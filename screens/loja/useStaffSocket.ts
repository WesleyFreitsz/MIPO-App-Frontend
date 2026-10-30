import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, getAccessToken } from "../../services/api";
import type { Order, OrderTab } from "./lojaTypes";

interface StaffSocketHandlers {
  onNewOrder: (order: Order) => void;
  onOrderUpdated: (order: Order) => void;
  onTabClosed: (tab: OrderTab) => void;
}

export function useStaffSocket(handlers: StaffSocketHandlers) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = io(api.defaults.baseURL ?? "http://localhost:3000", {
      transports: ["websocket"],
      reconnectionAttempts: Infinity,
      auth: (cb) => cb({ token: getAccessToken() }),
    });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("order:new", (order: Order) => handlersRef.current.onNewOrder(order));
    socket.on("order:updated", (order: Order) => handlersRef.current.onOrderUpdated(order));
    socket.on("tab:closed", (tab: OrderTab) => handlersRef.current.onTabClosed(tab));
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  return connected;
}
