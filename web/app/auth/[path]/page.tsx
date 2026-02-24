import { AuthView } from "@neondatabase/auth/react";

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  return (
    <div className="flex items-center justify-center min-h-screen">
      <AuthView path={path} />
    </div>
  );
}
