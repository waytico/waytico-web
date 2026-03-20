"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type BlockName = "hero" | "days" | "overview" | "tasks" | "locations" | "gear" | "season" | "budget" | "images" | "validate";

interface PipelineStreamState {
  readyBlocks: Set<BlockName>;
  isComplete: boolean;
  isFailed: boolean;
  error: string | null;
}

function handleSlugUpdate(slug: string) {
  if (slug && typeof window !== "undefined") {
    const currentPath = window.location.pathname;
    if (currentPath.includes("generating-")) {
      window.history.replaceState(null, "", `/trip/${slug}`);
    }
  }
}

export function usePipelineStream(projectId: string, isGenerating: boolean): PipelineStreamState {
  const router = useRouter();
  const [readyBlocks, setReadyBlocks] = useState<Set<BlockName>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPollingFallback = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/trips/stream/${projectId}`);
        if (!res.ok) return;
        const text = await res.text();
        // Parse SSE events from text
        const events = text.split("\n\n").filter(Boolean);
        for (const evt of events) {
          const match = evt.match(/^data:\s*(.+)$/m);
          if (!match) continue;
          try {
            const data = JSON.parse(match[1]);
            if (data.slug) handleSlugUpdate(data.slug);
            if (data.block) {
              setReadyBlocks(prev => new Set([...prev, data.block as BlockName]));
            }
            if (data.status === "complete") {
              setIsComplete(true);
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              router.refresh();
            }
            if (data.status === "failed") {
              setIsFailed(true);
              setError(data.error || "Generation failed");
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
            }
          } catch {}
        }
      } catch {}
    }, 5000);
  }, [projectId, router]);

  useEffect(() => {
    if (!isGenerating) return;

    const eventSource = new EventSource(`/api/trips/stream/${projectId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.slug) handleSlugUpdate(data.slug);
        if (data.block) {
          setReadyBlocks(prev => new Set([...prev, data.block as BlockName]));
        }
        if (data.status === "complete") {
          setIsComplete(true);
          eventSource.close();
          router.refresh();
        }
        if (data.status === "failed") {
          setIsFailed(true);
          setError(data.error || "Generation failed");
          eventSource.close();
        }
      } catch {}
    };

    eventSource.onerror = () => {
      eventSource.close();
      startPollingFallback();
    };

    return () => {
      eventSource.close();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [projectId, isGenerating, router, startPollingFallback]);

  return { readyBlocks, isComplete, isFailed, error };
}
