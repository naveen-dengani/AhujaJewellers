"use client";

import { useState, useEffect } from "react";
import { Plus, Search, FileText, Eye, Trash2, MoreVertical } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: { name: string };
  invoiceDate: string;
  totalAmount: number;
  pendingAmount: number;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error("Failed to fetch invoices", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(i => 
    i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    i.customer.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    
    try {
      await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      fetchInvoices();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Invoices</h1>
      </div>

      {/* Search & Add */}
      <div className="flex gap-2 mb-4">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link href="/dashboard/invoices/new" className="btn btn-primary">
          <Plus size={18} />
        </Link>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="loading">Loading...</div>
      ) : filteredInvoices.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <p className="empty-title">No invoices found</p>
        </div>
      ) : (
        <div className="card">
          {filteredInvoices.map((invoice) => (
            <Link 
              key={invoice.id} 
              href={`/dashboard/invoices/${invoice.id}`}
              className="invoice-item"
            >
              <div className="invoice-info">
                <div className="invoice-number">{invoice.invoiceNumber}</div>
                <div className="invoice-customer">{invoice.customer.name}</div>
                <div className="invoice-date">{formatDate(invoice.invoiceDate)}</div>
              </div>
              <div className="invoice-amounts">
                <div className="invoice-total">{formatCurrency(invoice.totalAmount)}</div>
                <span className={`badge ${invoice.pendingAmount > 0 ? "badge-warning" : "badge-success"}`}>
                  {invoice.pendingAmount > 0 ? formatCurrency(invoice.pendingAmount) : "Paid"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <style jsx>{`
        .flex { display: flex; }
        .gap-2 { gap: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .search-box { flex: 1; position: relative; }
        .search-input { padding-left: 40px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .invoice-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border); text-decoration: none; color: inherit; }
        .invoice-item:last-child { border-bottom: none; }
        .invoice-item:hover { background: var(--bg-base); margin: 0 -8px; padding: 14px 8px; border-radius: 8px; }
        .invoice-number { font-weight: 600; font-size: 1rem; }
        .invoice-customer { font-size: 0.875rem; color: var(--text-muted); margin-top: 2px; }
        .invoice-date { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .invoice-amounts { text-align: right; }
        .invoice-total { font-weight: 600; font-size: 1rem; }
        .loading { text-align: center; padding: 40px; color: var(--text-muted); }
      `}</style>
    </div>
  );
}