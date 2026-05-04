import { notFound } from "next/navigation";
import { getInvoice } from "@/actions/invoices";
import InvoiceDetailClient from "./InvoiceDetailClient";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);

  if (!invoice) {
    notFound();
  }

  return <InvoiceDetailClient invoice={invoice as never} />;
}