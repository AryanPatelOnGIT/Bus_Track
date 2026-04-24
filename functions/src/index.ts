import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ── Database Hydration & "Read Everything at Once" Architecture ──
// Triggered whenever a core route document changes.
// Aggregates all fragmented route/station relational data into a single "RouteDashboard" document
// to prevent the passenger client from executing 30+ individual document queries.
export const hydrateRouteDashboard = functions.firestore
  .document("routes/{routeId}")
  .onWrite(async (change, context) => {
    const routeId = context.params.routeId;
    
    try {
      // 1. Fetch the master collections
      const routesSnap = await db.collection("routes").get();
      
      const aggregatedRoutes = routesSnap.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {} as Record<string, any>);

      // 2. Write the heavily denormalized batch to a central monolithic dashboard doc
      await db.collection("dashboards").doc("main").set({
        routes: aggregatedRoutes,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      functions.logger.info(`✅ Successfully hydrated RouteDashboard after update to route: ${routeId}`);
    } catch (error) {
      functions.logger.error("❌ Failed to hydrate route dashboard:", error);
    }
  });
