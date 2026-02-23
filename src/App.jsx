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
import { scanGitHubRepo, getRecentGitHubRepos } from './utils/githubScanner';
import { generatePlainOutput } from './utils/outputFormatter';
import { formatNumber } from './utils/helpers';
import { DEFAULT_WARNING_PERCENT } from './constants';

function AppInner() {
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState([]);
  const [tree, setTree] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);
  const [scanMode, setScanMode] = useState('local');
  const [scanError, setScanError] = useState('');
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [sourceMeta, setSourceMeta] = useState(null);
  const [minifyEnabled, setMinifyEnabled] = useLocalStorage('cp-minify', false);
  const [gitignoreEnabled, setGitignoreEnabled] = useLocalStorage('cp-gitignore', true);
  const [tokenLimit, setTokenLimit] = useLocalStorage('cp-token-limit', 128_000);
  const [warningPercent, setWarningPercent] = useLocalStorage(
    'cp-warning-pct',
    DEFAULT_WARNING_PERCENT
  );
  const [customThreshold, setCustomThreshold] = useLocalStorage('cp-custom-threshold', 0);
  const [githubToken, setGithubToken] = useLocalStorage('cp-github-token', '');
  const [recentGitHubRepos, setRecentGitHubRepos] = useState(() => getRecentGitHubRepos());
  const [showWarning, setShowWarning] = useState(false);
  const [pendingPaths, setPendingPaths] = useState(null);

  const extensions = useMemo(() => {
    const countMap = {};
    files.forEach((file) => {
      if (!file.extension) return;
      countMap[file.extension] = (countMap[file.extension] || 0) + 1;
    });
    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .map(([ext]) => ext);
  }, [files]);

  const selectedFiles = useMemo(() => {
    return files
      .filter((file) => selectedPaths.has(file.path))
      .sort((a, b) => b.size - a.size);
  }, [files, selectedPaths]);

  const stats = useMemo(() => {
    const totalTokens = selectedFiles.reduce(
      (sum, file) => sum + (minifyEnabled ? file.minifiedTokens : file.tokens),
      0
    );
    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const totalLines = selectedFiles.reduce((sum, file) => sum + (file.lines || 0), 0);
    return {
      totalTokens,
      totalSize,
      totalLines,
      fileCount: selectedFiles.length,
      totalFiles: files.length,
    };
  }, [selectedFiles, minifyEnabled, files.length]);

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

  const handleOpenProject = useCallback(async () => {
    try {
      setScanError('');
      setScanMode('local');
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });

      setIsScanning(true);
      setScanCount(0);
      setScanTotal(0);

      const result = await scanDirectory(
        dirHandle,
        (count) => setScanCount(count),
        { applyGitignore: gitignoreEnabled }
      );

      setProjectName(result.name);
      setFiles(result.files);
      setTree(result.tree);
      setSourceMeta({ type: 'local' });
      setSelectedPaths(new Set());
      setIsScanning(false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Scan error:', err);
        setScanError(err.message || 'Impossible de scanner ce dossier local.');
      }
      setIsScanning(false);
    }
  }, [gitignoreEnabled]);

  const handleOpenGitHub = useCallback(
    async ({ repoInput, subPath = '' }) => {
      try {
        setScanError('');
        setScanMode('github');
        setIsScanning(true);
        setScanCount(0);
        setScanTotal(0);

        const result = await scanGitHubRepo({
          repoInput,
          token: githubToken,
          applyGitignore: gitignoreEnabled,
          subPath,
          onEstimate: (estimate) => {
            const overPercent = estimate.estimatedTokens > (tokenLimit * warningPercent) / 100;
            const overCustom = customThreshold > 0 && estimate.estimatedTokens > customThreshold;

            if (!overPercent && !overCustom) {
              return true;
            }

            const summary = [
              'Le repository semble volumineux :',
              `- ${estimate.fileCount} fichiers texte`,
              `- ${formatNumber(estimate.totalBytes)} bytes`,
              `- ~${formatNumber(estimate.estimatedTokens)} tokens estimes`,
              '',
              'Continuer le chargement ?',
            ];
            return window.confirm(summary.join('\n'));
          },
          onProgress: (current, total) => {
            setScanCount(current);
            setScanTotal(total);
          },
        });

        setProjectName(result.name);
        setFiles(result.files);
        setTree(result.tree);
        setSourceMeta(result.source || { type: 'github' });
        setRecentGitHubRepos(getRecentGitHubRepos());
        setSelectedPaths(new Set());
        setIsScanning(false);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('GitHub scan error:', err);
          setScanError(err.message || 'Impossible de charger ce projet GitHub.');
        }
        setIsScanning(false);
      }
    },
    [githubToken, gitignoreEnabled, tokenLimit, warningPercent, customThreshold]
  );

  const checkAndApplySelection = useCallback(
    (newPaths) => {
      const newFiles = files.filter((file) => newPaths.has(file.path));
      const newTokenTotal = newFiles.reduce(
        (sum, file) => sum + (minifyEnabled ? file.minifiedTokens : file.tokens),
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
          (file) => file.path.startsWith(folderPath + '/') || file.path === folderPath
        );
        const allSelected = folderFiles.every((file) => next.has(file.path));
        folderFiles.forEach((file) => {
          if (allSelected) next.delete(file.path);
          else next.add(file.path);
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
        const extFiles = files.filter((file) => file.extension === ext);
        const allSelected = extFiles.every((file) => next.has(file.path));
        extFiles.forEach((file) => {
          if (allSelected) next.delete(file.path);
          else next.add(file.path);
        });
        return next;
      });
    },
    [files]
  );

  const selectAll = useCallback(() => {
    const allPaths = new Set(files.map((file) => file.path));
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

  const handleBackToWelcome = useCallback(() => {
    setProjectName('');
    setFiles([]);
    setTree(null);
    setSelectedPaths(new Set());
    setSourceMeta(null);
    setScanError('');
    setScanCount(0);
    setScanTotal(0);
    setScanMode('local');
  }, []);

  const hasProject = files.length > 0;

  return (
    <div className="h-screen flex flex-col bg-cyber-bg text-cyber-text font-sans overflow-hidden transition-colors duration-300">
      <AnimatePresence mode="wait">
        {!hasProject ? (
          <WelcomeScreen
            key="welcome"
            onOpenLocal={handleOpenProject}
            onOpenGitHub={handleOpenGitHub}
            isScanning={isScanning}
            scanCount={scanCount}
            scanTotal={scanTotal}
            scanMode={scanMode}
            scanError={scanError}
            githubToken={githubToken}
            onChangeGithubToken={setGithubToken}
            recentGitHubRepos={recentGitHubRepos}
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
              onOpenProject={handleOpenProject}
              onBackToWelcome={handleBackToWelcome}
              isScanning={isScanning}
              sourceMeta={sourceMeta}
              tokenLimit={tokenLimit}
              onChangeTokenLimit={setTokenLimit}
              warningPercent={warningPercent}
              onChangeWarningPercent={setWarningPercent}
              customThreshold={customThreshold}
              onChangeCustomThreshold={setCustomThreshold}
              githubToken={githubToken}
              onChangeGithubToken={setGithubToken}
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
              />
              <MainPanel
                projectName={projectName}
                selectedFiles={selectedFiles}
                totalTokens={stats.totalTokens}
                minifyEnabled={minifyEnabled}
                tree={tree}
                selectedPaths={selectedPaths}
              />
            </div>
            <Dashboard
              stats={stats}
              minifyEnabled={minifyEnabled}
              tokenLimit={tokenLimit}
              outputText={outputText}
              projectName={projectName}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <WarningPopup
        isOpen={showWarning}
        totalTokens={
          pendingPaths
            ? files
                .filter((file) => pendingPaths.has(file.path))
                .reduce((sum, file) => sum + (minifyEnabled ? file.minifiedTokens : file.tokens), 0)
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
