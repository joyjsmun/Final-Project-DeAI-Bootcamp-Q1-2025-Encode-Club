"use client"

import { useState } from "react"
import { Wallet, BarChart3, TrendingUp, TrendingDown } from "lucide-react"
import { motion } from "framer-motion"
import { useAnimatedCounter } from "@/hooks/use-animated-counter"
import {
  cardStyle,
  cardHeaderStyle,
  cardTitleStyle,
  cardContentStyle,
  flexRowStyle,
  flexColStyle,
  transitionStyle,
} from "./ui-theme"

interface TokenBalance {
  symbol: string
  name: string
  amount: number
  usdValue: number
  change24h: number
  color: string
}

export default function WalletBalance() {
  // Mock wallet address
  const walletAddress = "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0"

  const [balances, setBalances] = useState<TokenBalance[]>([
    {
      symbol: "ETH",
      name: "Ethereum",
      amount: 0.235,
      usdValue: 452.38,
      change24h: 2.5,
      color: "bg-blue-500",
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      amount: 125.0,
      usdValue: 125.0,
      change24h: 0,
      color: "bg-sky-500",
    },
    {
      symbol: "BTC",
      name: "Bitcoin",
      amount: 0.005,
      usdValue: 300.75,
      change24h: -1.2,
      color: "bg-amber-500",
    },
  ])

  const totalUsd = balances.reduce((sum, token) => sum + token.usdValue, 0)
  const animatedTotal = useAnimatedCounter(totalUsd)

  return (
    <div className={cardStyle}>
      <div className={cardHeaderStyle}>
        <div className={cardTitleStyle}>
          <Wallet className="h-5 w-5 text-teal-500" />
          <span>Wallet & Balance</span>
        </div>
      </div>
      <div className={cardContentStyle}>
        {/* Wallet Address */}
        <div className="mb-5">
          <p className="text-sm text-slate-500 mb-1 font-medium">Wallet Address</p>
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200 flex items-center justify-between">
            <p className="font-mono text-sm text-slate-700 truncate">{walletAddress}</p>
            <button className="text-teal-500 hover:text-teal-600 text-sm font-medium ml-2">Copy</button>
          </div>
        </div>

        {/* Total Balance */}
        <div className="mb-6 mt-6">
          <div className={flexRowStyle}>
            <BarChart3 className="h-4 w-4 text-teal-500" />
            <h3 className="text-sm text-slate-500 font-medium">Total Balance</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800 mt-1">${animatedTotal.toFixed(2)}</p>
        </div>

        {/* Token Balances */}
        <div className="space-y-3">
          {balances.map((token, index) => (
            <motion.div
              key={token.symbol}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-200 ${transitionStyle}`}
            >
              <div className={flexRowStyle}>
                <div
                  className={`w-10 h-10 rounded-md ${token.color} text-white flex items-center justify-center font-medium shadow-sm`}
                >
                  {token.symbol}
                </div>
                <div className={flexColStyle}>
                  <p className="font-medium text-slate-800">{token.name}</p>
                  <p className="text-sm text-slate-500">
                    {token.amount.toFixed(token.symbol === "USDC" ? 2 : 6)} {token.symbol}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-800">${token.usdValue.toFixed(2)}</p>
                <div
                  className={`text-sm flex items-center justify-end ${
                    token.change24h > 0 ? "text-emerald-500" : token.change24h < 0 ? "text-rose-500" : "text-slate-400"
                  }`}
                >
                  {token.change24h > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : token.change24h < 0 ? (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  ) : null}
                  {token.change24h > 0 ? "+" : ""}
                  {token.change24h}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
