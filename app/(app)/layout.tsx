"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BrainCircuit,
  Users,
  Search,
  Settings,
  Plus,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Searches", href: "/searches", icon: Search },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar — Desktop */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border/60 bg-card/30 backdrop-blur-xl sticky top-0 h-screen">
        {/* Logo */}
        <div className="flex h-16 items-center px-5 border-b border-border/60 gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <BrainCircuit className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-sm text-foreground">Pavrix</span>
            <span className="text-[10px] text-muted-foreground">Sales Intelligence</span>
          </div>
        </div>

        {/* New Search CTA */}
        <div className="px-4 pt-4">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/15"
          >
            <Plus className="h-3.5 w-3.5" />
            New Search
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-border/60 space-y-3">
          <Link
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>

          <div className="flex items-center gap-3 px-1">
            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
              J
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">Jackson</span>
              <span className="text-[10px] text-muted-foreground truncate">jackson@pavrix.com</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between px-4 border-b border-border/60 md:hidden bg-card/60 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">Pavrix</span>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`p-2 rounded-lg transition-colors ${
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`}
                  title={item.name}
                >
                  <Icon className="h-4.5 w-4.5" />
                </Link>
              );
            })}
          </nav>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
