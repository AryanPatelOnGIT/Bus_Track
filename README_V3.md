# BusTrack V3 – Precision Navigation & Real-Time Syncing

BusTrack V3 is a major technical upgrade focusing on high-accuracy driver navigation and unified multi-interface synchronization. Building on the foundation of V2, this version implements advanced camera control and dynamic data modeling.

## 🚀 Version 3 (V3) Highlights

### 1. Advanced 3D Driver Navigation
V3 introduces a professional, turn-by-turn navigation experience for drivers:
- **60° Perspective Tilt**: Creates a cinematic "dash-cam" view to optimize visibility of upcoming road nodes and traffic alerts.
- **Dynamic Heading Synchronization**: The map canvas automatically rotates (`setHeading`) to keep the bus's forward direction pointed "UP," providing an intuitive orientation for active transit sessions.
- **Smart Recenter Logic**: A floating GPS control system that intelligently tracks current progress while allowing instant camera detachment.

### 2. High-Performance Gesture Interception
We solved the "Map Snapshot" and "Rubber-banding" issues seen in previous versions:
- **Native Event Wrapper**: Implemented a custom event interceptor (`onPointerDown`, `onTouchStart`, `onWheel`) around the Google Maps canvas.
- **Instant Camera Decoupling**: V3 is the first version to successfully break free from the auto-centering loop the exact millisecond a user interacts with the map. This enables drivers to explore the route manually without any "fighting" from the auto-follow system.

### 3. Real-Time Firestore Data Linking
V3 transitions the ecosystem from static route definitions to fully dynamic Firestore modeling:
- **useRoutes Synchronization**: The Passenger interface now utilizes a live Firestore hook to fetch active transit lines directly from the same database used by the Admin and Driver consoles.
- **Unified Socket Handshaking**: Fixed sub-second logic where Passenger and Driver sockets were previously using mismatched event names (e.g., `bus:location-update`).
- **Dynamic Route Selection**: Passengers now have a dedicated drop-down dashboard to switch between multiple active transit routes in real-time.

### 4. Synthetic Destination Mapping
For routes that don't have pre-defined stop nodes, V3 implements "Synthetic Waypoint Mapping":
- **Terminal Derivation**: Automatically calculates the final trip destination based on the last waypoint in the polyline array.
- **Adaptive ETA Cards**: The glassmorphic ETA cards now dynamically calculate distance-to-endpoint from raw GPS telemetry rather than relying on hardcoded station lists.

## 🛠 Project Structure
- **`/frontend/src/components/maps/DriverMap.tsx`**: Features the new 3D tilt and gesture-interception architecture.
- **`/frontend/src/app/passenger/page.tsx`**: Implements the V3 dynamic route selector and Firestore sync.
- **`/backend/src/sockets/trackingGateway.ts`**: Unified socket broadcasting logic for V3 cross-role communication.

---
*BusTrack V3 – Engineered for high-fidelity transit management.*
