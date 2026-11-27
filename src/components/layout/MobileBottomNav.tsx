"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  icon: ReactNode;
}

function HomeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function DumbbellIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="2" height="12" rx="1" />
      <rect x="18" y="6" width="2" height="12" rx="1" />
      <line x1="6" y1="9" x2="18" y2="9" />
      <line x1="6" y1="15" x2="18" y2="15" />
      <line x1="2.5" y1="8.5" x2="4" y2="8.5" />
      <line x1="20" y1="8.5" x2="21.5" y2="8.5" />
      <line x1="2.5" y1="15.5" x2="4" y2="15.5" />
      <line x1="20" y1="15.5" x2="21.5" y2="15.5" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const ROLE_NAV_ITEMS: Record<string, NavItem[]> = {
  USER: [
    { href: "/dashboard", label: "Inicio", exact: true, icon: <HomeIcon /> },
    { href: "/workout/live", label: "Entrenar", icon: <DumbbellIcon /> },
    { href: "/nutrition", label: "Nutrición", icon: <FlameIcon /> },
    { href: "/workout/history", label: "Bitácora", icon: <HistoryIcon /> },
    { href: "/profile", label: "Perfil", icon: <UserIcon /> },
  ],
  COACH: [
    { href: "/coach", label: "Roster", exact: true, icon: <UsersIcon /> },
    { href: "/coach/programs/new", label: "Programas", icon: <PlusSquareIcon /> },
  ],
  NUTRITIONIST: [
    { href: "/nutritionist", label: "Pacientes", icon: <UsersIcon /> },
  ],
  ADMIN: [
    { href: "/admin", label: "Panel", exact: true, icon: <ShieldIcon /> },
    { href: "/admin/exercises", label: "Ejercicios", icon: <DumbbellIcon /> },
  ],
};

/** Barra de navegación inferior fija para dispositivos móviles (< md). */
export function MobileBottomNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = ROLE_NAV_ITEMS[role];

  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-zinc-800 bg-black/95 backdrop-blur-md md:hidden pb-safe"
    >
      <div className="flex h-16 items-stretch justify-around">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 border-t-2 transition-colors active:bg-zinc-900 ${
                isActive
                  ? "border-red-600 text-red-500 bg-zinc-950"
                  : "border-transparent text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
