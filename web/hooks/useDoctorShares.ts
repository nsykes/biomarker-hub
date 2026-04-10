import { useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { DoctorShareInfo } from "@/lib/types";
import { createDoctorShare, revokeDoctorShare } from "@/lib/db/actions";

export function useDoctorShares(
  sharesList: DoctorShareInfo[],
  setSharesList: Dispatch<SetStateAction<DoctorShareInfo[]>>
) {
  const [newLabel, setNewLabel] = useState("");
  const [expiration, setExpiration] = useState("30d");
  const [creating, setCreating] = useState(false);
  const [newShare, setNewShare] = useState<{
    link: string;
    password: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (userName: string) => {
      if (!newLabel.trim()) return;
      setCreating(true);
      try {
        const expiresAt = getExpirationDate(expiration);
        const result = await createDoctorShare(
          newLabel.trim(),
          userName,
          expiresAt
        );
        if ("error" in result) {
          console.error("Doctor share DB error:", result.error);
          return;
        }
        const { token, password, info } = result;
        const link = `${window.location.origin}/share/${token}`;
        setNewShare({ link, password });
        setSharesList((prev) => [info, ...prev]);
      } catch (err) {
        console.error("Failed to create share:", err);
      } finally {
        setCreating(false);
      }
    },
    [newLabel, expiration, setSharesList]
  );

  const handleRevoke = useCallback(
    async (id: string) => {
      setRevokingId(id);
      try {
        await revokeDoctorShare(id);
        setSharesList((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        console.error("Failed to revoke share:", err);
      } finally {
        setRevokingId(null);
      }
    },
    [setSharesList]
  );

  const dismissNewShare = useCallback(() => {
    setNewShare(null);
    setNewLabel("");
  }, []);

  const copyLink = useCallback(() => {
    if (newShare) {
      navigator.clipboard.writeText(newShare.link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [newShare]);

  const copyPassword = useCallback(() => {
    if (newShare) {
      navigator.clipboard.writeText(newShare.password);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    }
  }, [newShare]);

  return {
    newLabel,
    setNewLabel,
    expiration,
    setExpiration,
    creating,
    newShare,
    linkCopied,
    passwordCopied,
    revokingId,
    handleCreate,
    handleRevoke,
    dismissNewShare,
    copyLink,
    copyPassword,
  };
}

function getExpirationDate(value: string): string | null {
  if (value === "never") return null;
  const now = new Date();
  const days: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };
  const d = days[value];
  if (!d) return null;
  now.setDate(now.getDate() + d);
  return now.toISOString();
}
