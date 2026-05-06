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
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const payments = await prisma.payment.findMany({
    where: { customerId: id },
    include: {
      invoice: {
        select: { invoiceNumber: true },
      },
    },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json(payments);
}