import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { WorkoutPageClient } from "@/components/workout/WorkoutPageClient";

// ──────────────────────────────────────────────────
// Página de Entrenamiento — /workout
// Server Component wrapper que extrae el userId de la sesión
// y lo pasa como prop al Client Component
// ──────────────────────────────────────────────────

export default async function WorkoutPage() {
  // Leer sesión desde la cookie HTTP-only
  const session = await getSession();

  // El middleware ya protege esta ruta, doble-check por robustez
  if (!session) {
    redirect("/login");
  }

  return <WorkoutPageClient userId={session.sub} />;
}
