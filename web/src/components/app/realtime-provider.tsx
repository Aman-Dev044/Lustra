"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { invalidate } from "@/lib/hooks/use-api";
import type { AppNotification, Invoice, Job } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

type Presence = { _id: string; name: string }[];

const RealtimeContext = createContext<{ socket: Socket | null; connected: boolean; presence: Presence }>({
  socket: null,
  connected: false,
  presence: [],
});

export const useRealtime = () => useContext(RealtimeContext);

/** Subscribe to a server event for the lifetime of the calling component. */
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const { socket } = useRealtime();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!socket) return;
    const fn = (p: T) => ref.current(p);
    socket.on(event, fn);
    return () => {
      socket.off(event, fn);
    };
  }, [socket, event]);
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence>([]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
    const s = io(url, { withCredentials: true, transports: ["websocket", "polling"] });
    // Publishing the live connection object is exactly the external-system sync effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(s);
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("presence", (p: { users: Presence }) => setPresence(p.users ?? []));

    // Keep every open view fresh: any change on the server invalidates the matching cached queries.
    const jobs = () => invalidate("/jobs", "/analytics", "/customers", "/activity");
    s.on("job:created", jobs);
    s.on("job:updated", jobs);
    s.on("job:deleted", jobs);
    s.on("invoice:updated", (inv: Invoice) => {
      invalidate("/invoices", "/analytics", "/customers", "/jobs", "/activity");
      if (inv?.status === "paid") toast.success(`Invoice #${inv.number} paid · ${formatMoney(inv.totals?.total)}`);
    });
    s.on("booking:created", (job: Job) => {
      invalidate("/jobs", "/analytics", "/customers");
      toast(`New online booking`, { description: `#${job.number} · ${job.title}` });
    });
    s.on("notification", (n: AppNotification) => {
      invalidate("/notifications");
      if (n.kind !== "booking" && n.kind !== "payment") toast(n.title, { description: n.body });
    });
    s.on("message:new", () => invalidate("/messages"));

    return () => {
      s.disconnect();
    };
  }, []);

  return <RealtimeContext.Provider value={{ socket, connected, presence }}>{children}</RealtimeContext.Provider>;
}
