"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCustomers, createCustomer } from "@/actions/customers";
import { getProducts, checkSimilarProducts } from "@/actions/products";
import { createInvoice, getLastPurchasePrice } from "@/actions/invoices";
import { formatCurrency, formatDate, formatDateInput, type SimilarProduct } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Package,
  Save,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import Link from "next/link";

type Customer = { id: string; name: string; phone: string | null };
type Product = { id: string; name: string; unit: string | null; defaultPrice: number };

const PREDEFINED_UNITS = ["piece", "line", "dozen", "kg"];

type InvoiceItem = {
  id: string;
  productId: string;
  productName: string;
  unit: string;
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

export default function NewInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Invoice form state
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerNotes, setNewCustomerNotes] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(formatDateInput(new Date()));
  const [transportAmount, setTransportAmount] = useState("0");
  const [taxAmount, setTaxAmount] = useState("0");
  const [amountReceived, setAmountReceived] = useState("0");
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: crypto.randomUUID(),
      productId: "",
      productName: "",
      unit: "",
      quantity: 1,
      price: 0,
      isNew: false,
    },
  ]);

  // Product search state per item
  const [activeItemSearch, setActiveItemSearch] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, PriceSuggestion>>({});
  const [similarProductsWarning, setSimilarProductsWarning] = useState<{
    itemId: string;
    productName: string;
    similar: SimilarProduct[];
  } | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusedItemId) {
      setTimeout(() => {
        const input = document.querySelector(`[data-item-id="${focusedItemId}"]`) as HTMLInputElement;
        if (input) {
          input.focus();
        }
        setFocusedItemId(null);
      }, 0);
    }
  }, [focusedItemId]);

  const loadData = useCallback(async () => {
    try {
      const [customerData, productData] = await Promise.all([
        getCustomers(),
        getProducts(),
      ]);
      setCustomers(customerData.map((c) => ({ id: c.id, name: c.name, phone: c.phone })));
      setProducts(productData as Product[]);
    } catch {
      console.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveItemSearch(null);
      }
      const target = e.target as HTMLElement;
      if (!target.closest(".customer-combobox")) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter customers based on search
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
  );

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Fetch price suggestion when product and customer selected
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
        // Ignore suggestion errors
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

  const updateItem = (id: string, updates: Partial<InvoiceItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const selectProduct = (itemId: string, product: Product) => {
    updateItem(itemId, {
      productId: product.id,
      productName: product.name,
      unit: product.unit || "",
      price: product.defaultPrice,
      isNew: false,
    });
    setActiveItemSearch(null);
    setProductSearch("");
    fetchSuggestion(itemId, product.id);
  };

  const createNewProductItem = async (itemId: string, name: string) => {
    const similar = await checkSimilarProducts(name);

    if (similar.length > 0) {
      setSimilarProductsWarning({
        itemId,
        productName: name,
        similar,
      });
      return;
    }

    updateItem(itemId, {
      productId: "",
      productName: name,
      unit: "",
      price: 0,
      isNew: true,
    });
    setActiveItemSearch(null);
    setProductSearch("");
  };

  const handleAddNewProductAnyway = () => {
    if (!similarProductsWarning) return;
    updateItem(similarProductsWarning.itemId, {
      productId: "",
      productName: similarProductsWarning.productName,
      price: 0,
      isNew: true,
    });
    setSimilarProductsWarning(null);
    setActiveItemSearch(null);
    setProductSearch("");
  };

  const handleUseSimilarProduct = (product: Product) => {
    if (!similarProductsWarning) return;
    updateItem(similarProductsWarning.itemId, {
      productId: product.id,
      productName: product.name,
      price: product.defaultPrice,
      isNew: false,
    });
    setSimilarProductsWarning(null);
    setActiveItemSearch(null);
    setProductSearch("");
  };

  const addItem = () => {
    const newId = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        productId: "",
        productName: "",
        unit: "",
        quantity: 1,
        price: 0,
        isNew: false,
      },
    ]);
    setFocusedItemId(newId);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
      setError("Please select or add a customer");
      return;
    }

    const validItems = items.filter((item) => item.productName.trim());
    if (validItems.length === 0) {
      setError("Please add at least one item");
      return;
    }

    setSaving(true);
    try {
      const result = await createInvoice({
        customerId,
        invoiceDate,
        transportAmount: transport,
        taxAmount: tax,
        amountReceived: received,
        items: validItems.map((item) => ({
          productId: item.productId || undefined,
          productName: item.productName,
          unit: item.unit && item.unit !== "OTHER" ? item.unit : null,
          quantity: item.quantity,
          price: item.price,
          isNew: item.isNew,
        })),
      });
      router.push(`/dashboard/invoices/${result.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create invoice";
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
        <div className="spinner" style={{ margin: "0 auto", borderTopColor: "var(--primary)" }} />
        <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/dashboard/invoices"
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: "0.75rem" }}
        >
          <ArrowLeft size={16} /> Back to Invoices
        </Link>
        <h1 className="page-title">Create New Invoice</h1>
        <p className="page-subtitle">
          Add items, set pricing, and create a new invoice
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
          {/* Left Column - Invoice Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Customer & Date */}
            <div className="card">
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>
                Invoice Details
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="invoice-customer">
                    Customer
                  </label>
                  <div className="customer-combobox" style={{ position: "relative" }}>
                    <input
                      id="invoice-customer"
                      className="input"
                      placeholder="Search customer..."
                      value={showCustomerDropdown ? customerSearch : (selectedCustomer?.name || "")}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => {
                        setCustomerSearch(selectedCustomer?.name || "");
                        setShowCustomerDropdown(true);
                      }}
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div
                        className="combobox-dropdown"
                        style={{ maxHeight: "200px" }}
                      >
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className={`combobox-option ${customerId === customer.id ? "selected" : ""}`}
                            onClick={() => {
                              setCustomerId(customer.id);
                              setCustomerSearch(customer.name);
                              setShowCustomerDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: 500 }}>{customer.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {customer.phone || "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {showCustomerDropdown && filteredCustomers.length === 0 && customerSearch && (
                      <div className="combobox-dropdown">
                        <div
                          className="combobox-option"
                          onClick={() => {
                            setShowAddCustomer(true);
                            setShowCustomerDropdown(false);
                          }}
                          style={{ color: "var(--primary)", fontWeight: 500 }}
                        >
                          + Add New Customer
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="invoice-date">
                    Invoice Date
                  </label>
                  <input
                    id="invoice-date"
                    type="date"
                    className="input"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>

                {showAddCustomer && (
                  <div className="card" style={{ backgroundColor: "var(--surface-raised)", marginTop: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
                        Add New Customer
                      </h3>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => setShowAddCustomer(false)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div className="input-group">
                        <label className="input-label" htmlFor="new-customer-name">
                          Name *
                        </label>
                        <input
                          id="new-customer-name"
                          className="input"
                          placeholder="Customer name"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label" htmlFor="new-customer-phone">
                          Phone (optional)
                        </label>
                        <input
                          id="new-customer-phone"
                          className="input"
                          placeholder="Phone number"
                          value={newCustomerPhone}
                          onChange={(e) => setNewCustomerPhone(e.target.value)}
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label" htmlFor="new-customer-notes">
                          Notes (optional)
                        </label>
                        <textarea
                          id="new-customer-notes"
                          className="input"
                          placeholder="Any notes..."
                          value={newCustomerNotes}
                          onChange={(e) => setNewCustomerNotes(e.target.value)}
                          rows={2}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={async () => {
                          if (!newCustomerName.trim()) {
                            setError("Customer name is required");
                            return;
                          }
                          setAddingCustomer(true);
                          setError("");
                          try {
                            const newCustomer = await createCustomer({
                              name: newCustomerName.trim(),
                              phone: newCustomerPhone.trim() || undefined,
                              notes: newCustomerNotes.trim() || undefined,
                            });
                            setCustomerId(newCustomer.id);
                            setCustomerSearch(newCustomer.name);
                            setCustomers((prev) => [...prev, { id: newCustomer.id, name: newCustomer.name, phone: newCustomerPhone }]);
                            setShowAddCustomer(false);
                            setNewCustomerName("");
                            setNewCustomerPhone("");
                            setNewCustomerNotes("");
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Failed to create customer");
                          } finally {
                            setAddingCustomer(false);
                          }
                        }}
                        disabled={addingCustomer}
                      >
                        {addingCustomer ? <Loader2 size={16} className="animate-spin" /> : "Add Customer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
                  Items
                </h3>
                </div>

              {/* Item Header - hidden on mobile */}
              <div
                className="invoice-header-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 0.7fr 1fr 1fr auto",
                  gap: "0.75rem",
                  padding: "0 0 0.5rem",
                  borderBottom: "1px solid var(--border)",
                  marginBottom: "0.5rem",
                }}
              >
                <span className="input-label">Product</span>
                <span className="input-label">Unit</span>
                <span className="input-label">Qty</span>
                <span className="input-label">Price (₹)</span>
                <span className="input-label">Subtotal</span>
                <span></span>
              </div>

              {/* Item Rows */}
              {items.map((item) => (
                <div key={item.id}>
                  <div className="invoice-item-row">
                    {/* Product select with combobox */}
                    <div className="combobox-container" ref={activeItemSearch === item.id ? dropdownRef : undefined}>
                      <input
                        className="input"
                        placeholder="Search or add product..."
                        data-item-id={item.id}
                        value={
                          activeItemSearch === item.id
                            ? productSearch
                            : item.productName
                        }
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setActiveItemSearch(item.id);
                        }}
                        onFocus={() => {
                          setActiveItemSearch(item.id);
                          setProductSearch(item.productName);
                        }}
                      />
                      {item.isNew && item.productName && (
                        <span
                          className="badge badge-gold new-product-badge"
                          style={{
                            position: "absolute",
                            right: "0.5rem",
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: "0.625rem",
                          }}
                        >
                          NEW
                        </span>
                      )}

                      {activeItemSearch === item.id && (
                        <div className="combobox-dropdown">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                              <div
                                key={product.id}
                                className={`combobox-option ${item.productId === product.id ? "selected" : ""}`}
                                onClick={() => selectProduct(item.id, product)}
                              >
                                <div style={{ fontWeight: 500 }}>
                                  {product.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  Default: {formatCurrency(product.defaultPrice)}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="combobox-empty">
                              No products found
                            </div>
                          )}

                          {/* Add new product option */}
                          {productSearch.trim() &&
                            !products.some(
                              (p) =>
                                p.name.toLowerCase() ===
                                productSearch.toLowerCase()
                            ) && (
                              <div
                                className="combobox-create"
                                onClick={() =>
                                  createNewProductItem(
                                    item.id,
                                    productSearch.trim()
                                  )
                                }
                              >
                                <Package size={14} />
                                <span>
                                  Add &quot;{productSearch.trim()}&quot; as new
                                  product
                                </span>
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Unit */}
                    <div style={{ display: "flex", gap: "0.25rem", width: "100%" }}>
                      <select
                        className="input"
                        value={
                          item.unit && !PREDEFINED_UNITS.includes(item.unit)
                            ? "custom"
                            : item.unit
                        }
                        onChange={(e) => {
                          if (e.target.value === "custom") {
                            updateItem(item.id, { unit: "OTHER" });
                          } else {
                            updateItem(item.id, { unit: e.target.value });
                          }
                        }}
                        style={{ 
                          padding: "0.375rem",
                          width: "100%",
                          minWidth: "70px",
                        }}
                      >
                        <option value="">-</option>
                        {PREDEFINED_UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                        <option value="custom">Other</option>
                      </select>
                      {(item.unit === "OTHER" || (item.unit && !PREDEFINED_UNITS.includes(item.unit))) && (
                        <input
                          className="input"
                          value={item.unit === "OTHER" ? "" : item.unit}
                          onChange={(e) =>
                            updateItem(item.id, { unit: e.target.value })
                          }
                          placeholder="Unit"
                          style={{ padding: "0.375rem", minWidth: "60px" }}
                        />
                      )}
                    </div>

                    {/* Quantity */}
                    <input
                      type="number"
                      className="input"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, {
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      min="0.01"
                      step="0.01"
                    />

                    {/* Price */}
                    <input
                      type="number"
                      className="input"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(item.id, {
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      min="0"
                      step="0.01"
                    />

                    {/* Subtotal */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                      }}
                    >
                      {formatCurrency(item.quantity * item.price)}
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Price suggestion */}
                  {suggestions[item.id] && (
                    <div className="suggestion-panel" style={{ margin: "0.5rem 0" }}>
                      <div className="suggestion-title">
                        <Sparkles size={14} />
                        Smart Price Suggestion
                      </div>
                      <div className="suggestion-text">
                        Last sold to{" "}
                        <strong>{suggestions[item.id].customerName}</strong> on{" "}
                        {formatDate(suggestions[item.id].date)} at{" "}
                        <strong>
                          {formatCurrency(suggestions[item.id].price)}
                        </strong>
                      </div>
                      <div
                        className="suggestion-action"
                        onClick={() => applySuggestedPrice(item.id)}
                      >
                        Click to use this price
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addItem}
                style={{ marginTop: "0.75rem" }}
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>

            {/* Amounts */}
            <div className="card">
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>
                Amounts
              </h3>
              <div
                className="invoice-amounts-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "1rem",
                }}
              >
                <div className="input-group">
                  <label className="input-label">Transport (₹)</label>
                  <input
                    type="number"
                    className="input"
                    value={transportAmount}
                    onChange={(e) => setTransportAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Tax (₹)</label>
                  <input
                    type="number"
                    className="input"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Amount Received (₹)</label>
                  <input
                    type="number"
                    className="input"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div>
            <div className="card card-gold" style={{ position: "sticky", top: "1.5rem" }}>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>
                Invoice Summary
              </h3>

              <div className="invoice-totals">
                <div className="invoice-total-row">
                  <span style={{ color: "var(--text-secondary)" }}>
                    Items Subtotal
                  </span>
                  <span>{formatCurrency(itemsSubtotal)}</span>
                </div>
                <div className="invoice-total-row">
                  <span style={{ color: "var(--text-secondary)" }}>
                    Transport
                  </span>
                  <span>{formatCurrency(transport)}</span>
                </div>
                <div className="invoice-total-row">
                  <span style={{ color: "var(--text-secondary)" }}>Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="invoice-total-row grand-total">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <div className="invoice-total-row">
                  <span style={{ color: "var(--text-secondary)" }}>
                    Amount Received
                  </span>
                  <span style={{ color: "var(--success)" }}>
                    {formatCurrency(received)}
                  </span>
                </div>
                <div className="invoice-total-row pending">
                  <span>Pending</span>
                  <span>{formatCurrency(pendingAmount)}</span>
                </div>
              </div>

              {/* New products notice */}
              {items.some((item) => item.isNew && item.productName) && (
                <div
                  style={{
                    background: "rgba(184, 134, 11, 0.08)",
                    border: "1px solid rgba(184, 134, 11, 0.15)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.75rem",
                    marginTop: "1rem",
                    fontSize: "0.8125rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "var(--primary-light)",
                      fontWeight: 600,
                      marginBottom: "0.375rem",
                    }}
                  >
                    <Package size={14} />
                    New Products
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    The following products will be added to your catalog:
                  </div>
                  <ul
                    style={{
                      marginTop: "0.375rem",
                      paddingLeft: "1rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {items
                      .filter((item) => item.isNew && item.productName)
                      .map((item) => (
                        <li key={item.id}>
                          {item.productName} ({formatCurrency(item.price)})
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={saving}
                style={{ width: "100%", marginTop: "1.5rem" }}
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="spinner" style={{ border: "none" }} />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Create Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Similar Products Warning Modal */}
      {similarProductsWarning && (
        <div className="modal-overlay" onClick={() => setSimilarProductsWarning(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Similar Products Found</h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSimilarProductsWarning(null)}
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
                Similar products already exist in your catalog:
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {similarProductsWarning.similar.slice(0, 3).map((product) => {
                const matchedProduct = products.find((p) => p.id === product.id);
                return (
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
                        {matchedProduct && ` • Default price: ${formatCurrency(matchedProduct.defaultPrice)}`}
                      </div>
                    </div>
                    {matchedProduct && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleUseSimilarProduct(matchedProduct)}
                      >
                        Use This
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="modal-footer" style={{ marginTop: "1.5rem" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSimilarProductsWarning(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddNewProductAnyway}
              >
                Add as New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
