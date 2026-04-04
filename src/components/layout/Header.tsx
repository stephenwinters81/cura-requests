"use client";

import { useSession, signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 lg:px-6">
      {/* Left: Mobile hamburger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Toggle navigation"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <div className="hidden lg:block">
          <span className="text-sm font-medium text-muted-foreground">
            Imaging Request System
          </span>
        </div>
      </div>

      {/* Right: User info + logout */}
      {user && (
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5">
            <span className="text-sm font-medium text-foreground">{user.name}</span>
            <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-[10px] uppercase tracking-wider">
              {user.role}
            </Badge>
          </div>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            Sign out
          </Button>
        </div>
      )}
    </header>
  );
}
