import { getEnv } from "@/lib/env";
import { runInvoices } from "@/lib/invoice-runner";

export const runtime = "nodejs";

function unauthorizedResponse() {
  return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function getBearerToken(request: Request): string {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice("Bearer ".length);
}

async function runCron(request: Request) {
  const token = getBearerToken(request);
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

export async function GET(request: Request) {
  return runCron(request);
}

export async function POST(request: Request) {
  return runCron(request);
}
