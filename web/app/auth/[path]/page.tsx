import { AuthView } from "@neondatabase/auth/react";
import { Logo } from "@/components/Logo";

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-surface-secondary)]">
      <Logo className="h-10 mb-6" />
      <AuthView
        path={path}
        classNames={{
          footerLink: "!text-[var(--color-primary)] font-medium",
        }}
      />
    </div>
  );
}
