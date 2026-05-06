import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 500 });
  }

  const units = await prisma.unit.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(units);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: "Unit name is required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 500 });
  }

  const existing = await prisma.unit.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, userId: user.id },
  });

  if (existing) {
    return NextResponse.json({ error: "Unit already exists" }, { status: 400 });
  }

  const unit = await prisma.unit.create({
    data: {
      name: name.trim(),
      userId: user.id,
    },
  });

  return NextResponse.json(unit);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Unit ID is required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 500 });
  }

  const unit = await prisma.unit.findFirst({
    where: { id, userId: user.id },
  });

  if (!unit) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }

  const productsCount = await prisma.product.count({
    where: { unitId: id },
  });

  if (productsCount > 0) {
    return NextResponse.json({ 
      error: "Cannot delete unit. It is being used by products." 
    }, { status: 400 });
  }

  await prisma.unit.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}