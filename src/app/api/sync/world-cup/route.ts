import { syncWorldCupData } from "@/lib/world-cup-sync";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const result = await syncWorldCupData({ force, ignoreWindow: force });
  return Response.json({ ok: result.status !== "error", sync: result }, { status: result.status === "error" ? 502 : 200 });
}
