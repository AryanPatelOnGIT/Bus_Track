/**
 * Google Maps Routes API v2 Helper
 * Replaces the deprecated DirectionsService
 */

export interface RouteRequest {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  intermediates?: google.maps.LatLngLiteral[];
  travelMode?: "DRIVE" | "BICYCLE" | "WALK" | "TWO_WHEELER";
  routingPreference?: "TRAFFIC_AWARE" | "TRAFFIC_AWARE_OPTIMAL";
}

export async function computeRouteV2(request: RouteRequest) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("Google Maps API Key not found");

  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

  const body = {
    origin: {
      location: {
        latLng: {
          latitude: request.origin.lat,
          longitude: request.origin.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: request.destination.lat,
          longitude: request.destination.lng,
        },
      },
    },
    intermediates: request.intermediates?.map((wp) => ({
      location: {
        latLng: {
          latitude: wp.lat,
          longitude: wp.lng,
        },
      },
    })),
    travelMode: request.travelMode || "DRIVE",
    routingPreference: request.routingPreference || "TRAFFIC_AWARE_OPTIMAL",
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false,
    },
    languageCode: "en-US",
    units: "METRIC",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to compute route via Routes API v2");
  }

  return await response.json();
}
