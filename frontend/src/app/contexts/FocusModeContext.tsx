import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface FocusModeContextType {
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  exitFocusMode: () => void;
}

const FocusModeContext = createContext<FocusModeContextType>({
  isFocusMode: false,
  toggleFocusMode: () => {},
  exitFocusMode: () => {},
});

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [isFocusMode, setIsFocusMode] = useState(false);

  const toggleFocusMode = () => setIsFocusMode(prev => !prev);
  const exitFocusMode = () => setIsFocusMode(false);

  useEffect(() => {
    // Escutando apenas o custom event despachado pelo layout ou hook
  }, [isFocusMode]);

  // Add/remove class on body for CSS targeting
  useEffect(() => {
    if (isFocusMode) {
      document.documentElement.classList.add('focus-mode');
    } else {
      document.documentElement.classList.remove('focus-mode');
    }
    return () => document.documentElement.classList.remove('focus-mode');
  }, [isFocusMode]);

  return (
    <FocusModeContext.Provider value={{ isFocusMode, toggleFocusMode, exitFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  return useContext(FocusModeContext);
}
