"use client";

import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface MapPolylineProps extends google.maps.PolylineOptions {
  path: google.maps.LatLngLiteral[];
}

export function MapPolyline({ path, ...options }: MapPolylineProps) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline();
    }
  }, []);

  useEffect(() => {
    if (polylineRef.current && map) {
      polylineRef.current.setMap(map);
    }
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map]);

  useEffect(() => {
    if (polylineRef.current) {
      polylineRef.current.setPath(path);
      polylineRef.current.setOptions(options);
    }
  }, [path, options]);

  return null;
}
