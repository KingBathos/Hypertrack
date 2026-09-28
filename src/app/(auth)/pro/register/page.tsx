import { Logo } from "@/components/ui/logo";
import { RegisterProForm } from "@/components/forms/register-pro-form";
import type { Metadata } from "next";

// ──────────────────────────────────────────────────
// Página de Registro para Profesionales — /pro/register
// ──────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Portal Profesional | HyperTrack",
  description:
    "Únete como Coach o Nutricionista y gestiona los planes de tus atletas desde una única plataforma.",
};

export default function RegisterProPage() {
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
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-red-700/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-red-700/10 blur-3xl" />

      {/* ── Card principal (Brutalism Estricto) ── */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-black border-4 border-zinc-800 p-8 shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]">
          <div className="mb-8 flex flex-col items-center gap-4">
            <Logo size="lg" />
            <div className="text-center mt-4">
              <h1 className="text-4xl font-heading font-black tracking-tighter uppercase text-red-500">
                PORTAL PRO
              </h1>
              <p className="mt-2 text-xs font-mono tracking-widest uppercase font-bold text-zinc-500">
                GESTIÓN DE ATLETAS
              </p>
            </div>
          </div>
          
          <div className="mb-8 border-b-4 border-red-600" />

          {/* Formulario Brutalista */}
          <RegisterProForm />

          {/* Footer */}
          <div className="mt-8 border-t-2 border-dashed border-zinc-800 pt-6">
            <p className="text-center text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
              ¿YA TIENES CUENTA PROFESIONAL?{" "}
              <a
                href="/pro/login"
                className="text-white hover:text-red-500 transition-colors"
              >
                INICIA SESIÓN
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
