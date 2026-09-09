export default function ContextPackerMark({ className = 'h-6 w-6', title }) {
  const logoSrc = `${import.meta.env.BASE_URL}contextpacker-logo.png`;

  return (
    <img
      src={logoSrc}
      className={className}
      alt={title || ''}
      title={title || undefined}
      aria-hidden={title ? undefined : true}
    />
  );
}
