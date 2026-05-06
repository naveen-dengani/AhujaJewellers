"use client";

import { use, useState, useEffect } from "react";
import { formatCurrency, formatDate, getWhatsAppLink, getBalanceWhatsAppMessage, formatDateInput } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, StickyNote, FileText, MessageCircle, Download, Plus, X, Trash2, Loader2, Receipt } from "lucide-react";

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  amountReceived: number;
  pendingAmount: number;
};

type Payment = {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  notes: string | null;
  invoice: { invoiceNumber: string } | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
};

type Balance = {
  totalBilled: number;
  totalReceived: number;
  totalPending: number;
  invoices: Invoice[];
};

const paymentModes = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" },
  { value: "cheque", label: "Cheque" },
];

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [customerRes, balanceRes, paymentsRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch(`/api/customers/${id}/balance`),
        fetch(`/api/customers/${id}/payments`),
      ]);

      const customerData = await customerRes.json();
      const balanceData = await balanceRes.json();
      const paymentsData = await paymentsRes.json();

      setCustomer(customerData);
      setBalance(balanceData.balance);
      setPayments(paymentsData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/customers/${id}/balance-pdf`);
      if (!response.ok) throw new Error("Failed to download");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `balance-${customer?.name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
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

  const handleShareWhatsApp = () => {
    if (!customer?.phone) {
      alert("No phone number for customer");
      return;
    }
    const message = getBalanceWhatsAppMessage(
      customer.name,
      balance?.totalBilled || 0,
      balance?.totalReceived || 0,
      balance?.totalPending || 0,
      baseUrl
    );
    const link = getWhatsAppLink(customer.phone, message);
    window.open(link, "_blank");
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError("");
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError("Please enter a valid amount");
      return;
    }
    if (amount > (balance?.totalPending || 0)) {
      setPaymentError(`Amount cannot exceed pending of ${formatCurrency(balance?.totalPending || 0)}`);
      return;
    }

    setSavingPayment(true);
    try {
      await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: id,
          amount,
          paymentMode,
          notes: paymentNotes || null,
        }),
      });
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentNotes("");
      fetchData();
    } catch (err) {
      setPaymentError("Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Delete this payment?")) return;
    try {
      await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert("Failed to delete payment");
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (!customer || !balance) {
    return (
      <div className="empty-state">
        <FileText size={48} />
        <p className="empty-title">Customer not found</p>
        <Link href="/dashboard/customers" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Customers
        </Link>
      </div>
    );
  }

  const pendingInvoices = balance.invoices.filter((inv) => inv.pendingAmount > 0);

  return (
    <div>
      <div className="page-header">
        <Link href="/dashboard/customers" className="back-btn">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="page-title">{customer.name}</h1>
          <div className="meta-row">
            {customer.phone && (
              <span className="meta-pill"><Phone size={14} /> {customer.phone}</span>
            )}
            {customer.notes && (
              <span className="meta-pill muted"><StickyNote size={14} /> {customer.notes}</span>
            )}
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="btn btn-primary" onClick={() => router.push(`/dashboard/invoices/new?customerId=${id}`)}>
          <Receipt size={18} />
          New Invoice
        </button>
        <button className="btn btn-secondary" onClick={handleDownloadPDF} disabled={downloading}>
          {downloading ? <Loader2 size={18} className="spinner" /> : <Download size={18} />}
          PDF
        </button>
        {customer.phone && (
          <button className="btn btn-secondary" onClick={handleShareWhatsApp}>
            <MessageCircle size={18} />
            Share
          </button>
        )}
        {balance.totalPending > 0 && (
          <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>
            <Plus size={18} />
            Payment
          </button>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card card-gold">
          <div className="stat-value">{formatCurrency(balance.totalBilled)}</div>
          <div className="stat-label">Total Billed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value success">{formatCurrency(balance.totalReceived)}</div>
          <div className="stat-label">Received</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${balance.totalPending > 0 ? "danger" : "success"}`}>
            {formatCurrency(balance.totalPending)}
          </div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Invoice History ({balance.invoices.length})</h2>
        {balance.invoices.length === 0 ? (
          <div className="empty-state small">
            <FileText size={32} />
            <p>No invoices</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Pending</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {balance.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="font-medium">{invoice.invoiceNumber}</td>
                    <td className="text-muted">{formatDate(invoice.invoiceDate)}</td>
                    <td className="text-right">{formatCurrency(invoice.totalAmount)}</td>
                    <td className="text-right text-success">{formatCurrency(invoice.amountReceived)}</td>
                    <td className="text-right">{formatCurrency(invoice.pendingAmount)}</td>
                    <td>
                      <span className={`badge ${invoice.pendingAmount <= 0 ? "badge-success" : "badge-warning"}`}>
                        {invoice.pendingAmount <= 0 ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td>
                      <Link href={`/dashboard/invoices/${invoice.id}`} className="btn btn-ghost btn-sm">
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

      {payments.length > 0 && (
        <div className="section">
          <h2 className="section-title">Payment History ({payments.length})</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                  <th>Mode</th>
                  <th>Invoice</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="text-muted">{formatDate(payment.paymentDate)}</td>
                    <td className="text-right font-medium text-success">{formatCurrency(payment.amount)}</td>
                    <td className="capitalize">{payment.paymentMode}</td>
                    <td>
                      {payment.invoice ? (
                        <Link href={`/dashboard/invoices/${payment.invoice.invoiceNumber}`} className="link">
                          {payment.invoice.invoiceNumber}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-muted">{payment.notes || "—"}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm danger" onClick={() => handleDeletePayment(payment.id)}>
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

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Payment</h2>
              <button className="icon-btn" onClick={() => setShowPaymentModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="pending-banner">
              <span>Total Pending:</span>
              <span className="danger">{formatCurrency(balance.totalPending)}</span>
            </div>
            {paymentError && <div className="error-banner">{paymentError}</div>}
            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  className="form-input"
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
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <div className="payment-modes">
                  {paymentModes.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      className={`mode-btn ${paymentMode === mode.value ? "active" : ""}`}
                      onClick={() => setPaymentMode(mode.value)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Any notes..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingPayment}>
                  {savingPayment ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .back-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main); flex-shrink: 0; }
        .page-title { font-size: 1.5rem; font-weight: 700; }
        .meta-row { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
        .meta-pill { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--text-muted); }
        .meta-pill.muted { color: var(--text-muted); }
        .action-buttons { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .action-buttons .btn { flex: 1; min-width: 100px; justify-content: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; }
        .stat-card.card-gold { border-color: var(--primary); background: linear-gradient(135deg, rgba(217, 119, 6, 0.1), transparent); }
        .stat-value { font-size: 1.25rem; font-weight: 700; }
        .stat-value.success { color: var(--success); }
        .stat-value.danger { color: var(--danger); }
        .stat-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-top: 4px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 1rem; font-weight: 600; margin-bottom: 12px; }
        .table-container { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { text-align: left; padding: 12px; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; background: var(--bg-secondary); border-bottom: 1px solid var(--border); }
        .data-table td { padding: 12px; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
        .data-table tr:last-child td { border-bottom: none; }
        .font-medium { font-weight: 500; }
        .text-right { text-align: right; }
        .text-muted { color: var(--text-muted); }
        .text-success { color: var(--success); }
        .capitalize { text-transform: capitalize; }
        .link { color: var(--primary); text-decoration: none; }
        .danger { color: var(--danger); }
        .empty-state { display: flex; flex-direction: column; align-items: center; padding: 40px; color: var(--text-muted); }
        .empty-state.small { padding: 24px; }
        .loading { text-align: center; padding: 40px; color: var(--text-muted); }
        .btn.danger { color: var(--danger); }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
        .modal { background: var(--bg-card); border-radius: 16px; width: 100%; max-width: 400px; padding: 20px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .modal-header h2 { font-size: 1.25rem; font-weight: 600; }
        .icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
        .pending-banner { display: flex; justify-content: space-between; padding: 12px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 16px; font-size: 0.875rem; }
        .error-banner { background: rgba(239, 68, 68, 0.1); color: var(--danger); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.875rem; }
        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 6px; }
        .form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 1rem; background: var(--bg-main); color: var(--text-main); }
        .payment-modes { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
        .mode-btn { padding: 10px 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-secondary); color: var(--text-secondary); font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
        .mode-btn.active { border-color: var(--primary); background: rgba(217, 119, 6, 0.1); color: var(--primary); }
        .modal-actions { display: flex; gap: 12px; margin-top: 20px; }
        .modal-actions .btn { flex: 1; }
      `}</style>
    </div>
  );
}