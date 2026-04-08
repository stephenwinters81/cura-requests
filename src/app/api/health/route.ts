import { NextRequest, NextResponse } from "next/server";
import { checkDatabase, checkRedis } from "@/lib/health";

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

  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);

  const allOk = database.status === "ok" && redis.status === "ok";

  return NextResponse.json(
    {
      status: allOk ? "ok" : "error",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      checks: { database, redis },
    },
    { status: allOk ? 200 : 503 }
  );
}
