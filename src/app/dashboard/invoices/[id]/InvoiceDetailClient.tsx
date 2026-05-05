"use client";

import { useState, useEffect } from "react";
import {
  formatCurrency,
  formatDate,
  getWhatsAppLink,
  getInvoiceWhatsAppMessage,
} from "@/lib/utils";
import {
  ArrowLeft,
  Printer,
  Download,
  MessageCircle,
  Edit,
  FileText,
  Calendar,
  User,
  Phone,
  Truck,
  Receipt,
  Loader2,
} from "lucide-react";
import Link from "next/link";

type InvoiceItem = {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  createdAt: Date;
  transportAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountReceived: number;
  pendingAmount: number;
  customer: { id: string; name: string; phone: string };
  items: InvoiceItem[];
};

interface InvoiceDetailClientProps {
  invoice: Invoice;
}

export default function InvoiceDetailClient({ invoice }: InvoiceDetailClientProps) {
  const [downloading, setDownloading] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const whatsappLink = baseUrl && invoice.customer.phone ? getWhatsAppLink(
    invoice.customer.phone,
    getInvoiceWhatsAppMessage(
      invoice.customer.name,
      invoice.invoiceNumber,
      invoice.invoiceDate,
      invoice.totalAmount,
      invoice.amountReceived,
      invoice.pendingAmount,
      invoice.id,
      baseUrl
    )
  ) : "";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`);
      if (!response.ok) throw new Error("Failed to download");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
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
          href="/dashboard/invoices"
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: "0.75rem" }}
        >
          <ArrowLeft size={16} /> Back to Invoices
        </Link>

        <div className="page-header">
          <div>
            <h1 className="page-title">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <p className="page-subtitle">
              Created on {formatDate(invoice.createdAt)}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn btn-secondary"
              onClick={handlePrint}
            >
              <Printer size={16} />
              Print
            </button>
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
              WhatsApp
            </a>
            <Link
              href={`/dashboard/invoices/${invoice.id}/edit`}
              className="btn btn-primary"
            >
              <Edit size={16} />
              Edit
            </Link>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Invoice Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Customer & Date Info */}
          <div className="card">
            <h3
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              Invoice Information
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(59, 130, 246, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileText size={16} style={{ color: "var(--info)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Invoice Number
                  </div>
                  <div style={{ fontWeight: 500 }}>{invoice.invoiceNumber}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(34, 197, 94, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Calendar size={16} style={{ color: "var(--success)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Invoice Date
                  </div>
                  <div style={{ fontWeight: 500 }}>
                    {formatDate(invoice.invoiceDate)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(184, 134, 11, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={16} style={{ color: "var(--primary-light)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Customer
                  </div>
                  <Link
                    href={`/dashboard/customers/${invoice.customer.id}`}
                    style={{
                      fontWeight: 500,
                      color: "var(--primary-light)",
                      textDecoration: "none",
                    }}
                  >
                    {invoice.customer.name}
                  </Link>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(168, 85, 247, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Phone size={16} style={{ color: "#a855f7" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Phone
                  </div>
                  <div style={{ fontWeight: 500 }}>{invoice.customer.phone || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
                Items ({invoice.items.length})
              </h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.productName}</td>
                    <td>{item.unit && item.unit.trim() && item.unit !== "OTHER" ? item.unit : "-"}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td style={{ fontWeight: 500 }}>
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div>
          <div className="card card-gold" style={{ position: "sticky", top: "1.5rem" }}>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>
              Payment Summary
            </h3>

            <div className="invoice-totals">
              <div className="invoice-total-row">
                <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Receipt size={14} /> Items Subtotal
                </span>
                <span>
                  {formatCurrency(
                    invoice.items.reduce((sum, item) => sum + item.subtotal, 0)
                  )}
                </span>
              </div>

              {invoice.transportAmount > 0 && (
                <div className="invoice-total-row">
                  <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Truck size={14} /> Transport
                  </span>
                  <span>{formatCurrency(invoice.transportAmount)}</span>
                </div>
              )}

              {invoice.taxAmount > 0 && (
                <div className="invoice-total-row">
                  <span style={{ color: "var(--text-secondary)" }}>Tax</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}

              <div className="invoice-total-row grand-total">
                <span>Total Amount</span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>

              <div className="invoice-total-row">
                <span style={{ color: "var(--success)" }}>Amount Received</span>
                <span style={{ color: "var(--success)" }}>
                  {formatCurrency(invoice.amountReceived)}
                </span>
              </div>

              <div className="invoice-total-row pending">
                <span>Pending Amount</span>
                <span>{formatCurrency(invoice.pendingAmount)}</span>
              </div>
            </div>

            {/* Status Badge */}
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                background:
                  invoice.pendingAmount <= 0
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                textAlign: "center",
                fontWeight: 600,
                color:
                  invoice.pendingAmount <= 0
                    ? "var(--success)"
                    : "var(--danger)",
              }}
            >
              {invoice.pendingAmount <= 0
                ? "✓ Fully Paid"
                : `⏳ ${formatCurrency(invoice.pendingAmount)} Pending`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}