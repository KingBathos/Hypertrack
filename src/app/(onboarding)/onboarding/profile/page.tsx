import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { OnboardingForm } from "@/components/forms/onboarding-form";
import type { Metadata } from "next";

// ──────────────────────────────────────────────────
// Página de Onboarding — /onboarding/profile
// ──────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Completa tu Perfil",
  description:
    "Configura tu perfil en HyperTrack para personalizar tu plan de entrenamiento e hipertrofia.",
};

interface OnboardingProfilePageProps {
  searchParams: Promise<{ uid?: string }>;
}

export default async function OnboardingProfilePage({
  searchParams,
}: OnboardingProfilePageProps) {
  const { uid } = await searchParams;

  // Si no hay userId, redirigir al registro
  if (!uid) {
    redirect("/register");
  }

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

      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-red-600/5 blur-3xl" />

      {/* ── Card principal ── */}
      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-black border-2 border-zinc-800 p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
          <div className="mb-6 flex flex-col items-center gap-3">
            <Logo size="md" />
            <div className="text-center mt-4">
              <h1 className="text-4xl font-heading font-black tracking-tighter text-white uppercase">
                COMPLETA TU PERFIL
              </h1>
              <p className="mt-2 text-xs font-mono tracking-widest uppercase font-bold text-zinc-500">
                PERSONALICEMOS TU EXPERIENCIA DE ENTRENAMIENTO
              </p>
            </div>
          </div>

          {/* Separador */}
          <div className="mb-8 border-b-2 border-dashed border-zinc-800" />

          {/* Formulario Stepper */}
          <OnboardingForm userId={uid} />
        </div>
      </div>
    </div>
  );
}
