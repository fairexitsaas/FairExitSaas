"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import GetAppModal from "@/components/dialogs/GetAppModal";

interface GetAppContextType {
  openGetApp: () => void;
  closeGetApp: () => void;
  isGetAppOpen: boolean;
}

const GetAppContext = createContext<GetAppContextType>({
  openGetApp: () => {},
  closeGetApp: () => {},
  isGetAppOpen: false,
});

export const useGetApp = () => useContext(GetAppContext);

export function GetAppProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-get-app", handleOpen);
    return () => window.removeEventListener("open-get-app", handleOpen);
  }, []);

  return (
    <GetAppContext.Provider
      value={{
        openGetApp: () => setIsOpen(true),
        closeGetApp: () => setIsOpen(false),
        isGetAppOpen: isOpen,
      }}
    >
      {children}
      <GetAppModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </GetAppContext.Provider>
  );
}

// Global helper to trigger Get the app from anywhere
export function triggerGetApp() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-get-app"));
  }
}
