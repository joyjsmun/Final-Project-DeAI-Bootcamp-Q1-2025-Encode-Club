"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Send, AudioWaveformIcon as Waveform, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { processCryptoCommand } from "@/lib/command-processor"
import { useMobile } from "@/hooks/use-mobile"
import { motion, AnimatePresence } from "framer-motion"
import VoiceVisualization from "./voice-visualization"
import ExampleCommands from "./example-commands"
import {
  cardStyle,
  cardHeaderStyle,
  cardTitleStyle,
  cardContentStyle,
  cardFooterStyle,
  primaryButtonStyle,
  inputStyle,
  transitionStyle,
} from "./ui-theme"

type Message = {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi there! I'm your crypto voice assistant. How can I help you?",
      timestamp: new Date(),
    },
  ])
  const [showExamples, setShowExamples] = useState(true)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSpeechRecognitionSupported =
        "SpeechRecognition" in window ||
        "webkitSpeechRecognition" in window ||
        "mozSpeechRecognition" in window ||
        "msSpeechRecognition" in window

      setIsSpeechSupported(isSpeechRecognitionSupported)

      // Initialize speech synthesis
      if ("speechSynthesis" in window) {
        synthRef.current = window.speechSynthesis
      }
    }

    // Cleanup
    return () => {
      stopListening()
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  // Initialize speech recognition when supported
  useEffect(() => {
    if (!isSpeechSupported || recognitionRef.current) return

    try {
      // Get the appropriate SpeechRecognition constructor
      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition ||
        window.mozSpeechRecognition ||
        window.msSpeechRecognition

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = "en-US"

        // Set up event handlers
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript
          if (transcript.trim()) {
            handleCommand(transcript)
          }
        }

        recognitionRef.current.onend = () => {
          // Automatically stop listening when recognition ends
          setIsListening(false)
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error)
          setIsListening(false)

          // Handle specific error types
          if (event.error === "not-allowed") {
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access to use voice commands.",
              variant: "destructive",
            })
          } else if (event.error === "aborted") {
            // This is often triggered when the recognition is stopped unexpectedly
            // We'll handle it silently to avoid showing unnecessary errors
            console.log("Speech recognition was aborted")
          } else {
            toast({
              title: "Voice Recognition Error",
              description: "There was an issue with voice recognition. Please try again or use text input.",
              variant: "destructive",
            })
          }
        }
      }
    } catch (error) {
      console.error("Failed to initialize speech recognition:", error)
      setIsSpeechSupported(false)
    }
  }, [isSpeechSupported])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const startListening = () => {
    if (!isSpeechSupported) {
      toast({
        title: "Not Supported",
        description: "Voice recognition is not supported in your browser.",
        variant: "destructive",
      })
      return
    }

    if (!recognitionRef.current) {
      toast({
        title: "Initialization Error",
        description: "Voice recognition failed to initialize. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    try {
      // Reset recognition instance to avoid multiple instances running
      stopListening()

      // Start after a short delay to ensure previous instance is fully stopped
      setTimeout(() => {
        try {
          recognitionRef.current.start()
          setIsListening(true)
          toast({
            title: "Listening...",
            description: "Speak your command clearly.",
          })
        } catch (error) {
          console.error("Failed to start speech recognition:", error)
          setIsListening(false)
          toast({
            title: "Error",
            description: "Failed to start voice recognition. Please try again.",
            variant: "destructive",
          })
        }
      }, 100)
    } catch (error) {
      console.error("Failed to start speech recognition:", error)
      setIsListening(false)
      toast({
        title: "Error",
        description: "Failed to start voice recognition. Please try again.",
        variant: "destructive",
      })
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error("Error stopping speech recognition:", error)
      }
      setIsListening(false)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const speak = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel() // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-US"
      utterance.rate = 1.0
      utterance.pitch = 1.0
      synthRef.current.speak(utterance)
    }
  }

  const handleCommand = async (command: string) => {
    // Add user message
    const userMessage: Message = {
      role: "user",
      content: command,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setTextInput("")

    try {
      // Process the command
      const response = await processCryptoCommand(command)

      // Add assistant response
      const assistantMessage: Message = {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Speak the response
      speak(response)
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I couldn't process that command. Please try again.",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
      speak(errorMessage.content)
    }
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (textInput.trim()) {
      handleCommand(textInput)
    }
  }

  const handleExampleSelect = (command: string) => {
    setTextInput(command)
  }

  return (
    <div className={cardStyle}>
      <div className={cardHeaderStyle}>
        <div className="flex items-center justify-between">
          <div className={cardTitleStyle}>
            <Waveform className="h-5 w-5 text-teal-500" />
            <span>Voice Assistant</span>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <VoiceVisualization isActive={isListening} />
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-slate-400 hover:text-teal-500 hover:bg-slate-100"
              onClick={() => setShowExamples(!showExamples)}
            >
              <HelpCircle size={16} />
            </Button>
          </div>
        </div>
      </div>
      <div className={cardContentStyle}>
        <div className="flex flex-col h-[350px]">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-md px-4 py-2 ${
                      message.role === "user"
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 text-slate-800 border border-slate-200"
                    }`}
                  >
                    <p className="text-[15px]">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <AnimatePresence>
            {showExamples && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ExampleCommands onSelectCommand={handleExampleSelect} />
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleTextSubmit} className="flex gap-2 mt-auto">
            <Button
              type="button"
              onClick={toggleListening}
              variant={isListening ? "destructive" : "default"}
              size="icon"
              className={`shrink-0 rounded-md ${
                isListening ? "bg-rose-500 hover:bg-rose-600" : "bg-teal-500 hover:bg-teal-600"
              } ${!isSpeechSupported ? "opacity-50 cursor-not-allowed" : ""} ${transitionStyle}`}
              disabled={!isSpeechSupported}
              title={isSpeechSupported ? "Toggle voice input" : "Voice recognition not supported in this browser"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </Button>

            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your command..."
              className={`bg-white ${inputStyle}`}
            />

            <Button type="submit" size="icon" className={`shrink-0 rounded-md ${primaryButtonStyle}`}>
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
      <div className={cardFooterStyle}>
        <p className="text-xs text-slate-500 text-center">
          {isSpeechSupported
            ? 'Try saying or typing commands like "What\'s my balance?" or "Send 0.1 ETH to Alice"'
            : "Voice recognition is not supported in your browser. Please use text input instead."}
        </p>
      </div>
    </div>
  )
}
