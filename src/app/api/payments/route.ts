import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { invoiceId, customerId, amount, paymentMode, notes } = body;

  if (!amount || !paymentMode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: { customer: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          customerId: invoice.customerId,
          userId,
          amount,
          paymentMode,
          notes: notes || null,
          paymentDate: new Date(),
        },
      });

      const newReceived = invoice.amountReceived + amount;
      const newPending = invoice.totalAmount - newReceived;

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountReceived: newReceived,
          pendingAmount: Math.max(0, newPending),
        },
      });

      return payment;
    });

    return NextResponse.json(result);
  }

  if (!customerId) {
    return NextResponse.json({ error: "Either invoiceId or customerId required" }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { customerId, pendingAmount: { gt: 0 } },
    orderBy: { invoiceDate: "asc" },
  });

  let remainingAmount = amount;
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        customerId,
        userId,
        amount,
        paymentMode,
        notes: notes || null,
        paymentDate: new Date(),
      },
    });

    for (const invoice of invoices) {
      if (remainingAmount <= 0) break;

      const paymentForInvoice = Math.min(remainingAmount, invoice.pendingAmount);
      
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          customerId,
          userId,
          amount: paymentForInvoice,
          paymentMode,
          notes: `Part of payment ${payment.id}`,
          paymentDate: new Date(),
        },
      });

      const newReceived = invoice.amountReceived + paymentForInvoice;
      const newPending = invoice.totalAmount - newReceived;

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountReceived: newReceived,
          pendingAmount: Math.max(0, newPending),
        },
      });

      remainingAmount -= paymentForInvoice;
    }

    return payment;
  });

  return NextResponse.json(result);
}