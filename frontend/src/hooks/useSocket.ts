"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// Singleton socket — prevents re-creating on re-renders
let socketInstance: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(BACKEND_URL, {
        transports: ["websocket"],
        autoConnect: true,
      });
    }
    socketRef.current = socketInstance;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);

    // Sync initial connection state
    if (socketInstance.connected) setIsConnected(true);

    return () => {
      socketInstance?.off("connect", onConnect);
      socketInstance?.off("disconnect", onDisconnect);
    };
  }, []);

  function joinRoom(room: string) {
    socketRef.current?.emit("admin:join"); // generic join — extend as needed
    void room; // suppress unused var warning
  }

  return { socket: socketRef.current, isConnected, joinRoom };
}
