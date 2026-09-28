import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { Logo } from "@/components/ui/logo";
import { LogoutButton } from "@/components/ui/logout-button";
import { NutritionOverview } from "@/components/nutrition/NutritionOverview";
import { MealTracker } from "@/components/nutrition/MealTracker";
import type { UserDocument } from "@/types/user";
import type { NutritionPlanDocument, MealLogDocument, NutritionPlanPublic, MealLogPublic } from "@/types/nutrition";

export const metadata: Metadata = {
  title: "Nutrición | HyperTrack",
  description: "Monitorea tus macros y calorías diarias.",
};

export default async function NutritionPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const db = await getDb();
  
  // 1. Obtener usuario
  const user = await db
    .collection<UserDocument>("users")
    .findOne({ publicId: session.sub }, { projection: { _id: 1 } });

  if (!user) {
    redirect("/login");
  }

  // 2. Obtener plan nutricional activo
  const planDoc = await db
    .collection<NutritionPlanDocument>("nutrition_plans")
    .findOne({ clientId: user._id, status: "ACTIVE" });

  let plan: NutritionPlanPublic | null = null;
  if (planDoc) {
    plan = {
      publicId: planDoc.publicId,
      status: planDoc.status,
      dailyTargets: planDoc.dailyTargets,
      startDate: planDoc.startDate.toISOString(),
      audit: {
        createdAt: planDoc.audit.createdAt.toISOString(),
        updatedAt: planDoc.audit.updatedAt.toISOString(),
      },
    };
  }

  // 3. Obtener meal_logs de las últimas 48 horas (para que el cliente filtre por su zona horaria)
  const twoDaysAgo = new Date();
  twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);

  const logsCursor = db
    .collection<MealLogDocument>("meal_logs")
    .find({
      userId: user._id,
      date: { $gte: twoDaysAgo }
    })
    .sort({ date: -1 });

  const mealLogs: MealLogPublic[] = (await logsCursor.toArray()).map(log => ({
    publicId: log.publicId,
    date: log.date.toISOString(),
    mealType: log.mealType,
    foodName: log.foodName,
    calories: log.calories,
    macros: log.macros,
    audit: {
      createdAt: log.audit.createdAt.toISOString()
    }
  }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Fondo decorativo ── */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      
      {/* ── Layout ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {/* Navbar */}
        <header className="mb-8 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
            >
              Dashboard
            </a>
            <a
              href="/workout"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
            >
              Entrenar
            </a>
            <LogoutButton variant="icon" />
          </div>
        </header>

        <main className="space-y-8">
          <section>
            <h1 className="mb-6 text-3xl font-black tracking-tight text-white">
              Nutrición
            </h1>
            <NutritionOverview plan={plan} recentLogs={mealLogs} />
          </section>

          {plan && (
            <section>
              <MealTracker />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
