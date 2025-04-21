"use client"

import { useState, useEffect } from "react"

export function useAnimatedCounter(targetValue: number, duration = 1000, decimals = 2) {
  const [displayValue, setDisplayValue] = useState(targetValue)

  useEffect(() => {
    let startTime: number | null = null
    let animationFrameId: number
    const startValue = displayValue

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)

      // Easing function for smoother animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)

      const currentValue = startValue + (targetValue - startValue) * easeOutQuart
      setDisplayValue(Number.parseFloat(currentValue.toFixed(decimals)))

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      }
    }

    animationFrameId = requestAnimationFrame(step)

    return () => cancelAnimationFrame(animationFrameId)
  }, [targetValue, duration, decimals])

  return displayValue
}
