import { getEnv } from "@/lib/env";
import { runInvoices } from "@/lib/invoice-runner";

export const runtime = "nodejs";

function unauthorizedResponse() {
  return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  return Response.json({ ok: true, message: "Invoice cron endpoint is alive." });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  const { CRON_SECRET } = getEnv();

  if (!token || token !== CRON_SECRET) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  const results = await runInvoices(startedAt);

  return Response.json({
    ok: true,
    runAt: startedAt.toISOString(),
    totals: {
      success: results.filter((item) => item.status === "success").length,
      failed: results.filter((item) => item.status === "failed").length,
      skipped: results.filter((item) => item.status === "skipped").length,
    },
    results,
  });
}
