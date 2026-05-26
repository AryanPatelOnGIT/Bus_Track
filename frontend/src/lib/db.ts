import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';

export interface UserData {
  name: string;
  email: string;
  photoURL: string;
  role: 'admin' | 'driver' | 'passenger';
  vehicleId: string | null;
  assignedRouteIds: string[];
  rideSessionId?: string;
}

export interface RouteStop {
  name: string;
  lat: number;
  lng: number;
}

export interface RouteData {
  id?: string;
  routeName: string;
  stops: RouteStop[];
}

export interface Vehicle {
  id?: string;
  busNumber: string;
  busName: string;
  assignedDriverId: string | null;
  assignedRouteIds: string[];
}

export interface MessageData {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  clearedAfterRide: boolean;
}

export const getUserData = async (uid: string): Promise<UserData | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserData;
  }
  return null;
};

export const createUser = async (uid: string, data: UserData): Promise<void> => {
  await setDoc(doc(db, 'users', uid), data);
};

export const updateUser = async (uid: string, data: Partial<UserData>): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), data);
};

export const getAllDrivers = async (): Promise<(UserData & { uid: string })[]> => {
  const q = query(collection(db, 'users'), where('role', '==', 'driver'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() } as UserData & { uid: string }));
};

export const getAllVehicles = async (): Promise<Vehicle[]> => {
  const querySnapshot = await getDocs(collection(db, 'vehicles'));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Vehicle));
};

export const addVehicle = async (data: Omit<Vehicle, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'vehicles'), data);
  return docRef.id;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'vehicles', id));
};

export const getAllRoutes = async (): Promise<RouteData[]> => {
  const querySnapshot = await getDocs(collection(db, 'routes'));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RouteData));
};

export const addRoute = async (data: Omit<RouteData, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'routes'), data);
  return docRef.id;
};

export const deleteRoute = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'routes', id));
};

export const assignDriverToVehicle = async (driverId: string, vehicleId: string, routeIds: string[]): Promise<void> => {
  const batch = writeBatch(db);

  const driverRef = doc(db, 'users', driverId);
  batch.update(driverRef, {
    vehicleId,
    assignedRouteIds: routeIds,
  });

  const vehicleRef = doc(db, 'vehicles', vehicleId);
  batch.update(vehicleRef, {
    assignedDriverId: driverId,
    assignedRouteIds: routeIds,
  });

  await batch.commit();
};
