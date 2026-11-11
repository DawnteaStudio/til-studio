"use client";

import { createContext, useContext, type ReactNode } from "react";

interface ReaderAccess {
  canManage: boolean;
  hosted: boolean;
  signOutAction?: () => Promise<void>;
}

const ReaderAccessContext = createContext<ReaderAccess>({ canManage: false, hosted: true });

export function ReaderAccessProvider({ children, ...access }: ReaderAccess & { children: ReactNode }) {
  return <ReaderAccessContext.Provider value={access}>{children}</ReaderAccessContext.Provider>;
}

export function useReaderAccess() {
  return useContext(ReaderAccessContext);
}

export function OwnerOnly({ children }: { children: ReactNode }) {
  const { canManage } = useReaderAccess();
  return canManage ? children : null;
}
