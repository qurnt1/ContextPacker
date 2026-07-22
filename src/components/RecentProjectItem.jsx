import { motion } from 'framer-motion';
import { FolderOpen, Github, AlertTriangle, Trash2, Star } from 'lucide-react';

function formatRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
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
  const isGithub = item.type === 'github';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => { if (disabled) return; needsPermission ? onRelocate?.(item) : onOpen(item); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' && !disabled) { needsPermission ? onRelocate?.(item) : onOpen(item); } }}
      className={`group flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
        isOpening
          ? 'border-cyber-accent/40 bg-cyber-accent/5'
          : 'border-cyber-border bg-cyber-surface/60 hover:border-cyber-accent/25 hover:bg-cyber-surface'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Favorite star */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(item.key); }}
        disabled={disabled}
        className={`p-0.5 rounded transition-colors flex-shrink-0 ${
          isFavorite
            ? 'text-amber-400 hover:text-amber-300'
            : 'text-cyber-text-3 hover:text-amber-400 opacity-0 group-hover:opacity-100'
        }`}
        title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
      </button>

      {/* Icon */}
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
        isGithub ? 'bg-purple-500/10 text-purple-400' : 'bg-cyber-accent/10 text-cyber-accent'
      }`}>
        {isGithub ? <Github className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-cyber-text truncate" title={item.name}>
            {item.name}
          </p>
          {isGithub && item.ref && (
            <span className="text-[9px] font-mono text-cyber-text-3 bg-cyber-surface-2 px-1 py-0.5 rounded flex-shrink-0 hidden sm:inline" title={item.ref}>
              {item.ref}
            </span>
          )}
        </div>
        <p className="text-[10px] text-cyber-text-3 mt-0.5">
          {isGithub ? 'GitHub' : 'Local'}
          {item.fileCount != null ? ` · ${item.fileCount} fichiers` : ''}
          {item.openedAt ? ` · ${formatRelative(item.openedAt)}` : ''}
        </p>
      </div>

      {/* Permission warning */}
      {needsPermission && (
        <span className="text-amber-500 flex-shrink-0" title="Permission d'accès au dossier requise">
          <AlertTriangle className="w-3.5 h-3.5" />
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.key); }}
          disabled={disabled}
          className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-red-400 transition-all"
          title="Retirer de l'historique"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}
