"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
  userRole: string;
}

export function AppShell({ children, userRole }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        userRole={userRole}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuToggle={() => setMobileOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
