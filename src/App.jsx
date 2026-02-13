import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './hooks/useTheme';
import { useLocalStorage } from './hooks/useLocalStorage';
import WelcomeScreen from './components/WelcomeScreen';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import Dashboard from './components/Dashboard';
import WarningPopup from './components/WarningPopup';
import { scanDirectory } from './utils/scanner';
import { generatePlainOutput } from './utils/outputFormatter';
import { DEFAULT_WARNING_PERCENT } from './constants';

function AppInner() {
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState([]);
  const [tree, setTree] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [minifyEnabled, setMinifyEnabled] = useLocalStorage('cp-minify', false);
  const [gitignoreEnabled, setGitignoreEnabled] = useLocalStorage('cp-gitignore', true);
  const [tokenLimit, setTokenLimit] = useLocalStorage('cp-token-limit', 128_000);
  const [warningPercent, setWarningPercent] = useLocalStorage('cp-warning-pct', DEFAULT_WARNING_PERCENT);
  const [customThreshold, setCustomThreshold] = useLocalStorage('cp-custom-threshold', 0);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingPaths, setPendingPaths] = useState(null);

  // Extensions sorted by frequency (desc)
  const extensions = useMemo(() => {
    const countMap = {};
    files.forEach((f) => {
      if (f.extension) {
        countMap[f.extension] = (countMap[f.extension] || 0) + 1;
      }
    });
    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .map(([ext]) => ext);
  }, [files]);

  // Selected files sorted by size desc
  const selectedFiles = useMemo(() => {
    return files
      .filter((f) => selectedPaths.has(f.path))
      .sort((a, b) => b.size - a.size);
  }, [files, selectedPaths]);

  // Stats
  const stats = useMemo(() => {
    const totalTokens = selectedFiles.reduce(
      (sum, f) => sum + (minifyEnabled ? f.minifiedTokens : f.tokens),
      0
    );
    const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    const totalLines = selectedFiles.reduce((sum, f) => sum + (f.lines || 0), 0);
    return {
      totalTokens,
      totalSize,
      totalLines,
      fileCount: selectedFiles.length,
      totalFiles: files.length,
    };
  }, [selectedFiles, minifyEnabled, files.length]);

  // Output text
  const outputText = useMemo(() => {
    if (selectedFiles.length === 0) return '';
    return generatePlainOutput(
      projectName,
      selectedFiles,
      stats.totalTokens,
      minifyEnabled,
      tree,
      selectedPaths
    );
  }, [projectName, selectedFiles, stats.totalTokens, minifyEnabled, tree, selectedPaths]);

  // --- Handlers ---

  const handleOpenProject = useCallback(async () => {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      setIsScanning(true);
      setScanCount(0);

      const result = await scanDirectory(dirHandle, (count) => setScanCount(count));

      setProjectName(result.name);
      setFiles(result.files);
      setTree(result.tree);
      // Lazy Selection: aucun fichier sélectionné par défaut
      setSelectedPaths(new Set());
      setIsScanning(false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Scan error:', err);
      }
      setIsScanning(false);
    }
  }, []);

  // Check threshold warnings before applying bulk selection
  const checkAndApplySelection = useCallback(
    (newPaths) => {
      const newFiles = files.filter((f) => newPaths.has(f.path));
      const newTokenTotal = newFiles.reduce(
        (sum, f) => sum + (minifyEnabled ? f.minifiedTokens : f.tokens),
        0
      );

      const overPercent = newTokenTotal > (tokenLimit * warningPercent) / 100;
      const overCustom = customThreshold > 0 && newTokenTotal > customThreshold;

      if (overPercent || overCustom) {
        setPendingPaths(newPaths);
        setShowWarning(true);
        return;
      }

      setSelectedPaths(newPaths);
    },
    [files, minifyEnabled, tokenLimit, warningPercent, customThreshold]
  );

  const togglePath = useCallback((path) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleFolder = useCallback(
    (folderPath) => {
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        const folderFiles = files.filter(
          (f) => f.path.startsWith(folderPath + '/') || f.path === folderPath
        );
        const allSelected = folderFiles.every((f) => next.has(f.path));
        folderFiles.forEach((f) => {
          if (allSelected) next.delete(f.path);
          else next.add(f.path);
        });
        return next;
      });
    },
    [files]
  );

  const toggleExtension = useCallback(
    (ext) => {
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        const extFiles = files.filter((f) => f.extension === ext);
        const allSelected = extFiles.every((f) => next.has(f.path));
        extFiles.forEach((f) => {
          if (allSelected) next.delete(f.path);
          else next.add(f.path);
        });
        return next;
      });
    },
    [files]
  );

  const selectAll = useCallback(() => {
    const allPaths = new Set(files.map((f) => f.path));
    checkAndApplySelection(allPaths);
  }, [files, checkAndApplySelection]);

  const deselectAll = useCallback(() => {
    setSelectedPaths(new Set());
  }, []);

  const handleWarningConfirm = useCallback(() => {
    if (pendingPaths) {
      setSelectedPaths(pendingPaths);
      setPendingPaths(null);
    }
    setShowWarning(false);
  }, [pendingPaths]);

  const handleWarningCancel = useCallback(() => {
    setPendingPaths(null);
    setShowWarning(false);
  }, []);

  const hasProject = files.length > 0;

  return (
    <div className="h-screen flex flex-col bg-cyber-bg text-cyber-text font-sans overflow-hidden transition-colors duration-300">
      <AnimatePresence mode="wait">
        {!hasProject ? (
          <WelcomeScreen
            key="welcome"
            onOpen={handleOpenProject}
            isScanning={isScanning}
            scanCount={scanCount}
          />
        ) : (
          <motion.div
            key="main"
            className="flex flex-col flex-1 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Header
              outputText={outputText}
              projectName={projectName}
              tokenLimit={tokenLimit}
              onChangeTokenLimit={setTokenLimit}
              warningPercent={warningPercent}
              onChangeWarningPercent={setWarningPercent}
              customThreshold={customThreshold}
              onChangeCustomThreshold={setCustomThreshold}
            />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar
                projectName={projectName}
                tree={tree}
                files={files}
                selectedPaths={selectedPaths}
                extensions={extensions}
                minifyEnabled={minifyEnabled}
                gitignoreEnabled={gitignoreEnabled}
                stats={stats}
                onTogglePath={togglePath}
                onToggleFolder={toggleFolder}
                onToggleExtension={toggleExtension}
                onSelectAll={selectAll}
                onDeselectAll={deselectAll}
                onToggleMinify={() => setMinifyEnabled((v) => !v)}
                onToggleGitignore={() => setGitignoreEnabled((v) => !v)}
                onOpenProject={handleOpenProject}
                isScanning={isScanning}
                tokenLimit={tokenLimit}
                onChangeTokenLimit={setTokenLimit}
                warningPercent={warningPercent}
                onChangeWarningPercent={setWarningPercent}
                customThreshold={customThreshold}
                onChangeCustomThreshold={setCustomThreshold}
              />
              <MainPanel
                projectName={projectName}
                selectedFiles={selectedFiles}
                totalTokens={stats.totalTokens}
                minifyEnabled={minifyEnabled}
                tree={tree}
                selectedPaths={selectedPaths}
                outputText={outputText}
              />
            </div>
            <Dashboard stats={stats} minifyEnabled={minifyEnabled} tokenLimit={tokenLimit} />
          </motion.div>
        )}
      </AnimatePresence>

      <WarningPopup
        isOpen={showWarning}
        totalTokens={
          pendingPaths
            ? files
                .filter((f) => pendingPaths.has(f.path))
                .reduce((sum, f) => sum + (minifyEnabled ? f.minifiedTokens : f.tokens), 0)
            : stats.totalTokens
        }
        tokenLimit={tokenLimit}
        warningPercent={warningPercent}
        customThreshold={customThreshold}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
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
