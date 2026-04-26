"use client";

import type {ThemeProviderProps} from "next-themes";
import {ThemeProvider as NextThemesProvider} from "next-themes";

export default function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
