"use client";

import { Suspense } from "react";
import { ShellFrame } from "@/components/shell/ShellFrame";

export default function HomePage() {
  return (
    <Suspense>
      <ShellFrame />
    </Suspense>
  );
}
