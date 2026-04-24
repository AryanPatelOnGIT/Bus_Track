"use client";

import { useEffect } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  // "geometry" and "marker" are needed globally.
  // "places" and "routes" load lazily via useMapsLibrary() — no need to preload.
  return (
    <APIProvider
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY as string}
      libraries={["geometry", "marker"]}
    >
      {children}
    </APIProvider>
  );
}
