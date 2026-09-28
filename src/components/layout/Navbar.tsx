import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { getSession } from "@/lib/auth/session";
import { LogoutButton } from "@/components/ui/logout-button";

export async function Navbar() {
  const session = await getSession();

  return (
    <nav className="sticky top-0 z-50 w-full border-b-4 border-zinc-900 bg-black">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="transition-transform active:scale-95">
            <Logo size="sm" />
          </Link>
          
          {session && (
            <div className="hidden md:flex items-center gap-2">
              {session.role === "USER" && (
                <>
                  <Link
                    href="/dashboard"
                    className="bg-transparent border-b-2 border-transparent hover:border-red-600 hover:bg-white hover:text-black transition-none uppercase font-bold text-zinc-400 px-3 py-2 text-sm tracking-widest"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/workout/history"
                    className="bg-transparent border-b-2 border-transparent hover:border-red-600 hover:bg-white hover:text-black transition-none uppercase font-bold text-zinc-400 px-3 py-2 text-sm tracking-widest"
                  >
                    Bitácora
                  </Link>
                  <Link
                    href="/profile"
                    className="bg-transparent border-b-2 border-transparent hover:border-red-600 hover:bg-white hover:text-black transition-none uppercase font-bold text-zinc-400 px-3 py-2 text-sm tracking-widest"
                  >
                    Perfil
                  </Link>
                </>
              )}

              {session.role === "COACH" && (
                <Link
                  href="/coach"
                  className="bg-transparent border-b-2 border-transparent hover:border-red-600 hover:bg-white hover:text-black transition-none uppercase font-bold text-red-500 px-3 py-2 text-sm tracking-widest"
                >
                  Modo Coach
                </Link>
              )}
              {session.role === "NUTRITIONIST" && (
                <Link
                  href="/nutritionist"
                  className="bg-transparent border-b-2 border-transparent hover:border-red-600 hover:bg-white hover:text-black transition-none uppercase font-bold text-red-500 px-3 py-2 text-sm tracking-widest"
                >
                  Nutricionista
                </Link>
              )}
              {session.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="bg-transparent border-b-2 border-transparent hover:border-red-600 hover:bg-white hover:text-black transition-none uppercase font-bold text-red-500 px-3 py-2 text-sm tracking-widest"
                >
                  Admin
                </Link>
              )}
            </div>
          )}
        </div>

        {session ? (
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-block text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
              ATLETA ACTIVO
            </span>
            <LogoutButton variant="icon" />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="bg-transparent border-b-2 border-transparent hover:border-red-600 hover:bg-white hover:text-black transition-none uppercase font-bold text-zinc-400 px-3 py-2 text-sm tracking-widest"
            >
              Iniciar Sesión
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
