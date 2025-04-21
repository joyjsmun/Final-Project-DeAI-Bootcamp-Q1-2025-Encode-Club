import VoiceAssistant from "@/components/voice-assistant"
import WalletBalance from "@/components/wallet-balance"
import TransactionHistory from "@/components/transaction-history"
import AddressBook from "@/components/address-book"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-outfit">
      <div className="container mx-auto px-6 py-10 max-w-6xl">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 tracking-normal mb-2">Crypto Voice Assistant</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">Manage your crypto with voice commands</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-7 space-y-8">
            <VoiceAssistant />
            <TransactionHistory />
          </div>

          {/* Sidebar area */}
          <div className="lg:col-span-5 space-y-8">
            <WalletBalance />
            <AddressBook />
          </div>
        </div>
      </div>
      <Toaster />
    </main>
  )
}
