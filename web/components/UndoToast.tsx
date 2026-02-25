"use client";

import { useEffect, useState } from "react";

interface UndoToastProps {
  name: string;
  onUndo: () => void;
}

export function UndoToast({ name, onUndo }: UndoToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-up on next frame
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: visible ? 24 : -60,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        background: "#fff",
        borderRadius: 999,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
        zIndex: 9999,
        transition: "bottom 0.25s ease-out",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontSize: 14,
          color: "var(--color-text-primary)",
        }}
      >
        &ldquo;{name}&rdquo; deleted
      </span>
      <button
        onClick={onUndo}
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--color-primary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px 4px",
          borderRadius: 4,
        }}
      >
        Undo
      </button>
    </div>
  );
}
