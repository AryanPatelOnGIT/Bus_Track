/**
 * Next.js API Route: /api/compute-polyline
 *
 * This is a SERVER-SIDE proxy that forwards the compute-polyline request to the
 * backend with the ADMIN_API_SECRET attached. The secret is stored in a
 * non-public env var (no NEXT_PUBLIC_ prefix), so it is NEVER sent to the browser.
 *
 * The frontend calls /api/compute-polyline (this route) instead of the backend directly.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
  const adminSecret = process.env.ADMIN_API_SECRET;

  if (!adminSecret) {
    return NextResponse.json(
      { error: "Server misconfigured: admin secret not set" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstreamRes = await fetch(`${backendUrl}/api/routes/compute-polyline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": adminSecret,
      },
      body: JSON.stringify(body),
    });

    const data = await upstreamRes.json();
    return NextResponse.json(data, { status: upstreamRes.status });
  } catch (err) {
    console.error("[compute-polyline proxy] Upstream error:", err);
    return NextResponse.json({ error: "Failed to reach backend" }, { status: 502 });
  }
}
