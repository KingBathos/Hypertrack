import { Logo } from "@/components/ui/logo";
import { RegisterForm } from "@/components/forms/register-form";
import type { Metadata } from "next";

// ──────────────────────────────────────────────────
// Página de Registro — /register
// ──────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Crear Cuenta | HyperTrack",
  description:
    "Regístrate en HyperTrack y comienza a rastrear tu progreso de hipertrofia, nutrición y entrenamiento.",
};

export default function RegisterPage() {
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

      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-red-600/5 blur-3xl" />

      {/* ── Card principal (Brutalism) ── */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-black border-2 border-zinc-800 p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
          <div className="mb-8 flex flex-col items-center gap-4">
            <Logo size="lg" />
            <div className="text-center mt-4">
              <h1 className="text-4xl font-heading font-black tracking-tighter text-white uppercase">
                ALISTAMIENTO
              </h1>
              <p className="mt-2 text-xs font-mono tracking-widest uppercase font-bold text-zinc-500">
                COMIENZA TU PROGRESO HOY
              </p>
            </div>
          </div>
          {/* Separador */}
          <div className="mb-8 border-b-2 border-dashed border-zinc-800" />

          {/* Formulario */}
          <RegisterForm />

          {/* Footer */}
          <div className="mt-8 border-t-2 border-dashed border-zinc-800 pt-6">
            <p className="text-center text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
              ¿YA TIENES CUENTA?{" "}
              <a
                href="/login"
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
