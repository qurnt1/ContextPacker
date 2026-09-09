import { useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useStore, selectHasProject } from './store';
import WelcomeScreen from './components/WelcomeScreen';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import Dashboard from './components/Dashboard';
import WarningPopup from './components/WarningPopup';
import ShortcutHelp from './components/ShortcutHelp';
import OnboardingWizard from './components/OnboardingWizard';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function AppInner() {
  const hasProject = useStore(selectHasProject);
  const isScanning = useStore((s) => s.isScanning);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const setSidebarWidth = useStore((s) => s.setSidebarWidth);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const onboardingDone = useStore((s) => s.onboardingDone);
  const setOnboardingDone = useStore((s) => s.setOnboardingDone);
  const effectiveSidebarWidth = sidebarCollapsed ? 52 : sidebarWidth;

  const [showOnboarding, setShowOnboarding] = useState(false);

  const { showHelp, openHelp, closeHelp } = useKeyboardShortcuts();

  // Auto-show onboarding only on first launch, and NOT during a scan
  useEffect(() => {
    if (!onboardingDone && !hasProject && !isScanning) {
      const timer = setTimeout(() => setShowOnboarding(true), 400);
      return () => clearTimeout(timer);
    }
  }, [onboardingDone, hasProject, isScanning]);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingDone();
  }, [setOnboardingDone]);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = useStore.getState().sidebarWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      setSidebarWidth(startWidth + delta);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }, [setSidebarWidth]);

  const handleResizeKeyDown = useCallback((event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 16 : -16;
    setSidebarWidth(useStore.getState().sidebarWidth + delta);
  }, [setSidebarWidth]);

  return (
    <div className="app-shell h-screen flex flex-col bg-cyber-bg text-cyber-text font-sans overflow-hidden">
      <AnimatePresence mode="wait">
        {!hasProject ? (
          <WelcomeScreen key="welcome" onShowOnboarding={() => setShowOnboarding(true)} />
        ) : (
          <motion.div
            key="main"
            className="flex flex-col flex-1 overflow-hidden"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <Header onShowHelp={openHelp} />
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => useStore.getState().toggleSidebar()}
                  aria-label="Fermer le panneau latéral"
                  className="mobile-panel-backdrop absolute inset-0 z-30 hidden max-md:block"
                />
              )}
              <div
                id="sidebar"
                style={{ '--sidebar-width': `${effectiveSidebarWidth}px` }}
                className={`sidebar-frame flex-shrink-0 overflow-hidden ${sidebarCollapsed ? 'is-collapsed' : ''}`}
              >
                <Sidebar />
              </div>
              {!sidebarCollapsed && (
                <div className="relative z-10 w-0 flex-shrink-0 cursor-col-resize transition-colors hover:bg-cyber-accent/30 active:bg-cyber-accent/50 group" onPointerDown={handleResizeStart} onKeyDown={handleResizeKeyDown} role="separator" aria-label="Redimensionner le panneau latéral" aria-orientation="vertical" aria-valuemin={180} aria-valuemax={600} aria-valuenow={sidebarWidth} tabIndex={0}>
                  <div className="absolute inset-y-0 -left-2 -right-2" />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <MainPanel />
              </div>
            </div>
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>

      <WarningPopup />
      <ShortcutHelp isOpen={showHelp} onClose={closeHelp} />
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
