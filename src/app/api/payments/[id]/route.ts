import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const payment = await prisma.payment.findFirst({
    where: { id, userId },
    include: { invoice: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    if (payment.invoiceId && payment.invoice) {
      const newReceived = payment.invoice.amountReceived - payment.amount;
      const newPending = payment.invoice.totalAmount - newReceived;

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountReceived: Math.max(0, newReceived),
          pendingAmount: Math.max(0, newPending),
        },
      });
    }

    await tx.payment.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}