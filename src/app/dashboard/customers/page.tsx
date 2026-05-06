"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users, Phone, MoreVertical, Edit, Trash2, X } from "lucide-react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error("Failed to fetch customers", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";
      
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      setShowModal(false);
      setEditingCustomer(null);
      setFormData({ name: "", phone: "", notes: "" });
      fetchCustomers();
    } catch (err) {
      console.error("Failed to save customer", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    
    try {
      await fetch(`/api/customers/${id}`, { method: "DELETE" });
      fetchCustomers();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ name: customer.name, phone: customer.phone || "", notes: customer.notes || "" });
    setShowModal(true);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
      </div>

      {/* Search & Add */}
      <div className="flex gap-2 mb-4">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingCustomer(null); setFormData({ name: "", phone: "", notes: "" }); setShowModal(true); }}>
          <Plus size={18} />
        </button>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="loading">Loading...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p className="empty-title">No customers found</p>
        </div>
      ) : (
        <div className="card">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="customer-item">
              <Link href={`/dashboard/customers/${customer.id}`} className="customer-link">
                <div className="customer-info">
                  <div className="customer-name">{customer.name}</div>
                  {customer.phone && (
                    <div className="customer-phone">
                      <Phone size={14} /> {customer.phone}
                    </div>
                  )}
                </div>
              </Link>
              <div className="customer-actions">
                <button className="icon-btn ghost" onClick={() => openEdit(customer)}>
                  <Edit size={18} />
                </button>
                <button className="icon-btn ghost danger" onClick={() => handleDelete(customer.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCustomer ? "Edit Customer" : "Add Customer"}</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .flex { display: flex; }
        .gap-2 { gap: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .search-box { flex: 1; position: relative; }
        .search-input { padding-left: 40px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .customer-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border); }
        .customer-item:last-child { border-bottom: none; }
        .customer-link { flex: 1; text-decoration: none; color: inherit; }
        .customer-name { font-weight: 600; font-size: 1rem; }
        .customer-phone { display: flex; align-items: center; gap: 4px; font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px; }
        .customer-actions { display: flex; gap: 4px; }
        .danger { color: var(--danger) !important; }
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