"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { invoiceSchema, type InvoiceInput } from "@/lib/validations";
import { generateInvoiceNumber } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/pdf/documents";
import { revalidatePath } from "next/cache";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function getInvoices(filters?: {
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const userId = await getUserId();

  const where: Record<string, unknown> = { userId };

  if (filters?.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.invoiceDate = {};
    if (filters.dateFrom) {
      (where.invoiceDate as Record<string, unknown>).gte = new Date(
        filters.dateFrom
      );
    }
    if (filters.dateTo) {
      (where.invoiceDate as Record<string, unknown>).lte = new Date(
        filters.dateTo
      );
    }
  }

  return prisma.invoice.findMany({
    where,
    include: {
      customer: {
        select: { name: true, phone: true },
      },
      items: true,
    },
    orderBy: { invoiceDate: "desc" },
  });
}

export async function getInvoice(id: string) {
  const userId = await getUserId();
  return prisma.invoice.findFirst({
    where: { id, userId },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function createInvoice(data: InvoiceInput) {
  const userId = await getUserId();
  const validated = invoiceSchema.parse(data);

  const result = await prisma.$transaction(async (tx) => {
    // Calculate totals
    const itemsSubtotal = validated.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    const totalAmount =
      itemsSubtotal + validated.transportAmount + validated.taxAmount;
    const pendingAmount = totalAmount - validated.amountReceived;

    // Create invoice
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        customerId: validated.customerId,
        userId,
        invoiceDate: new Date(validated.invoiceDate),
        transportAmount: validated.transportAmount,
        taxAmount: validated.taxAmount,
        totalAmount,
        amountReceived: validated.amountReceived,
        pendingAmount,
      },
    });

    // Create invoice items - with dynamic product creation
    for (const item of validated.items) {
      let productId = item.productId;

      // If no productId or it's a new product, find or create
      if (!productId || item.isNew) {
        const product = await tx.product.findFirst({
          where: {
            userId,
            name: { equals: item.productName, mode: "insensitive" },
          },
        });

        if (product) {
          productId = product.id;
        } else {
          // Create new product dynamically
          const newProduct = await tx.product.create({
            data: {
              name: item.productName,
              defaultPrice: item.price,
              userId,
            },
          });
          productId = newProduct.id;
        }
      }

      await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productId: productId!,
          productName: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.quantity * item.price,
        },
      });
    }

    return invoice;
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  return result;
}

export async function updateInvoice(id: string, data: InvoiceInput) {
  const userId = await getUserId();
  const validated = invoiceSchema.parse(data);

  const result = await prisma.$transaction(async (tx) => {
    // Delete existing items
    await tx.invoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    // Calculate totals
    const itemsSubtotal = validated.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    const totalAmount =
      itemsSubtotal + validated.transportAmount + validated.taxAmount;
    const pendingAmount = totalAmount - validated.amountReceived;

    // Update invoice
    const invoice = await tx.invoice.update({
      where: { id },
      data: {
        customerId: validated.customerId,
        invoiceDate: new Date(validated.invoiceDate),
        transportAmount: validated.transportAmount,
        taxAmount: validated.taxAmount,
        totalAmount,
        amountReceived: validated.amountReceived,
        pendingAmount,
      },
    });

    // Recreate items with dynamic product creation
    for (const item of validated.items) {
      let productId = item.productId;

      if (!productId || item.isNew) {
        const product = await tx.product.findFirst({
          where: {
            userId,
            name: { equals: item.productName, mode: "insensitive" },
          },
        });

        if (product) {
          productId = product.id;
        } else {
          const newProduct = await tx.product.create({
            data: {
              name: item.productName,
              defaultPrice: item.price,
              userId,
            },
          });
          productId = newProduct.id;
        }
      }

      await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productId: productId!,
          productName: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.quantity * item.price,
        },
      });
    }

    return invoice;
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  return result;
}

export async function deleteInvoice(id: string) {
  const userId = await getUserId();

  await prisma.invoice.delete({
    where: { id },
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");
}

export async function getLastPurchasePrice(
  customerId: string,
  productId: string
) {
  const userId = await getUserId();

  const lastInvoiceItem = await prisma.invoiceItem.findFirst({
    where: {
      productId,
      invoice: { customerId, userId },
    },
    orderBy: { invoice: { invoiceDate: "desc" } },
    include: {
      invoice: {
        select: {
          invoiceDate: true,
          customer: { select: { name: true } },
        },
      },
    },
  });

  if (!lastInvoiceItem) return null;

  return {
    price: lastInvoiceItem.price,
    date: lastInvoiceItem.invoice.invoiceDate,
    customerName: lastInvoiceItem.invoice.customer.name,
  };
}

export async function downloadInvoicePDF(id: string) {
  const userId = await getUserId();
  
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: {
      customer: { select: { name: true, phone: true } },
      items: { select: { productName: true, unit: true, quantity: true, price: true, subtotal: true } },
    },
  });
  
  if (!invoice) throw new Error("Invoice not found");

  return generateInvoicePDF(invoice);
}

export async function getDashboardStats() {
  const userId = await getUserId();

  const [customerCount, pendingResult, recentInvoices] = await Promise.all([
    prisma.customer.count({ where: { userId } }),
    prisma.invoice.aggregate({
      where: { userId },
      _sum: { pendingAmount: true },
    }),
    prisma.invoice.findMany({
      where: { userId },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    totalCustomers: customerCount,
    totalPending: pendingResult._sum.pendingAmount || 0,
    recentInvoices,
  };
}
