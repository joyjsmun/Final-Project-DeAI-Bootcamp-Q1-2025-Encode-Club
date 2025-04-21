"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LightbulbIcon, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { JSX } from "react"
import { transitionStyle } from "./ui-theme"

interface CommandCategory {
  name: string
  icon: JSX.Element
  color: string
  commands: string[]
}

interface ExampleCommandsProps {
  onSelectCommand: (command: string) => void
}

export default function ExampleCommands({ onSelectCommand }: ExampleCommandsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories: CommandCategory[] = [
    {
      name: "Balance",
      icon: <LightbulbIcon size={14} />,
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      commands: [
        "What's my balance?",
        "How much ETH do I have?",
        "Show me my wallet balance",
        "What's my total balance in USD?",
      ],
    },
    {
      name: "Send",
      icon: <Sparkles size={14} />,
      color: "bg-violet-100 text-violet-700 border-violet-200",
      commands: [
        "Send 0.1 ETH to Alice",
        "Transfer 50 USDC to Bob",
        "Send Bitcoin to Kevin",
        "Transfer 0.05 ETH to Alice",
      ],
    },
    {
      name: "History",
      icon: <Sparkles size={14} />,
      color: "bg-blue-100 text-blue-700 border-blue-200",
      commands: [
        "Show my transaction history",
        "Show recent transactions",
        "What were my last transfers?",
        "Show my recent activity",
      ],
    },
    {
      name: "Contacts",
      icon: <Sparkles size={14} />,
      color: "bg-amber-100 text-amber-700 border-amber-200",
      commands: ["Show my contacts", "Who's in my address book?", "Show me my saved addresses", "List all my contacts"],
    },
  ]

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
    if (isExpanded) {
      setSelectedCategory(null)
    }
  }

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(selectedCategory === categoryName ? null : categoryName)
  }

  const handleCommandClick = (command: string) => {
    onSelectCommand(command)
  }

  return (
    <div className="mt-4 bg-slate-50 rounded-md border border-slate-200 overflow-hidden">
      <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100" onClick={toggleExpand}>
        <div className="flex items-center gap-2">
          <LightbulbIcon size={16} className="text-amber-500" />
          <span className="font-medium text-slate-700">Example Commands</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-3 pb-3"
          >
            <div className="flex flex-wrap gap-2 mb-2">
              {categories.map((category) => (
                <div
                  key={category.name}
                  onClick={() => handleCategoryClick(category.name)}
                  className={`cursor-pointer ${transitionStyle}`}
                >
                  <Badge
                    variant="outline"
                    className={`${category.color} ${
                      selectedCategory === category.name ? "ring-2 ring-offset-1 ring-slate-300" : ""
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {category.icon}
                      {category.name}
                    </span>
                  </Badge>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {selectedCategory && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2 mt-3"
                >
                  {categories
                    .find((cat) => cat.name === selectedCategory)
                    ?.commands.map((command, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="bg-white p-2 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all duration-200"
                        onClick={() => handleCommandClick(command)}
                      >
                        <p className="text-sm text-slate-700">{command}</p>
                      </motion.div>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>

            {!selectedCategory && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} className="text-xs text-slate-500 mt-1">
                Select a category to see example commands
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
