export default function ContextPackerMark({ className = 'w-6 h-6', title }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M18.5 4.5h-6.8a7.5 7.5 0 1 0 0 15h6.8v-3.2h-6.8a4.3 4.3 0 1 1 0-8.6h6.8V4.5Z"
        fill="currentColor"
      />
      <rect x="15" y="8.5" width="4" height="3" rx="1" fill="var(--cp-accent)" />
      <rect x="15" y="12.5" width="4" height="3" rx="1" fill="var(--cp-accent)" />
    </svg>
  );
}
