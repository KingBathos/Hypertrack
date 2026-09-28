"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { saveOnboardingProfile, checkPhoneExists } from "@/actions/onboarding";
import {
  profileFormSchema,
  STEP_SCHEMAS,
  SEX_LABELS,
  GOAL_LABELS,
  GOAL_DESCRIPTIONS,
  GOAL_ICONS,
  type ProfileFormData,
  type PrimaryGoal,
} from "@/lib/schemas/profile.schema";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "@/components/ui/icons";

// ──────────────────────────────────────────────────
// Configuración del Stepper
// ──────────────────────────────────────────────────

const STEPS = [
  { title: "Datos personales",  subtitle: "¿Cómo te llamas?",          icon: "👤" },
  { title: "Perfil biológico",  subtitle: "Datos demográficos",         icon: "🧬" },
  { title: "Contacto y cuerpo", subtitle: "Contacto y medidas",          icon: "📱" },
  { title: "Objetivo",          subtitle: "Tu meta y preferencias",     icon: "🎯" },
] as const;

const TOTAL_STEPS = STEPS.length;

// ──────────────────────────────────────────────────
// OnboardingForm
// ──────────────────────────────────────────────────

interface OnboardingFormProps {
  userId: string;
}

export function OnboardingForm({ userId }: OnboardingFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      sex: undefined,
      birthDate: "",
      phone: "+51",
      heightCm: undefined,
      weightKg: undefined,
      primaryGoal: undefined,
      measurementSystem: "METRIC",
    },
    mode: "onTouched",
  });

  // ── Navegación ──

  const goNext = async () => {
    const stepSchema = STEP_SCHEMAS[currentStep];
    const fieldNames = Object.keys(stepSchema.shape) as (keyof ProfileFormData)[];
    const isValid = await trigger(fieldNames);
    if (isValid) {
      if (currentStep === 2) {
        const phone = getValues("phone");
        if (phone) {
          const isTaken = await checkPhoneExists(phone);
          if (isTaken) {
            setError("phone", { type: "manual", message: "Este número ya está registrado en otra cuenta." });
            return;
          }
        }
      }

      if (currentStep < TOTAL_STEPS - 1) {
        setCurrentStep((p) => p + 1);
      }
    }
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((p) => p - 1);
  };

  // ── Submit ──

  const onSubmit = async (data: ProfileFormData) => {
    setServerError(null);
    try {
      await saveOnboardingProfile(data, userId);
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : "No se pudo conectar con el servidor.");
    }
  };

  const selectedGoal = watch("primaryGoal");
  const selectedMeasurement = watch("measurementSystem");

  // ── Estado de éxito ──

  if (isSubmitSuccessful) {
    return (
      <div className="flex flex-col items-center gap-5 py-10">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/20">
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-zinc-100">¡Perfil completado!</h3>
          <p className="mt-2 text-sm text-zinc-400">Preparando tu plan de entrenamiento…</p>
        </div>
        <div className="h-1 w-56 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full w-full animate-pulse rounded-full bg-linear-to-r from-cyan-500 to-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Stepper visual ── */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((step, index) => (
          <div key={step.title} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold
                  transition-all duration-300
                  ${index < currentStep
                    ? "bg-linear-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20"
                    : index === currentStep
                      ? "bg-cyan-500/15 text-cyan-400 ring-2 ring-cyan-500/30"
                      : "bg-zinc-800/50 text-zinc-600"}
                `}
              >
                {index < currentStep ? (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>
              <span className={`hidden text-[10px] font-medium sm:block transition-colors ${index <= currentStep ? "text-zinc-300" : "text-zinc-600"}`}>
                {step.title}
              </span>
            </div>
            {index < TOTAL_STEPS - 1 && (
              <div className="mx-2 h-0.5 w-8 sm:w-12">
                <div className={`h-full rounded-full transition-all duration-500 ${index < currentStep ? "bg-linear-to-r from-cyan-500 to-emerald-500" : "bg-zinc-800"}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Título del paso ── */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-zinc-100">{STEPS[currentStep].subtitle}</h2>
        <p className="mt-1 text-xs text-zinc-500">Paso {currentStep + 1} de {TOTAL_STEPS}</p>
      </div>

      {/* ── Error servidor ── */}
      {serverError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{serverError}</p>
        </div>
      )}

      {/* ── Formulario ── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">

        {/* PASO 1: Nombre y apellido */}
        <div className={currentStep === 0 ? "flex flex-col gap-4" : "hidden"}>
          <Input label="Nombre" placeholder="Tu nombre" autoComplete="given-name"
            error={errors.firstName?.message} {...register("firstName")} />
          <Input label="Apellido" placeholder="Tu apellido" autoComplete="family-name"
            error={errors.lastName?.message} {...register("lastName")} />
        </div>

        {/* PASO 2: Sexo y fecha de nacimiento */}
        <div className={currentStep === 1 ? "flex flex-col gap-4" : "hidden"}>
          <Select
            label="Sexo biológico"
            placeholder="Selecciona una opción"
            options={Object.entries(SEX_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            error={errors.sex?.message}
            {...register("sex")}
          />
          <Input label="Fecha de nacimiento" type="date"
            hint="Necesitamos tu edad para personalizar tu plan"
            error={errors.birthDate?.message} {...register("birthDate")} />
        </div>

        {/* PASO 3: Teléfono, altura y peso */}
        <div className={currentStep === 2 ? "flex flex-col gap-4" : "hidden"}>
          <Input label="Teléfono" type="tel" placeholder="+123456789" autoComplete="tel"
            hint="Formato internacional, ej: +51912345678"
            error={errors.phone?.message} {...register("phone")} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Altura (cm)" type="number" placeholder="170" min={50} max={300}
              hint="Entre 50 y 300 cm"
              error={errors.heightCm?.message}
              {...register("heightCm", { valueAsNumber: true })} />
            <Input label="Peso (kg)" type="number" placeholder="75" min={20} max={500}
              hint="Entre 20 y 500 kg"
              error={errors.weightKg?.message}
              {...register("weightKg", { valueAsNumber: true })} />
          </div>
        </div>

        {/* PASO 4: Objetivo + sistema de medición */}
        <div className={currentStep === 3 ? "flex flex-col gap-3" : "hidden"}>
          {/* Cards de objetivo */}
          <div className="grid gap-2">
            {(Object.entries(GOAL_LABELS) as [PrimaryGoal, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue("primaryGoal", value, { shouldValidate: true, shouldTouch: true })}
                className={`group/card relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer
                  ${selectedGoal === value
                    ? "border-cyan-500/50 bg-cyan-500/5 ring-2 ring-cyan-500/20"
                    : "border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600"}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg transition-all
                  ${selectedGoal === value ? "bg-cyan-500/15" : "bg-zinc-800/50 group-hover/card:bg-zinc-800"}`}>
                  {GOAL_ICONS[value]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${selectedGoal === value ? "text-cyan-300" : "text-zinc-200"}`}>{label}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 truncate">{GOAL_DESCRIPTIONS[value]}</p>
                </div>
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all
                  ${selectedGoal === value ? "border-cyan-400 bg-cyan-400" : "border-zinc-600"}`}>
                  {selectedGoal === value && <div className="h-2 w-2 rounded-full bg-zinc-950" />}
                </div>
                <input type="radio" value={value} className="sr-only" {...register("primaryGoal")} />
              </button>
            ))}
          </div>
          {errors.primaryGoal?.message && (
            <p className="flex items-center gap-1 text-xs text-red-400" role="alert">
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.primaryGoal.message}
            </p>
          )}

          {/* Sistema de medición */}
          <div className="mt-2">
            <p className="mb-2 text-sm font-medium text-zinc-400">Sistema de medición</p>
            <div className="flex gap-2">
              {[
                { value: "METRIC", label: "Métrico", sub: "kg / cm" },
                { value: "IMPERIAL", label: "Imperial", sub: "lb / in" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue("measurementSystem", opt.value as "METRIC" | "IMPERIAL", { shouldValidate: true, shouldTouch: true })}
                  className={`flex flex-1 flex-col items-center rounded-xl border py-3 transition-all duration-200
                    ${selectedMeasurement === opt.value
                      ? "border-emerald-500/50 bg-emerald-500/5 ring-2 ring-emerald-500/20"
                      : "border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600"}`}
                >
                  <span className={`text-sm font-semibold ${selectedMeasurement === opt.value ? "text-emerald-300" : "text-zinc-300"}`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-zinc-500">{opt.sub}</span>
                  <input type="radio" value={opt.value} className="sr-only" {...register("measurementSystem")} />
                </button>
              ))}
            </div>
            {errors.measurementSystem?.message && (
              <p className="mt-1 text-xs text-red-400">{errors.measurementSystem.message}</p>
            )}
          </div>
        </div>

        {/* ── Botones de navegación ── */}
        <div className="flex gap-3 pt-2">
          {currentStep > 0 && (
            <Button type="button" variant="secondary" size="lg" onClick={goBack} className="flex-1">
              Atrás
            </Button>
          )}
          {currentStep < TOTAL_STEPS - 1 ? (
            <Button type="button" size="lg" onClick={goNext}
              fullWidth={currentStep === 0} className={currentStep > 0 ? "flex-1" : ""}>
              Continuar
            </Button>
          ) : (
            <Button type="submit" size="lg" loading={isSubmitting} className="flex-1">
              Completar perfil
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
