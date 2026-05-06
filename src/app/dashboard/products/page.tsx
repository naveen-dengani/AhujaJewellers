"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Package, Edit, Trash2, X, AlertTriangle } from "lucide-react";
import { calculateSimilarity } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  unit: string | null;
  defaultPrice: number;
  description: string | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: "", unit: "", defaultPrice: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Failed to fetch products", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Check for similar products when name changes
  useEffect(() => {
    if (formData.name && !editingProduct) {
      const similar = products.filter(p => 
        calculateSimilarity(formData.name, p.name) >= 75
      );
      setSimilarProducts(similar);
    } else {
      setSimilarProducts([]);
    }
  }, [formData.name, products, editingProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";
      
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          unit: formData.unit || null,
          defaultPrice: parseFloat(formData.defaultPrice) || 0,
          description: formData.description || null,
        }),
      });

      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: "", unit: "", defaultPrice: "", description: "" });
      fetchProducts();
    } catch (err) {
      console.error("Failed to save product", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      fetchProducts();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ 
      name: product.name, 
      unit: product.unit || "", 
      defaultPrice: product.defaultPrice.toString(), 
      description: product.description || "" 
    });
    setShowModal(true);
  };

  const unitOptions = ["piece", "gram", "kg", "dozen", "pair", "set", "meter"];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Products</h1>
      </div>

      {/* Search & Add */}
      <div className="flex gap-2 mb-4">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setFormData({ name: "", unit: "", defaultPrice: "", description: "" }); setShowModal(true); }}>
          <Plus size={18} />
        </button>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="loading">Loading...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p className="empty-title">No products found</p>
        </div>
      ) : (
        <div className="card">
          {filteredProducts.map((product) => (
            <div key={product.id} className="product-item">
              <div className="product-info">
                <div className="product-name">{product.name}</div>
                <div className="product-details">
                  {product.unit && <span className="product-unit">{product.unit}</span>}
                  <span className="product-price">₹{product.defaultPrice.toLocaleString()}</span>
                </div>
              </div>
              <div className="product-actions">
                <button className="icon-btn ghost" onClick={() => openEdit(product)}>
                  <Edit size={18} />
                </button>
                <button className="icon-btn ghost danger" onClick={() => handleDelete(product.id)}>
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
              <h2>{editingProduct ? "Edit Product" : "Add Product"}</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Similar Products Warning */}
            {similarProducts.length > 0 && (
              <div className="similar-warning">
                <AlertTriangle size={18} />
                <span>Similar products exist: {similarProducts.map(p => p.name).join(", ")}</span>
              </div>
            )}

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
                <label className="form-label">Unit</label>
                <select
                  className="form-input"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="">Select unit</option>
                  {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Default Price</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.defaultPrice}
                  onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        .product-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border); }
        .product-item:last-child { border-bottom: none; }
        .product-name { font-weight: 600; font-size: 1rem; }
        .product-details { display: flex; gap: 12px; margin-top: 4px; }
        .product-unit { font-size: 0.8125rem; color: var(--text-muted); text-transform: capitalize; }
        .product-price { font-size: 0.8125rem; color: var(--primary); font-weight: 600; }
        .product-actions { display: flex; gap: 4px; }
        .danger { color: var(--danger) !important; }
        .loading { text-align: center; padding: 40px; color: var(--text-muted); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
        .modal { background: var(--bg-card); border-radius: 16px; width: 100%; max-width: 400px; padding: 20px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .modal-header h2 { font-size: 1.25rem; font-weight: 600; }
        .modal-actions { display: flex; gap: 12px; margin-top: 20px; }
        .modal-actions .btn { flex: 1; }
        .similar-warning { display: flex; align-items: center; gap: 8px; padding: 12px; background: rgba(202, 138, 4, 0.1); border-radius: 8px; font-size: 0.8125rem; color: var(--warning); margin-bottom: 16px; }
      `}</style>
    </div>
  );
}