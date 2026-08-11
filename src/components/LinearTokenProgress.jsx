import { motion } from 'framer-motion';

/**
 * Linear horizontal token progress bar.
 *
 * Props:
 *  - current: number (tokens used)
 *  - limit:   number (token limit)
 *  - isWarning: boolean (override: force warning state)
 *  - warningPercent: number (configured warning threshold)
 */
export default function LinearTokenProgress({ current, limit, isWarning, warningPercent = 80 }) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const realPct = limit > 0 ? (current / limit) * 100 : 0;
  const danger = realPct > 100;
  const safeWarningPercent = Number.isFinite(warningPercent)
    ? Math.min(Math.max(warningPercent, 0), 100)
    : 80;
  const warn = realPct > safeWarningPercent || isWarning;

  const barColor = danger
    ? 'var(--cp-danger, #ef4444)'
    : warn
      ? 'var(--cp-warning, #f59e0b)'
      : 'var(--cp-accent, #22c55e)';

  return (
    <div className="flex items-center gap-2 flex-1 max-w-md">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={current}
        aria-label="Utilisation des tokens"
        className="flex-1 h-2 rounded-sm overflow-hidden"
        style={{
          background: 'var(--cp-surface-2)',
        }}
      >
        <motion.div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: barColor,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
