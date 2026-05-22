import { rtdb } from './firebase';
import { ref, onValue, off, push, remove, set } from 'firebase/database';

export interface BusLocation {
  lat: number;
  lng: number;
  speed: number;
  timestamp: number;
  heading: number;
}

export interface RTDBMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  clearedAfterRide: boolean;
}

export const subscribeToBusLocation = (vehicleId: string, callback: (location: BusLocation | null) => void) => {
  const locationRef = ref(rtdb, `buses/${vehicleId}/location`);
  const unsubscribe = onValue(locationRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as BusLocation);
    } else {
      callback(null);
    }
  });

  return () => off(locationRef, 'value', unsubscribe);
};

export const subscribeToAllBuses = (callback: (locations: Record<string, { location: BusLocation }>) => void) => {
  const busesRef = ref(rtdb, 'buses');
  const unsubscribe = onValue(busesRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback({});
    }
  });

  return () => off(busesRef, 'value', unsubscribe);
};

export const sendMessage = async (rideSessionId: string, message: Omit<RTDBMessage, 'clearedAfterRide'>) => {
  const messagesRef = ref(rtdb, `messages/${rideSessionId}/messages`);
  const newMessageRef = push(messagesRef);
  await set(newMessageRef, {
    ...message,
    clearedAfterRide: false,
  });
};

export const subscribeToMessages = (rideSessionId: string, callback: (messages: (RTDBMessage & { id: string })[]) => void) => {
  const messagesRef = ref(rtdb, `messages/${rideSessionId}/messages`);
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const messagesArray = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      callback(messagesArray);
    } else {
      callback([]);
    }
  });

  return () => off(messagesRef, 'value', unsubscribe);
};

export const clearMessages = async (rideSessionId: string) => {
  const messagesRef = ref(rtdb, `messages/${rideSessionId}`);
  await remove(messagesRef);
};
