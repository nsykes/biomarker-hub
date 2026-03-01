import { useState, useCallback, useRef, type MutableRefObject } from "react";
import { Biomarker, ExtractionResult } from "@/lib/types";
import { updateFileBiomarkers } from "@/lib/db/actions";
import { UNDO_TOAST_DURATION_MS } from "@/lib/constants";

export function useUndoDelete(
  savedFileId: string | null,
  extractionRef: MutableRefObject<ExtractionResult | null>,
  setExtraction: (updater: (prev: ExtractionResult | null) => ExtractionResult | null) => void
) {
  const [toastItem, setToastItem] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const pendingDeleteRef = useRef<{
    biomarker: Biomarker;
    index: number;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  const flushPendingDelete = useCallback(async () => {
    const pending = pendingDeleteRef.current;
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pendingDeleteRef.current = null;
    setToastItem(null);
    if (savedFileId && extractionRef.current) {
      await updateFileBiomarkers(savedFileId, extractionRef.current.biomarkers);
    }
  }, [savedFileId, extractionRef]);

  const handleDeleteBiomarker = useCallback(
    (id: string) => {
      flushPendingDelete();

      setExtraction((prev) => {
        if (!prev) return prev;
        const index = prev.biomarkers.findIndex((b) => b.id === id);
        if (index === -1) return prev;
        const deleted = prev.biomarkers[index];

        const timeoutId = setTimeout(() => {
          pendingDeleteRef.current = null;
          setToastItem(null);
          if (savedFileId && extractionRef.current) {
            updateFileBiomarkers(savedFileId, extractionRef.current.biomarkers).catch(
              console.error
            );
          }
        }, UNDO_TOAST_DURATION_MS);

        pendingDeleteRef.current = { biomarker: deleted, index, timeoutId };
        setToastItem({
          id: deleted.id,
          name: deleted.metricName || deleted.rawName,
        });

        return {
          ...prev,
          biomarkers: prev.biomarkers.filter((b) => b.id !== id),
        };
      });
    },
    [savedFileId, flushPendingDelete, setExtraction, extractionRef]
  );

  const handleUndo = useCallback(() => {
    const pending = pendingDeleteRef.current;
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pendingDeleteRef.current = null;
    setToastItem(null);
    setExtraction((prev) => {
      if (!prev) return prev;
      const restored = [...prev.biomarkers];
      restored.splice(
        Math.min(pending.index, restored.length),
        0,
        pending.biomarker
      );
      return { ...prev, biomarkers: restored };
    });
  }, [setExtraction]);

  return { toastItem, flushPendingDelete, handleDeleteBiomarker, handleUndo };
}
