export function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="5 4 252 48"
      role="img"
      aria-label="Biomarker Hub"
      className={className}
    >
      <g id="icon" transform="translate(6, 4)">
        <rect x="8" y="8" width="48" height="6" rx="3" fill="#0A84FF" opacity="0.08" />
        <rect x="20" y="8" width="24" height="6" rx="3" fill="#0A84FF" opacity="0.2" />
        <circle cx="30" cy="11" r="5" fill="#0A84FF" />
        <circle cx="30" cy="11" r="2" fill="white" />
        <rect x="8" y="22" width="48" height="6" rx="3" fill="#0A84FF" opacity="0.08" />
        <rect x="16" y="22" width="30" height="6" rx="3" fill="#0A84FF" opacity="0.2" />
        <circle cx="38" cy="25" r="5" fill="#0A84FF" opacity="0.6" />
        <circle cx="38" cy="25" r="2" fill="white" />
        <rect x="8" y="36" width="48" height="6" rx="3" fill="#0A84FF" opacity="0.08" />
        <rect x="22" y="36" width="20" height="6" rx="3" fill="#0A84FF" opacity="0.2" />
        <circle cx="34" cy="39" r="5" fill="#0A84FF" opacity="0.35" />
        <circle cx="34" cy="39" r="2" fill="white" />
      </g>
      <g id="wordmark" transform="translate(74, 0)">
        <text x="0" y="36" fontFamily="-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" fontSize="26" fontWeight="600" fill="currentColor" letterSpacing="-0.5">Biomarker</text>
        <text x="130" y="36" fontFamily="-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" fontSize="26" fontWeight="400" fill="#0A84FF" letterSpacing="-0.5">Hub</text>
      </g>
    </svg>
  );
}
