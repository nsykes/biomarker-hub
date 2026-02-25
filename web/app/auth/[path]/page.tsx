import { AuthView } from "@neondatabase/auth/react";

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-surface-secondary)]">
      <img src="/logo.svg" alt="Biomarker Hub" className="h-8 mb-6" />
      <AuthView
        path={path}
        classNames={{
          footerLink: "!text-[#0A84FF] font-medium",
        }}
      />
    </div>
  );
}
