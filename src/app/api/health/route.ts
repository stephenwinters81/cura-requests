import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  // Optional token auth for health check
  const token = process.env.HEALTH_CHECK_TOKEN;
  if (token) {
    const authHeader = request.headers.get("authorization");
    const providedToken = authHeader?.replace("Bearer ", "");
    if (providedToken !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database check
  try {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    checks.database = { status: "ok", latencyMs };
  } catch (error) {
    console.error("Health check DB error:", error instanceof Error ? error.message : error);
    checks.database = { status: "error" };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    {
      status: allOk ? "ok" : "error",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
