"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ChevronDown, Trash2, ArrowLeft, Save, Loader2 } from "lucide-react";
import { formatCurrency, calculateSimilarity } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface Product {
  id: string;
  name: string;
  unit: string | null;
  defaultPrice: number;
}

interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [transportAmount, setTransportAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);

  // Add item form
  const [newItemProduct, setNewItemProduct] = useState<Product | null>(null);
  const [newItemSearch, setNewItemSearch] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [showNewProductInput, setShowNewProductInput] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [showSimilarWarning, setShowSimilarWarning] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [customersRes, productsRes, invoiceRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/products"),
        fetch(`/api/invoices/${id}`),
      ]);

      const customersData = await customersRes.json();
      const productsData = await productsRes.json();
      const invoiceData = await invoiceRes.json();

      setCustomers(customersData);
      setProducts(productsData);

      if (invoiceData) {
        setInvoiceNumber(invoiceData.invoiceNumber);
        setInvoiceDate(invoiceData.invoiceDate.split('T')[0]);
        setSelectedCustomer(invoiceData.customer);
        setItems(invoiceData.items.map((i: any) => ({
          id: i.id,
          productId: i.productId || "new-" + i.id,
          productName: i.productName,
          unit: i.unit || "",
          quantity: i.quantity,
          price: i.price,
          subtotal: i.subtotal,
        })));
        setTransportAmount(invoiceData.transportAmount?.toString() || "");
        setTaxAmount(invoiceData.taxAmount?.toString() || "");
        setAmountReceived(invoiceData.amountReceived?.toString() || "");
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(newItemSearch.toLowerCase())
    );
  }, [products, newItemSearch]);

  useEffect(() => {
    if (newProductName && !newItemProduct) {
      const similar = products.filter(p => 
        calculateSimilarity(newProductName, p.name) >= 75
      );
      setShowSimilarWarning(similar.length > 0);
    } else {
      setShowSimilarWarning(false);
    }
  }, [newProductName, products, newItemProduct]);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const transport = parseFloat(transportAmount) || 0;
  const tax = parseFloat(taxAmount) || 0;
  const total = subtotal + transport + tax;
  const received = parseFloat(amountReceived) || 0;
  const pending = total - received;

  const addItem = () => {
    if (!newItemProduct && !newProductName) return;

    const qty = parseFloat(newItemQty) || 1;
    const price = parseFloat(newItemPrice) || newItemProduct?.defaultPrice || 0;
    const subtotalVal = qty * price;
    const unit = newItemProduct?.unit || newItemUnit;

    if (newItemProduct) {
      setItems([...items, {
        id: "new-" + Date.now(),
        productId: newItemProduct.id,
        productName: newItemProduct.name,
        unit: unit,
        quantity: qty,
        price,
        subtotal: subtotalVal
      }]);
    } else {
      setItems([...items, {
        id: "new-" + Date.now(),
        productId: "new-" + Date.now(),
        productName: newProductName,
        unit: newItemUnit,
        quantity: qty,
        price,
        subtotal: subtotalVal
      }]);
    }

    setNewItemProduct(null);
    setNewItemSearch("");
    setNewItemUnit("");
    setNewItemQty("1");
    setNewItemPrice("");
    setShowAddItem(false);
    setShowNewProductInput(false);
    setNewProductName("");
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer || items.length === 0) {
      alert("Please select a customer and add at least one item");
      return;
    }

    setSaving(true);

    try {
      await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          invoiceDate,
          items: items.map(i => ({
            id: i.id.startsWith("new-") ? null : i.id,
            productId: i.productId.startsWith("new-") ? null : i.productId,
            productName: i.productName,
            unit: i.unit,
            quantity: i.quantity,
            price: i.price,
            subtotal: i.subtotal,
          })),
          transportAmount: transport,
          taxAmount: tax,
          totalAmount: total,
          amountReceived: received,
          pendingAmount: pending,
        }),
      });

      router.push(`/dashboard/invoices/${id}`);
    } catch (err) {
      console.error("Failed to update invoice", err);
      alert("Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="page-title">Edit Invoice</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card mb-4">
          <div className="form-group">
            <label className="form-label">Invoice Number</label>
            <div className="invoice-number-display">{invoiceNumber}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
        </div>

        <div className="card mb-4">
          <label className="form-label">Customer *</label>
          <div className="combobox-container">
            <div 
              className="combobox-trigger"
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
            >
              <span>{selectedCustomer?.name || "Select customer"}</span>
              <ChevronDown size={18} />
            </div>
            {showCustomerDropdown && (
              <div className="combobox-dropdown">
                <div className="combobox-search">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="combobox-options">
                  {filteredCustomers.length === 0 ? (
                    <div className="combobox-empty">No customers</div>
                  ) : (
                    filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        className="combobox-option"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerDropdown(false);
                          setCustomerSearch("");
                        }}
                      >
                        <div>{c.name}</div>
                        {c.phone && <div className="combobox-option-sub">{c.phone}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card mb-4">
          <div className="section-header">
            <h3 className="section-title">Items</h3>
            <button 
              type="button" 
              className="btn btn-sm btn-secondary"
              onClick={() => setShowAddItem(true)}
            >
              <Plus size={16} /> Add
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty-state" style={{ padding: "20px" }}>
              <p>No items added</p>
            </div>
          ) : (
            <div className="items-list">
              {items.map((item) => (
                <div key={item.id} className="item-row">
                  <div className="item-info">
                    <div className="item-name">{item.productName}</div>
                    <div className="item-details">
                      {item.quantity} × {formatCurrency(item.price)} {item.unit && `(${item.unit})`}
                    </div>
                  </div>
                  <div className="item-right">
                    <div className="item-subtotal">{formatCurrency(item.subtotal)}</div>
                    <button 
                      type="button"
                      className="icon-btn ghost danger"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAddItem && (
          <div className="modal-overlay" onClick={() => setShowAddItem(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add Item</h2>
                <button className="icon-btn" onClick={() => setShowAddItem(false)}>
                  <X size={20} />
                </button>
              </div>

              {showSimilarWarning && (
                <div className="similar-warning">
                  Similar products exist
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Product</label>
                {!showNewProductInput ? (
                  <div>
                    {newItemProduct ? (
                      <div className="selected-product">
                        <div className="selected-product-name">{newItemProduct.name}</div>
                        <button 
                          type="button" 
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setNewItemProduct(null); setNewItemUnit(""); }}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <input
                        id="product-search"
                        type="text"
                        className="form-input"
                        placeholder="Search products..."
                        value={newItemSearch}
                        onChange={(e) => setNewItemSearch(e.target.value)}
                      />
                    )}
                    {((newItemSearch && !newItemProduct) || (newItemSearch && newItemProduct)) && (
                      <div className="combobox-dropdown" style={{ position: "relative", marginTop: "4px", maxHeight: "200px", overflowY: "auto" }}>
                        {filteredProducts.length === 0 && newItemSearch && (
                          <div className="combobox-empty">No products found</div>
                        )}
                        {filteredProducts.map(p => (
                          <div
                            key={p.id}
                            className="combobox-option"
                            onClick={() => {
                              setNewItemProduct(p);
                              setNewItemPrice(p.defaultPrice.toString());
                              setNewItemSearch("");
                              setNewItemUnit(p.unit || "");
                            }}
                          >
                            <div>{p.name}</div>
                            <div className="combobox-option-sub">{formatCurrency(p.defaultPrice)} {p.unit && `• ${p.unit}`}</div>
                          </div>
                        ))}
                        {newItemSearch && !filteredProducts.find(p => p.name.toLowerCase() === newItemSearch.toLowerCase()) && (
                          <div 
                            className="combobox-create"
                            onClick={() => setShowNewProductInput(true)}
                          >
                            + Create "{newItemSearch}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="New product name"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      autoFocus
                    />
                    <button 
                      type="button" 
                      className="btn btn-ghost btn-sm mt-2"
                      onClick={() => { setShowNewProductInput(false); setNewProductName(""); }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Qty</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Unit</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={newItemProduct?.unit || "piece, kg..."}
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    disabled={!!newItemProduct?.unit}
                  />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Price</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddItem(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={addItem}>
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card mb-4">
          <h3 className="section-title mb-3">Amount Details</h3>
          
          <div className="form-group">
            <label className="form-label">Transport</label>
            <input
              type="number"
              className="form-input"
              value={transportAmount}
              onChange={(e) => setTransportAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tax</label>
            <input
              type="number"
              className="form-input"
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Received</label>
            <input
              type="number"
              className="form-input"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="totals-section">
            <div className="total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="total-row">
              <span>Transport</span>
              <span>{formatCurrency(transport)}</span>
            </div>
            <div className="total-row">
              <span>Tax</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="total-row grand-total">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="total-row pending">
              <span>Pending</span>
              <span>{formatCurrency(pending)}</span>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary btn-lg"
          style={{ width: "100%" }}
          disabled={saving || !selectedCustomer || items.length === 0}
        >
          {saving ? <><Loader2 size={18} className="spinner" /> Saving...</> : <><Save size={18} /> Save Changes</>}
        </button>
      </form>

      <style jsx>{`
        .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .back-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main); cursor: pointer; }
        .mb-4 { margin-bottom: 16px; }
        .invoice-number-display { font-size: 1.25rem; font-weight: 700; color: var(--primary); }
        .combobox-container { position: relative; }
        .combobox-trigger { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: var(--bg-base); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; }
        .combobox-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; margin-top: 4px; max-height: 200px; overflow-y: auto; z-index: 10; }
        .combobox-search { padding: 8px; border-bottom: 1px solid var(--border); }
        .combobox-options { max-height: 150px; overflow-y: auto; }
        .combobox-option { padding: 12px; cursor: pointer; }
        .combobox-option:hover { background: var(--bg-base); }
        .combobox-option-sub { font-size: 0.75rem; color: var(--text-muted); }
        .combobox-empty { padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.875rem; }
        .combobox-create { padding: 12px; border-top: 1px solid var(--border); cursor: pointer; color: var(--primary); }
        .items-list { display: flex; flex-direction: column; gap: 8px; }
        .item-row { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-base); border-radius: 8px; }
        .item-name { font-weight: 600; }
        .item-details { font-size: 0.8125rem; color: var(--text-muted); }
        .item-right { display: flex; align-items: center; gap: 12px; }
        .item-subtotal { font-weight: 600; }
        .danger { color: var(--danger) !important; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
        .modal { background: var(--bg-card); border-radius: 16px; width: 100%; max-width: 400px; padding: 20px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .modal-header h2 { font-size: 1.25rem; font-weight: 600; }
        .modal-actions { display: flex; gap: 12px; margin-top: 20px; }
        .modal-actions .btn { flex: 1; }
        .flex { display: flex; }
        .gap-2 { gap: 8px; }
        .mt-2 { margin-top: 8px; }
        .similar-warning { padding: 12px; background: rgba(202, 138, 4, 0.1); border-radius: 8px; font-size: 0.8125rem; color: var(--warning); margin-bottom: 16px; }
        .totals-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.9375rem; }
        .grand-total { font-weight: 700; font-size: 1.125rem; color: var(--primary); border-top: 2px solid var(--border); padding-top: 12px; margin-top: 8px; }
        .pending { color: var(--danger); font-weight: 600; }
        .btn-lg { padding: 16px; font-size: 1rem; }
        .section-title { font-size: 1rem; font-weight: 600; }
        .mb-3 { margin-bottom: 12px; }
        .loading { text-align: center; padding: 40px; color: var(--text-muted); }
        .spinner { animation: spin 1s linear infinite; display: inline; margin-right: 8px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}