"use client";

import { useCallback, useState } from "react";

interface UseModalFormOptions {
  /** Called on successful submit when `closeOnSuccess` is true. */
  onClose: () => void;
  /** If the parent's onSubmit handler closes the modal itself (e.g., via
   *  state change that unmounts this component), set to `false`. Default true. */
  closeOnSuccess?: boolean;
  /** Shown when the caught value isn't an Error instance. */
  defaultError?: string;
}

/** Shared saving/error state + submit-wrapping used by Create/Edit modals.
 *
 *  Each modal supplies its own submit function; this hook handles the
 *  meta-state (toggling `saving`, clearing `error`, catching failures,
 *  optionally closing on success). Keeps modal bodies focused on their
 *  own form fields and validation. */
export function useModalForm(options: UseModalFormOptions) {
  const { onClose, closeOnSuccess = true, defaultError = "Failed to save" } =
    options;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrapSubmit = useCallback(
    <T,>(fn: () => Promise<T>) => {
      return async () => {
        setSaving(true);
        setError(null);
        try {
          await fn();
          if (closeOnSuccess) onClose();
        } catch (e) {
          setError(e instanceof Error ? e.message : defaultError);
        } finally {
          setSaving(false);
        }
      };
    },
    [onClose, closeOnSuccess, defaultError]
  );

  return { saving, error, setError, wrapSubmit };
}
