import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateInput(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `INV-${year}${month}-${random}`;
}

export function getWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("91")
    ? cleanPhone
    : `91${cleanPhone}`;
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

export function getInvoiceWhatsAppMessage(
  customerName: string,
  invoiceNumber: string,
  invoiceDate: Date | string,
  totalAmount: number,
  amountReceived: number,
  pendingAmount: number,
  invoiceId: string,
  baseUrl?: string
): string {
  const pdfLink = baseUrl ? `${baseUrl}/api/invoices/${invoiceId}/pdf` : "";
  return `Hello ${customerName},

📄 Invoice #${invoiceNumber}
📅 Date: ${formatDate(invoiceDate)}
💰 Total: ${formatCurrency(totalAmount)}
✅ Paid: ${formatCurrency(amountReceived)}
⏳ Pending: ${formatCurrency(pendingAmount)}
${pdfLink ? `📎 PDF: ${pdfLink}` : ""}

Thank you for your business!
- Ahuja Jewellers`;
}

export function getBalanceWhatsAppMessage(
  customerName: string,
  totalBilled: number,
  totalReceived: number,
  totalPending: number,
  baseUrl?: string
): string {
  const pdfLink = baseUrl ? `${baseUrl}/api/customers/balance/pdf` : "";
  return `Hello ${customerName},

📊 Your Account Summary:
💰 Total Billed: ${formatCurrency(totalBilled)}
✅ Total Paid: ${formatCurrency(totalReceived)}
⏳ Pending Balance: ${formatCurrency(totalPending)}
${pdfLink ? `📎 Statement PDF: ${pdfLink}` : ""}

Thank you!
- Ahuja Jewellers`;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = str1.toLowerCase().trim().replace(/\s+/g, " ");
  const normalized2 = str2.toLowerCase().trim().replace(/\s+/g, " ");

  if (normalized1 === normalized2) return 100;

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return Math.round(similarity);
}

export interface SimilarProduct {
  id: string;
  name: string;
  similarity: number;
}

export function findSimilarProducts(
  newName: string,
  existingProducts: { id: string; name: string }[],
  threshold: number = 75
): SimilarProduct[] {
  const similar: SimilarProduct[] = [];

  for (const product of existingProducts) {
    const similarity = calculateSimilarity(newName, product.name);
    if (similarity >= threshold) {
      similar.push({
        id: product.id,
        name: product.name,
        similarity,
      });
    }
  }

  return similar.sort((a, b) => b.similarity - a.similarity);
}