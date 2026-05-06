"use client";

import { use, useState, useEffect } from "react";
import { formatCurrency, formatDate, getWhatsAppLink, getInvoiceWhatsAppMessage } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, FileText, Trash2, Download, Share2, Plus, X, Pencil, CreditCard } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: { name: string; phone: string | null };
  items: Array<{
    id: string;
    productName: string;
    unit: string | null;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  transportAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountReceived: number;
  pendingAmount: number;
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error("Invoice not found");
      const data = await res.json();
      setInvoice(data);
    } catch (err) {
      setError("Invoice not found");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this invoice?")) return;
    
    try {
      await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      window.location.href = "/dashboard/invoices";
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${id}/pdf`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoice?.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!invoice?.customer.phone) {
      alert("No phone number for customer");
      return;
    }
    const message = getInvoiceWhatsAppMessage(
      invoice.customer.name,
      invoice.invoiceNumber,
      invoice.invoiceDate,
      invoice.totalAmount,
      invoice.amountReceived,
      invoice.pendingAmount,
      invoice.id
    );
    const link = getWhatsAppLink(invoice.customer.phone, message);
    window.open(link, "_blank");
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    
    setSavingPayment(true);
    try {
      await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: id,
          amount: parseFloat(paymentAmount),
          paymentMode,
        }),
      });
      setShowPaymentModal(false);
      setPaymentAmount("");
      fetchInvoice();
    } catch (err) {
      alert("Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (error || !invoice) {
    return (
      <div className="empty-state">
        <FileText size={48} />
        <p className="empty-title">{error || "Invoice not found"}</p>
        <Link href="/dashboard/invoices" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Invoices
        </Link>
      </div>
    );
  }

  const subtotal = invoice.items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div>
      <div className="page-header">
        <Link href="/dashboard/invoices" className="back-btn">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="page-title">{invoice.invoiceNumber}</h1>
          <p className="page-subtitle">{formatDate(invoice.invoiceDate)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <Link href={`/dashboard/invoices/${id}/edit`} className="btn btn-secondary">
          <Pencil size={18} />
          Edit
        </Link>
        <button className="btn btn-secondary" onClick={handleDownloadPDF} disabled={downloading}>
          <Download size={18} />
          {downloading ? "..." : "PDF"}
        </button>
        {invoice.customer.phone && (
          <button className="btn btn-secondary" onClick={handleShareWhatsApp}>
            <Share2 size={18} />
            WhatsApp
          </button>
        )}
        {invoice.pendingAmount > 0 && (
          <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>
            <CreditCard size={18} />
            Add Payment
          </button>
        )}
        <button className="btn btn-danger-ghost" onClick={handleDelete}>
          <Trash2 size={18} />
        </button>
      </div>

      {/* Customer Info */}
      <div className="card mb-4">
        <div className="customer-info-section">
          <div className="info-label">Customer</div>
          <div className="info-value">{invoice.customer.name}</div>
          {invoice.customer.phone && (
            <div className="info-sub">{invoice.customer.phone}</div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card mb-4">
        <h3 className="section-title mb-3">Items</h3>
        <div className="items-table">
          <div className="table-header">
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Total</span>
          </div>
          {invoice.items.map((item) => (
            <div key={item.id} className="table-row">
              <div className="item-name">{item.productName}</div>
              <div className="item-qty">{item.quantity} {item.unit}</div>
              <div className="item-price">{formatCurrency(item.price)}</div>
              <div className="item-subtotal">{formatCurrency(item.subtotal)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="card mb-4">
        <div className="totals-section">
          <div className="total-row">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {invoice.transportAmount > 0 && (
            <div className="total-row">
              <span>Transport</span>
              <span>{formatCurrency(invoice.transportAmount)}</span>
            </div>
          )}
          {invoice.taxAmount > 0 && (
            <div className="total-row">
              <span>Tax</span>
              <span>{formatCurrency(invoice.taxAmount)}</span>
            </div>
          )}
          <div className="total-row grand-total">
            <span>Total</span>
            <span>{formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div className="total-row">
            <span>Received</span>
            <span className="success">{formatCurrency(invoice.amountReceived)}</span>
          </div>
          {invoice.pendingAmount > 0 && (
            <div className="total-row pending">
              <span>Pending</span>
              <span>{formatCurrency(invoice.pendingAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="status-section">
        <span className={`badge ${invoice.pendingAmount > 0 ? "badge-warning" : "badge-success"}`}>
          {invoice.pendingAmount > 0 ? `Pending: ${formatCurrency(invoice.pendingAmount)}` : "Paid"}
        </span>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Payment</h2>
              <button className="icon-btn" onClick={() => setShowPaymentModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPayment}>
              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Enter amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={invoice.pendingAmount}
                  required
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Max: {formatCurrency(invoice.pendingAmount)}
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select
                  className="form-input"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
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
        .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .back-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main); text-decoration: none; }
        .action-buttons { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .action-buttons .btn { flex: 1; min-width: 100px; justify-content: center; }
        .btn-danger-ghost { background: transparent; color: var(--danger); border: 1px solid var(--danger); }
        .mb-4 { margin-bottom: 16px; }
        .customer-info-section { display: flex; flex-direction: column; gap: 4px; }
        .info-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }
        .info-value { font-size: 1.125rem; font-weight: 600; }
        .info-sub { font-size: 0.875rem; color: var(--text-muted); }
        .section-title { font-size: 1rem; font-weight: 600; }
        .mb-3 { margin-bottom: 12px; }
        .items-table { display: flex; flex-direction: column; gap: 8px; }
        .table-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
        .table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
        .table-row:last-child { border-bottom: none; }
        .item-name { font-weight: 500; }
        .item-qty { color: var(--text-muted); }
        .item-price { text-align: right; }
        .item-subtotal { text-align: right; font-weight: 600; }
        .totals-section { display: flex; flex-direction: column; gap: 8px; }
        .total-row { display: flex; justify-content: space-between; font-size: 0.9375rem; }
        .grand-total { font-weight: 700; font-size: 1.125rem; color: var(--primary); border-top: 2px solid var(--border); padding-top: 12px; margin-top: 8px; }
        .success { color: var(--success); }
        .pending { color: var(--danger); font-weight: 600; }
        .status-section { display: flex; justify-content: center; }
        .loading { text-align: center; padding: 40px; color: var(--text-muted); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
        .modal { background: var(--bg-card); border-radius: 16px; width: 100%; max-width: 400px; padding: 20px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .modal-header h2 { font-size: 1.25rem; font-weight: 600; }
        .modal-actions { display: flex; gap: 12px; margin-top: 20px; }
        .modal-actions .btn { flex: 1; }
      `}</style>
    </div>
  );
}