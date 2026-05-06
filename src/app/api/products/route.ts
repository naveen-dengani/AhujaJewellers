import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, unit, defaultPrice, description } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.product.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (existing) {
    return NextResponse.json({ error: "Product already exists" }, { status: 400 });
  }

  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 500 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      unit: unit || null,
      defaultPrice: defaultPrice || 0,
      description: description || null,
      userId: user.id,
    },
  });

  return NextResponse.json(product);
}