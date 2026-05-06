/* eslint-disable @typescript-eslint/no-explicit-any */
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/utils";

const SHOP_NAME = "AHUJA JEWELLERS";
const SHOP_PHONE = "9165795141";
const SHOP_ADDRESS_LINE1 = "Shalimar Market, Station Road";
const SHOP_ADDRESS_LINE2 = "Katni, M.P. 483501";
const COLOR_BROWN = "#4a3728";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLOR_BROWN, paddingBottom: 15 },
  title: { fontSize: 18, fontWeight: "bold", color: COLOR_BROWN },
  owner: { fontSize: 10, color: "#555", marginTop: 3 },
  phone: { fontSize: 10, color: "#555", marginTop: 2 },
  addressLine: { fontSize: 9, color: "#555", marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  label: { color: "#666" },
  value: { fontWeight: "bold" },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 10, color: "#333" },
  table: { marginTop: 10 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f5f5f5", paddingVertical: 6, paddingHorizontal: 8 },
  tableHeaderText: { fontWeight: "bold", color: "#333" },
  tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  col1: { width: "40%" },
  col1_5: { width: "10%" },
  col2: { width: "12%", textAlign: "right" },
  col3: { width: "18%", textAlign: "right" },
  col4: { width: "20%", textAlign: "right" },
  totals: { marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#333" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grandTotal: { fontSize: 12, fontWeight: "bold", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#333" },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, textAlign: "center", color: "#999", fontSize: 8 },
});

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string | Date;
  customer: { name: string; phone: string | null; notes: string | null };
  items: Array<{ productName: string; unit: string | null; quantity: number; price: number; subtotal: number }>;
  transportAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountReceived: number;
  pendingAmount: number;
}

export function InvoicePDF({ data }: { data: InvoiceData }) {
  const itemsSubtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{SHOP_NAME}</Text>
          <Text style={styles.owner}>Mayank Dengani</Text>
          <Text style={styles.phone}>{SHOP_PHONE}</Text>
          <Text style={styles.addressLine}>{SHOP_ADDRESS_LINE1}</Text>
          <Text style={styles.addressLine}>{SHOP_ADDRESS_LINE2}</Text>
          <Text style={{ fontSize: 10, color: COLOR_BROWN, marginTop: 8 }}>
            Invoice #{data.invoiceNumber}
          </Text>
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value}>{data.customer.name}</Text>
          </View>
          <View>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(data.invoiceDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.col1]}>Product</Text>
              <Text style={[styles.tableHeaderText, styles.col1_5]}>Unit</Text>
              <Text style={[styles.tableHeaderText, styles.col2]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.col3]}>Price</Text>
              <Text style={[styles.tableHeaderText, styles.col4]}>Subtotal</Text>
            </View>
            {data.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>{item.productName}</Text>
                <Text style={styles.col1_5}>{item.unit && item.unit.trim() ? item.unit : "-"}</Text>
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
          {data.transportAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.label}>Transport</Text>
              <Text>{formatCurrency(data.transportAmount)}</Text>
            </View>
          )}
          {data.taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.label}>Tax</Text>
              <Text>{formatCurrency(data.taxAmount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total</Text>
            <Text>{formatCurrency(data.totalAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Amount Received</Text>
            <Text style={{ color: "#22c55e" }}>
              {formatCurrency(data.amountReceived)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Pending</Text>
            <Text style={{ color: data.pendingAmount > 0 ? "#ef4444" : "#22c55e" }}>
              {formatCurrency(data.pendingAmount)}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>Thank you for your business!</Text>
      </Page>
    </Document>
  );
}

export interface BalanceData {
  customer: { name: string; phone: string | null; notes: string | null };
  balance: {
    totalBilled: number;
    totalReceived: number;
    totalPending: number;
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      invoiceDate: string | Date;
      totalAmount: number;
      amountReceived: number;
      pendingAmount: number;
    }>;
  };
}

export function BalancePDF({ data }: { data: BalanceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{SHOP_NAME}</Text>
          <Text style={styles.owner}>Mayank Dengani</Text>
          <Text style={styles.phone}>{SHOP_PHONE}</Text>
          <Text style={styles.addressLine}>{SHOP_ADDRESS_LINE1}</Text>
          <Text style={styles.addressLine}>{SHOP_ADDRESS_LINE2}</Text>
          <Text style={{ fontSize: 10, color: COLOR_BROWN, marginTop: 8 }}>
            Account Statement
          </Text>
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value}>{data.customer.name}</Text>
          </View>
          <View>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{data.customer.phone || "-"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Billed</Text>
            <Text style={styles.value}>{formatCurrency(data.balance.totalBilled)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Received</Text>
            <Text style={[styles.value, { color: "#22c55e" }]}>
              {formatCurrency(data.balance.totalReceived)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pending Balance</Text>
            <Text style={[styles.value, { color: data.balance.totalPending > 0 ? "#ef4444" : "#22c55e" }]}>
              {formatCurrency(data.balance.totalPending)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice History</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: "30%" }]}>Invoice #</Text>
              <Text style={[styles.tableHeaderText, { width: "20%" }]}>Date</Text>
              <Text style={[styles.tableHeaderText, { width: "20%", textAlign: "right" }]}>Total</Text>
              <Text style={[styles.tableHeaderText, { width: "20%", textAlign: "right" }]}>Paid</Text>
              <Text style={[styles.tableHeaderText, { width: "10%", textAlign: "right" }]}>Pending</Text>
            </View>
            {data.balance.invoices.map((invoice, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={{ width: "30%" }}>{invoice.invoiceNumber}</Text>
                <Text style={{ width: "20%" }}>{formatDate(invoice.invoiceDate)}</Text>
                <Text style={{ width: "20%", textAlign: "right" }}>{formatCurrency(invoice.totalAmount)}</Text>
                <Text style={{ width: "20%", textAlign: "right" }}>{formatCurrency(invoice.amountReceived)}</Text>
                <Text style={{ width: "10%", textAlign: "right", color: invoice.pendingAmount > 0 ? "#ef4444" : "#22c55e" }}>
                  {formatCurrency(invoice.pendingAmount)}
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

export async function generateBalancePDF(data: BalanceData) {
  const blob = await pdf(<BalancePDF data={data} />).toBlob();
  return blob;
}