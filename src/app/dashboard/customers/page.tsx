"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCustomersWithBalance,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/actions/customers";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Users,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  pendingBalance: number;
  createdAt: Date;
  updatedAt: Date;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">("name");
  const [sortDesc, setSortDesc] = useState(true);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await getCustomersWithBalance();
      setCustomers(data as Customer[]);
    } catch {
      console.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  ).sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === "createdAt") {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      comparison = aDate - bDate;
    } else if (sortBy === "updatedAt") {
      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      comparison = aDate - bDate;
    }
    return sortDesc ? -comparison : comparison;
  });

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName("");
    setPhone("");
    setNotes("");
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone || "");
    setNotes(customer.notes || "");
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, { name, phone, notes });
      } else {
        await createCustomer({ name, phone, notes });
      }
      setShowModal(false);
      await loadCustomers();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save customer";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    setSaving(true);
    try {
      await deleteCustomer(deletingCustomer.id);
      setShowDeleteModal(false);
      setDeletingCustomer(null);
      await loadCustomers();
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
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">
            Manage your customer directory ({customers.length} total)
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="search-container" style={{ marginBottom: "1rem", maxWidth: "400px" }}>
        <Search size={16} className="search-icon" />
        <input
          className="input"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      

      {/* Table */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div className="spinner" style={{ margin: "0 auto", borderTopColor: "var(--primary)" }} />
          <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>Loading customers...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <Users size={28} />
          </div>
          <div className="empty-title">
            {search ? "No customers found" : "No customers yet"}
          </div>
          <div className="empty-description">
            {search
              ? "Try a different search term"
              : "Add your first customer to get started"}
          </div>
          {!search && (
            <button
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
              onClick={openCreateModal}
            >
              <Plus size={16} />
              Add Customer
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>
                  Name
                  <button
                    className="sort-icon-btn"
                    onClick={() => {
                      if (sortBy === "name") {
                        setSortDesc(!sortDesc);
                      } else {
                        setSortBy("name");
                        setSortDesc(true);
                      }
                    }}
                    title="Sort by name"
                  >
                    {sortBy === "name" ? (sortDesc ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowDown size={14} />}
                  </button>
                </th>
                <th>Phone</th>
                <th>Notes</th>
                <th>Pending Amount</th>
                <th>
                  Created
                  <button
                    className="sort-icon-btn"
                    onClick={() => {
                      if (sortBy === "createdAt") {
                        setSortDesc(!sortDesc);
                      } else {
                        setSortBy("createdAt");
                        setSortDesc(true);
                      }
                    }}
                    title="Sort by created date"
                  >
                    {sortBy === "createdAt" ? (sortDesc ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowDown size={14} />}
                  </button>
                </th>
                <th>
                  Modified
                  <button
                    className="sort-icon-btn"
                    onClick={() => {
                      if (sortBy === "updatedAt") {
                        setSortDesc(!sortDesc);
                      } else {
                        setSortBy("updatedAt");
                        setSortDesc(true);
                      }
                    }}
                    title="Sort by modified date"
                  >
                    {sortBy === "updatedAt" ? (sortDesc ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowDown size={14} />}
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => {
                return (
                  <tr key={customer.id}>
                    <td>
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        style={{
                          color: "var(--primary-light)",
                          textDecoration: "none",
                          fontWeight: 500,
                        }}
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {customer.phone}
                    </td>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {customer.notes || "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          customer.pendingBalance > 0 ? "badge-danger" : "badge-success"
                        }`}
                      >
                        {formatCurrency(customer.pendingBalance)}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {customer.createdAt ? formatDate(new Date(customer.createdAt)) : "—"}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {customer.updatedAt ? formatDate(new Date(customer.updatedAt)) : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => openEditModal(customer)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => {
                            setDeletingCustomer(customer);
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCustomer ? "Edit Customer" : "Add Customer"}
              </h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && (
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
                  {formError}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div className="input-group">
                  <label className="input-label" htmlFor="customer-name">
                    Name *
                  </label>
                  <input
                    id="customer-name"
                    className="input"
                    placeholder="Customer name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="customer-phone">
                    Phone
                  </label>
                  <input
                    id="customer-phone"
                    className="input"
                    placeholder="Phone number (optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="customer-notes">
                    Notes
                  </label>
                  <textarea
                    id="customer-notes"
                    className="input"
                    placeholder="Optional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <div className="spinner" />
                  ) : editingCustomer ? (
                    "Update"
                  ) : (
                    "Add Customer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && deletingCustomer && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="modal-content confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon">
              <AlertTriangle size={28} />
            </div>
            <h3 className="confirm-title">Delete Customer</h3>
            <p className="confirm-text">
              Are you sure you want to delete{" "}
              <strong>{deletingCustomer.name}</strong>? This will also delete
              all their invoices. This action cannot be undone.
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
