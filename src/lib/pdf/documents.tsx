import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/utils";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#d4af37",
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#d4af37",
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  label: {
    color: "#666",
  },
  value: {
    fontWeight: "bold",
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontWeight: "bold",
    color: "#333",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  col1: { width: "50%" },
  col2: { width: "15%", textAlign: "right" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "20%", textAlign: "right" },
  
  totals: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  grandTotal: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#999",
    fontSize: 8,
  },
});

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string;
    invoiceDate: Date;
    customer: { name: string; phone: string };
    transportAmount: number;
    taxAmount: number;
    totalAmount: number;
    amountReceived: number;
    pendingAmount: number;
    items: Array<{
      productName: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
  };
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  const itemsSubtotal = invoice.items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>AJUHA JEWELLERS</Text>
          <Text style={styles.subtitle}>Invoice #{invoice.invoiceNumber}</Text>
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value}>{invoice.customer.name}</Text>
          </View>
          <View>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(invoice.invoiceDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.col1]}>Product</Text>
              <Text style={[styles.tableHeaderText, styles.col2]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.col3]}>Price</Text>
              <Text style={[styles.tableHeaderText, styles.col4]}>Subtotal</Text>
            </View>
            {invoice.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>{item.productName}</Text>
                <Text style={styles.col2}>{item.quantity}</Text>
                <Text style={styles.col3}>{formatCurrency(item.price)}</Text>
                <Text style={styles.col4}>{formatCurrency(item.subtotal)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Items Subtotal</Text>
            <Text>{formatCurrency(itemsSubtotal)}</Text>
          </View>
          {invoice.transportAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.label}>Transport</Text>
              <Text>{formatCurrency(invoice.transportAmount)}</Text>
            </View>
          )}
          {invoice.taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.label}>Tax</Text>
              <Text>{formatCurrency(invoice.taxAmount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total</Text>
            <Text>{formatCurrency(invoice.totalAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Amount Received</Text>
            <Text style={{ color: "#22c55e" }}>
              {formatCurrency(invoice.amountReceived)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Pending</Text>
            <Text
              style={{
                color: invoice.pendingAmount > 0 ? "#ef4444" : "#22c55e",
              }}
            >
              {formatCurrency(invoice.pendingAmount)}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>Thank you for your business!</Text>
      </Page>
    </Document>
  );
}

interface BalancePDFProps {
  customer: {
    name: string;
    phone: string;
    notes: string | null;
  };
  balance: {
    totalBilled: number;
    totalReceived: number;
    totalPending: number;
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      invoiceDate: Date;
      totalAmount: number;
      amountReceived: number;
      pendingAmount: number;
    }>;
  };
}

export function BalancePDF({ customer, balance }: BalancePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>AJUHA JEWELLERS</Text>
          <Text style={styles.subtitle}>Account Statement</Text>
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value}>{customer.name}</Text>
          </View>
          <View>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{customer.phone}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Billed</Text>
            <Text style={styles.value}>{formatCurrency(balance.totalBilled)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Received</Text>
            <Text style={[styles.value, { color: "#22c55e" }]}>
              {formatCurrency(balance.totalReceived)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pending Balance</Text>
            <Text
              style={[
                styles.value,
                { color: balance.totalPending > 0 ? "#ef4444" : "#22c55e" },
              ]}
            >
              {formatCurrency(balance.totalPending)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice History</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.col1]}>Invoice #</Text>
              <Text style={[styles.tableHeaderText, styles.col2]}>Date</Text>
              <Text style={[styles.tableHeaderText, styles.col3]}>Total</Text>
              <Text style={[styles.tableHeaderText, styles.col4]}>Paid</Text>
            </View>
            {balance.invoices.map((invoice, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>{invoice.invoiceNumber}</Text>
                <Text style={styles.col2}>
                  {formatDate(invoice.invoiceDate)}
                </Text>
                <Text style={styles.col3}>
                  {formatCurrency(invoice.totalAmount)}
                </Text>
                <Text style={styles.col4}>
                  {formatCurrency(invoice.amountReceived)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>Thank you for your business!</Text>
      </Page>
    </Document>
  );
}

export async function generateInvoicePDF(invoice: InvoicePDFProps["invoice"]) {
  const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob();
  return blob;
}

export async function generateBalancePDF(
  customer: BalancePDFProps["customer"],
  balance: BalancePDFProps["balance"]
) {
  const blob = await pdf(<BalancePDF customer={customer} balance={balance} />).toBlob();
  return blob;
}