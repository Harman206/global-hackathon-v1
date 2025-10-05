import { ReactNode, createContext, useContext, useEffect, useState } from "react";

interface IContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
}

const AppContext = createContext<IContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem("openai_api_key") || "";
  });

  // Sync API key to localStorage
  useEffect(() => {
    localStorage.setItem("openai_api_key", apiKey);
  }, [apiKey]);

  const setApiKey = (key: string) => {
    setApiKeyState(key);
  };

  const value: IContextType = {
    apiKey,
    setApiKey,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }

  return context;
};
