import { getShareByToken } from "@/lib/db/actions/doctor-shares";
import { ShareView } from "@/components/ShareView";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await getShareByToken(token);

  if (!share) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-secondary)]">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Share not found
          </h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            This link may have been revoked or does not exist.
          </p>
        </div>
      </div>
    );
  }

  if (share.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-secondary)]">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Share expired
          </h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            This link has expired. Please ask the patient for a new link.
          </p>
        </div>
      </div>
    );
  }

  return <ShareView token={token} userName={share.userName} />;
}
