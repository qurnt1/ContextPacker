import { useId } from 'react';

export default function ContextPackerMark({ className = 'w-6 h-6', title }) {
  const maskId = `context-packer-mark-${useId().replaceAll(':', '')}`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <rect x="3.5" y="6" width="12.5" height="15" rx="2.5" fill="currentColor" opacity="0.3" />
      <rect x="5.5" y="4" width="12.5" height="15" rx="2.5" fill="currentColor" opacity="0.62" />
      <mask id={maskId} maskUnits="userSpaceOnUse" x="7" y="2" width="14" height="20">
        <rect x="7" y="2" width="13.5" height="19" rx="2.5" fill="white" />
        <path
          d="M11 17V7h4.1a3 3 0 1 1 0 6H11m2-4v2h2.1a1 1 0 1 0 0-2H13Z"
          fill="none"
          stroke="black"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </mask>
      <rect x="7" y="2" width="13.5" height="19" rx="2.5" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
