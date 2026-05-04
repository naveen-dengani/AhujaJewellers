"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function getPaymentsByInvoice(invoiceId: string) {
  const userId = await getUserId();
  return prisma.payment.findMany({
    where: { invoiceId, userId },
    orderBy: { paymentDate: "desc" },
  });
}

export async function getPaymentsByCustomer(customerId: string) {
  const userId = await getUserId();
  return prisma.payment.findMany({
    where: { customerId, userId },
    include: {
      invoice: {
        select: { invoiceNumber: true },
      },
    },
    orderBy: { paymentDate: "desc" },
  });
}

export async function createPayment(data: {
  invoiceId?: string;
  customerId: string;
  amount: number;
  paymentDate?: Date;
  paymentMode: string;
  notes?: string;
}) {
  const userId = await getUserId();

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, userId },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  if (data.invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, userId, customerId: data.customerId },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const newAmountReceived = invoice.amountReceived + data.amount;
    const newPendingAmount = Math.max(0, invoice.totalAmount - newAmountReceived);

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId: data.invoiceId,
          customerId: data.customerId,
          userId,
          amount: data.amount,
          paymentDate: data.paymentDate || new Date(),
          paymentMode: data.paymentMode,
          notes: data.notes || null,
        },
      }),
      prisma.invoice.update({
        where: { id: data.invoiceId },
        data: {
          amountReceived: newAmountReceived,
          pendingAmount: newPendingAmount,
        },
      }),
    ]);

    revalidatePath(`/dashboard/invoices/${data.invoiceId}`);
    revalidatePath(`/dashboard/customers/${data.customerId}`);
    return payment;
  } else {
    const payment = await prisma.payment.create({
      data: {
        customerId: data.customerId,
        userId,
        amount: data.amount,
        paymentDate: data.paymentDate || new Date(),
        paymentMode: data.paymentMode,
        notes: data.notes || null,
      },
    });

    revalidatePath(`/dashboard/customers/${data.customerId}`);
    return payment;
  }
}

export async function deletePayment(paymentId: string) {
  const userId = await getUserId();

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId },
    include: { invoice: true },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.invoiceId && payment.invoice) {
    const newAmountReceived = payment.invoice.amountReceived - payment.amount;
    const newPendingAmount = Math.max(0, payment.invoice.totalAmount - newAmountReceived);

    await prisma.$transaction([
      prisma.payment.delete({
        where: { id: paymentId },
      }),
      prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountReceived: newAmountReceived,
          pendingAmount: newPendingAmount,
        },
      }),
    ]);

    revalidatePath(`/dashboard/invoices/${payment.invoiceId}`);
  } else {
    await prisma.payment.delete({
      where: { id: paymentId },
    });
  }

  revalidatePath(`/dashboard/customers/${payment.customerId}`);
}