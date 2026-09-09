import { AlertTriangle, FolderOpen, Loader2, Star, Trash2 } from 'lucide-react';

function formatRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return `il y a ${Math.floor(days / 30)} mois`;
}

export default function RecentProjectItem({
  item,
  onOpen,
  onDelete,
  disabled,
  isOpening,
  needsPermission,
  onRelocate,
  isFavorite,
  onToggleFavorite,
}) {
  const handleOpen = () => {
    if (!disabled) needsPermission ? onRelocate?.(item) : onOpen(item);
  };

  return (
    <div className={`group flex min-w-0 items-center gap-2 rounded-lg border bg-cyber-surface px-3 py-2 transition ${isOpening ? 'border-cyber-accent/50 bg-cyber-accent/5' : 'border-cyber-border hover:border-cyber-accent/35'} ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onToggleFavorite?.(item.key); }}
        disabled={disabled}
        className={`shrink-0 rounded p-0.5 transition-colors ${isFavorite ? 'text-amber-600' : 'text-cyber-text-3 opacity-0 hover:text-amber-600 group-hover:opacity-100'}`}
        title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="flex min-w-0 flex-1 items-center gap-2 rounded text-left focus-visible:outline-none"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyber-accent/10 text-cyber-accent">
          {isOpening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FolderOpen className="h-4 w-4" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-cyber-text" title={item.name}>{item.name}</span>
          <span className="mt-0.5 block truncate text-[10px] text-cyber-text-3">
            Dossier local
            {item.fileCount != null ? ` · ${item.fileCount} fichiers` : ''}
            {item.openedAt ? ` · ${formatRelative(item.openedAt)}` : ''}
          </span>
        </span>
        {needsPermission ? (
          <span className="shrink-0 text-amber-700" title="Permission d’accès au dossier requise">
            <AlertTriangle className="h-3.5 w-3.5" aria-label="Permission requise" />
          </span>
        ) : null}
      </button>

      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onDelete(item.key); }}
        disabled={disabled}
        className="shrink-0 rounded p-1 text-cyber-text-3 opacity-0 transition hover:bg-cyber-surface-2 hover:text-red-700 group-hover:opacity-100"
        title="Retirer de l’historique"
        aria-label={`Retirer ${item.name} de l’historique`}
      >
        <Trash2 className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}
