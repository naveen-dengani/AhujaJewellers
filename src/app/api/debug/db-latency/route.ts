import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const start = Date.now();
  
  // Simple query to measure DB latency
  await prisma.user.count();
  
  const latency = Date.now() - start;
  
  return NextResponse.json({ 
    latencyMs: latency,
    timestamp: new Date().toISOString()
  });
}