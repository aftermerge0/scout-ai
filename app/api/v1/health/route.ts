import { jsonOk } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk({
    ok: true,
    version: "1.0.0",
    time: new Date().toISOString(),
  });
}
