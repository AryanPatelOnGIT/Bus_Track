# CLAUDE.md — BusTrack AI Interaction Conventions

This file encodes the project's engineering standards and conventions for AI coding assistants. Follow these rules precisely on every interaction.

---

## Architecture Rules

### Socket Handler Location
- All Socket.io event handlers MUST live in `backend/src/sockets/trackingGateway.ts`
- The `backend/src/socket/` directory (busLocation.ts, busLocationHandler.ts) is legacy simulation code — do not add new handlers there
- Never register a second `io.on("connection", ...)` in `server.ts` — trackingGateway owns this

### API Key Separation
- **Server API key** (`GOOGLE_MAPS_API_KEY`): Used by backend for Routes API v2. Never sent to browser.
- **Browser API key** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`): Used by frontend Maps JS API. Restricted by HTTP referrer in GCP Console.
- These MUST be different keys with different restrictions. Never use the same key for both.

### Secret Handling
- Variables containing secrets MUST NOT use the `NEXT_PUBLIC_` prefix
- Admin operations from the frontend MUST go via the Next.js API proxy at `/api/compute-polyline`
- The proxy reads `ADMIN_API_SECRET` server-side and attaches it to backend requests
- Client components may never import or read any secret

### Data Flow
- All Google Maps/Routes API calls go through the backend, not the frontend
- ETA updates flow: backend etaService → Socket.io → passengers room broadcast
- Polyline data is pre-computed once via seed script and cached in Firestore — do not recompute unless admin explicitly triggers it

---

## Security Rules

### Input Validation
- ALL socket event handlers MUST validate the complete payload shape before processing
- Use allowlists (not denylists) for enum fields (e.g., status, type)
- Validate lat/lng: `typeof lat === "number" && isFinite(lat) && lat >= -90 && lat <= 90`
- Validate string IDs: `typeof id === "string" && id.trim().length > 0 && id.length < 256`
- Reject and log, never propagate, invalid payloads

### Admin Middleware
- Admin middleware (`requireAdminSecret`) MUST fail **closed** — return 503 when `ADMIN_API_SECRET` is not set
- Never call `next()` when a required security env var is missing

### Firestore Rules
- Never use wildcard `allow read, write: if request.auth != null` — this grants too much access
- Access must be granted per collection with role checks (`isAdmin()`, `isDriver()`)
- Changes to `firestore.rules` must be deployed separately: `firebase deploy --only firestore:rules`

### REST Validation
- Always validate `req.params` values (busId, requestId) for length and type before using them as Firestore document IDs
- Use status allowlists: `["active", "idle", "maintenance"]` for bus status, `["pickup", "dropoff"]` for request type

---

## Performance Rules

### ETA Computation
- Default ETA interval is controlled by `ETA_INTERVAL_MS` env var (default: 180000 = 3 min)
- Do NOT hardcode `30_000` as the interval in `trackingGateway.ts` — it bypasses cost optimization
- The 500m movement threshold in etaService.ts is intentional — don't remove it

### Caching
- Directions API results are cached in `useGoogleDirections.ts` for 15 minutes (CACHE_TTL_MS)
- The `directionsCache` Map evicts at 50 entries max — don't increase this without profiling
- Route polylines are cached in `routePolylineCache` (etaService) at server startup — this avoids repeated Firestore reads

### Firestore Writes
- `bus_history` collection writes are intentionally disabled — only `bus_locations` is written per update
- Do not re-enable history writes without implementing a Firestore budget alert

---

## Code Quality Rules

### TypeScript
- All socket event handler payloads must be destructured with `?? {}` safety: `const { busId } = payload ?? {}`
- Use `isNonEmptyString()` and `isValidLatLng()` helper functions for validation — don't inline type checks
- Do not use `any` in production code paths unless explicitly annotated with `// eslint-disable`

### File Organization
- Backend route files: `backend/src/routes/*.ts`
- Backend libraries: `backend/src/lib/*.ts`
- Socket handlers: `backend/src/sockets/trackingGateway.ts`
- Frontend API client: `frontend/src/lib/api.ts`
- Frontend hooks: `frontend/src/hooks/use*.ts`
- Frontend components by user role: `frontend/src/components/{admin,driver,passenger,shared,maps}/`

### Error Handling
- HTTP errors must use appropriate status codes (400 validation, 401 auth, 403 forbidden, 404 not found, 500 server)
- Never return internal file paths, stack traces, or implementation details in HTTP responses
- Socket validation failures: log with `console.warn`, return early — do not emit error events that could leak info

---

## Development Process

1. **Before changing socket events**, update `backend/src/types/index.ts` first (both `ClientToServerEvents` and `ServerToClientEvents` interfaces)
2. **Before changing Firestore structure**, update `firestore.rules` and deploy them
3. **Verify UI changes visually** by comparing screenshots before marking as done
4. **Address root causes, not symptoms** — if a build fails, read the full error before making changes
5. **Run `npm run lint`** in both `frontend/` and `backend/` before committing
6. **Never commit `.env` or `.env.local`** — they are in `.gitignore` for a reason
7. **Rotate secrets immediately** if they are ever committed, logged, or exposed in error messages

---

## Deployment Checklist

Before any production deployment:
- [ ] `ADMIN_API_SECRET` is set and is ≥32 random characters
- [ ] `GOOGLE_MAPS_API_KEY` (backend) has IP restriction in GCP Console
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` has HTTP referrer restriction to your domain
- [ ] `FIREBASE_SERVICE_ACCOUNT` is stored in Secret Manager (not in `.env`)
- [ ] Firestore rules deployed: `firebase deploy --only firestore:rules`
- [ ] Backend Docker image built and verified non-root: `docker inspect <image> | grep User`
- [ ] Health check verified: `curl https://your-backend/health`
