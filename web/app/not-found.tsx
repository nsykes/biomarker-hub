import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg)]">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Page not found
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/" className="btn-primary inline-block">
          Go home
        </Link>
      </div>
    </div>
  );
}
