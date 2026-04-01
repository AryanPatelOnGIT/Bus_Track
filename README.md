# 🚌 Bus Track (V2) - Modern Navigation & Real-Time Fleet Tracking

A premium, role-based bus tracking application built with **React/Next.js**, **Node.js/Socket.io**, and **Firebase/Firestore**. This version (V2) features a modernized navigation engine and premium Google Maps styling.

## 🌟 Key Features (V2 Update)

### 🚀 Modernized Routes API v2
- **Unified Navigation Engine**: Migrated from the deprecated `DirectionsService` to the modern **Google Maps Routes API (v2)**.
- **Traffic-Aware Routing**: Routes are calculated using `TRAFFIC_AWARE_OPTIMAL` for real-time traffic bypass and accurate ETAs.
- **Field Masking Optimization**: High-performance API requests with specific field masks for reduced latency and cost efficiency.

### 🎨 Premium Visual Experience
- **"The Blue Line"**: A high-visibility, professional route path matching the official Google Maps aesthetic.
- **Dynamic Traffic Layer**: Real-time traffic visualization across Driver, Passenger, and Admin consoles.
- **Animated Bus Markers**: Directional bus icons with status-aware coloring (Active, Idle, Maintenance).

### 🔄 Intelligent Fleet Synchronization
- **Cross-Module Route Sync**: When a Driver selects a route, it is instantly broadcast to all Passengers and Admin dashboards via Firestore.
- **Real-Time GPS Streaming**: Sub-second location updates powered by Socket.io.
- **Interactive Admin Console**: Admins can select any bus in the fleet to view its specific active route and real-time turn-by-turn instructions.

### 🛡️ Smart Logic
- **Directional ETA Hook**: Throttled destination-aware ETA calculations for Passengers.
- **Automatic Path Cleanup**: Map UI remains clean by hiding paths when no active tracking session is present.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, `@vis.gl/react-google-maps`, `lucide-react`.
- **Backend**: Node.js, Express, Socket.io.
- **Database**: Firebase Firestore.
- **Maps API**: Google Maps Platform (Maps JS SDK, Routes API v2, Geometry Library).

## 🚀 Getting Started

### 1. Environment Setup
Create a `.env.local` in `frontend/` and `.env` in `backend/`:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
FIREBASE_CONFIG={...}
```

### 2. Installations
```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
npm install
```

### 3. Run the Development Environment
```bash
# Terminal 1 (Backend)
cd backend
npm run dev

# Terminal 2 (Frontend)
cd frontend
npm run dev
```

## ⚠️ Important Note on Google Cloud Billing
The advanced **Routes API v2** and **TrafficLayer** features require a Google Cloud Project with **Billing Enabled**. If billing is not active, the application will default to a clean map view without the route path to avoid "ugly" visual fallbacks.

---
*Developed for AryanPatelOnGIT/Bus_Track*
