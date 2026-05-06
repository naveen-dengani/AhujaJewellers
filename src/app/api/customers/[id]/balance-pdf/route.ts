import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateBalancePDF } from "@/lib/pdf/invoice-pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, userId },
    });

    if (!customer) {
      return new NextResponse("Customer not found", { status: 404 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { customerId: id, userId },
      orderBy: { invoiceDate: "desc" },
    });

    const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalReceived = invoices.reduce((sum, inv) => sum + inv.amountReceived, 0);
    const totalPending = invoices.reduce((sum, inv) => sum + inv.pendingAmount, 0);

    const blob = await generateBalancePDF({
      customer: {
        name: customer.name,
        phone: customer.phone,
        notes: customer.notes,
      },
      balance: {
        totalBilled,
        totalReceived,
        totalPending,
        invoices: invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          totalAmount: inv.totalAmount,
          amountReceived: inv.amountReceived,
          pendingAmount: inv.pendingAmount,
        })),
      },
    });

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="balance-${customer.name.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Balance PDF generation error:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}