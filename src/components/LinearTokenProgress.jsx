import { Check, FolderSearch, Loader2, ScanSearch } from 'lucide-react';

const SCAN_STAGES = [
  { key: 'preparation', label: 'Préparation', icon: Loader2 },
  { key: 'exploration', label: 'Exploration', icon: FolderSearch },
  { key: 'analyse', label: 'Analyse', icon: ScanSearch },
  { key: 'finalisation', label: 'Finalisation', icon: Check },
];

function getScanStage(total, count, currentFile) {
  if (!total) return 'preparation';
  if (count >= total) return 'finalisation';
  return currentFile ? 'analyse' : 'exploration';
}

export function ScanProgress({ count = 0, total = 0, currentFile = '' }) {
  const stage = getScanStage(total, count, currentFile);
  const stageIndex = SCAN_STAGES.findIndex(({ key }) => key === stage);
  const percent = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : null;
  const stageLabel = SCAN_STAGES[stageIndex]?.label || 'Préparation';

  return (
    <div className="scan-stage space-y-4 p-4 sm:p-5" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cyber-text">{stageLabel} du dossier</p>
          <p className="mt-1 truncate text-xs text-cyber-text-3" title={currentFile || undefined}>
            {currentFile ? `Lecture de ${currentFile}` : total ? 'Préparation des fichiers...' : 'Comptage des fichiers...'}
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-cyber-accent">
          {percent == null ? 'En cours' : `${count}/${total}`}
        </span>
      </div>

      <div className="flex items-center gap-1.5" aria-label="Étapes du scan">
        {SCAN_STAGES.map(({ key, label, icon: Icon }, index) => {
          const isDone = index < stageIndex;
          const isActive = index === stageIndex;
          return (
            <div key={key} className={`flex min-w-0 flex-1 items-center gap-1.5 text-[10px] font-medium ${isDone ? 'scan-step-done' : isActive ? 'scan-step-active' : 'text-cyber-text-3'}`} aria-current={isActive ? 'step' : undefined}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current">
                <Icon className={`h-3 w-3 ${isActive && key === 'preparation' ? 'animate-spin' : ''}`} aria-hidden="true" />
              </span>
              <span className="hidden truncate sm:inline">{label}</span>
            </div>
          );
        })}
      </div>

      <div
        className="scan-track"
        role="progressbar"
        aria-label="Progression de l’analyse du dossier"
        aria-valuemin={0}
        aria-valuemax={total || undefined}
        aria-valuenow={total ? count : undefined}
        aria-valuetext={total ? `${count} fichiers sur ${total}, étape ${stageLabel}` : `Étape ${stageLabel}`}
      >
        <div className={`scan-fill ${total ? '' : 'scan-fill-indeterminate'}`} style={total ? { transform: `scaleX(${percent / 100})` } : undefined} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-cyber-text-3">
        <span>{total ? `${percent}% analysé` : 'Le total sera affiché dès qu’il sera connu'}</span>
        {total ? <span className="font-mono tabular-nums">{total} fichiers détectés</span> : null}
      </div>
    </div>
  );
}

export default function LinearTokenProgress({ current = 0, limit = 0, isWarning, warningPercent = 80 }) {
  const realPercent = limit > 0 ? (current / limit) * 100 : 0;
  const percent = Math.min(realPercent, 100);
  const danger = realPercent > 100;
  const safeWarningPercent = Number.isFinite(warningPercent)
    ? Math.min(Math.max(warningPercent, 0), 100)
    : 80;
  const warning = realPercent > safeWarningPercent || isWarning;
  const barColor = danger ? 'var(--cp-danger)' : warning ? 'var(--cp-warning)' : 'var(--cp-accent)';

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div
        className="token-progress-track h-2 min-w-0 flex-1 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={current}
        aria-label="Utilisation des tokens"
      >
        <div className="token-progress-fill h-full rounded-full" style={{ transform: `scaleX(${percent / 100})`, backgroundColor: barColor }} />
      </div>
    </div>
  );
}
