"use client";

import { usePasswordChange } from "@/hooks/usePasswordChange";

export function PasswordSection() {
  const {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordSaving,
    passwordError,
    passwordSuccess,
    clearError,
    handlePasswordChange,
  } = usePasswordChange();

  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
        Change Password
      </h2>
      <div className="space-y-2.5">
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] block mb-1.5">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              clearError();
            }}
            disabled={passwordSaving}
            className="input-base"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] block mb-1.5">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              clearError();
            }}
            disabled={passwordSaving}
            className="input-base"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] block mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearError();
            }}
            disabled={passwordSaving}
            className="input-base"
          />
        </div>
        {passwordError && (
          <div className="rounded-lg px-3 py-2 text-sm text-[var(--color-error-text)] bg-[var(--color-error-bg)]">
            {passwordError}
          </div>
        )}
        {passwordSuccess && (
          <p className="text-xs text-[var(--color-success)] font-medium">Password changed</p>
        )}
        <button
          onClick={handlePasswordChange}
          disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          className={passwordSuccess ? "btn-primary !bg-[var(--color-success)]" : "btn-primary"}
        >
          {passwordSaving ? "Saving..." : passwordSuccess ? "Changed!" : "Change Password"}
        </button>
      </div>
    </section>
  );
}
