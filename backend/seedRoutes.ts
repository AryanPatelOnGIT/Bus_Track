import * as admin from "firebase-admin";
import "dotenv/config";

const PREDEFINED_ROUTES = [
  {
    id: "route_au_samras",
    name: "Ahmedabad University → Samras Boys Hostel",
    waypoints: [
      [72.5566, 23.0335], // Ahmedabad University
      [72.5400, 23.0360], // Samras Boys Hostel
    ],
    color: "#3b82f6",
  },
  {
    id: "route_samras_iim",
    name: "Samras Boys Hostel → IIM Ahmedabad",
    waypoints: [
      [72.5400, 23.0360], // Samras Boys Hostel
      [72.5270, 23.0270], // IIM Ahmedabad
    ],
    color: "#3b82f6",
  },
  {
    id: "route_au_iim",
    name: "Ahmedabad University → IIM Ahmedabad",
    waypoints: [
      [72.5566, 23.0335], // Ahmedabad University
      [72.5270, 23.0270], // IIM Ahmedabad
    ],
    color: "#3b82f6",
  },
  {
    id: "route_cg_rto",
    name: "CG Road → RTO Circle",
    waypoints: [
      [72.5530, 23.0280], // CG Road
      [72.5715, 23.0645], // RTO Circle
    ],
    color: "#3b82f6",
  },
  {
    id: "route_rto_iskon",
    name: "RTO Circle → ISKCON Temple",
    waypoints: [
      [72.5715, 23.0645], // RTO Circle
      [72.5080, 23.0300], // ISKCON Temple
    ],
    color: "#3b82f6",
  },
];

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
if (rawServiceAccount) {
    const serviceAccount = JSON.parse(rawServiceAccount);
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
} else {
    admin.initializeApp();
}

const db = admin.firestore();

async function seedRoutes() {
    console.log("Seeding routes...");
    for (const route of PREDEFINED_ROUTES) {
        const firestoreRoute = {
            ...route,
            waypoints: route.waypoints.map(w => ({ lng: w[0], lat: w[1] }))
        };
        await db.collection("routes").doc(route.id).set(firestoreRoute);
        console.log(`✅ Seeded route: ${route.name}`);
    }
    console.log("Done.");
    process.exit(0);
}

seedRoutes().catch(console.error);
