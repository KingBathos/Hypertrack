import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";
import { LoginForm } from "@/components/forms/login-form";
import type { Metadata } from "next";

// ──────────────────────────────────────────────────
// Página de Login — /login
// ──────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Iniciar Sesión | HyperTrack",
  description:
    "Accede a tu cuenta de HyperTrack y retoma el control de tu progreso de hipertrofia, nutrición y entrenamiento.",
};

function LoginPageContent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* ── Fondo decorativo ── */}
      {/* Grid sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Glow orbs — patrón invertido al de registro para distinción visual */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-red-600/5 blur-3xl" />

      {/* ── Card principal (Brutalism) ── */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-black border-2 border-zinc-800 p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
          <div className="mb-8 flex flex-col items-center gap-4">
            <Logo size="lg" />
            <div className="text-center mt-4">
              <h1 className="text-4xl font-heading font-black tracking-tighter text-white uppercase">
                BIENVENIDO AL SISTEMA
              </h1>
              <p className="mt-2 text-xs font-mono tracking-widest uppercase font-bold text-zinc-500">
                INICIA SESIÓN PARA CONTINUAR
              </p>
            </div>
          </div>
          {/* Separador */}
          <div className="mb-8 border-b-2 border-dashed border-zinc-800" />

          {/* Formulario — necesita Suspense por useSearchParams */}
          <LoginForm />

          {/* Footer */}
          <div className="mt-8 border-t-2 border-dashed border-zinc-800 pt-6 flex flex-col gap-4">
            <p className="text-center text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
              ¿NO TIENES CUENTA?{" "}
              <a
                href="/register"
                className="text-white hover:text-red-500 transition-colors"
              >
                CRÉALA AHORA
              </a>
            </p>
            <p className="text-right text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-600">
              <a
                href="/pro/login"
                className="hover:text-red-500 transition-colors border-b border-transparent hover:border-red-500"
              >
                ACCESO PROFESIONALES (COACH/NUTRICIONISTA)
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-cyan-400" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
