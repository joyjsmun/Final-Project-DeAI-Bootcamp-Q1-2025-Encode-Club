"use client"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface VoiceVisualizationProps {
  isActive: boolean
}

export default function VoiceVisualization({ isActive }: VoiceVisualizationProps) {
  const [barHeights, setBarHeights] = useState<number[]>([30, 30, 30, 30, 30])

  // Generate random heights for the visualization bars
  useEffect(() => {
    if (!isActive) {
      setBarHeights([30, 30, 30, 30, 30])
      return
    }

    const interval = setInterval(() => {
      if (isActive) {
        const newHeights = Array.from({ length: 5 }, () => Math.floor(Math.random() * 50) + 30)
        setBarHeights(newHeights)
      }
    }, 150)

    return () => clearInterval(interval)
  }, [isActive])

  return (
    <div className="flex items-center justify-center gap-1 h-6">
      {barHeights.map((height, index) => (
        <motion.div
          key={index}
          animate={{ height: `${height}%` }}
          transition={{
            duration: 0.2,
            ease: "easeInOut",
          }}
          className="w-1 bg-teal-500 rounded-sm"
        />
      ))}
    </div>
  )
}
