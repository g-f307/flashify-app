"use client";

import { motion } from 'framer-motion';
import { Loader2, Brain, Zap } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
  fullScreen?: boolean; // Nova prop para controlar se deve ocupar tela toda
}

export function LoadingScreen({ 
  message = "Carregando...", 
  showProgress = false, 
  progress = 0,
  fullScreen = false
}: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-background z-50">
      {/* Container que considera a sidebar no desktop apenas se não for fullScreen */}
      <div className={`h-full flex items-center justify-center ${!fullScreen ? 'lg:ml-64' : ''}`}>
        <div className="flex flex-col items-center justify-center space-y-8 p-8 max-w-md mx-auto">
        
        {/* Logo animado */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            duration: 0.8,
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
          className="relative"
        >
          <div className="relative inline-flex items-center justify-center">
            {/* Elementos decorativos usando cores do sistema */}
            <motion.div 
              className="absolute -top-3 -right-3 w-4 h-4 bg-secondary rounded-full opacity-80"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div 
              className="absolute -bottom-2 -left-4 w-3 h-3 bg-primary rounded-full opacity-60"
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.6, 0.9, 0.6]
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            />
            <motion.div 
              className="absolute top-4 -left-3 w-2 h-2 bg-secondary rounded-full opacity-70"
              animate={{ 
                scale: [1, 1.4, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
            
            {/* Ícone principal com cor primária */}
            <motion.div 
              className="bg-primary p-6 rounded-2xl shadow-xl relative z-10"
              animate={{ 
                boxShadow: [
                  "0 10px 25px rgba(0,0,0,0.1)",
                  "0 15px 35px rgba(0,0,0,0.15)",
                  "0 10px 25px rgba(0,0,0,0.1)"
                ]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <Brain className="w-8 h-8 text-primary-foreground" />
              </motion.div>
            </motion.div>
            
            {/* Elementos decorativos adicionais */}
            <motion.div 
              className="absolute -bottom-3 right-2 w-3 h-3 bg-secondary rounded-full opacity-60"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.6, 0.9, 0.6]
              }}
              transition={{ 
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.5
              }}
            />
          </div>
        </motion.div>

        {/* Título da aplicação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            Flashify
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Zap className="w-6 h-6 text-primary" />
            </motion.div>
          </h1>
          <p className="text-muted-foreground text-sm">
            Transformando conhecimento em aprendizado
          </p>
        </motion.div>

        {/* Spinner de carregamento */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col items-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <Loader2 className="w-8 h-8 text-primary" />
          </motion.div>
          
          <p className="text-muted-foreground text-center text-sm max-w-xs">
            {message}
          </p>
        </motion.div>

        {/* Barra de progresso (opcional) */}
        {showProgress && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "100%" }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="w-full max-w-xs"
          >
            <div className="bg-secondary rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-primary h-full rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {Math.round(progress)}%
            </p>
          </motion.div>
        )}

        {/* Pontos de carregamento animados */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="flex space-x-1"
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 bg-primary rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.2
              }}
            />
          ))}
        </motion.div>
        </div>
      </div>
    </div>
  );
}

// Componente específico para carregamento inicial da aplicação
export function AppLoadingScreen() {
  return (
    <LoadingScreen 
      message="Preparando sua experiência de aprendizado..."
      fullScreen={true} // Sempre tela cheia para carregamento inicial
    />
  );
}

// Componente para carregamento de páginas (considera sidebar)
export function PageLoadingScreen({ message }: { message?: string }) {
  return (
    <LoadingScreen 
      message={message || "Carregando página..."}
      fullScreen={false}
    />
  );
}

// Componente para carregamento de login/logout (tela toda)
export function AuthLoadingScreen({ message }: { message?: string }) {
  return (
    <LoadingScreen 
      message={message || "Processando..."}
      fullScreen={true}
    />
  );
}
