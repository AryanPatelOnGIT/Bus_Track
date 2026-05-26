import { auth, rtdb } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
}

function subscribeWhenAuthenticated(start: () => () => void) {
  if (!auth || !rtdb) {
    return () => {};
  }

  if (auth.currentUser) {
    return start();
  }

  let activeUnsubscribe = () => {};
  const unsubscribeFromAuth = onAuthStateChanged(auth, (user) => {
    if (!user) return;

    activeUnsubscribe = start();
    unsubscribeFromAuth();
  });

  return () => {
    activeUnsubscribe();
    unsubscribeFromAuth();
  };
}

function requireAuthenticatedUser() {
  if (!auth?.currentUser) {
    throw new Error('Authentication required to access Realtime Database.');
  }

  return auth.currentUser;
}

export const subscribeToBusLocation = (vehicleId: string, callback: (location: BusLocation | null) => void) => {
  return subscribeWhenAuthenticated(() => {
    if (!rtdb) {
      return () => {};
    }

    const locationRef = ref(rtdb, `buses/${vehicleId}/location`);
    const unsubscribe = onValue(locationRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as BusLocation);
      } else {
        callback(null);
      }
    });

    return () => off(locationRef, 'value', unsubscribe);
  });
};

export const subscribeToAllBuses = (callback: (locations: Record<string, { location: BusLocation }>) => void) => {
  return subscribeWhenAuthenticated(() => {
    if (!rtdb) {
      return () => {};
    }

    const busesRef = ref(rtdb, 'buses');
    const unsubscribe = onValue(busesRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({});
      }
    });

    return () => off(busesRef, 'value', unsubscribe);
  });
};

export const sendMessage = async (rideSessionId: string, message: Omit<RTDBMessage, 'clearedAfterRide'>) => {
  requireAuthenticatedUser();

  if (!rtdb) {
    throw new Error('Realtime Database is not configured.');
  }

  const messagesRef = ref(rtdb, `messages/${rideSessionId}`);
  const newMessageRef = push(messagesRef);
  await set(newMessageRef, {
    ...message,
  });
};

export const subscribeToMessages = (rideSessionId: string, callback: (messages: (RTDBMessage & { id: string })[]) => void) => {
  return subscribeWhenAuthenticated(() => {
    if (!rtdb) {
      return () => {};
    }

    const messagesRef = ref(rtdb, `messages/${rideSessionId}`);
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
  });
};

export const clearMessages = async (rideSessionId: string) => {
  requireAuthenticatedUser();

  if (!rtdb) {
    throw new Error('Realtime Database is not configured.');
  }

  const messagesRef = ref(rtdb, `messages/${rideSessionId}`);
  await remove(messagesRef);
};
