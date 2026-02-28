"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface SignLanguageContextType {
  signText: string;
  setSignText: (text: string) => void;
}

const SignLanguageContext = createContext<SignLanguageContextType>({
  signText: "",
  setSignText: () => {},
});

export function SignLanguageProvider({ children }: { children: ReactNode }) {
  const [signText, setSignText] = useState("");
  return (
    <SignLanguageContext.Provider value={{ signText, setSignText }}>
      {children}
    </SignLanguageContext.Provider>
  );
}

export function useSignLanguage() {
  return useContext(SignLanguageContext);
}
