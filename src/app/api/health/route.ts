export const dynamic = "force-dynamic";

/**
 * Liveness only. Online rooms are owned by the realtime Worker (Durable
 * Object), so this endpoint must never require Postgres to answer 200.
 */
export async function GET() {
  return Response.json({
    ok: true,
    realtime: process.env.NEXT_PUBLIC_REALTIME_URL ?? null,
  });
}
