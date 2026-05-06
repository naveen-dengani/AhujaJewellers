import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, userId },
    include: {
      invoices: {
        orderBy: { invoiceDate: "desc" },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const totalBilled = customer.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalReceived = customer.invoices.reduce((sum, inv) => sum + inv.amountReceived, 0);
  const totalPending = customer.invoices.reduce((sum, inv) => sum + inv.pendingAmount, 0);

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes,
    },
    balance: {
      totalBilled,
      totalReceived,
      totalPending,
      invoices: customer.invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        totalAmount: inv.totalAmount,
        amountReceived: inv.amountReceived,
        pendingAmount: inv.pendingAmount,
      })),
    },
  });
}