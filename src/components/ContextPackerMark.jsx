import { Zap } from 'lucide-react';

export default function ContextPackerMark({ className = 'w-6 h-6', title }) {
  return (
    <Zap
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
