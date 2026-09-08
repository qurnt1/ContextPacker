import { Zap } from 'lucide-react';

export default function ContextPackerMark({ className = 'h-6 w-6', title }) {
  return (
    <Zap
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
