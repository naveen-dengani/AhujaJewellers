"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { getCustomers } from "@/actions/customers";
import { getProducts } from "@/actions/products";
import {
  getInvoice,
  updateInvoice,
  getLastPurchasePrice,
} from "@/actions/invoices";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Package,
  Save,
  Loader2,
} from "lucide-react";
import Link from "next/link";

type Customer = { id: string; name: string; phone: string };
type Product = { id: string; name: string; defaultPrice: number };

type InvoiceItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  isNew: boolean;
};

type PriceSuggestion = {
  price: number;
  date: Date;
  customerName: string;
  itemId: string;
};

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Invoice form state
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [transportAmount, setTransportAmount] = useState("0");
  const [taxAmount, setTaxAmount] = useState("0");
  const [amountReceived, setAmountReceived] = useState("0");
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Product search
  const [activeItemSearch, setActiveItemSearch] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [suggestions, setSuggestions] = useState<
    Record<string, PriceSuggestion>
  >({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [invoice, customerData, productData] = await Promise.all([
        getInvoice(id),
        getCustomers(),
        getProducts(),
      ]);

      if (!invoice) {
        router.push("/dashboard/invoices");
        return;
      }

      setCustomers(
        customerData.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
      );
      setProducts(productData as Product[]);

      // Populate form from invoice
      setCustomerId(invoice.customerId);
      setInvoiceDate(formatDateInput(invoice.invoiceDate));
      setTransportAmount(invoice.transportAmount.toString());
      setTaxAmount(invoice.taxAmount.toString());
      setAmountReceived(invoice.amountReceived.toString());
      setItems(
        invoice.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          isNew: false,
        }))
      );
    } catch {
      setError("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setActiveItemSearch(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestion = useCallback(
    async (itemId: string, productId: string) => {
      if (!customerId || !productId) return;
      try {
        const result = await getLastPurchasePrice(customerId, productId);
        if (result) {
          setSuggestions((prev) => ({
            ...prev,
            [itemId]: { ...result, itemId },
          }));
        }
      } catch {
        // Ignore
      }
    },
    [customerId]
  );

  // Calculations
  const itemsSubtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const transport = parseFloat(transportAmount) || 0;
  const tax = parseFloat(taxAmount) || 0;
  const totalAmount = itemsSubtotal + transport + tax;
  const received = parseFloat(amountReceived) || 0;
  const pendingAmount = totalAmount - received;

  const updateItem = (itemId: string, updates: Partial<InvoiceItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  const selectProduct = (itemId: string, product: Product) => {
    updateItem(itemId, {
      productId: product.id,
      productName: product.name,
      price: product.defaultPrice,
      isNew: false,
    });
    setActiveItemSearch(null);
    setProductSearch("");
    fetchSuggestion(itemId, product.id);
  };

  const createNewProductItem = (itemId: string, name: string) => {
    updateItem(itemId, {
      productId: "",
      productName: name,
      price: 0,
      isNew: true,
    });
    setActiveItemSearch(null);
    setProductSearch("");
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: "",
        productName: "",
        quantity: 1,
        price: 0,
        isNew: false,
      },
    ]);
  };

  const removeItem = (itemId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const applySuggestedPrice = (itemId: string) => {
    const suggestion = suggestions[itemId];
    if (suggestion) {
      updateItem(itemId, { price: suggestion.price });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    const validItems = items.filter((item) => item.productName.trim());
    if (validItems.length === 0) {
      setError("Please add at least one item");
      return;
    }

    setSaving(true);
    try {
      await updateInvoice(id, {
        customerId,
        invoiceDate,
        transportAmount: transport,
        taxAmount: tax,
        amountReceived: received,
        items: validItems.map((item) => ({
          productId: item.productId || undefined,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          isNew: item.isNew,
        })),
      });
      router.push(`/dashboard/invoices/${id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update invoice";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <div
          className="spinner"
          style={{ margin: "0 auto", borderTopColor: "var(--primary)" }}
        />
        <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>
          Loading invoice...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href={`/dashboard/invoices/${id}`}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: "0.75rem" }}
        >
          <ArrowLeft size={16} /> Back to Invoice
        </Link>
        <h1 className="page-title">Edit Invoice</h1>
        <p className="page-subtitle">
          Update invoice details and items
        </p>
      </div>

      {error && (
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
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Customer & Date */}
            <div className="card">
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>
                Invoice Details
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="input-group">
                  <label className="input-label">Customer *</label>
                  <select
                    className="input"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                  >
                    <option value="">Select a customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Invoice Date</label>
                  <input
                    type="date"
                    className="input"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Items</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
                  <Plus size={14} /> Add Item
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "0.75rem", padding: "0 0 0.5rem", borderBottom: "1px solid var(--border)", marginBottom: "0.5rem" }}>
                <span className="input-label">Product</span>
                <span className="input-label">Qty</span>
                <span className="input-label">Price (₹)</span>
                <span className="input-label">Subtotal</span>
                <span></span>
              </div>

              {items.map((item) => (
                <div key={item.id}>
                  <div className="invoice-item-row">
                    <div className="combobox-container" ref={activeItemSearch === item.id ? dropdownRef : undefined}>
                      <input
                        className="input"
                        placeholder="Search or add product..."
                        value={activeItemSearch === item.id ? productSearch : item.productName}
                        onChange={(e) => { setProductSearch(e.target.value); setActiveItemSearch(item.id); }}
                        onFocus={() => { setActiveItemSearch(item.id); setProductSearch(item.productName); }}
                      />
                      {item.isNew && item.productName && (
                        <span className="badge badge-gold new-product-badge" style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.625rem" }}>NEW</span>
                      )}
                      {activeItemSearch === item.id && (
                        <div className="combobox-dropdown">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                              <div key={product.id} className={`combobox-option ${item.productId === product.id ? "selected" : ""}`} onClick={() => selectProduct(item.id, product)}>
                                <div style={{ fontWeight: 500 }}>{product.name}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Default: {formatCurrency(product.defaultPrice)}</div>
                              </div>
                            ))
                          ) : (
                            <div className="combobox-empty">No products found</div>
                          )}
                          {productSearch.trim() && !products.some((p) => p.name.toLowerCase() === productSearch.toLowerCase()) && (
                            <div className="combobox-create" onClick={() => createNewProductItem(item.id, productSearch.trim())}>
                              <Package size={14} />
                              <span>Add &quot;{productSearch.trim()}&quot; as new product</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <input type="number" className="input" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })} min="0.01" step="0.01" />
                    <input type="number" className="input" value={item.price} onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })} min="0" step="0.01" />
                    <div style={{ display: "flex", alignItems: "center", fontWeight: 500, fontSize: "0.875rem" }}>{formatCurrency(item.quantity * item.price)}</div>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeItem(item.id)} disabled={items.length <= 1} style={{ color: "var(--danger)" }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {suggestions[item.id] && (
                    <div className="suggestion-panel" style={{ margin: "0.5rem 0" }}>
                      <div className="suggestion-title"><Sparkles size={14} /> Smart Price Suggestion</div>
                      <div className="suggestion-text">Last sold to <strong>{suggestions[item.id].customerName}</strong> on {formatDate(suggestions[item.id].date)} at <strong>{formatCurrency(suggestions[item.id].price)}</strong></div>
                      <div className="suggestion-action" onClick={() => applySuggestedPrice(item.id)}>Click to use this price</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Amounts */}
            <div className="card">
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>Amounts</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div className="input-group">
                  <label className="input-label">Transport (₹)</label>
                  <input type="number" className="input" value={transportAmount} onChange={(e) => setTransportAmount(e.target.value)} min="0" step="0.01" />
                </div>
                <div className="input-group">
                  <label className="input-label">Tax (₹)</label>
                  <input type="number" className="input" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} min="0" step="0.01" />
                </div>
                <div className="input-group">
                  <label className="input-label">Amount Received (₹)</label>
                  <input type="number" className="input" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} min="0" step="0.01" />
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="card card-gold" style={{ position: "sticky", top: "1.5rem" }}>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>Invoice Summary</h3>
              <div className="invoice-totals">
                <div className="invoice-total-row"><span style={{ color: "var(--text-secondary)" }}>Items Subtotal</span><span>{formatCurrency(itemsSubtotal)}</span></div>
                <div className="invoice-total-row"><span style={{ color: "var(--text-secondary)" }}>Transport</span><span>{formatCurrency(transport)}</span></div>
                <div className="invoice-total-row"><span style={{ color: "var(--text-secondary)" }}>Tax</span><span>{formatCurrency(tax)}</span></div>
                <div className="invoice-total-row grand-total"><span>Total</span><span>{formatCurrency(totalAmount)}</span></div>
                <div className="invoice-total-row"><span style={{ color: "var(--text-secondary)" }}>Received</span><span style={{ color: "var(--success)" }}>{formatCurrency(received)}</span></div>
                <div className="invoice-total-row pending"><span>Pending</span><span>{formatCurrency(pendingAmount)}</span></div>
              </div>

              {items.some((item) => item.isNew && item.productName) && (
                <div style={{ background: "rgba(184, 134, 11, 0.08)", border: "1px solid rgba(184, 134, 11, 0.15)", borderRadius: "var(--radius-md)", padding: "0.75rem", marginTop: "1rem", fontSize: "0.8125rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary-light)", fontWeight: 600, marginBottom: "0.375rem" }}><Package size={14} /> New Products</div>
                  <div style={{ color: "var(--text-secondary)" }}>Will be added to catalog:</div>
                  <ul style={{ marginTop: "0.375rem", paddingLeft: "1rem", color: "var(--text-primary)" }}>
                    {items.filter((item) => item.isNew && item.productName).map((item) => (
                      <li key={item.id}>{item.productName} ({formatCurrency(item.price)})</li>
                    ))}
                  </ul>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ width: "100%", marginTop: "1.5rem" }}>
                {saving ? (<><Loader2 size={18} /> Saving...</>) : (<><Save size={18} /> Update Invoice</>)}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
