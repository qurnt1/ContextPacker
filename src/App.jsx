import { useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './hooks/useTheme';
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
  const loadGithubHistory = useStore((s) => s.loadGithubHistory);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const setSidebarWidth = useStore((s) => s.setSidebarWidth);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const onboardingDone = useStore((s) => s.onboardingDone);
  const setOnboardingDone = useStore((s) => s.setOnboardingDone);
  const effectiveSidebarWidth = sidebarCollapsed ? 52 : sidebarWidth;

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadGithubHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [setSidebarWidth]);

  return (
    <div className="h-screen flex flex-col bg-cyber-bg text-cyber-text font-sans overflow-hidden transition-colors duration-300">
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
            <div className="flex flex-1 overflow-hidden">
              <div id="sidebar" style={{ width: effectiveSidebarWidth }} className="flex-shrink-0 transition-[width] duration-200 overflow-hidden">
                <Sidebar />
              </div>
              {!sidebarCollapsed && (
                <div className="w-1.5 flex-shrink-0 cursor-col-resize hover:bg-cyber-accent/30 active:bg-cyber-accent/50 transition-colors relative group" onMouseDown={handleResizeStart}>
                  <div className="absolute inset-y-0 -left-1 -right-1" />
                </div>
              )}
              <MainPanel />
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
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
