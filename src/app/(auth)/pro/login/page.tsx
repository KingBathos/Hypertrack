import { Logo } from "@/components/ui/logo";
import { LoginProForm } from "@/components/forms/login-pro-form";
import type { Metadata } from "next";

// ──────────────────────────────────────────────────
// Página de Login para Profesionales — /pro/login
// ──────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Acceso Profesional | HyperTrack",
  description: "Portal exclusivo para entrenadores y nutricionistas.",
};

export default function LoginProPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* ── Fondo decorativo ── */}
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

      {/* Glow orbs - rojo más intenso para el portal pro */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-red-700/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-red-700/10 blur-3xl" />

      {/* ── Card principal (Brutalism Estricto) ── */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-black border-4 border-zinc-800 p-8 shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]">
          <div className="mb-8 flex flex-col items-center gap-4">
            <Logo size="lg" />
            <div className="text-center mt-4">
              <h1 className="text-4xl font-heading font-black tracking-tighter uppercase text-red-500">
                ACCESO PRO
              </h1>
              <p className="mt-2 text-xs font-mono tracking-widest uppercase font-bold text-zinc-500">
                SISTEMA DE GESTIÓN AVANZADA
              </p>
            </div>
          </div>
          
          <div className="mb-8 border-b-4 border-red-600" />

          {/* Formulario Brutalista */}
          <LoginProForm />

          {/* Footer */}
          <div className="mt-8 border-t-2 border-dashed border-zinc-800 pt-6">
            <p className="text-center text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
              ¿AÚN NO ERES PARTE?{" "}
              <a
                href="/pro/register"
                className="text-white hover:text-red-500 transition-colors"
              >
                APLICA AHORA
              </a>
            </p>
            <p className="mt-4 text-center text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-600">
              <a
                href="/login"
                className="hover:text-red-500 transition-colors border-b border-transparent hover:border-red-500"
              >
                VOLVER AL ACCESO ESTÁNDAR
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
