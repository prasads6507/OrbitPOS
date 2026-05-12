"use client"

import * as React from "react"

export function ThemeProvider({ children, ...props }: any) {
  // We've simplified this to a basic wrapper to remove the Next.js 16 / next-themes conflict.
  // This ensures the app loads perfectly while we investigate a compatible dark-mode solution.
  
  // Destructure next-themes props to avoid passing them to the underlying div element
  const { 
    attribute, 
    defaultTheme, 
    enableSystem, 
    disableTransitionOnChange, 
    forcedTheme,
    storageKey,
    themes,
    enableColorScheme,
    ...divProps 
  } = props;

  return <div className="min-h-screen bg-white text-slate-900" {...divProps}>{children}</div>
}
