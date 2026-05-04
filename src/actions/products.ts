"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { productSchema, type ProductInput } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { findSimilarProducts, type SimilarProduct } from "@/lib/utils";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function getProducts() {
  const userId = await getUserId();
  return prisma.product.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function getProduct(id: string) {
  const userId = await getUserId();
  return prisma.product.findFirst({
    where: { id, userId },
  });
}

export async function createProduct(data: ProductInput): Promise<{ product?: unknown; similarProducts?: SimilarProduct[]; error?: string }> {
  const userId = await getUserId();
  const validated = productSchema.parse(data);

  const existingProducts = await prisma.product.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  const similarProducts = findSimilarProducts(validated.name, existingProducts);

  if (similarProducts.length > 0) {
    return {
      error: `A similar product already exists`,
      similarProducts,
    };
  }

  const product = await prisma.product.create({
    data: {
      ...validated,
      userId,
    },
  });

  revalidatePath("/dashboard/products");
  return { product };
}

export async function updateProduct(id: string, data: ProductInput) {
  const userId = await getUserId();
  const validated = productSchema.parse(data);

  const product = await prisma.product.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/dashboard/products");
  return product;
}

export async function deleteProduct(id: string) {
  const userId = await getUserId();

  await prisma.product.delete({
    where: { id },
  });

  revalidatePath("/dashboard/products");
}

export async function searchProducts(query: string) {
  const userId = await getUserId();
  return prisma.product.findMany({
    where: {
      userId,
      name: { contains: query, mode: "insensitive" },
    },
    take: 20,
    orderBy: { name: "asc" },
  });
}

// Dynamic product creation - find existing or create new
export async function findOrCreateProduct(
  productName: string,
  price: number
): Promise<{ id: string; name: string; defaultPrice: number; similarProducts?: SimilarProduct[] }> {
  const userId = await getUserId();

  let product = await prisma.product.findFirst({
    where: { userId, name: { equals: productName, mode: "insensitive" } },
  });

  if (!product) {
    const existingProducts = await prisma.product.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    const similarProducts = findSimilarProducts(productName, existingProducts);

    if (similarProducts.length > 0) {
      return {
        id: "",
        name: productName,
        defaultPrice: price,
        similarProducts,
      };
    }

    product = await prisma.product.create({
      data: {
        name: productName,
        defaultPrice: price,
        userId,
      },
    });
    revalidatePath("/dashboard/products");
  }

  return product;
}

// Check for similar products (used in invoice combobox)
export async function checkSimilarProducts(productName: string): Promise<SimilarProduct[]> {
  const userId = await getUserId();

  const existingProducts = await prisma.product.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  return findSimilarProducts(productName, existingProducts);
}
