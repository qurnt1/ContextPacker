import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import WelcomeScreen from './components/WelcomeScreen';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import Dashboard from './components/Dashboard';
import { useLocalStorage } from './hooks/useLocalStorage';
import { scanDirectory } from './utils/scanner';
import { generatePlainOutput } from './utils/outputFormatter';

export default function App() {
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState([]);
  const [tree, setTree] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [minifyEnabled, setMinifyEnabled] = useLocalStorage('cp-minify', false);

  // Derived: unique extensions
  const extensions = useMemo(() => {
    const exts = new Set();
    files.forEach((f) => {
      if (f.extension) exts.add(f.extension);
    });
    return [...exts].sort();
  }, [files]);

  // Derived: selected files sorted by size desc
  const selectedFiles = useMemo(() => {
    return files
      .filter((f) => selectedPaths.has(f.path))
      .sort((a, b) => b.size - a.size);
  }, [files, selectedPaths]);

  // Derived: stats
  const stats = useMemo(() => {
    const totalTokens = selectedFiles.reduce(
      (sum, f) => sum + (minifyEnabled ? f.minifiedTokens : f.tokens),
      0
    );
    const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    return {
      totalTokens,
      totalSize,
      fileCount: selectedFiles.length,
      totalFiles: files.length,
    };
  }, [selectedFiles, minifyEnabled, files.length]);

  // Derived: output text for clipboard
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
      setSelectedPaths(new Set(result.files.map((f) => f.path)));
      setIsScanning(false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Scan error:', err);
      }
      setIsScanning(false);
    }
  }, []);

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
    setSelectedPaths(new Set(files.map((f) => f.path)));
  }, [files]);

  const deselectAll = useCallback(() => {
    setSelectedPaths(new Set());
  }, []);

  const hasProject = files.length > 0;

  return (
    <div className="h-screen flex flex-col bg-cyber-bg text-gray-200 font-sans overflow-hidden">
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
            <div className="flex flex-1 overflow-hidden">
              <Sidebar
                projectName={projectName}
                tree={tree}
                files={files}
                selectedPaths={selectedPaths}
                extensions={extensions}
                minifyEnabled={minifyEnabled}
                stats={stats}
                onTogglePath={togglePath}
                onToggleFolder={toggleFolder}
                onToggleExtension={toggleExtension}
                onSelectAll={selectAll}
                onDeselectAll={deselectAll}
                onToggleMinify={() => setMinifyEnabled((v) => !v)}
                onOpenProject={handleOpenProject}
                isScanning={isScanning}
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
            <Dashboard stats={stats} minifyEnabled={minifyEnabled} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
