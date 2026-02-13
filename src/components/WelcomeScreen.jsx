import { motion } from 'framer-motion';
import { FolderOpen, Loader2, Zap, AlertTriangle } from 'lucide-react';

const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export default function WelcomeScreen({ onOpen, isScanning, scanCount }) {
  return (
    <motion.div
      className="flex-1 flex items-center justify-center grid-bg radial-glow relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient borders */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-cyan/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-cyan/20 to-transparent" />
        <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-transparent via-cyber-cyan/10 to-transparent" />
        <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-cyber-cyan/10 to-transparent" />
      </div>

      <div className="text-center z-10 px-6">
        {/* Logo */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyber-surface neon-border mb-6 animate-pulse-glow">
            <Zap className="w-10 h-10 text-cyber-cyan" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-5xl font-bold tracking-tight mb-1"
        >
          <span className="text-cyber-text">Context</span>
          <span className="text-cyber-cyan text-glow-cyan">Packer</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.38, duration: 0.5 }}
          className="text-xs font-mono text-cyber-text-3 mb-5"
        >
          v2.0
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="text-cyber-text-2 text-lg mb-10 max-w-md mx-auto leading-relaxed"
        >
          Compilez vos fichiers sources en un prompt unique, optimisé pour les fenêtres de contexte IA.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          {isSupported ? (
            <motion.button
              onClick={onOpen}
              disabled={isScanning}
              whileHover={{ scale: 1.04, boxShadow: '0 0 30px rgba(0,229,255,0.35)' }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-cyber-surface neon-border-bright text-cyber-cyan font-semibold text-lg transition-all duration-300 hover:bg-cyber-surface-2 disabled:opacity-60 disabled:cursor-not-allowed glow-cyan"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>
                    Analyse en cours… <span className="font-mono text-cyber-text">{scanCount}</span> fichiers
                  </span>
                </>
              ) : (
                <>
                  <FolderOpen className="w-5 h-5" />
                  <span>Ouvrir un nouveau projet ou dossier</span>
                </>
              )}
            </motion.button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-5 py-3 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  L'API File System Access n'est pas supportée par ce navigateur.
                </span>
              </div>
              <p className="text-cyber-text-3 text-sm">
                Utilisez Chrome, Edge ou un navigateur basé sur Chromium.
              </p>
            </div>
          )}
        </motion.div>

        {/* Footer info - texte plus clair */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-12 flex items-center justify-center gap-6 text-xs text-cyber-text-2 font-medium"
        >
          <span>100% côté client</span>
          <span className="w-1 h-1 rounded-full bg-cyber-cyan/30" />
          <span>Aucun fichier envoyé</span>
          <span className="w-1 h-1 rounded-full bg-cyber-cyan/30" />
          <span>Tiktoken o200k_base</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
