import { Router } from "express";
import { activeBuses } from "../sockets/trackingGateway";

const router = Router();

// Retrieve fleet statistics
router.get("/fleet", (_req, res) => {
  let activeCount = 0;
  let idleCount = 0;
  let maintenanceCount = 0;

  for (const bus of activeBuses.values()) {
    if (bus.status === "active") activeCount++;
    else if (bus.status === "idle") idleCount++;
    else if (bus.status === "maintenance") maintenanceCount++;
  }

  // Mixed static seeds with live memory state
  res.json({
    totalBuses: 50,
    activeBuses: activeCount,
    maintenanceBuses: maintenanceCount,
    ongoingTrips: activeCount + idleCount, 
    passengerCount: 1420 + Math.floor(activeCount * 12.5), 
  });
});

// Retrieve aggregated trip analytics graph data
router.get("/trips", (_req, res) => {
  // Returns static mock for UI render validation since DB missing
  res.json({ trips: [] });
});

// Retrieve aggregated feedback table
router.get("/feedback", (_req, res) => {
  // Returns static mock for UI render validation since DB missing
  res.json({ feedback: [] });
});

export default router;
