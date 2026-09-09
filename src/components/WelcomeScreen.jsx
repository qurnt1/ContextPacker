import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  FileText,
  FolderTree,
  FolderOpen,
  Github,
  Hash,
  History,
  Monitor,
  Scissors,
  ShieldCheck,
  Star,
  Upload,
} from 'lucide-react';
import { useStore } from '../store';
import { getHandle } from '../utils/handleStorage';
import RecentProjectItem from './RecentProjectItem';
import ContextPackerMark from './ContextPackerMark';
import { ScanProgress } from './LinearTokenProgress';

const isSupported = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
const MAX_VISIBLE = 4;

const FEATURES = [
  {
    title: 'Contexte sélectionné',
    description: 'Choisissez les fichiers et dossiers utiles pour donner à votre assistant IA une vue claire de votre projet.',
    icon: FolderOpen,
    tone: 'text-cyber-accent',
  },
  {
    title: 'Traitement local',
    description: 'Vos fichiers restent dans votre navigateur. Les dossiers .git, venv et les caches restent exclus.',
    icon: ShieldCheck,
    tone: 'text-cyan-700',
  },
  {
    title: 'Arborescence du projet',
    description: 'Conservez une structure lisible dans l’export pour aider l’IA à comprendre les relations entre vos fichiers.',
    icon: FolderTree,
    tone: 'text-violet-700',
  },
  {
    title: 'Formats de sortie',
    description: 'Exportez votre contexte en texte brut ou en Markdown selon l’assistant et le workflow utilisés.',
    icon: FileText,
    tone: 'text-cyber-accent',
  },
  {
    title: 'Formatage compact',
    description: 'Réduisez les séparateurs et espaces inutiles pour préparer un contexte plus efficace en tokens.',
    icon: Scissors,
    tone: 'text-cyan-700',
  },
  {
    title: 'Estimation des tokens',
    description: 'Suivez le volume de votre sélection et sa position par rapport à la limite choisie.',
    icon: Hash,
    tone: 'text-violet-700',
  },
];

export default function WelcomeScreen({ onShowOnboarding }) {
  const handleOpenLocal = useStore((s) => s.handleOpenLocal);
  const handleReopenLocal = useStore((s) => s.handleReopenLocal);
  const isScanning = useStore((s) => s.isScanning);
  const scanCount = useStore((s) => s.scanCount);
  const scanTotal = useStore((s) => s.scanTotal);
  const currentFile = useStore((s) => s.currentFile);
  const scanError = useStore((s) => s.scanError);
  const recentProjects = useStore((s) => s.recentProjects || []);
  const removeRecentProject = useStore((s) => s.removeRecentProject);
  const favoriteProjects = useStore((s) => s.favoriteProjects || []);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const dragCounter = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [openingKey, setOpeningKey] = useState(null);
  const [permissionItems, setPermissionItems] = useState(new Set());
  const [errorItem, setErrorItem] = useState(null);
  const welcomeShellRef = useRef(null);
  const presentationRef = useRef(null);
  const [showScrollCue, setShowScrollCue] = useState(true);

  useEffect(() => {
    const shell = welcomeShellRef.current;
    if (!shell) return undefined;

    const handleScroll = () => setShowScrollCue(shell.scrollTop < 24);
    handleScroll();
    shell.addEventListener('scroll', handleScroll, { passive: true });
    return () => shell.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToPresentation = () => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    presentationRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  useEffect(() => {
    let cancelled = false;
    const checkPermissions = async () => {
      const needsPermission = new Set();
      for (const item of recentProjects) {
        if (cancelled) return;
        if (item.type !== 'local') continue;
        const projectId = item.id || item.key?.replace(/^local:/, '');
        if (!projectId || projectId === item.name) {
          needsPermission.add(item.key);
          continue;
        }
        try {
          const saved = await getHandle(projectId);
          if (cancelled) return;
          if (!saved || (await saved.queryPermission({ mode: 'read' })) !== 'granted') {
            needsPermission.add(item.key);
          }
        } catch {
          needsPermission.add(item.key);
        }
      }
      if (!cancelled) setPermissionItems(needsPermission);
    };
    checkPermissions();
    return () => { cancelled = true; };
  }, [recentProjects]);

  const handleRecentOpen = useCallback(async (item) => {
    if (isScanning || item.type !== 'local') return;
    setErrorItem(null);
    setOpeningKey(item.key);
    const result = await handleReopenLocal(item);
    if (!result.ok) {
      if (result.error?.message === 'MISSING_HANDLE' || result.error?.message === 'PERMISSION_DENIED') {
        setPermissionItems((previous) => new Set([...previous, item.key]));
      }
      if (!result.aborted) setErrorItem(item.key);
    }
    setOpeningKey(null);
  }, [handleReopenLocal, isScanning]);

  const handleRelocate = useCallback(async (item) => {
    if (isScanning || !isSupported) return;
    setErrorItem(null);
    setOpeningKey(item.key);
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      const result = await handleOpenLocal(handle);
      if (!result.ok && !result.aborted) setErrorItem(item.key);
      if (result.ok) removeRecentProject(item.key);
    } catch (error) {
      if (error?.name !== 'AbortError') setErrorItem(item.key);
    } finally {
      setOpeningKey(null);
    }
  }, [handleOpenLocal, isScanning, removeRecentProject]);

  const handleDragEnter = (event) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget)) return;
    dragCounter.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (event) => event.preventDefault();

  const handleDragLeave = (event) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget)) return;
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    try {
      for (const item of [...event.dataTransfer.items]) {
        if (item.kind !== 'file') continue;
        const handle = await item.getAsFileSystemHandle();
        if (handle?.kind === 'directory') {
          await handleOpenLocal(handle);
          return;
        }
      }
    } catch (error) {
      if (error?.name !== 'AbortError') console.warn('Échec du glisser-déposer.', error);
    }
    await handleOpenLocal();
  };

  const localProjects = useMemo(
    () => recentProjects.filter((project) => project.type === 'local'),
    [recentProjects]
  );

  const { visibleFavorites, visibleRecents } = useMemo(() => {
    const favoriteKeys = new Set(favoriteProjects);
    const favorites = localProjects.filter((project) => favoriteKeys.has(project.key));
    const recents = localProjects.filter((project) => !favoriteKeys.has(project.key));
    const sortByOpenedAt = (a, b) => (b.openedAt ? Date.parse(b.openedAt) : 0) - (a.openedAt ? Date.parse(a.openedAt) : 0);
    favorites.sort(sortByOpenedAt);
    recents.sort(sortByOpenedAt);
    const visibleFavorites = favorites.slice(0, MAX_VISIBLE);
    return {
      visibleFavorites,
      visibleRecents: recents.slice(0, Math.max(0, MAX_VISIBLE - visibleFavorites.length)),
    };
  }, [favoriteProjects, localProjects]);

  const hasHistory = visibleFavorites.length > 0 || visibleRecents.length > 0;

  return (
    <div
      ref={welcomeShellRef}
      className="welcome-shell relative flex flex-1 items-start justify-center"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <a
        href="https://github.com/qurnt1/ContextPacker"
        target="_blank"
        rel="noreferrer"
        className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-md border border-cyber-border bg-cyber-surface/90 px-2.5 py-1.5 text-[11px] font-medium text-cyber-text-2 shadow-sm transition-colors hover:border-cyber-accent/30 hover:bg-cyber-surface hover:text-cyber-accent"
        title="Voir le code source de ContextPacker sur GitHub"
        aria-label="Gratuit et open source, voir le code source sur GitHub"
      >
        <Github className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Gratuit et open source</span>
      </a>

      {isDragOver ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-cyber-accent/10 p-6" aria-live="polite">
          <div className="card w-full max-w-md border-2 border-dashed border-cyber-accent px-8 py-7 text-center">
            <Monitor className="mx-auto mb-3 h-10 w-10 text-cyber-accent" aria-hidden="true" />
            <p className="text-lg font-semibold text-cyber-text">Déposez le dossier ici</p>
            <p className="mt-1 text-sm text-cyber-text-3">Le scan démarrera automatiquement.</p>
          </div>
        </div>
      ) : null}

      <div className="welcome-content short-height-padding z-10 mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 md:py-14">
        <div className="welcome-primary">
          <div className="welcome-identity mx-auto max-w-3xl">
            <ContextPackerMark className="mx-auto mb-5 h-[120px] w-[120px] object-contain" title="ContextPacker" />

            <h1 className="welcome-title mb-4 text-5xl font-bold text-cyber-text sm:text-6xl">ContextPacker</h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-cyber-text-2 sm:text-lg">
              Transformez un dossier local en contexte clair, sélectionné et prêt à copier dans votre IA.
            </p>
          </div>

          <div className="welcome-launch mt-6">
          <div className="welcome-card mx-auto w-full max-w-3xl rounded-lg p-5 text-left sm:p-7">
          {isScanning ? (
            <ScanProgress count={scanCount} total={scanTotal} currentFile={currentFile} />
          ) : (
            <div className="space-y-3">
              {isSupported ? (
                <button
                  type="button"
                  onClick={() => { void handleOpenLocal(); }}
                  disabled={isScanning}
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-cyber-accent px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-cyber-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FolderOpen className="h-5 w-5" aria-hidden="true" />
                  <span>Ouvrir un dossier local</span>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-center text-amber-900">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  <span className="text-sm font-medium">L’ouverture de dossiers n’est pas disponible dans ce navigateur.</span>
                  <p className="text-xs text-amber-800">Utilisez Chrome, Edge ou un navigateur basé sur Chromium.</p>
                </div>
              )}
              <div className="welcome-dropzone rounded-lg border border-dashed px-3 py-3 text-center">
                <Upload className="mr-1.5 inline h-4 w-4 text-cyber-text-3" aria-hidden="true" />
                <span className="text-[11px] text-cyber-text-3">Glissez-déposez un dossier ici</span>
              </div>
            </div>
          )}

          {scanError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800" role="alert">
              {scanError}
            </div>
          ) : null}
          </div>

          {errorItem ? (
            <div className="mx-auto mt-3 w-full max-w-3xl rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-center text-xs text-red-800" role="alert">
              Impossible de rouvrir ce dossier. Relocalisez-le pour continuer.
            </div>
          ) : null}

          {hasHistory ? (
            <div className="mx-auto mt-7 w-full max-w-3xl text-left">
              {visibleFavorites.length > 0 ? (
                <section aria-labelledby="favorite-projects-title">
                  <h2 id="favorite-projects-title" className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyber-text-3">
                    <Star className="h-3 w-3 text-amber-600" aria-hidden="true" /> Favoris
                  </h2>
                  <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {visibleFavorites.map((item) => (
                      <RecentProjectItem
                        key={item.key}
                        item={item}
                        onOpen={handleRecentOpen}
                        onDelete={removeRecentProject}
                        onRelocate={handleRelocate}
                        disabled={isScanning}
                        isOpening={openingKey === item.key}
                        needsPermission={permissionItems.has(item.key)}
                        isFavorite
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {visibleRecents.length > 0 ? (
                <section aria-labelledby="recent-projects-title">
                  <h2 id="recent-projects-title" className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyber-text-3">
                    <History className="h-3 w-3" aria-hidden="true" /> Dossiers récents
                  </h2>
                  <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                    {visibleRecents.map((item) => (
                      <RecentProjectItem
                        key={item.key}
                        item={item}
                        onOpen={handleRecentOpen}
                        onDelete={removeRecentProject}
                        onRelocate={handleRelocate}
                        disabled={isScanning}
                        isOpening={openingKey === item.key}
                        needsPermission={permissionItems.has(item.key)}
                        isFavorite={false}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-cyber-text-3">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-cyber-accent" aria-hidden="true" /> Traitement local</span>
            <span aria-hidden="true">•</span>
            <span>Aucun fichier envoyé</span>
            <span aria-hidden="true">•</span>
            <button type="button" data-testid="welcome-guide-button" onClick={onShowOnboarding} className="transition-colors hover:text-cyber-accent">
              Guide de démarrage
            </button>
          </div>

          {showScrollCue ? (
            <button
              type="button"
              onClick={scrollToPresentation}
              className="welcome-scroll-cue"
              title="Voir la présentation"
              aria-label="Voir la présentation"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          </div>
        </div>

        <section ref={presentationRef} className="mx-auto mt-8 w-full max-w-4xl scroll-mt-4 text-left" aria-labelledby="welcome-features-title">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyber-accent">ContextPacker</p>
            <h2 id="welcome-features-title" className="mt-2 text-2xl font-semibold text-cyber-text sm:text-3xl">
              Tout le nécessaire pour préparer votre contexte IA
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-cyber-text-2 sm:text-base">
              ContextPacker facilite le partage de votre code avec vos assistants IA tout en vous laissant le contrôle sur les fichiers transmis.
            </p>
          </div>

          <div className="mt-8 grid gap-x-10 sm:grid-cols-2">
            {FEATURES.map(({ title, description, icon: Icon, tone }) => (
              <article key={title} className="border-t border-cyber-border py-5">
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-cyber-text">{title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-cyber-text-2">{description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 w-full max-w-4xl border-t border-cyber-border pt-10 text-left" aria-labelledby="welcome-how-title">
          <h2 id="welcome-how-title" className="text-2xl font-semibold text-cyber-text sm:text-3xl">Comment ça marche</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cyber-text-2 sm:text-base">
            Préparez un contexte plus précis pour vos demandes de développement en trois étapes simples.
          </p>
          <ol className="mt-7 grid gap-6 sm:grid-cols-3">
            <li className="border-l-2 border-cyber-accent pl-4">
              <span className="font-mono text-xs font-bold text-cyber-accent">01</span>
              <h3 className="mt-2 text-sm font-semibold text-cyber-text">Ouvrez un dossier</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-cyber-text-2">Sélectionnez un dossier local ou glissez-le dans la zone prévue.</p>
            </li>
            <li className="border-l-2 border-cyan-500 pl-4">
              <span className="font-mono text-xs font-bold text-cyan-700">02</span>
              <h3 className="mt-2 text-sm font-semibold text-cyber-text">Ajustez la sélection</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-cyber-text-2">Filtrez les fichiers, activez le formatage compact et vérifiez les tokens.</p>
            </li>
            <li className="border-l-2 border-violet-500 pl-4">
              <span className="font-mono text-xs font-bold text-violet-700">03</span>
              <h3 className="mt-2 text-sm font-semibold text-cyber-text">Copiez le contexte</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-cyber-text-2">Exportez en TXT ou Markdown puis transmettez uniquement ce dont l’IA a besoin.</p>
            </li>
          </ol>
        </section>

      </div>

    </div>
  );
}
