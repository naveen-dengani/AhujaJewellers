import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: { 
      customer: true,
      items: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existingInvoice = await prisma.invoice.findFirst({
    where: { id, userId },
  });

  if (!existingInvoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const body = await request.json();
  const { customerId, invoiceDate, items, transportAmount, taxAmount, totalAmount, amountReceived, pendingAmount } = body;

  const result = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    const itemData = items.map((item: any) => ({
      invoiceId: id,
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    }));

    await tx.invoiceItem.createMany({
      data: itemData,
    });

    const updated = await tx.invoice.update({
      where: { id },
      data: {
        customerId,
        invoiceDate: new Date(invoiceDate),
        transportAmount,
        taxAmount,
        totalAmount,
        amountReceived,
        pendingAmount,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    return updated;
  });

  return NextResponse.json(result);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  await prisma.invoice.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}