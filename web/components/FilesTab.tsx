"use client";

import { useState, useEffect, useCallback } from "react";
import { StoredFile } from "@/lib/types";
import { getFiles, deleteFile } from "@/lib/db/actions";

interface FilesTabProps {
  onNewExtraction: () => void;
  onViewFile: (file: StoredFile) => void;
}

const REPORT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  blood_panel: { label: "Blood", color: "bg-red-100 text-red-700" },
  dexa_scan: { label: "DEXA", color: "bg-purple-100 text-purple-700" },
  other: { label: "Other", color: "bg-gray-100 text-gray-600" },
};

export function FilesTab({ onNewExtraction, onViewFile }: FilesTabProps) {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      const data = await getFiles();
      setFiles(data);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this file and its extraction data?")) return;
    setDeletingId(id);
    try {
      await deleteFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 p-8">
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <div className="text-center">
          <p className="text-lg font-medium text-gray-500">No files yet</p>
          <p className="text-sm mt-1">
            Upload a lab report PDF to get started
          </p>
        </div>
        <button
          onClick={onNewExtraction}
          className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Upload PDF
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div className="overflow-auto h-full">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-gray-50 border-b z-10">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Filename</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Lab</th>
              <th className="px-5 py-3 font-medium">Collection Date</th>
              <th className="px-5 py-3 font-medium">Biomarkers</th>
              <th className="px-5 py-3 font-medium">Added</th>
              <th className="px-5 py-3 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {files.map((f) => {
              const badge = REPORT_TYPE_LABELS[f.reportType ?? "other"] ?? REPORT_TYPE_LABELS.other;
              return (
                <tr
                  key={f.id}
                  onClick={() => onViewFile(f)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {f.filename}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {f.labName || f.source || "\u2014"}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {f.collectionDate || "\u2014"}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {f.biomarkers.length}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {new Date(f.addedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={(e) => handleDelete(e, f.id)}
                      disabled={deletingId === f.id}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete file"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FAB button */}
      <button
        onClick={onNewExtraction}
        className="absolute bottom-6 right-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 hover:shadow-xl transition-all flex items-center justify-center"
        title="New extraction"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  );
}
