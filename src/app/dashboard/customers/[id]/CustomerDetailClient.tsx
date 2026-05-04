"use client";

import { useState, useEffect } from "react";
import {
  formatCurrency,
  formatDate,
  getWhatsAppLink,
  getBalanceWhatsAppMessage,
  formatDateInput,
} from "@/lib/utils";
import { getPaymentsByCustomer, createPayment, deletePayment } from "@/actions/payments";
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
  Plus,
  X,
  DollarSign,
  Trash2,
  CreditCard,
  Banknote,
  Wallet,
  Receipt,
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

type Payment = {
  id: string;
  amount: number;
  paymentDate: Date;
  paymentMode: string;
  notes: string | null;
  invoice: { invoiceNumber: string } | null;
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

const paymentModes = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "upi", label: "UPI", icon: Wallet },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "bank", label: "Bank Transfer", icon: DollarSign },
  { value: "other", label: "Other", icon: DollarSign },
];

export default function CustomerDetailClient({ customer, balance }: CustomerDetailClientProps) {
  const [downloading, setDownloading] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(formatDateInput(new Date()));
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    async function loadPayments() {
      try {
        const data = await getPaymentsByCustomer(customer.id);
        setPayments(data as Payment[]);
      } catch (err) {
        console.error("Failed to load payments:", err);
      } finally {
        setLoadingPayments(false);
      }
    }
    loadPayments();
  }, [customer.id]);

  const pendingInvoices = balance.invoices.filter((inv) => inv.pendingAmount > 0);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError("");
    setSavingPayment(true);

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError("Please enter a valid amount");
      setSavingPayment(false);
      return;
    }

    if (amount > balance.totalPending) {
      setPaymentError(`Amount cannot exceed total pending of ${formatCurrency(balance.totalPending)}`);
      setSavingPayment(false);
      return;
    }

    try {
      await createPayment({
        invoiceId: selectedInvoiceId || undefined,
        customerId: customer.id,
        amount,
        paymentDate: new Date(paymentDate),
        paymentMode,
        notes: paymentNotes || undefined,
      });

      const updatedPayments = await getPaymentsByCustomer(customer.id);
      setPayments(updatedPayments as Payment[]);

      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentNotes("");
      setSelectedInvoiceId("");
      window.location.reload();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    try {
      await deletePayment(paymentId);
      const updatedPayments = await getPaymentsByCustomer(customer.id);
      setPayments(updatedPayments as Payment[]);
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete payment:", err);
    }
  };

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
            {balance.totalPending > 0 && (
              <button
                className="btn btn-primary"
                onClick={() => setShowPaymentModal(true)}
              >
                <Plus size={16} />
                Record Payment
              </button>
            )}
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

      {/* Payment History */}
      {!loadingPayments && payments.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "0.75rem",
            }}
          >
            Payment History ({payments.length})
          </h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Invoice</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td style={{ fontWeight: 500, color: "var(--success)" }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{payment.paymentMode}</td>
                    <td>
                      {payment.invoice ? (
                        <Link
                          href={`/dashboard/invoices/${payment.invoice.invoiceNumber}`}
                          style={{ color: "var(--primary-light)", textDecoration: "none" }}
                        >
                          {payment.invoice.invoiceNumber}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-muted)", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {payment.notes || "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleDeletePayment(payment.id)}
                        style={{ color: "var(--danger)", width: "32px", height: "32px" }}
                        title="Delete payment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Record Payment</h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowPaymentModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: "0.75rem",
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                marginBottom: "1rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Total Pending:</span>
              <span style={{ fontWeight: 600, color: "var(--danger)" }}>
                {formatCurrency(balance.totalPending)}
              </span>
            </div>

            <form onSubmit={handleRecordPayment}>
              {paymentError && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.75rem",
                    color: "var(--danger)",
                    fontSize: "0.875rem",
                    marginBottom: "1rem",
                  }}
                >
                  {paymentError}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="payment-amount">
                    Amount (₹) *
                  </label>
                  <input
                    id="payment-amount"
                    type="number"
                    className="input"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    max={balance.totalPending}
                    required
                    autoFocus
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="payment-date">
                    Payment Date
                  </label>
                  <input
                    id="payment-date"
                    type="date"
                    className="input"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="invoice-select">
                    Apply to Invoice (optional)
                  </label>
                  <select
                    id="invoice-select"
                    className="input"
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  >
                    <option value="">No specific invoice</option>
                    {pendingInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {formatCurrency(inv.pendingAmount)} pending
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Payment Mode *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                    {paymentModes.map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => setPaymentMode(mode.value)}
                          style={{
                            padding: "0.625rem",
                            borderRadius: "var(--radius-md)",
                            border: paymentMode === mode.value
                              ? "2px solid var(--primary)"
                              : "1px solid var(--border)",
                            background: paymentMode === mode.value
                              ? "rgba(184, 134, 11, 0.1)"
                              : "var(--bg-secondary)",
                            color: paymentMode === mode.value
                              ? "var(--primary-light)"
                              : "var(--text-secondary)",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          <Icon size={16} />
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="payment-notes">
                    Notes (optional)
                  </label>
                  <input
                    id="payment-notes"
                    type="text"
                    className="input"
                    placeholder="Any additional notes..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingPayment}
                >
                  {savingPayment ? <div className="spinner" /> : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}