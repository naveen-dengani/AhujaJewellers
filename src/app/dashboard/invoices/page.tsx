"use client";

import { useState, useEffect, useCallback } from "react";
import { getInvoices, deleteInvoice } from "@/actions/invoices";
import { getCustomers } from "@/actions/customers";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  FileText,
  AlertTriangle,
  Filter,
} from "lucide-react";
import Link from "next/link";

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  amountReceived: number;
  pendingAmount: number;
  customer: { name: string; phone: string };
};

type Customer = {
  id: string;
  name: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [invoiceData, customerData] = await Promise.all([
        getInvoices(filterCustomer ? { customerId: filterCustomer } : undefined),
        getCustomers(),
      ]);
      setInvoices(invoiceData as Invoice[]);
      setCustomers(
        customerData.map((c) => ({ id: c.id, name: c.name }))
      );
    } catch {
      console.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [filterCustomer]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deletingInvoice) return;
    setSaving(true);
    try {
      await deleteInvoice(deletingInvoice.id);
      setShowDeleteModal(false);
      setDeletingInvoice(null);
      await loadData();
    } catch {
      console.error("Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">
            Manage all invoices ({invoices.length} total)
          </p>
        </div>
        <div className="header-actions">
          <Link href="/dashboard/invoices/new" className="btn btn-primary">
            <Plus size={18} />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-field">
          <label className="input-label" htmlFor="invoice-search">
            Search
          </label>
          <div className="search-container full-width">
            <Search size={16} className="search-icon" />
            <input
              id="invoice-search"
              className="input"
              placeholder="Search by invoice # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-field">
          <label className="input-label" htmlFor="invoice-customer-filter">
            Customer Filter
          </label>
          <div style={{ position: "relative" }}>
            <Filter
              size={16}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <select
              id="invoice-customer-filter"
              className="input"
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              style={{ paddingLeft: "2.5rem" }}
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div className="spinner" style={{ margin: "0 auto", borderTopColor: "var(--primary)" }} />
          <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>Loading invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <FileText size={28} />
          </div>
          <div className="empty-title">
            {search || filterCustomer
              ? "No invoices found"
              : "No invoices yet"}
          </div>
          <div className="empty-description">
            {search || filterCustomer
              ? "Try different filters"
              : "Create your first invoice to get started"}
          </div>
          {!search && !filterCustomer && (
            <Link
              href="/dashboard/invoices/new"
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              <Plus size={16} />
              Create Invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="table-container table-stack">
          <table className="table-stack">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Pending</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td data-label="Invoice #" style={{ fontWeight: 500 }}>
                    {invoice.invoiceNumber}
                  </td>
                  <td data-label="Date" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(invoice.invoiceDate)}
                  </td>
                  <td data-label="Customer">{invoice.customer.name}</td>
                  <td data-label="Total">{formatCurrency(invoice.totalAmount)}</td>
                  <td data-label="Paid" style={{ color: "var(--success)" }}>
                    {formatCurrency(invoice.amountReceived)}
                  </td>
                  <td data-label="Pending">{formatCurrency(invoice.pendingAmount)}</td>
                  <td data-label="Status">
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
                  <td data-label="Actions">
                    <div className="table-actions">
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="btn btn-ghost btn-icon"
                        title="View"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => {
                          setDeletingInvoice(invoice);
                          setShowDeleteModal(true);
                        }}
                        title="Delete"
                        style={{ color: "var(--danger)" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && deletingInvoice && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div
            className="modal-content confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon">
              <AlertTriangle size={28} />
            </div>
            <h3 className="confirm-title">Delete Invoice</h3>
            <p className="confirm-text">
              Are you sure you want to delete invoice{" "}
              <strong>{deletingInvoice.invoiceNumber}</strong>? This action
              cannot be undone.
            </p>
            <div className="confirm-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? <div className="spinner" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
