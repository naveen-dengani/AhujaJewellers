import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Users, Plus, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Single optimized query to get all dashboard stats
  const [stats, recentInvoices] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        _count: { select: { customers: true } },
        invoices: {
          select: {
            totalAmount: true,
            pendingAmount: true,
            amountReceived: true,
          },
        },
      },
    }),
    prisma.invoice.findMany({
      where: { user: { email: session.user.email } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: true },
    }),
  ]);

  if (!stats) {
    redirect("/login");
  }

  // Calculate totals from the aggregation
  const totalCustomers = stats._count.customers;
  const totalBilled = stats.invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalPending = stats.invoices.reduce((sum, inv) => sum + (inv.pendingAmount || 0), 0);
  const totalReceived = totalBilled - totalPending;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back!</p>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link href="/dashboard/invoices/new" className="btn btn-primary">
          <Plus size={18} />
          New Invoice
        </Link>
        <Link href="/dashboard/customers" className="btn btn-secondary">
          <Users size={18} />
          Add Customer
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Customers</div>
          <div className="stat-value">{totalCustomers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Billed</div>
          <div className="stat-value">{formatCurrency(totalBilled)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Received</div>
          <div className="stat-value">{formatCurrency(totalReceived)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value pending">{formatCurrency(totalPending)}</div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card">
        <div className="section-header">
          <h2 className="section-title">Recent Invoices</h2>
          <Link href="/dashboard/invoices" className="section-link">
            View All <ArrowRight size={14} style={{ marginLeft: 4 }} />
          </Link>
        </div>

        {recentInvoices.length > 0 ? (
          <div>
            {recentInvoices.map((invoice) => (
              <Link 
                key={invoice.id} 
                href={`/dashboard/invoices/${invoice.id}`}
                className="list-item"
              >
                <div className="list-item-content">
                  <div className="list-item-title">{invoice.invoiceNumber}</div>
                  <div className="list-item-subtitle">{invoice.customer.name}</div>
                </div>
                <div className="list-item-right">
                  <div className="list-item-amount">{formatCurrency(invoice.totalAmount)}</div>
                  <span className={`badge ${invoice.pendingAmount > 0 ? "badge-warning" : "badge-success"}`}>
                    {invoice.pendingAmount > 0 ? "Pending" : "Paid"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <div className="empty-title">No invoices yet</div>
            <div className="empty-desc">Create your first invoice</div>
          </div>
        )}
      </div>
    </div>
  );
}