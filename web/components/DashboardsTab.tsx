"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardSummary } from "@/lib/types";
import { getDashboards, createDashboard } from "@/lib/db/actions";
import { CreateDashboardModal } from "./CreateDashboardModal";
import { DashboardView } from "./DashboardView";
import { PageSpinner } from "./Spinner";

export function DashboardsTab() {
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(
    null
  );

  const loadDashboards = useCallback(async () => {
    try {
      const data = await getDashboards();
      setDashboards(data);
    } catch (err) {
      console.error("Failed to load dashboards:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboards();
  }, [loadDashboards]);

  const handleCreate = async (name: string, slugs: string[]) => {
    const id = await createDashboard(name, slugs);
    setShowCreate(false);
    await loadDashboards();
    setActiveDashboardId(id);
  };

  const handleBack = useCallback(() => {
    setActiveDashboardId(null);
    loadDashboards();
  }, [loadDashboards]);

  if (activeDashboardId) {
    return (
      <DashboardView dashboardId={activeDashboardId} onBack={handleBack} />
    );
  }

  if (loading) {
    return <PageSpinner />;
  }

  if (dashboards.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] gap-5 p-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-light)] flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[var(--color-primary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              No dashboards yet
            </p>
            <p className="text-sm mt-1 text-[var(--color-text-secondary)]">
              Create a dashboard to monitor multiple biomarkers at a glance
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary mt-1"
          >
            Create Dashboard
          </button>
        </div>

        {showCreate && (
          <CreateDashboardModal
            onSubmit={handleCreate}
            onClose={() => setShowCreate(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative h-full">
      <div className="overflow-auto h-full">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDashboardId(d.id)}
              className="card px-5 py-4 text-left hover:shadow-md transition-all duration-200 hover:border-[var(--color-primary)] group"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                    {d.name}
                  </h3>
                  <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                    {d.biomarkerCount}{" "}
                    {d.biomarkerCount === 1 ? "biomarker" : "biomarkers"}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* FAB button */}
      <button
        onClick={() => setShowCreate(true)}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #0A84FF, #0070E0)",
        }}
        title="Create dashboard"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </button>

      {showCreate && (
        <CreateDashboardModal
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
