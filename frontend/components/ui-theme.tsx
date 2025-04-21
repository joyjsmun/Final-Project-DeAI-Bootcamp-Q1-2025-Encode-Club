"use client"

import { cn } from "@/lib/utils"

// Common card styling for a more organized UI
export const cardStyle = "bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden"
export const cardHeaderStyle = "p-5 border-b border-slate-100 bg-slate-50/50"
export const cardTitleStyle = "text-lg font-semibold text-slate-800 flex items-center gap-2"
export const cardContentStyle = "p-5"
export const cardFooterStyle = "px-5 py-4 bg-slate-50/50 border-t border-slate-100"

// Common button styling
export const primaryButtonStyle = "bg-teal-500 hover:bg-teal-600 text-white transition-colors duration-200"
export const secondaryButtonStyle = "bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors duration-200"
export const ghostButtonStyle = "hover:bg-slate-100 text-slate-700 transition-colors duration-200"

// Common input styling
export const inputStyle = "border-slate-200 rounded-md focus:ring-teal-500 focus:border-teal-500"

// Common badge styling
export const badgeStyle = "text-xs font-medium px-2 py-1 rounded-full"

// Common icon styling
export const iconStyle = "flex-shrink-0"

// Common text styling
export const headingStyle = "font-semibold text-slate-800"
export const subheadingStyle = "text-sm text-slate-500"
export const bodyTextStyle = "text-slate-700"
export const mutedTextStyle = "text-sm text-slate-500"

// Common layout styling
export const sectionStyle = "mb-6"
export const gridStyle = "grid gap-4"
export const flexRowStyle = "flex items-center gap-3"
export const flexColStyle = "flex flex-col gap-2"

// Common animation styling
export const transitionStyle = "transition-all duration-200"
export const hoverStyle = "hover:shadow-md hover:border-slate-300"

// Function to combine styles with conditional classes
export function uiStyle(...classes: (string | undefined | null | boolean)[]) {
  return cn(...classes)
}
