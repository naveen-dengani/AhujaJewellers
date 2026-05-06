import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";
import { renderToStream } from "@react-pdf/renderer";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { 
      customer: true,
      items: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const pdfData = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    customer: {
      name: invoice.customer.name,
      phone: invoice.customer.phone,
      notes: invoice.customer.notes,
    },
    items: invoice.items,
    transportAmount: invoice.transportAmount,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    amountReceived: invoice.amountReceived,
    pendingAmount: invoice.pendingAmount,
  };

  const stream = await renderToStream(<InvoicePDF data={pdfData} />);
  
  return new NextResponse(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });
}