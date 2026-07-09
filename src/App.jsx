import { useEffect, useCallback } from 'react';
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
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function AppInner() {
  const hasProject = useStore(selectHasProject);
  const loadGithubHistory = useStore((s) => s.loadGithubHistory);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const setSidebarWidth = useStore((s) => s.setSidebarWidth);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const effectiveSidebarWidth = sidebarCollapsed ? 56 : sidebarWidth;

  useEffect(() => {
    loadGithubHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { showHelp, closeHelp } = useKeyboardShortcuts();

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
          <WelcomeScreen key="welcome" />
        ) : (
          <motion.div
            key="main"
            className="flex flex-col flex-1 overflow-hidden"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <Header />
            <div className="flex flex-1 overflow-hidden">
              <div style={{ width: effectiveSidebarWidth }} className="flex-shrink-0 transition-[width] duration-200">
                <Sidebar />
              </div>
              {/* Resize handle (hidden when collapsed) */}
              {!sidebarCollapsed && (
                <div
                  className="w-1.5 flex-shrink-0 cursor-col-resize hover:bg-cyber-accent/30 active:bg-cyber-accent/50 transition-colors relative group"
                  onMouseDown={handleResizeStart}
                >
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
