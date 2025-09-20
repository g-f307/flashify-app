'use client';

import { motion } from 'framer-motion';
import { Zap, Brain } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ 
  message = "Carregando...", 
  fullScreen = false 
}: LoadingScreenProps) {
  const containerClasses = fullScreen 
    ? "fixed inset-0 z-50 flex items-center justify-center bg-background"
    : "fixed inset-0 z-50 flex items-center justify-center bg-background lg:ml-64";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-6">
        {/* Logo animado */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Elementos decorativos */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-secondary rounded-full opacity-80"></div>
          <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-primary rounded-full opacity-60"></div>
          <div className="absolute top-3 -left-2 w-2 h-2 bg-secondary rounded-full opacity-70"></div>
          <div className="absolute -top-1 left-4 w-2 h-2 bg-primary rounded-full opacity-80"></div>
          
          {/* Logo principal */}
          <div className="bg-primary p-6 rounded-2xl shadow-lg relative z-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-8 h-8 text-primary-foreground" />
            </motion.div>
          </div>
          
          {/* Elementos decorativos adicionais */}
          <div className="absolute -bottom-2 right-1 w-3 h-3 bg-secondary rounded-full opacity-60"></div>
          <div className="absolute top-1 right-3 w-2 h-2 bg-primary rounded-full opacity-70"></div>
        </motion.div>

        {/* Título com ícone animado */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center space-x-2"
        >
          <h1 className="text-3xl font-bold text-foreground">Flashify</h1>
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
          >
            <Zap className="w-6 h-6 text-primary" />
          </motion.div>
        </motion.div>

        {/* Spinner elegante */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative"
        >
          <div className="w-12 h-12 border-4 border-muted rounded-full">
            <motion.div
              className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>

        {/* Mensagem */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-muted-foreground text-lg font-medium text-center"
        >
          {message}
        </motion.p>

        {/* Pontos de carregamento animados */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex space-x-2"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                delay: i * 0.2 
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
