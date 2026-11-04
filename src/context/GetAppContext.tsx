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

    if (typeof window !== "undefined" && window.location.hash === "#app") {
      setIsOpen(true);
    }

    const handleHashChange = () => {
      if (typeof window !== "undefined" && window.location.hash === "#app") {
        setIsOpen(true);
      }
    };
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("open-get-app", handleOpen);
      window.removeEventListener("hashchange", handleHashChange);
    };
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
