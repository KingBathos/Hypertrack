"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workoutProgramSchema, type WorkoutProgram, DAYS_OF_WEEK } from "@/lib/schemas/routine.schema";
import { useRouter } from "next/navigation";
import { z } from "zod";

export function RoutineForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, control, handleSubmit, formState: { errors } } = useForm<z.infer<typeof workoutProgramSchema>>({
    resolver: zodResolver(workoutProgramSchema),
    defaultValues: {
      name: "",
      assignedDays: [],
      status: "ACTIVE",
      authorId: "pending", 
      clientId: "pending", 
      exercises: [{ exerciseName: "", sets: [{ setNumber: 1, reps: 10, weight: 0, unit: "KG" }] }]
    } as z.infer<typeof workoutProgramSchema>
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "exercises"
  });

  const onSubmit = async (data: WorkoutProgram) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Error al guardar la rutina");
      }

      router.push("/routines");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
      <h2 className="text-xl font-bold">Crear Nueva Rutina</h2>
      
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

      <div>
        <label className="block text-sm font-medium mb-1">Nombre de la Rutina</label>
        <input 
          {...register("name")} 
          className="w-full border p-2 rounded-md"
          placeholder="Ej: Empuje, Pecho y Tríceps..."
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Días Asignados</label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <label key={day} className="flex items-center gap-1 bg-neutral-100 p-2 rounded-md text-sm cursor-pointer hover:bg-neutral-200">
              <input type="checkbox" value={day} {...register("assignedDays")} />
              {day}
            </label>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Ejercicios</h3>
          <button 
            type="button" 
            onClick={() => append({ exerciseName: "", sets: [{ setNumber: 1, reps: 10, weight: 0, unit: "KG" }] })}
            className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-md"
          >
            + Añadir Ejercicio
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-md bg-neutral-50 relative">
              <button 
                type="button" 
                onClick={() => remove(index)}
                className="absolute top-2 right-2 text-red-500 text-xs hover:underline"
              >
                Eliminar
              </button>
              
              <label className="block text-sm mb-1">Nombre del Ejercicio</label>
              <input 
                {...register(`exercises.${index}.exerciseName`)} 
                className="w-full border p-2 rounded-md mb-2"
                placeholder="Ej: Press de Banca"
              />
              {errors.exercises?.[index]?.exerciseName && (
                <p className="text-red-500 text-xs">{errors.exercises[index].exerciseName?.message}</p>
              )}
            </div>
          ))}
        </div>
        {errors.exercises?.root && <p className="text-red-500 text-xs mt-2">{errors.exercises.root.message}</p>}
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-black text-white p-3 rounded-md font-medium hover:bg-neutral-800 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar Rutina"}
      </button>
    </form>
  );
}
