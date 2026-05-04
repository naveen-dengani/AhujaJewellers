# Shopkeeper Billing & Accounting System - Implementation Plan (Updated)

A production-ready Next.js application for shopkeepers to manage customers, products, invoices with payment tracking, smart pricing suggestions, WhatsApp integration, and dynamic product creation.

---

## 🆕 New Feature Added

### Dynamic Product Creation During Invoice
- If a product is not found in the catalog while creating an invoice:
  - Allow free-text product entry
  - Automatically create the product in the database
  - Link it to the invoice
  - Make it available for future use

---

## 🗄️ Database Schema Update

**InvoiceItem**
- id, invoiceId, productId
- productName (snapshot), quantity, price, subtotal

**Dynamic Product Handling:**
- Product may be created at invoice time
- productId should always be stored

---

## 🎨 UI Update (Invoice Page)

**Product Input Enhancement:**
- Searchable dropdown for products
- If not found:
  - Show "Add new product"
  - Allow free-text entry

---

## 🔧 Backend Logic (NEW)

```typescript
async function findOrCreateProduct(userId: string, productName: string, price: number) {
  let product = await prisma.product.findFirst({
    where: { userId, name: productName }
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        name: productName,
        defaultPrice: price,
        userId
      }
    });
  }

  return product;
}
```

**Usage in Invoice Creation:**

```typescript
await prisma.$transaction(async (tx) => {
  const invoice = await tx.invoice.create({ data: invoiceData });

  for (const item of items) {
    const product = await findOrCreateProduct(userId, item.name, item.price);

    await tx.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        productId: product.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.quantity * item.price
      }
    });
  }
});
```

---

## ⚙️ API Update

**createInvoice(data)** should:
1. Loop through items
2. Call findOrCreateProduct
3. Use returned productId
4. Save invoice + items in transaction

---

## 🪜 Implementation Step Update

### Phase 4: Invoice System (Updated)

Add step:
- Implement dynamic product creation during invoice

---

## 🎯 Result

- No need to pre-create products
- Faster billing flow
- Catalog auto-builds over time

---

(All other parts of original plan remain unchanged)

