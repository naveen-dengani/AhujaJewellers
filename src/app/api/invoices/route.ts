import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { 
    invoiceNumber, 
    customerId, 
    invoiceDate, 
    items, 
    transportAmount, 
    taxAmount, 
    totalAmount, 
    amountReceived, 
    pendingAmount 
  } = body;

  if (!invoiceNumber || !customerId || !items?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const productMap = new Map();
    
    for (const item of items) {
      if (!item.productId || item.productId.startsWith("new-")) {
        const product = await tx.product.create({
          data: {
            name: item.productName,
            unit: item.unit || null,
            defaultPrice: item.price,
            userId,
          },
        });
        productMap.set(item.productId, product.id);
      } else {
        productMap.set(item.productId, item.productId);
      }
    }

    const createdInvoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        userId,
        invoiceDate: new Date(invoiceDate),
        transportAmount: transportAmount || 0,
        taxAmount: taxAmount || 0,
        totalAmount,
        amountReceived: amountReceived || 0,
        pendingAmount,
        items: {
          create: items.map((item: any) => ({
            productId: productMap.get(item.productId),
            productName: item.productName,
            unit: item.unit || null,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
        },
      },
    });

    return createdInvoice;
  });

  return NextResponse.json(invoice);
}