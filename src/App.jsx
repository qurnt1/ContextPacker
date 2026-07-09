import { useEffect } from 'react';
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

  useEffect(() => {
    loadGithubHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { showHelp, closeHelp } = useKeyboardShortcuts();

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
              <Sidebar />
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
