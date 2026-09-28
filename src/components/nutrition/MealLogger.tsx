"use client";

import { useRef } from "react";
import { logMeal } from "@/actions/nutrition";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit"
      disabled={pending}
      className="brutalist-button w-full mt-4 p-3"
    >
      {pending ? "REGISTRANDO..." : "REGISTRAR COMIDA"}
    </button>
  );
}

export default function MealLogger() {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    try {
      await logMeal(formData);
      if (formRef.current) formRef.current.reset();
    } catch (e) {
      alert("Error al registrar comida");
    }
  };

  return (
    <div className="mt-6 border-t-2 border-zinc-800 pt-6">
      <h3 className="text-white font-heading font-black text-xl uppercase tracking-wider mb-4 flex items-center gap-2">
        LOG DE COMIDA
      </h3>
      
      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <select 
            name="mealType"
            className="bg-zinc-900 border-2 border-zinc-800 rounded-none px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-red-600"
          >
            <option value="Desayuno">DESAYUNO</option>
            <option value="Almuerzo">ALMUERZO</option>
            <option value="Cena">CENA</option>
            <option value="Snack">SNACK</option>
          </select>
          <input 
            name="name"
            type="text"
            required
            placeholder="ALIMENTO (EJ. POLLO)"
            className="bg-zinc-900 border-2 border-zinc-800 rounded-none px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-red-600 font-bold uppercase"
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="block text-[10px] text-zinc-500 font-mono font-bold mb-1">KCAL</label>
            <input 
              name="calories"
              type="number"
              required
              placeholder="0"
              className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-none px-2 py-2 text-sm text-white font-black focus:outline-none focus:border-red-600 text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 font-mono font-bold mb-1">PRO (g)</label>
            <input 
              name="protein"
              type="number"
              required
              placeholder="0"
              className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-none px-2 py-2 text-sm text-white font-black focus:outline-none focus:border-red-600 text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 font-mono font-bold mb-1">CARB (g)</label>
            <input 
              name="carbs"
              type="number"
              required
              placeholder="0"
              className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-none px-2 py-2 text-sm text-white font-black focus:outline-none focus:border-red-600 text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 font-mono font-bold mb-1">FAT (g)</label>
            <input 
              name="fats"
              type="number"
              required
              placeholder="0"
              className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-none px-2 py-2 text-sm text-white font-black focus:outline-none focus:border-red-600 text-center"
            />
          </div>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
