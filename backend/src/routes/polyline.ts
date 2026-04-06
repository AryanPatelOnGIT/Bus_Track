import { Router, Request, Response, NextFunction } from "express";

const router = Router();

// ── Admin-only middleware ──────────────────────────────────────────────────────
// The ADMIN_API_SECRET env var is compared against the X-Admin-Secret header.
// Set this to a long random string and keep it out of the frontend bundle.
// Without this guard, any external party can burn your Routes API quota instantly.
function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) {
    // Fail CLOSED — never allow access when the secret is not configured.
    // This prevents accidental exposure on fresh deployments or misconfigured CI.
    console.error("🚨 ADMIN_API_SECRET is not set. Blocking request to compute-polyline.");
    res.status(503).json({ error: "Server misconfigured: admin secret not set" });
    return;
  }
  const provided = req.headers["x-admin-secret"];
  if (provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ── Input validation helper ───────────────────────────────────────────────────
function isValidLatLng(obj: unknown): obj is { lat: number; lng: number } {
  if (!obj || typeof obj !== "object") return false;
  const { lat, lng } = obj as Record<string, unknown>;
  return (
    typeof lat === "number" && isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === "number" && isFinite(lng) && lng >= -180 && lng <= 180
  );
}

/**
 * POST /api/routes/compute-polyline
 *
 * Body: { waypoints: Array<{ lat: number; lng: number }> }
 * Returns: { polyline: string } — encoded polyline for the full route
 *
 * Protected by admin secret. Validates waypoints before calling Routes API.
 * Failure returns a 4xx/5xx — callers must handle this and NOT silently save.
 */
router.post("/compute-polyline", requireAdminSecret, async (req: Request, res: Response) => {
  const { waypoints } = req.body;

  // ── Input validation ──
  if (!waypoints) {
    res.status(400).json({ error: "Missing required field: waypoints" });
    return;
  }
  if (!Array.isArray(waypoints)) {
    res.status(400).json({ error: "waypoints must be an array" });
    return;
  }
  if (waypoints.length < 2) {
    res.status(400).json({ error: "waypoints must have at least 2 items" });
    return;
  }
  const invalidIndex = waypoints.findIndex((wp) => !isValidLatLng(wp));
  if (invalidIndex !== -1) {
    res.status(400).json({
      error: `Waypoint at index ${invalidIndex} is invalid. Each must be { lat: number, lng: number }.`,
    });
    return;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Google Maps API key not configured on server" });
    return;
  }

  try {
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediates = waypoints.slice(1, -1);

    const body: Record<string, unknown> = {
      origin: {
        location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
      },
      destination: {
        location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE", // Static route — no live traffic billing
      computeAlternativeRoutes: false,
      languageCode: "en-US",
      units: "METRIC",
    };

    if (intermediates.length > 0) {
      body.intermediates = intermediates.map((wp: { lat: number; lng: number }) => ({
        location: { latLng: { latitude: wp.lat, longitude: wp.lng } },
      }));
    }

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`❌ Routes API HTTP ${response.status}:`, errBody);
      res.status(502).json({ error: `Routes API returned ${response.status}`, detail: errBody });
      return;
    }

    const data = (await response.json()) as { routes?: Array<{ polyline?: { encodedPolyline?: string }; distanceMeters?: number; duration?: string }> };

    if (!data.routes || data.routes.length === 0) {
      res.status(422).json({ error: "Routes API returned no routes for these waypoints" });
      return;
    }

    const route = data.routes[0];
    const polyline = route.polyline?.encodedPolyline;
    if (!polyline) {
      res.status(422).json({ error: "Routes API returned a route but with no encoded polyline" });
      return;
    }

    res.json({
      polyline,
      distanceMeters: route.distanceMeters ?? 0,
      duration: route.duration ?? "0s",
    });
  } catch (err) {
    console.error("❌ compute-polyline internal error:", err);
    res.status(500).json({ error: "Internal server error while computing polyline" });
  }
});

export default router;
