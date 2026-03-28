import { Router } from "express";
import { pendingRequests } from "../sockets/trackingGateway";
import type { PassengerRequest } from "../types";

const router = Router();

// Create new external pickup request HTTP (primarily used over socket though)
router.post("/", (req, res) => {
  const data = req.body;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  const newRequest: PassengerRequest = {
    ...data,
    requestId,
    status: "pending",
    createdAt: Date.now(),
  };

  pendingRequests.set(requestId, newRequest);
  res.status(201).json(newRequest);
});

// List all currently pending requests for admin view tracking
router.get("/", (_req, res) => {
  const reqArray = Array.from(pendingRequests.values());
  res.json({ requests: reqArray });
});

// Admin patch completion override
router.patch("/:id", (req, res) => {
  const { status } = req.body;
  const pReq = pendingRequests.get(req.params.id);

  if (pReq && status) {
    pReq.status = status;
    res.json(pReq);
  } else {
    res.status(404).json({ error: "Request not found" });
  }
});

// Cancel a request by ID
router.delete("/:id", (req, res) => {
  const id = req.params.id;
  if(pendingRequests.has(id)) {
    pendingRequests.delete(id);
    res.json({ message: "Deleted successfully" });
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

export default router;
