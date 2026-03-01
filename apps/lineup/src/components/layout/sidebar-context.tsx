'use client';

import { createContext, useContext, useState } from 'react';

interface SidebarContext {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

const Ctx = createContext<SidebarContext | null>(null);

export function SidebarProvider(props: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return <Ctx.Provider value={{ collapsed, setCollapsed }}>{props.children}</Ctx.Provider>;
}

export function useSidebar() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSidebar must be used within SidebarProvider');
  return v;
}
