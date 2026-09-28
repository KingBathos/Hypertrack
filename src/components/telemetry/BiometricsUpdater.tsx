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

      const result = await logBiometrics(formData);

      if (result.success) {
        setIsOpen(false);
        reset();
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
          <div className="brutalist-card bg-zinc-950 p-6 w-full max-w-md relative">
            <button 
              onClick={() => setIsOpen(false)}
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
              <div>
                <label className="block text-sm text-zinc-400 font-mono uppercase tracking-widest mb-2 font-bold">
                  PESO CORPORAL (KG) <span className="text-red-500">*</span>
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
                  GRASA CORPORAL (%) <span className="text-zinc-600">(OPCIONAL)</span>
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

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
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
