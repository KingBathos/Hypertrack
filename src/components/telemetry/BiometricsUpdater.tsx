"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { biometricsSchema, type BiometricsFormData } from "@/lib/schemas/profile.schema";
import { logBiometrics } from "@/actions/profile";

export default function BiometricsUpdater() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showCircumferences, setShowCircumferences] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<BiometricsFormData>({
    resolver: zodResolver(biometricsSchema),
  });

  const onSubmit = async (data: BiometricsFormData) => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("weight", data.weight.toString());
      if (data.bodyFatPercentage) {
        formData.append("bodyFatPercentage", data.bodyFatPercentage.toString());
      }
      // Circunferencias
      if (data.waistCm) formData.append("waistCm", data.waistCm.toString());
      if (data.hipCm) formData.append("hipCm", data.hipCm.toString());
      if (data.chestCm) formData.append("chestCm", data.chestCm.toString());
      if (data.armCm) formData.append("armCm", data.armCm.toString());
      if (data.thighCm) formData.append("thighCm", data.thighCm.toString());
      if (data.calfCm) formData.append("calfCm", data.calfCm.toString());

      const result = await logBiometrics(formData);

      if (result.success) {
        setIsOpen(false);
        reset();
        setShowCircumferences(false);
        router.refresh();
      } else {
        setErrorMsg(result.error || "Ocurrió un error al guardar las mediciones.");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const circumferenceFields = [
    { name: "waistCm" as const, label: "CINTURA", placeholder: "Ej: 78" },
    { name: "hipCm" as const, label: "CADERA", placeholder: "Ej: 95" },
    { name: "chestCm" as const, label: "PECHO", placeholder: "Ej: 100" },
    { name: "armCm" as const, label: "BRAZO (BÍCEPS)", placeholder: "Ej: 35" },
    { name: "thighCm" as const, label: "MUSLO", placeholder: "Ej: 58" },
    { name: "calfCm" as const, label: "PANTORRILLA", placeholder: "Ej: 38" },
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="brutalist-button mt-8 w-full p-4 text-center"
      >
        ACTUALIZAR MEDIDAS
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="brutalist-card bg-zinc-950 p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => { setIsOpen(false); setShowCircumferences(false); }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white font-mono font-bold"
            >
              [X]
            </button>
            
            <h2 className="text-2xl font-heading font-black text-white mb-6 uppercase tracking-wider">
              NUEVA MEDICIÓN
            </h2>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-950 border border-red-500 text-red-500 font-mono text-sm uppercase">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Campos principales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 font-mono uppercase tracking-widest mb-2 font-bold">
                    PESO (KG) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register("weight", { valueAsNumber: true })}
                    className="brutalist-input w-full p-3 bg-zinc-900 text-white border-2 focus:outline-none"
                    placeholder="Ej: 80.5"
                  />
                  {errors.weight && (
                    <p className="text-red-500 text-xs font-mono uppercase mt-1">{errors.weight.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 font-mono uppercase tracking-widest mb-2 font-bold">
                    GRASA (%) <span className="text-zinc-600">(OPC.)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register("bodyFatPercentage", { valueAsNumber: true })}
                    className="brutalist-input w-full p-3 bg-zinc-900 text-white border-2 focus:outline-none"
                    placeholder="Ej: 15.2"
                  />
                  {errors.bodyFatPercentage && (
                    <p className="text-red-500 text-xs font-mono uppercase mt-1">{errors.bodyFatPercentage.message}</p>
                  )}
                </div>
              </div>

              {/* Toggle circunferencias */}
              <button
                type="button"
                onClick={() => setShowCircumferences(!showCircumferences)}
                className="w-full text-left p-3 border-2 border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors flex items-center justify-between"
              >
                <span className="text-sm text-zinc-400 font-mono uppercase tracking-widest font-bold">
                  📏 CIRCUNFERENCIAS CORPORALES
                </span>
                <span className="text-zinc-500 font-mono text-xs">
                  {showCircumferences ? "▲ OCULTAR" : "▼ MOSTRAR"}
                </span>
              </button>

              {showCircumferences && (
                <div className="grid grid-cols-2 gap-4 p-4 border-2 border-zinc-800 bg-zinc-900/30">
                  <p className="col-span-2 text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-bold mb-1">
                    Todas las medidas en centímetros (opcionales)
                  </p>
                  {circumferenceFields.map((field) => (
                    <div key={field.name}>
                      <label className="block text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 font-bold">
                        {field.label}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        {...register(field.name, { valueAsNumber: true })}
                        className="brutalist-input w-full p-2 bg-zinc-950 text-white border-2 focus:outline-none text-sm"
                        placeholder={field.placeholder}
                      />
                      {errors[field.name] && (
                        <p className="text-red-500 text-[10px] font-mono uppercase mt-0.5">{errors[field.name]?.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); setShowCircumferences(false); }}
                  className="flex-1 p-4 border-2 border-zinc-700 text-zinc-400 font-heading font-black tracking-widest hover:bg-zinc-800 transition-colors uppercase"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 brutalist-button p-4 text-center disabled:opacity-50"
                >
                  {isSubmitting ? "GUARDANDO..." : "GUARDAR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
