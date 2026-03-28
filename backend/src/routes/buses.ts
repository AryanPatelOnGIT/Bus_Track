import { Router } from "express";
import { activeBuses } from "../sockets/trackingGateway";

const router = Router();

// GET all active buses snapshot for fleet overview
router.get("/", (_req, res) => {
  const busesArray = Array.from(activeBuses.values());
  res.json({ buses: busesArray });
});

// GET specific bus by ID
router.get("/:busId", (req, res) => {
  const bus = activeBuses.get(req.params.busId);
  if (bus) {
    res.json(bus);
  } else {
    res.status(404).json({ error: "Bus not found or inactive" });
  }
});

// PATCH bus status (admin override)
router.patch("/:busId", (req, res) => {
  const { status } = req.body;
  const bus = activeBuses.get(req.params.busId);
  
  if (bus && status) {
    bus.status = status;
    res.json(bus);
  } else {
    res.status(404).json({ error: "Bus not found" });
  }
});

export default router;
