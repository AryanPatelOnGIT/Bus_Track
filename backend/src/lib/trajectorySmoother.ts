import { BusLocation } from "../types";

export class TrajectorySmoother {
  private _lat: number | null = null;
  private _lng: number | null = null;
  private _heading: number | null = null;
  private _speed: number | null = null;
  
  // High smoothing factor means more trust in prediction vs measurement
  private _alpha = 0.6; 
  private _headingAlpha = 0.3;

  public filter(measurement: BusLocation): BusLocation {
    if (this._lat === null || this._lng === null) {
      this._lat = measurement.lat;
      this._lng = measurement.lng;
      this._heading = measurement.heading;
      this._speed = measurement.speed;
      return measurement;
    }

    // Exponential Moving Average pseudo-Kalman filtering for spatial jitter correction
    // Blends the new observation with the previous corrected state.
    this._lat = this._lat * this._alpha + measurement.lat * (1 - this._alpha);
    this._lng = this._lng * this._alpha + measurement.lng * (1 - this._alpha);
    this._speed = this._speed! * this._alpha + measurement.speed * (1 - this._alpha);

    // Heading requires modulo arithmetic for circular blending
    let diff = measurement.heading - this._heading!;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    this._heading = (this._heading! + diff * (1 - this._headingAlpha)) % 360;
    if (this._heading < 0) this._heading += 360;

    return {
      ...measurement,
      lat: this._lat,
      lng: this._lng,
      heading: this._heading,
      speed: this._speed
    };
  }
}

export const activeFilters = new Map<string, TrajectorySmoother>();

export function getSmoothedLocation(busId: string, measurement: BusLocation): BusLocation {
  let filter = activeFilters.get(busId);
  if (!filter) {
    filter = new TrajectorySmoother();
    activeFilters.set(busId, filter);
  }
  return filter.filter(measurement);
}

export function clearTrajectory(busId: string) {
  activeFilters.delete(busId);
}
