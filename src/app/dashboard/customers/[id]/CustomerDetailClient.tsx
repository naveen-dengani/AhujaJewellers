"use client";

import { useState, useEffect } from "react";
import {
  formatCurrency,
  formatDate,
  getWhatsAppLink,
  getBalanceWhatsAppMessage,
} from "@/lib/utils";
import {
  ArrowLeft,
  Phone,
  StickyNote,
  IndianRupee,
  FileText,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Download,
  Loader2,
} from "lucide-react";
import Link from "next/link";

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  amountReceived: number;
  pendingAmount: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
};

interface CustomerDetailClientProps {
  customer: Customer;
  balance: {
    totalBilled: number;
    totalReceived: number;
    totalPending: number;
    invoices: Invoice[];
  };
}

export default function CustomerDetailClient({ customer, balance }: CustomerDetailClientProps) {
  const [downloading, setDownloading] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const whatsappLink = baseUrl ? getWhatsAppLink(
    customer.phone,
    getBalanceWhatsAppMessage(
      customer.name,
      balance.totalBilled,
      balance.totalReceived,
      balance.totalPending,
      baseUrl
    )
  ) : "";

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/customers/${customer.id}/balance-pdf`);
      if (!response.ok) throw new Error("Failed to download");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `balance-${customer.name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/dashboard/customers"
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: "0.75rem" }}
        >
          <ArrowLeft size={16} /> Back to Customers
        </Link>
        <div className="page-header">
          <div>
            <h1 className="page-title">{customer.name}</h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginTop: "0.25rem",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                }}
              >
                <Phone size={14} /> {customer.phone}
              </span>
              {customer.notes && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <StickyNote size={14} /> {customer.notes}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn btn-secondary"
              onClick={handleDownloadPDF}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 size={16} className="spinner" />
              ) : (
                <Download size={16} />
              )}
              PDF
            </button>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <MessageCircle size={16} />
              Share Balance
            </a>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid-stats" style={{ marginBottom: "2rem" }}>
        <div className="stat-card card-gold">
          <div
            className="stat-icon"
            style={{ background: "rgba(59, 130, 246, 0.1)" }}
          >
            <IndianRupee size={20} style={{ color: "var(--info)" }} />
          </div>
          <div className="stat-value">{formatCurrency(balance.totalBilled)}</div>
          <div className="stat-label">Total Billed</div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "rgba(34, 197, 94, 0.1)" }}
          >
            <TrendingUp size={20} style={{ color: "var(--success)" }} />
          </div>
          <div className="stat-value" style={{ color: "var(--success)" }}>
            {formatCurrency(balance.totalReceived)}
          </div>
          <div className="stat-label">Total Received</div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "rgba(239, 68, 68, 0.1)" }}
          >
            <TrendingDown size={20} style={{ color: "var(--danger)" }} />
          </div>
          <div
            className="stat-value"
            style={{
              color:
                balance.totalPending > 0 ? "var(--danger)" : "var(--success)",
            }}
          >
            {formatCurrency(balance.totalPending)}
          </div>
          <div className="stat-label">Pending Balance</div>
        </div>
      </div>

      {/* Invoice History */}
      <div>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
          }}
        >
          Invoice History ({balance.invoices.length})
        </h2>

        {balance.invoices.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-icon">
              <FileText size={28} />
            </div>
            <div className="empty-title">No invoices</div>
            <div className="empty-description">
              No invoices found for this customer
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {balance.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td style={{ fontWeight: 500 }}>{invoice.invoiceNumber}</td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td>{formatCurrency(invoice.totalAmount)}</td>
                    <td style={{ color: "var(--success)" }}>
                      {formatCurrency(invoice.amountReceived)}
                    </td>
                    <td>{formatCurrency(invoice.pendingAmount)}</td>
                    <td>
                      <span
                        className={`badge ${
                          invoice.pendingAmount <= 0
                            ? "badge-success"
                            : "badge-danger"
                        }`}
                      >
                        {invoice.pendingAmount <= 0 ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        View
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