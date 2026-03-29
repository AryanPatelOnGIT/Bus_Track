import { db } from "./lib/firebaseAdmin";
// @ts-ignore: Intentionally grabbing frontend file
import { PREDEFINED_ROUTES } from "../../frontend/src/lib/predefinedRoutes";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load backend .env file
dotenv.config({ path: resolve(__dirname, "../../.env") });

async function seedFirebase() {
  console.log("🌱 Starting Firebase Seed...");

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT is not set in the .env file.");
    console.error("Please add the service account JSON to proceed with seeding.");
    process.exit(1);
  }

  try {
    const routesCollection = db.collection("routes");

    let count = 0;
    for (const route of PREDEFINED_ROUTES) {
      console.log(`Adding route: ${route.name} (${route.id})...`);
      
      const routeDoc = routesCollection.doc(route.id);
      
      await routeDoc.set({
        id: route.id,
        name: route.name,
        waypoints: route.waypoints,
        color: route.color,
        createdAt: new Date().toISOString(),
      }, { merge: true }); // Use merge so re-running the seed updates existing but keeps any other added fields

      count++;
    }

    console.log(`✅ Successfully seeded ${count} routes into Firestore!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding Firebase:", error);
    process.exit(1);
  }
}

seedFirebase();
