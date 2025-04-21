"use client"

import { useState } from "react"
import { Book, Plus, X, Edit, User } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  cardStyle,
  cardHeaderStyle,
  cardTitleStyle,
  cardContentStyle,
  cardFooterStyle,
  flexRowStyle,
  transitionStyle,
  inputStyle,
} from "./ui-theme"

interface Contact {
  id: string
  name: string
  address: string
  date: Date
}

export default function AddressBook() {
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: "c1",
      name: "Alice",
      address: "0x1234567890abcdef1234567890abcdef12345678",
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: "c2",
      name: "Bob",
      address: "0xabcdef1234567890abcdef1234567890abcdef12",
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      id: "c3",
      name: "Kevin",
      address: "0x7890abcdef1234567890abcdef1234567890abcd",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ])

  const [newContact, setNewContact] = useState({
    name: "",
    address: "",
  })

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const handleAddContact = () => {
    if (newContact.name.trim() && newContact.address.trim()) {
      const newContactEntry: Contact = {
        id: `c${Date.now()}`,
        name: newContact.name.trim(),
        address: newContact.address.trim(),
        date: new Date(),
      }

      setContacts([...contacts, newContactEntry])
      setNewContact({ name: "", address: "" })
      setIsAddDialogOpen(false)
    }
  }

  return (
    <div className={cardStyle}>
      <div className={cardHeaderStyle}>
        <div className="flex items-center justify-between">
          <div className={cardTitleStyle}>
            <Book className="h-5 w-5 text-teal-500" />
            <span>Address Book</span>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-teal-500 hover:text-teal-600 hover:bg-slate-50 rounded-md"
              >
                <Plus size={18} />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-800 border-slate-200 rounded-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">Add New Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="Contact name"
                    className={`bg-white ${inputStyle}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-slate-700">
                    Wallet Address
                  </Label>
                  <Input
                    id="address"
                    value={newContact.address}
                    onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                    placeholder="0x..."
                    className={`bg-white ${inputStyle} font-mono`}
                  />
                </div>
                <Button onClick={handleAddContact} className="w-full bg-teal-500 hover:bg-teal-600 text-white">
                  Add Contact
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className={cardContentStyle}>
        <div className="space-y-3">
          <AnimatePresence>
            {contacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-200 ${transitionStyle}`}
              >
                <div className={flexRowStyle}>
                  <div className="w-8 h-8 rounded-md bg-violet-500 text-white flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{contact.name}</p>
                    <p className="text-xs text-slate-500 font-mono truncate max-w-[120px]">{contact.address}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-teal-500 hover:text-teal-600 hover:bg-slate-50 rounded-md"
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {contacts.length === 0 && (
            <div className="text-center py-6 text-slate-500">
              <p>No contacts yet</p>
            </div>
          )}
        </div>
      </div>
      <div className={cardFooterStyle}>
        <Button
          variant="outline"
          className="w-full text-teal-500 border-slate-200 hover:bg-slate-50"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus size={16} className="mr-1" /> Add Contact
        </Button>
      </div>
    </div>
  )
}
