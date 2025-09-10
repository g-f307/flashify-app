import { motion } from "framer-motion"
import { Progress } from "@/components/ui/progress"

export default function FlashcardLoader({ progress }: { progress: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="p-6 bg-card shadow-md rounded-2xl flex flex-col items-center w-full max-w-sm"
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-4xl mb-4"
      >
        📚✨
      </motion.div>
      <p className="mb-2 font-medium text-gray-700">Gerando seus flashcards...</p>
      <Progress value={progress} className="w-full h-2" />
      <p className="text-sm text-gray-500 mt-2">
        {progress < 100 ? `${progress}% completo` : "Pronto!"}
      </p>
    </motion.div>
  )
}
