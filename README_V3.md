# BusTrack V3 – Advanced Navigation & Synchronization

Version 3 of the BusTrack ecosystem introduces professional-grade navigation features and a synchronized real-time experience across all transit interfaces.

## 🚀 Key Improvements in V3

### 1. 3D Driver Navigation Mode
The Driver interface now features a high-fidelity navigation experience that rivals dedicated GPS hardware:
- **60° Perspective Tilt**: Provides a cinematic 3D view of the road ahead, optimizing visibility for urban transit environments.
- **Level 18 Dynamic Zoom**: High-resolution map scale for precise maneuver tracking.
- **Real-Time Heading Rotation**: The map automatically rotates (`setHeading`) as the bus moves, keeping the transit path oriented 'UP' for the driver.

### 2. Bulletproof Gesture Interception
We implemented a custom gesture-interception layer to solve camera "rubber-banding" issues:
- **Multi-Touch Support**: Precise detection of pointer, scroll, and touch events on the map canvas.
- **Instant Decoupling**: Manually panning or zooming the map instantly unlocks the camera from the bus, allowing drivers to explore the route freely without being snapped back to center.
- **Single-Tap Restoration**: Re-engage professional tracking via the dedicated floating GPS target button.

### 3. Dynamic Passenger-Driver Synchronization
Version 3 eliminates static route mismatches by strictly integrating with Firestore:
- **Unified Route Data**: Passengers now fetch live transit lines directly from Firestore, ensuring they are always tracking the same data as the drivers.
- **Route Selector**: A new glassmorphism dashboard element allows passengers to switch between different active routes.
- **Automatic Bus Discovery**: Bus markers inhabit the map dynamically as soon as a driver starts a broadcast on a matching route ID.

### 4. Advanced ETA Derivation
The passenger dashboard now calculates ETAs and distances dynamically based on the current bus position and the route's terminal waypoint, providing real-time arrival estimates.

## 🏗 Technology Stack
- **Frontend**: Next.js 14, TailwindCSS v4, Lucide Icons.
- **Maps**: @vis.gl/react-google-maps (Google Maps Platform).
- **Backend**: Node.js, Socket.IO, Firebase Admin SDK.
- **Database**: Google Firestore (Real-time Config & Persistence).

---
*BusTrack V3 – Precision Transit Intelligence.*
