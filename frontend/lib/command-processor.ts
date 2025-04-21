// Mock command processor for the MVP
// This would eventually be replaced with a more sophisticated NLP system

type CommandType = "balance" | "send" | "history" | "contact" | "unknown"

interface ParsedCommand {
  type: CommandType
  recipient?: string
  amount?: string
  currency?: string
}

export async function processCryptoCommand(commandText: string): Promise<string> {
  // Convert to lowercase for easier matching
  const text = commandText.toLowerCase()

  // Parse the command
  const parsedCommand = parseCommand(text)

  // Process based on command type
  switch (parsedCommand.type) {
    case "balance":
      return getBalanceResponse(text)

    case "send":
      return getTransactionResponse(parsedCommand)

    case "history":
      return getHistoryResponse()

    case "contact":
      return getContactResponse(parsedCommand)

    case "unknown":
    default:
      return "I'm sorry, I didn't understand that command. You can ask about your balance, send crypto, check history, or manage contacts."
  }
}

function parseCommand(text: string): ParsedCommand {
  // Check for balance inquiries
  if (
    text.includes("balance") ||
    text.includes("how much") ||
    text.match(/what('s| is) my (balance|account)/) ||
    text.includes("show me my wallet")
  ) {
    return { type: "balance" }
  }

  // Check for send commands
  if (text.includes("send") || text.includes("transfer")) {
    const amountMatch = text.match(/\d+\.?\d*/)
    const amount = amountMatch ? amountMatch[0] : undefined

    const currencyMatch = text.match(/(eth|ethereum|bitcoin|btc|usdc|dai)/i)
    const currency = currencyMatch ? currencyMatch[0].toUpperCase() : "ETH"

    // Try to find recipient
    let recipient
    if (text.includes(" to ")) {
      const parts = text.split(" to ")
      if (parts.length > 1) {
        recipient = parts[1].trim().split(" ")[0]
      }
    }

    return {
      type: "send",
      amount,
      currency,
      recipient,
    }
  }

  // Check for history inquiries
  if (
    text.includes("history") ||
    text.includes("transactions") ||
    text.includes("recent") ||
    text.includes("activity") ||
    text.includes("transfers")
  ) {
    return { type: "history" }
  }

  // Check for contact management
  if (
    text.includes("contact") ||
    text.includes("address book") ||
    text.includes("saved addresses") ||
    text.includes("who's in my")
  ) {
    return { type: "contact" }
  }

  return { type: "unknown" }
}

function getBalanceResponse(text: string): string {
  // Mock data - would be replaced with actual wallet balance
  const balance = {
    eth: 0.235,
    btc: 0.005,
    usdc: 125.0,
    usdValue: 452.38 + 300.75 + 125.0,
  }

  // Check if asking for specific currency
  if (text.includes("eth") || text.includes("ethereum")) {
    return `Your ETH balance is ${balance.eth} ETH, which is approximately $452.38 USD.`
  } else if (text.includes("btc") || text.includes("bitcoin")) {
    return `Your BTC balance is ${balance.btc} BTC, which is approximately $300.75 USD.`
  } else if (text.includes("usdc") || text.includes("usd coin")) {
    return `Your USDC balance is ${balance.usdc} USDC, which is $125.00 USD.`
  } else if (text.includes("usd") || text.includes("dollar")) {
    return `Your total balance in USD is $${balance.usdValue.toFixed(2)}.`
  }

  // Default response for general balance inquiry
  return `Your current balance is ${balance.eth} ETH, ${balance.btc} BTC, and ${balance.usdc} USDC, which is approximately $${balance.usdValue.toFixed(
    2,
  )} USD in total.`
}

function getTransactionResponse(command: ParsedCommand): string {
  if (!command.amount || !command.recipient) {
    return "I need an amount and recipient to send a transaction. For example, say 'Send 0.1 ETH to Kevin'."
  }

  return `I'll send ${command.amount} ${command.currency} to ${command.recipient}. Please confirm this transaction by saying 'confirm'.`
}

function getHistoryResponse(): string {
  // Mock data - would be replaced with actual transaction history
  return "Your recent transactions include: Received 0.5 ETH from Alice 2 days ago, Sent 0.1 ETH to Bob yesterday, and Sent 50 USDC to Kevin 4 hours ago."
}

function getContactResponse(command: ParsedCommand): string {
  return "Your address book contains contacts: Alice, Bob, and Kevin. You can send crypto to any of them by name."
}
