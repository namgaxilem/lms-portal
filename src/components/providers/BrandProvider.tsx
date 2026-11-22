"use client";
import { createContext, useContext } from "react";
import type { Brand } from "@/config/brand";

const BrandContext = createContext<Brand | null>(null);

/** Makes the deployment's brand (resolved on the server) available to client components. */
export function BrandProvider({ brand, children }: { brand: Brand; children: React.ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand(): Brand {
  const brand = useContext(BrandContext);
  if (!brand) throw new Error("useBrand must be used within a BrandProvider");
  return brand;
}
