"use client"

import { useState } from "react"
import { ClockIcon, ArrowUpRight, ArrowDownLeft, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  cardStyle,
  cardHeaderStyle,
  cardTitleStyle,
  cardContentStyle,
  cardFooterStyle,
  flexRowStyle,
  flexColStyle,
  transitionStyle,
} from "./ui-theme"

interface Transaction {
  id: string
  type: "send" | "receive"
  amount: number
  currency: string
  counterparty: string
  timestamp: Date
  status: "completed" | "pending" | "failed"
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "tx1",
      type: "receive",
      amount: 0.5,
      currency: "ETH",
      counterparty: "Alice",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: "completed",
    },
    {
      id: "tx2",
      type: "send",
      amount: 0.1,
      currency: "ETH",
      counterparty: "Bob",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      status: "completed",
    },
    {
      id: "tx3",
      type: "send",
      amount: 50,
      currency: "USDC",
      counterparty: "Kevin",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      status: "pending",
    },
  ])

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`
    } else {
      return "Just now"
    }
  }

  return (
    <div className={cardStyle}>
      <div className={cardHeaderStyle}>
        <div className={cardTitleStyle}>
          <ClockIcon className="h-5 w-5 text-teal-500" />
          <span>Transaction History</span>
        </div>
      </div>
      <div className={cardContentStyle}>
        <div className="space-y-3">
          <AnimatePresence>
            {transactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-200 ${transitionStyle}`}
              >
                <div className={flexRowStyle}>
                  <div
                    className={`w-10 h-10 rounded-md flex items-center justify-center ${
                      tx.type === "receive" ? "bg-emerald-500 text-white" : "bg-violet-500 text-white"
                    }`}
                  >
                    {tx.type === "receive" ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div className={flexColStyle}>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">
                        {tx.type === "receive" ? "Received from" : "Sent to"} {tx.counterparty}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          tx.status === "completed"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : tx.status === "pending"
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : "bg-rose-50 text-rose-600 border-rose-200"
                        }`}
                      >
                        {tx.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{formatDate(tx.timestamp)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-800">
                    {tx.type === "receive" ? "+" : "-"}
                    {tx.amount} {tx.currency}
                  </p>
                  <Button variant="ghost" size="sm" className="text-xs text-teal-500 p-0 h-6 hover:text-teal-600">
                    View <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {transactions.length === 0 && (
            <div className="text-center py-6 text-slate-500">
              <p>No transactions yet</p>
            </div>
          )}
        </div>
      </div>
      {transactions.length > 0 && (
        <div className={cardFooterStyle}>
          <Button variant="outline" className="w-full text-teal-500 border-slate-200 hover:bg-slate-50">
            View all transactions
          </Button>
        </div>
      )}
    </div>
  )
}
