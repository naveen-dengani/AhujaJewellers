import { notFound } from "next/navigation";
import { getCustomer, getCustomerBalance } from "@/actions/customers";
import CustomerDetailClient from "./CustomerDetailClient";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customer, balance] = await Promise.all([
    getCustomer(id),
    getCustomerBalance(id),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <CustomerDetailClient
      customer={customer as never}
      balance={balance as never}
    />
  );
}