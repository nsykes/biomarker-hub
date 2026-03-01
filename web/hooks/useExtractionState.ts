import { useState, useCallback, useEffect, useRef } from "react";
import {
  Biomarker,
  ExtractionResult,
  ExtractionMeta,
  ExtractionResponse,
  StoredFile,
  ReferenceRangeConflict,
} from "@/lib/types";
import {
  saveFile,
  reextractReport,
  getSettingsSafe,
  updateFileBiomarkers,
  updateReportInfo,
  reconcileReferenceRanges,
} from "@/lib/db/actions";
import { DEFAULT_MODEL } from "@/lib/constants";

type Mode = { type: "new" } | { type: "view"; file: StoredFile };

export function useExtractionState(mode: Mode) {
  const initialExtraction =
    mode.type === "view"
      ? {
          reportInfo: {
            source: mode.file.source ?? "",
            labName: mode.file.labName ?? null,
            collectionDate: mode.file.collectionDate ?? "",
            reportType:
              (mode.file.reportType as "blood_panel" | "dexa_scan" | "other") ??
              "other",
          },
          biomarkers: mode.file.biomarkers,
        }
      : null;

  const [extraction, setExtraction] = useState<ExtractionResult | null>(
    initialExtraction
  );
  const extractionRef = useRef(initialExtraction);
  useEffect(() => {
    extractionRef.current = extraction;
  }, [extraction]);

  const [meta, setMeta] = useState<ExtractionMeta | null>(
    mode.type === "view" ? mode.file.meta : null
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFileId, setSavedFileId] = useState<string | null>(
    mode.type === "view" ? mode.file.id : null
  );
  const [rangeConflicts, setRangeConflicts] = useState<
    ReferenceRangeConflict[] | null
  >(null);

  const [defaultModel, setDefaultModel] = useState<string>(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    getSettingsSafe().then((result) => {
      if (result.data) {
        setDefaultModel(result.data.defaultModel);
        setApiKey(result.data.openRouterApiKey);
      }
    });
  }, []);

  const handleExtract = useCallback(
    async (file: File) => {
      setIsExtracting(true);
      setError(null);
      setExtraction(null);
      setMeta(null);

      try {
        const formData = new FormData();
        formData.append("pdf", file);
        formData.append("model", defaultModel);
        if (apiKey) {
          formData.append("apiKey", apiKey);
        }

        const response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error || `Extraction failed: ${response.status}`
          );
        }

        const text = await response.text();
        const parsed = JSON.parse(text.trim());
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        const data: ExtractionResponse = parsed;
        setExtraction(data.extraction);
        setMeta(data.meta);

        // Auto-save to database
        try {
          const extractionData = {
            source: data.extraction.reportInfo.source || null,
            labName: data.extraction.reportInfo.labName || null,
            collectionDate:
              data.extraction.reportInfo.collectionDate || null,
            reportType: data.extraction.reportInfo.reportType || null,
            biomarkers: data.extraction.biomarkers,
            meta: data.meta,
          };

          let id: string;
          if (savedFileId) {
            await reextractReport(savedFileId, extractionData);
            id = savedFileId;
          } else {
            id = await saveFile({ filename: file.name, ...extractionData });
            setSavedFileId(id);
          }

          const uploadRes = await fetch(`/api/reports/${id}/pdf`, {
            method: "PUT",
            body: file,
          });
          if (!uploadRes.ok) {
            const retry = await fetch(`/api/reports/${id}/pdf`, {
              method: "PUT",
              body: file,
            });
            if (!retry.ok) {
              console.error("PDF upload failed after retry:", retry.status);
            }
          }
        } catch (saveErr) {
          console.error("Failed to auto-save:", saveErr);
        }

        // Reconcile reference ranges from PDF
        try {
          const reconcileInput = data.extraction.biomarkers
            .filter(
              (b) =>
                b.canonicalSlug &&
                (b.referenceRangeLow !== null ||
                  b.referenceRangeHigh !== null)
            )
            .map((b) => ({
              canonicalSlug: b.canonicalSlug!,
              referenceRangeLow: b.referenceRangeLow,
              referenceRangeHigh: b.referenceRangeHigh,
              unit: b.unit,
              metricName: b.metricName,
            }));
          if (reconcileInput.length > 0) {
            const conflicts =
              await reconcileReferenceRanges(reconcileInput);
            if (conflicts.length > 0) {
              setRangeConflicts(conflicts);
            }
          }
        } catch (reconcileErr) {
          console.error(
            "Failed to reconcile reference ranges:",
            reconcileErr
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Extraction failed");
      } finally {
        setIsExtracting(false);
      }
    },
    [apiKey, defaultModel, savedFileId]
  );

  const handleUpdateReportInfo = useCallback(
    (field: string, value: string) => {
      setExtraction((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          reportInfo: { ...prev.reportInfo, [field]: value },
        };
        if (savedFileId) {
          updateReportInfo(savedFileId, { [field]: value }).catch(
            console.error
          );
        }
        return updated;
      });
    },
    [savedFileId]
  );

  const handleUpdateBiomarker = useCallback(
    (id: string, field: keyof Biomarker, value: unknown) => {
      setExtraction((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          biomarkers: prev.biomarkers.map((b) =>
            b.id === id ? { ...b, [field]: value } : b
          ),
        };
        if (savedFileId) {
          updateFileBiomarkers(savedFileId, updated.biomarkers).catch(
            console.error
          );
        }
        return updated;
      });
    },
    [savedFileId]
  );

  const handleAddBiomarker = useCallback(
    (biomarker: Biomarker) => {
      setExtraction((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          biomarkers: [...prev.biomarkers, biomarker],
        };
        if (savedFileId) {
          updateFileBiomarkers(savedFileId, updated.biomarkers).catch(
            console.error
          );
        }
        return updated;
      });
    },
    [savedFileId]
  );

  return {
    extraction,
    setExtraction,
    extractionRef,
    meta,
    setMeta,
    isExtracting,
    error,
    setError,
    savedFileId,
    setSavedFileId,
    defaultModel,
    apiKey,
    rangeConflicts,
    setRangeConflicts,
    handleExtract,
    handleUpdateReportInfo,
    handleUpdateBiomarker,
    handleAddBiomarker,
  };
}
