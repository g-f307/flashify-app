import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const loadingMessages = [
  "Conectando...",
  "Tirando a poeira dos livros...",
  "Preparando seus flashcards mágicos...",
  "Pronto para estudar!"
]

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 1500)

    const timer = setTimeout(() => {
      onFinish()
    }, 4000)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [onFinish])

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="text-5xl font-bold mb-6"
      >
        Flashify ✨
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="text-lg"
        >
          {loadingMessages[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
