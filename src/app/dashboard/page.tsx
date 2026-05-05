import { getDashboardStats } from "@/actions/invoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Users, IndianRupee, FileText, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  let stats;
  try {
    stats = await getDashboardStats();
  } catch {
    stats = { totalCustomers: 0, totalPending: 0, recentInvoices: [] };
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back to Ahuja Jewellers</p>
        </div>
        <Link href="/dashboard/invoices/new" className="btn btn-primary">
          <Plus size={18} />
          New Invoice
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid-stats" style={{ marginBottom: "2rem" }}>
        <div className="stat-card card-gold">
          <div
            className="stat-icon"
            style={{ background: "rgba(184, 134, 11, 0.1)" }}
          >
            <Users size={20} style={{ color: "var(--primary-light)" }} />
          </div>
          <div className="stat-value">{stats.totalCustomers}</div>
          <div className="stat-label">Total Customers</div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "rgba(239, 68, 68, 0.1)" }}
          >
            <IndianRupee size={20} style={{ color: "var(--danger)" }} />
          </div>
          <div className="stat-value" style={{ color: "var(--danger)" }}>
            {formatCurrency(stats.totalPending)}
          </div>
          <div className="stat-label">Total Pending</div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "rgba(59, 130, 246, 0.1)" }}
          >
            <FileText size={20} style={{ color: "var(--info)" }} />
          </div>
          <div className="stat-value">{stats.recentInvoices.length}</div>
          <div className="stat-label">Recent Invoices</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: "2rem" }}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
          }}
        >
          Quick Actions
        </h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/dashboard/invoices/new" className="btn btn-primary">
            <Plus size={16} />
            Create Invoice
          </Link>
          <Link href="/dashboard/customers" className="btn btn-secondary">
            <Users size={16} />
            Manage Customers
          </Link>
          <Link href="/dashboard/products" className="btn btn-secondary">
            <FileText size={16} />
            View Products
          </Link>
        </div>
      </div>

      {/* Recent Invoices */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>
            Recent Invoices
          </h2>
          <Link
            href="/dashboard/invoices"
            className="btn btn-ghost btn-sm"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {stats.recentInvoices.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-icon">
              <FileText size={28} />
            </div>
            <div className="empty-title">No invoices yet</div>
            <div className="empty-description">
              Create your first invoice to get started
            </div>
            <Link
              href="/dashboard/invoices/new"
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              <Plus size={16} />
              Create Invoice
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stats.recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td style={{ fontWeight: 500 }}>
                      {invoice.invoiceNumber}
                    </td>
                    <td>{invoice.customer.name}</td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td>{formatCurrency(invoice.totalAmount)}</td>
                    <td style={{ color: "var(--success)" }}>
                      {formatCurrency(invoice.amountReceived)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          invoice.pendingAmount > 0
                            ? "badge-danger"
                            : "badge-success"
                        }`}
                      >
                        {formatCurrency(invoice.pendingAmount)}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        View <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
