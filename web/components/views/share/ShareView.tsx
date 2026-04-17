"use client";

import { useState } from "react";
import type { SharedBiomarkerSummary } from "@/lib/db/actions/doctor-shares";
import { ShareAuthForm } from "./ShareAuthForm";
import { ShareBiomarkerList } from "./ShareBiomarkerList";
import { ShareBiomarkerDetail } from "./ShareBiomarkerDetail";

interface ShareViewProps {
  token: string;
  userName: string;
}

export function ShareView({ token, userName }: ShareViewProps) {
  const [session, setSession] = useState<{
    password: string;
    summaries: SharedBiomarkerSummary[];
  } | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  if (!session) {
    return (
      <ShareAuthForm
        token={token}
        userName={userName}
        onAuthenticated={(password, summaries) =>
          setSession({ password, summaries })
        }
      />
    );
  }

  if (activeSlug) {
    return (
      <ShareBiomarkerDetail
        token={token}
        password={session.password}
        slug={activeSlug}
        onBack={() => setActiveSlug(null)}
      />
    );
  }

  return (
    <ShareBiomarkerList
      userName={userName}
      summaries={session.summaries}
      onSelect={setActiveSlug}
    />
  );
}
