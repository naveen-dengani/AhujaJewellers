"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/actions/products";
import { formatCurrency, type SimilarProduct } from "@/lib/utils";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Package,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  unit: string | null;
  defaultPrice: number;
  description: string | null;
  createdAt: Date;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  const PREDEFINED_UNITS = ["piece", "line", "dozen", "kg"];

  // Similar products state
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [pendingProductData, setPendingProductData] = useState<{
    name: string;
    unit: string | undefined;
    defaultPrice: number | string;
    description: string | undefined;
  } | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const data = await getProducts();
      setProducts(data as Product[]);
    } catch {
      console.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingProduct(null);
    setName("");
    setUnit("");
    setCustomUnit("");
    setDefaultPrice("");
    setDescription("");
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    const isCustom = product.unit && !PREDEFINED_UNITS.includes(product.unit);
    setUnit(isCustom ? "custom" : (product.unit || ""));
    setCustomUnit(isCustom ? (product.unit || "") : "");
    setDefaultPrice(product.defaultPrice.toString());
    setDescription(product.description || "");
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    try {
      const finalUnit = unit === "custom" ? customUnit : (unit || undefined);
      const data = {
        name,
        unit: finalUnit,
        defaultPrice: parseFloat(defaultPrice) || 0,
        description: description || undefined,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
        setShowModal(false);
        await loadProducts();
      } else {
        const result = await createProduct(data);

        if (result.similarProducts && result.similarProducts.length > 0) {
          setSimilarProducts(result.similarProducts);
          setPendingProductData({
            name: data.name,
            unit: data.unit,
            defaultPrice: data.defaultPrice,
            description: data.description,
          });
          setShowSimilarModal(true);
        } else {
          setShowModal(false);
          await loadProducts();
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save product";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDespiteSimilar = async () => {
    if (!pendingProductData) return;
    setSaving(true);
    try {
      await createProduct(pendingProductData as { name: string; unit?: string; defaultPrice: number; description?: string });
      setShowSimilarModal(false);
      setSimilarProducts([]);
      setPendingProductData(null);
      setShowModal(false);
      await loadProducts();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save product";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSimilar = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      const isCustom = product.unit && !PREDEFINED_UNITS.includes(product.unit);
      setUnit(isCustom ? "custom" : (product.unit || ""));
      setCustomUnit(isCustom ? (product.unit || "") : "");
      setDefaultPrice(product.defaultPrice.toString());
      setDescription(product.description || "");
      setShowSimilarModal(false);
      setSimilarProducts([]);
      setPendingProductData(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setSaving(true);
    try {
      await deleteProduct(deletingProduct.id);
      setShowDeleteModal(false);
      setDeletingProduct(null);
      await loadProducts();
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
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">
            Manage your product catalog ({products.length} items)
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="filter-bar" style={{ marginBottom: "1rem" }}>
        <div className="filter-field">
          <label className="input-label" htmlFor="product-search">
            Search
          </label>
          <div className="search-container full-width">
            <Search size={16} className="search-icon" />
            <input
              id="product-search"
              className="input"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div className="spinner" style={{ margin: "0 auto", borderTopColor: "var(--primary)" }} />
          <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <Package size={28} />
          </div>
          <div className="empty-title">
            {search ? "No products found" : "No products yet"}
          </div>
          <div className="empty-description">
            {search
              ? "Try a different search term"
              : "Add products to your catalog or they'll be created automatically during invoicing"}
          </div>
          {!search && (
            <button
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
              onClick={openCreateModal}
            >
              <Plus size={16} />
              Add Product
            </button>
          )}
        </div>
      ) : (
        <div className="table-container table-stack">
          <table className="table-stack">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Unit</th>
                <th>Default Price</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td data-label="Product Name" style={{ fontWeight: 500 }}>{product.name}</td>
                  <td data-label="Unit">{product.unit || "—"}</td>
                  <td data-label="Default Price">
                    <span className="badge badge-gold">
                      {formatCurrency(product.defaultPrice)}
                    </span>
                  </td>
                  <td
                    data-label="Description"
                    style={{
                      color: "var(--text-muted)",
                      maxWidth: "250px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {product.description || "—"}
                  </td>
                  <td data-label="Actions">
                    <div className="table-actions">
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => openEditModal(product)}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => {
                          setDeletingProduct(product);
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingProduct ? "Edit Product" : "Add Product"}
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

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="product-name">
                    Product Name *
                  </label>
                  <input
                    id="product-name"
                    className="input"
                    placeholder="e.g., Gold Chain 22K"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="product-unit">
                    Unit
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      id="product-unit"
                      className="input"
                      value={unit}
                      onChange={(e) => {
                        setUnit(e.target.value);
                        if (e.target.value !== "custom") setCustomUnit("");
                      }}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select unit</option>
                      {PREDEFINED_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                      <option value="custom">Other (custom)</option>
                    </select>
                    {unit === "custom" && (
                      <input
                        className="input"
                        placeholder="Enter unit"
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        style={{ flex: 1 }}
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="product-price">
                    Default Price (₹)
                  </label>
                  <input
                    id="product-price"
                    type="number"
                    className="input"
                    placeholder="0.00"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="product-desc">
                    Description
                  </label>
                  <textarea
                    id="product-desc"
                    className="input"
                    placeholder="Optional description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                  ) : editingProduct ? (
                    "Update"
                  ) : (
                    "Add Product"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Similar Products Warning */}
      {showSimilarModal && (
        <div className="modal-overlay" onClick={() => setShowSimilarModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Similar Products Found</h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowSimilarModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: "rgba(184, 134, 11, 0.1)",
                border: "1px solid rgba(184, 134, 11, 0.2)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <AlertCircle size={20} style={{ color: "var(--primary-light)" }} />
              <span style={{ color: "var(--text-primary)", fontSize: "0.875rem" }}>
                We found similar products in your catalog:
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {similarProducts.map((product) => (
                <div
                  key={product.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem",
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{product.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {product.similarity}% match
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSelectSimilar(product.id)}
                  >
                    Use This
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-footer" style={{ marginTop: "1.5rem" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowSimilarModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddDespiteSimilar}
                disabled={saving}
              >
                {saving ? <div className="spinner" /> : "Add Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && deletingProduct && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div
            className="modal-content confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon">
              <AlertTriangle size={28} />
            </div>
            <h3 className="confirm-title">Delete Product</h3>
            <p className="confirm-text">
              Are you sure you want to delete{" "}
              <strong>{deletingProduct.name}</strong>? This action cannot be
              undone.
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
