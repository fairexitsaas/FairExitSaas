import { createContext, useContext } from "react";

export type CountryCode = "CA" | "US";

export interface CountryContextType {
  Country: CountryCode;
  setCountry: (country: CountryCode) => void;
}

export const CountryContext = createContext<CountryContextType | null>(null);

export function useCountry() {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error("useCountry must be used within a CountryContext.Provider");
  }
  return context;
}