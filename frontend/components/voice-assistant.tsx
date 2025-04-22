"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Send, AudioWaveformIcon as Waveform, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
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
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([
    {
      role: "assistant",
      content: "Hi there! I'm your crypto voice assistant. How can I help you?",
    },
  ])
  const [showExamples, setShowExamples] = useState(true)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMediaRecorderSupported = "MediaRecorder" in window
      setIsSpeechSupported(isMediaRecorderSupported)
    }
  }, [])

  const startListening = async () => {
    if (!isSpeechSupported || isProcessing) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        await handleAudioTranscription(audioBlob)
      }

      mediaRecorder.start()
      setIsListening(true)
      toast({
        title: "Listening...",
        description: "Speak your command clearly.",
      })
    } catch (error) {
      console.error("Failed to start recording:", error)
      setIsListening(false)
      toast({
        title: "Error",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsListening(false)
    }
  }

  const handleAudioTranscription = async (audioBlob: Blob) => {
    if (!audioBlob) return

    setIsProcessing(true)
    const formData = new FormData()
    formData.append('audio', audioBlob, 'audio.webm')

    try {
      const response = await fetch('/api/voice-to-text', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to transcribe audio')
      }

      const { transcription } = await response.json()
      if (transcription) {
        handleCommand(transcription)
      }
    } catch (error) {
      console.error("Error transcribing audio:", error)
      toast({
        title: "Transcription Error",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const speak = async (text: string) => {
    try {
      const response = await fetch('/api/text-to-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to convert text to speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing speech:', error);
      toast({
        title: "Speech Error",
        description: "Failed to play speech. Please try again.",
        variant: "destructive",
      });
    }
  }

  const handleCommand = async (command: string) => {
    if (!command.trim() || isProcessing) return

    setIsProcessing(true)
    setTextInput("")

    const userMessageForApi: ChatCompletionMessageParam = {
      role: "user",
      content: command,
    }

    const historyToSend = [...messages, userMessageForApi]
    setMessages(historyToSend)

    try {
      console.log("Sending to API:", { text: command, history: historyToSend })

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: command,
          history: historyToSend,
        }),
      })

      console.log("API Response Status:", response.status)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
          console.error("API Error Response Body:", errorData)
        } catch (e) {
          console.error("Failed to parse error response JSON")
          errorData = { error: "Failed to process request.", details: await response.text() }
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const updatedHistory: ChatCompletionMessageParam[] = data.history

      console.log("Received Updated History:", updatedHistory)

      setMessages(updatedHistory)

      const lastAssistantMessage = updatedHistory
        .slice()
        .reverse()
        .find((msg) => msg.role === "assistant")

      if (lastAssistantMessage?.content && typeof lastAssistantMessage.content === 'string') {
        await speak(lastAssistantMessage.content)
      } else {
        console.log("No speakable assistant message content found or content is not a string:", lastAssistantMessage?.content)
      }
    } catch (error: any) {
      console.error("Error calling agent API:", error)
      const errorMessageContent = `Error: ${error.message || "Failed to communicate with the assistant."}`
      const errorMessageForApi: ChatCompletionMessageParam = {
        role: "assistant",
        content: errorMessageContent,
      }
      setMessages((prev) => [...prev, errorMessageForApi])
      await speak(errorMessageContent)
      toast({
        title: "API Error",
        description: errorMessageContent,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleCommand(textInput)
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
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="h-5 w-5"
                >
                  <div className="animate-spin rounded-full h-full w-full border-b-2 border-teal-500"></div>
                </motion.div>
              )}
              {isListening && !isProcessing && (
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
              {messages
                 .filter(message => {
                    if (message.role === 'user') {
                       return true;
                    }
                    if (message.role === 'assistant') {
                       const hasTextContent = typeof message.content === 'string' && message.content.trim() !== '';
                       const hasToolCalls = !!(message as any).tool_calls && Array.isArray((message as any).tool_calls) && (message as any).tool_calls.length > 0;
                       return hasTextContent || !hasToolCalls;
                    }
                    return false;
                 })
                 .map((message, index) => (
                <motion.div
                  key={`${message.role}-${index}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 shadow-sm ${
                      message.role === "user"
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 text-slate-800 border border-slate-200"
                    }`}
                  >
                    <p className="text-[15px] whitespace-pre-wrap">
                       {typeof message.content === 'string'
                          ? message.content
                          : '[non-text content]'
                       }
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
              onClick={isListening ? stopListening : startListening}
              variant={isListening ? "destructive" : "default"}
              size="icon"
              className={`shrink-0 rounded-md ${
                isListening ? "bg-rose-500 hover:bg-rose-600" : "bg-teal-500 hover:bg-teal-600"
              } ${!isSpeechSupported || isProcessing ? "opacity-50 cursor-not-allowed" : ""} ${transitionStyle}`}
              disabled={!isSpeechSupported || isProcessing}
              title={
                isProcessing ? "Processing..." :
                isSpeechSupported ? (isListening ? "Stop listening" : "Start listening") :
                "Voice recognition not supported"
              }
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </Button>

            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={isProcessing ? "Processing..." : "Type or say your command..."}
              className={`bg-white ${inputStyle}`}
              disabled={isProcessing}
            />

            <Button
               type="submit"
               size="icon"
               className={`shrink-0 rounded-md ${primaryButtonStyle}`}
               disabled={isProcessing || !textInput.trim()}
            >
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
