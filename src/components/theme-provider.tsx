"use client"

import * as React from "react"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // We've simplified this to a basic wrapper to remove the Next.js 16 / next-themes conflict.
  // This ensures the app loads perfectly while we investigate a compatible dark-mode solution.
  return <div className="min-h-screen bg-white text-slate-900">{children}</div>
}
