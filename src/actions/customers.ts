"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { customerSchema, type CustomerInput } from "@/lib/validations";
import { generateBalancePDF } from "@/lib/pdf/documents";
import { revalidatePath } from "next/cache";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function getCustomers() {
  const userId = await getUserId();
  return prisma.customer.findMany({
    where: { userId },
    include: {
      invoices: {
        select: {
          pendingAmount: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getCustomersWithBalance() {
  const userId = await getUserId();

  const customers = await prisma.customer.findMany({
    where: { userId },
    include: {
      invoices: {
        select: {
          totalAmount: true,
          amountReceived: true,
        },
      },
      payments: {
        where: { invoiceId: null },
        select: { amount: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return customers.map((customer) => {
    const totalBilled = customer.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalReceivedFromInvoices = customer.invoices.reduce((sum, inv) => sum + inv.amountReceived, 0);
    const totalFromUnlinkedPayments = customer.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalReceived = totalReceivedFromInvoices + totalFromUnlinkedPayments;
    const pendingBalance = totalBilled - totalReceived;

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes,
      pendingBalance: Math.max(0, pendingBalance),
    };
  });
}

export async function getCustomer(id: string) {
  const userId = await getUserId();
  return prisma.customer.findFirst({
    where: { id, userId },
    include: {
      invoices: {
        include: {
          items: true,
        },
        orderBy: { invoiceDate: "desc" },
      },
    },
  });
}

export async function createCustomer(data: CustomerInput) {
  const userId = await getUserId();
  const validated = customerSchema.parse(data);

  const customer = await prisma.customer.create({
    data: {
      ...validated,
      userId,
    },
  });

  revalidatePath("/dashboard/customers");
  return customer;
}

export async function updateCustomer(id: string, data: CustomerInput) {
  const userId = await getUserId();
  const validated = customerSchema.parse(data);

  const customer = await prisma.customer.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${id}`);
  return customer;
}

export async function deleteCustomer(id: string) {
  const userId = await getUserId();

  await prisma.customer.delete({
    where: { id },
  });

  revalidatePath("/dashboard/customers");
}

export async function getCustomerBalance(customerId: string) {
  const userId = await getUserId();

  const invoices = await prisma.invoice.findMany({
    where: { customerId, userId },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      totalAmount: true,
      amountReceived: true,
      pendingAmount: true,
    },
    orderBy: { invoiceDate: "desc" },
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalReceivedFromInvoices = invoices.reduce(
    (sum, inv) => sum + inv.amountReceived,
    0
  );

  const paymentsWithoutInvoice = await prisma.payment.findMany({
    where: {
      customerId,
      userId,
      invoiceId: null,
    },
    select: { amount: true },
  });

  const totalFromUnlinkedPayments = paymentsWithoutInvoice.reduce(
    (sum, p) => sum + p.amount,
    0
  );

  const totalReceived = totalReceivedFromInvoices + totalFromUnlinkedPayments;
  const totalPending = totalBilled - totalReceived;

  return { totalBilled, totalReceived, totalPending, invoices };
}

export async function downloadBalancePDF(customerId: string) {
  const userId = await getUserId();
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
  });
  if (!customer) throw new Error("Customer not found");

  const balance = await getCustomerBalance(customerId);
  return generateBalancePDF(customer, balance);
}

export async function searchCustomers(query: string) {
  const userId = await getUserId();
  return prisma.customer.findMany({
    where: {
      userId,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    },
    take: 10,
    orderBy: { name: "asc" },
  });
}
