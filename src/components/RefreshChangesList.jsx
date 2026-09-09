import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Search, X } from 'lucide-react';
import { formatNumber } from '../utils/helpers';

const FILTERS = [
  { key: 'all', label: 'Tous', countKey: 'totalChanged' },
  { key: 'added', label: 'Ajoutés', countKey: 'addedFileCount' },
  { key: 'modified', label: 'Modifiés', countKey: 'modifiedFileCount' },
  { key: 'removed', label: 'Supprimés', countKey: 'removedFileCount' },
];

const KIND_STYLES = {
  added: {
    label: 'Ajouté',
    groupLabel: 'Dossier ajouté',
    text: 'text-emerald-700',
    icon: 'text-emerald-600',
    surface: 'bg-emerald-50/70 hover:bg-emerald-50',
  },
  modified: {
    label: 'Modifié',
    groupLabel: 'Dossier modifié',
    text: 'text-amber-700',
    icon: 'text-amber-600',
    surface: 'bg-amber-50/70 hover:bg-amber-50',
  },
  removed: {
    label: 'Supprimé',
    groupLabel: 'Dossier supprimé',
    text: 'text-red-700',
    icon: 'text-red-600',
    surface: 'bg-red-50/70 hover:bg-red-50',
  },
};

function getKindStyle(kind) {
  return KIND_STYLES[kind] || KIND_STYLES.modified;
}

function getGroups(summary) {
  if (Array.isArray(summary?.changeGroups) && summary.changeGroups.length > 0) return summary.changeGroups;
  return (summary?.changes || []).map((change) => ({
    type: 'file',
    path: change.path,
    kind: change.kind,
    fileCount: 1,
    addedLines: change.addedLines,
    removedLines: change.removedLines,
    changedLines: change.changedLines,
    changes: [change],
  }));
}

function summarizeChanges(changes) {
  return {
    fileCount: changes.length,
    addedLines: changes.reduce((total, change) => total + (change.addedLines || 0), 0),
    removedLines: changes.reduce((total, change) => total + (change.removedLines || 0), 0),
    changedLines: changes.reduce((total, change) => total + (change.changedLines || 0), 0),
  };
}

function getVisibleGroups(groups, filter, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase('fr-FR');

  return groups
    .map((group) => {
      const groupMatches = !normalizedQuery || group.path.toLocaleLowerCase('fr-FR').includes(normalizedQuery);
      const changes = group.changes.filter((change) => {
        const kindMatches = filter === 'all' || change.kind === filter;
        const pathMatches = groupMatches || change.path.toLocaleLowerCase('fr-FR').includes(normalizedQuery);
        return kindMatches && pathMatches;
      });
      return { ...group, ...summarizeChanges(changes), changes };
    })
    .filter((group) => group.changes.length > 0);
}

function LineDelta({ addedLines, removedLines }) {
  return (
    <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] tabular-nums">
      {addedLines > 0 ? <span className="text-emerald-700">+{formatNumber(addedLines)}</span> : null}
      {removedLines > 0 ? <span className="text-red-700">−{formatNumber(removedLines)}</span> : null}
      {addedLines === 0 && removedLines === 0 ? <span className="text-cyber-text-3">0 ligne</span> : null}
    </span>
  );
}

function FileChangeRow({ change }) {
  const style = getKindStyle(change.kind);
  return (
    <li className="flex min-w-0 items-center gap-2 border-t border-cyber-border/60 px-3 py-2 text-xs first:border-t-0">
      <FileText className={`h-3.5 w-3.5 shrink-0 ${style.icon}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-mono text-cyber-text-2" title={change.path}>{change.path}</span>
      <span className={`shrink-0 text-[10px] ${style.text}`}>{style.label}</span>
      <LineDelta addedLines={change.addedLines || 0} removedLines={change.removedLines || 0} />
    </li>
  );
}

function DirectoryChangeGroup({ group, expanded, onToggle }) {
  const style = getKindStyle(group.kind);
  const FolderIcon = expanded ? FolderOpen : Folder;
  const action = expanded ? 'Replier' : 'Déplier';

  return (
    <li className="border-b border-cyber-border/70 last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(group.path)}
        aria-expanded={expanded}
        aria-label={`${action} le dossier ${group.path}`}
        className={`flex w-full min-w-0 items-center gap-2 px-3 py-2.5 text-left transition-colors ${style.surface}`}
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-cyber-text-3" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-cyber-text-3" aria-hidden="true" />}
        <FolderIcon className={`h-4 w-4 shrink-0 ${style.icon}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-xs font-medium text-cyber-text" title={group.path}>{group.path}/</span>
          <span className="mt-0.5 block text-[10px] text-cyber-text-3">
            {group.fileCount} fichier{group.fileCount > 1 ? 's' : ''} · {style.groupLabel.toLocaleLowerCase('fr-FR')}
          </span>
        </span>
        <LineDelta addedLines={group.addedLines || 0} removedLines={group.removedLines || 0} />
      </button>
      {expanded ? (
        <ul className="bg-white/60 px-2 py-1.5">
          {group.changes.map((change) => <FileChangeRow key={`${change.kind}:${change.path}`} change={change} />)}
        </ul>
      ) : null}
    </li>
  );
}

export default function RefreshChangesList({ summary }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState(() => new Set());
  const groups = useMemo(() => getGroups(summary), [summary]);
  const visibleGroups = useMemo(() => getVisibleGroups(groups, filter, query), [groups, filter, query]);
  const visibleFileCount = visibleGroups.reduce((total, group) => total + group.fileCount, 0);

  useEffect(() => {
    if (!query) return;
    setExpandedPaths((current) => {
      const next = new Set(current);
      groups.filter((group) => group.type === 'directory').forEach((group) => next.add(group.path));
      return next;
    });
  }, [groups, query]);

  const toggleGroup = (path) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2" aria-labelledby="refresh-summary-changes">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="refresh-summary-changes" className="text-[10px] font-semibold uppercase tracking-wider text-cyber-text-3">
          Toutes les différences
        </h3>
        <span className="text-[10px] text-cyber-text-3">{visibleFileCount} fichier{visibleFileCount > 1 ? 's' : ''} affiché{visibleFileCount > 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-cyber-border bg-cyber-surface-2 p-1" role="group" aria-label="Filtrer les changements">
        {FILTERS.map((item) => {
          const active = filter === item.key;
          const count = summary?.[item.countKey] || 0;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              aria-pressed={active}
              aria-label={`${item.label} ${count}`}
              className={`flex min-h-7 flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors sm:flex-none ${active ? 'bg-cyber-surface text-cyber-accent shadow-sm' : 'text-cyber-text-3 hover:bg-cyber-surface hover:text-cyber-text-2'}`}
            >
              <span>{item.label}</span>
              <span className="font-mono tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cyber-text-3" aria-hidden="true" />
        <label htmlFor="refresh-change-search" className="sr-only">Rechercher dans les différences</label>
        <input
          id="refresh-change-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtrer les chemins..."
          className="h-8 w-full rounded-md border border-cyber-border bg-cyber-surface pl-8 pr-8 text-xs text-cyber-text placeholder:text-cyber-text-3/70 focus:border-cyber-accent focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-cyber-text-3 hover:bg-cyber-surface-2 hover:text-cyber-text"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div data-testid="refresh-changes-list" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-cyber-border bg-cyber-surface-2/50">
        {visibleGroups.length > 0 ? (
          <ul aria-label="Différences du projet">
            {visibleGroups.map((group) => (
              group.type === 'directory' ? (
                <DirectoryChangeGroup
                  key={`${group.kind}:${group.path}`}
                  group={group}
                  expanded={expandedPaths.has(group.path)}
                  onToggle={toggleGroup}
                />
              ) : (
                <FileChangeRow key={`${group.kind}:${group.path}`} change={group.changes[0]} />
              )
            ))}
          </ul>
        ) : (
          <p className="px-3 py-8 text-center text-[11px] text-cyber-text-3">Aucune différence pour ce filtre.</p>
        )}
      </div>
    </section>
  );
}
