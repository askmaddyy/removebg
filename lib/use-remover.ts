"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Status = "idle" | "loading" | "ready" | "working" | "error";

export type Cut = {
  id: number;
  name: string;
  original: string;
  cutout: string;
  width: number;
  height: number;
  ms: number;
};

export function useRemover() {
  const worker = useRef<Worker | null>(null);
  const started = useRef(new Map<number, number>());
  const nextId = useRef(1);

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [device, setDevice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cuts, setCuts] = useState<Cut[]>([]);
  const pending = useRef(new Map<number, { name: string; original: string }>());

  useEffect(() => {
    const w = new Worker(new URL("./bg.worker.ts", import.meta.url));
    worker.current = w;

    w.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d.type === "load") {
        setStatus((s) => (s === "working" ? s : "loading"));
        setProgress(d.progress ?? 0);
      } else if (d.type === "ready") {
        setDevice(d.device);
        setStatus((s) => (s === "working" ? s : "ready"));
        setProgress(100);
      } else if (d.type === "done") {
        const meta = pending.current.get(d.id);
        pending.current.delete(d.id);
        const ms = Date.now() - (started.current.get(d.id) ?? Date.now());
        started.current.delete(d.id);
        setCuts((prev) => [
          {
            id: d.id,
            name: meta?.name ?? "image.png",
            original: meta?.original ?? "",
            cutout: URL.createObjectURL(d.blob),
            width: d.width,
            height: d.height,
            ms,
          },
          ...prev,
        ]);
        setStatus("ready");
      } else if (d.type === "error") {
        setError(d.message);
        setStatus("error");
      }
    };

    return () => {
      w.terminate();
      worker.current = null;
    };
  }, []);

  const warm = useCallback(() => {
    if (status !== "idle") return;
    setStatus("loading");
    worker.current?.postMessage({ type: "warm" });
  }, [status]);

  const cut = useCallback(
    async (file: File) => {
      if (!worker.current) return;
      setError(null);
      setStatus("working");
      const id = nextId.current++;
      const bitmap = await createImageBitmap(file);
      pending.current.set(id, { name: file.name, original: URL.createObjectURL(file) });
      started.current.set(id, Date.now());
      worker.current.postMessage({ type: "cut", bitmap, id }, [bitmap]);
    },
    [],
  );

  return { status, progress, device, error, cuts, cut, warm, setCuts };
}
