'use client';

import { AuthContextProvider } from "./context/AuthContext";
import { ThemeProvider } from './context/ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthContextProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </AuthContextProvider>
  );
} 