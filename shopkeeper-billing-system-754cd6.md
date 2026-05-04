# Shopkeeper Billing & Accounting System - Implementation Plan

A production-ready Next.js application for shopkeepers to manage customers, products, invoices with payment tracking, smart pricing suggestions, and WhatsApp integration.

---

## 📋 Project Overview

**Tech Stack:**
- Next.js 14 (App Router)
- PostgreSQL + Prisma ORM
- NextAuth.js for authentication
- Tailwind CSS + shadcn/ui components
- @react-pdf/renderer for PDF generation
- Lucide React for icons

**Key Capabilities:**
- Customer & product management
- Multi-item invoices with transport/tax
- Payment tracking with pending balance calculation
- Smart pricing suggestions based on purchase history
- Customer balance sheets with invoice history
- PDF generation & WhatsApp sharing

---

## 🗄️ Database Schema

### Core Models

**User**
- id, email, password (hashed), name, createdAt

**Customer**
- id, name, phone (unique), notes, userId, createdAt

**Product**
- id, name, defaultPrice, description, userId, createdAt

**Invoice**
- id, invoiceNumber (auto-generated), customerId, userId
- invoiceDate, transportAmount, taxAmount
- totalAmount, amountReceived, pendingAmount
- createdAt, updatedAt

**InvoiceItem**
- id, invoiceId, productId
- productName (snapshot), quantity, price, subtotal

**Indexes:**
- Customer: phone, userId
- Invoice: customerId, userId, invoiceDate
- InvoiceItem: invoiceId, productId

**Relations:**
- User → Customers (1:many)
- User → Products (1:many)
- User → Invoices (1:many)
- Customer → Invoices (1:many)
- Invoice → InvoiceItems (1:many)
- Product → InvoiceItems (1:many)

---

## 🏗️ Application Architecture

### Folder Structure
```
/app
  /(auth)
    /login - Login page
  /(dashboard)
    /dashboard - Main dashboard
    /customers - Customer list & management
    /customers/[id] - Customer detail + balance sheet
    /products - Product catalog
    /invoices - Invoice list
    /invoices/new - Create invoice
    /invoices/[id] - View/edit invoice
    /invoices/[id]/pdf - PDF view
  /api
    /auth/[...nextauth] - NextAuth config
/components
  /ui - shadcn components
  /customers - Customer forms, cards
  /products - Product forms, cards
  /invoices - Invoice form, item list, suggestion panel
  /shared - Layout, navbar, etc.
/lib
  /db - Prisma client
  /auth - Auth config
  /utils - Helpers
  /pdf - PDF generation logic
/prisma
  schema.prisma
  seed.ts
```

### API Design (Server Actions)

**Authentication:**
- `signIn()` - Email/password login
- `signOut()` - Logout
- `getSession()` - Current user

**Customers:**
- `getCustomers()` - List all
- `getCustomer(id)` - Single customer
- `createCustomer(data)` - Add new
- `updateCustomer(id, data)` - Edit
- `deleteCustomer(id)` - Remove
- `getCustomerBalance(id)` - Balance sheet data

**Products:**
- `getProducts()` - List all
- `getProduct(id)` - Single product
- `createProduct(data)` - Add new
- `updateProduct(id, data)` - Edit
- `deleteProduct(id)` - Remove

**Invoices:**
- `getInvoices()` - List all with filters
- `getInvoice(id)` - Single invoice with items
- `createInvoice(data)` - Create with items
- `updateInvoice(id, data)` - Edit invoice
- `deleteInvoice(id)` - Remove
- `getLastPurchasePrice(customerId, productId)` - For suggestions

---

## 🎨 UI Pages & Components

### 1. Login Page
- Simple email/password form
- NextAuth integration
- Redirect to dashboard on success

### 2. Dashboard
- Summary cards:
  - Total customers
  - Total pending amount
  - Recent invoices count
- Quick actions: New invoice, Add customer
- Recent invoices table

### 3. Customers Page
- Data table with search
- Columns: Name, Phone, Total Pending, Actions
- Add/Edit customer modal
- Delete confirmation

### 4. Customer Detail Page
- Customer info card
- Balance summary:
  - Total billed
  - Total received
  - Total pending
- Invoice history table
- Actions:
  - Print balance sheet
  - Download PDF
  - Share via WhatsApp

### 5. Products Page
- Data table with search
- Columns: Name, Default Price, Actions
- Add/Edit product modal
- Delete confirmation

### 6. Invoice List Page
- Data table with filters (date range, customer)
- Columns: Invoice #, Date, Customer, Total, Paid, Pending
- Click to view/edit

### 7. New/Edit Invoice Page

**Layout: Two-column**

**Left Column - Invoice Form:**
- Customer select (searchable)
- Invoice date picker
- Product items section:
  - Product select + quantity + price
  - Add/remove item rows
  - Subtotal per item
- Transport amount input
- Tax amount input
- Amount received input
- **Live calculations:**
  - Items subtotal
  - Total = subtotal + transport + tax
  - Pending = total - received

**Right Column - Suggestion Panel:**
- Shows when product selected
- Displays:
  - "Last sold to [Customer] on [Date] at ₹[Price]"
  - "Click to use this price"
- Empty state if no history

**Actions:**
- Save invoice
- Save & Print
- Cancel

### 8. Invoice View Page
- Display invoice details (read-only or edit mode)
- Print button → browser print dialog
- Download PDF button
- Share WhatsApp button
- Edit button (if in view mode)

---

## 🔧 Key Implementation Details

### 1. Smart Pricing Suggestion Logic

```typescript
// When product selected in invoice form
async function getLastPurchasePrice(customerId: string, productId: string) {
  const lastInvoice = await prisma.invoiceItem.findFirst({
    where: {
      productId,
      invoice: { customerId }
    },
    orderBy: { invoice: { invoiceDate: 'desc' } },
    include: { invoice: true }
  });
  
  return lastInvoice ? {
    price: lastInvoice.price,
    date: lastInvoice.invoice.invoiceDate
  } : null;
}
```

### 2. Balance Calculation

```typescript
async function getCustomerBalance(customerId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { customerId },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      totalAmount: true,
      amountReceived: true,
      pendingAmount: true
    }
  });
  
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalReceived = invoices.reduce((sum, inv) => sum + inv.amountReceived, 0);
  const totalPending = totalBilled - totalReceived;
  
  return { totalBilled, totalReceived, totalPending, invoices };
}
```

### 3. Invoice Total Calculation (Client-side)

```typescript
// React state management
const itemsSubtotal = items.reduce((sum, item) => 
  sum + (item.quantity * item.price), 0
);
const totalAmount = itemsSubtotal + transportAmount + taxAmount;
const pendingAmount = totalAmount - amountReceived;
```

### 4. WhatsApp Integration

```typescript
// Invoice share
function getInvoiceWhatsAppLink(customer: Customer, invoice: Invoice) {
  const message = `Hello ${customer.name},

Invoice #${invoice.invoiceNumber}
Date: ${formatDate(invoice.invoiceDate)}
Total: ₹${invoice.totalAmount}
Paid: ₹${invoice.amountReceived}
Pending: ₹${invoice.pendingAmount}

Thank you for your business!`;
  
  return `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;
}

// Balance sheet share
function getBalanceWhatsAppLink(customer: Customer, balance: Balance) {
  const message = `Hello ${customer.name},

Your Account Summary:
Total Billed: ₹${balance.totalBilled}
Total Paid: ₹${balance.totalReceived}
Pending Balance: ₹${balance.totalPending}

Thank you!`;
  
  return `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;
}
```

### 5. PDF Generation

**Invoice PDF:**
- Use @react-pdf/renderer
- Create PDF component with invoice layout
- Generate blob and trigger download

**Balance Sheet PDF:**
- Similar approach
- Include customer info + invoice table

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.14.0",
    "next-auth": "^4.24.0",
    "bcryptjs": "^2.4.3",
    "@react-pdf/renderer": "^3.4.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.378.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "prisma": "^5.14.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/bcryptjs": "^2.4.6"
  }
}
```

---

## 🚀 Implementation Steps

### Phase 1: Project Setup
1. Initialize Next.js project with TypeScript
2. Install dependencies
3. Setup Tailwind CSS + shadcn/ui
4. Configure Prisma with PostgreSQL
5. Create database schema
6. Run migrations

### Phase 2: Authentication
1. Setup NextAuth.js
2. Create login page
3. Implement auth middleware
4. Create protected layout

### Phase 3: Core CRUD Operations
1. Customer management (list, add, edit, delete)
2. Product management (list, add, edit, delete)
3. Build reusable UI components (tables, forms, modals)

### Phase 4: Invoice System
1. Invoice list page with filters
2. Create invoice form with multi-item support
3. Implement live calculation logic
4. Add transport/tax/payment fields
5. Save invoice with items (transaction)

### Phase 5: Smart Suggestions
1. Build suggestion panel component
2. Implement last purchase price query
3. Integrate into invoice form
4. Add "use this price" functionality

### Phase 6: Balance & Reporting
1. Customer balance calculation logic
2. Customer detail page with balance sheet
3. Invoice history table
4. Aggregation queries

### Phase 7: PDF & Print
1. Create printable invoice layout
2. Implement browser print functionality
3. Build PDF generation with @react-pdf/renderer
4. Add download triggers

### Phase 8: WhatsApp Integration
1. Create message templates
2. Build WhatsApp link generator
3. Add share buttons to invoice & balance pages
4. Test with phone number formatting

### Phase 9: Polish & Testing
1. Add loading states
2. Error handling & validation
3. Responsive design tweaks
4. Test all flows end-to-end
5. Seed database with sample data

---

## 🎯 Success Criteria

✅ Shopkeeper can log in securely  
✅ Full CRUD for customers and products  
✅ Create invoices with multiple items  
✅ Transport, tax, and payment tracking  
✅ Pending balance auto-calculated  
✅ Smart pricing suggestions appear correctly  
✅ Customer balance sheet shows accurate totals  
✅ Print and PDF download work  
✅ WhatsApp share sends correct messages  
✅ Clean, intuitive UI  
✅ Fast performance with optimized queries  

---

## 📝 Notes

- **Single tenant:** One user per deployment (can be extended later)
- **Invoice editing:** Full edit capability post-creation
- **Data integrity:** Use Prisma transactions for invoice creation
- **Indexing:** Critical for performance with large datasets
- **Validation:** Zod schemas for all forms
- **Security:** Hash passwords, protect routes, sanitize inputs
- **Scalability:** Schema supports multi-tenant with userId field

---

## 🔐 Security Considerations

1. Password hashing with bcrypt (10 rounds)
2. NextAuth session management
3. Server-side validation on all mutations
4. SQL injection protection via Prisma
5. CSRF protection (Next.js built-in)
6. Environment variables for secrets

---

## 🎨 UI/UX Principles

- **Minimal clicks:** Quick access to common actions
- **Clear feedback:** Loading states, success/error messages
- **Mobile-friendly:** Responsive design for tablet use
- **Keyboard shortcuts:** Tab navigation in forms
- **Smart defaults:** Pre-fill common values
- **Inline editing:** Where appropriate
- **Confirmation dialogs:** For destructive actions

---

This plan provides a complete roadmap for building a production-ready shopkeeper billing system with all requested features. The architecture is clean, scalable, and follows Next.js best practices.
