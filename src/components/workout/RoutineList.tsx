"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function RoutineList() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchRoutines = async () => {
    try {
      const res = await fetch("/api/routines");
      if (res.ok) {
        const data = await res.json();
        setRoutines(data.routines);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Escuchamos focus de la ventana por si creamos una rutina y vuelve a esta vista
    fetchRoutines();
  }, []);

  const handleArchive = async (id: string) => {
    if (!confirm("¿Seguro que quieres archivar esta rutina? Dejará de aparecer en tus opciones diarias.")) return;
    
    try {
      const res = await fetch(`/api/routines/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" })
      });
      if (res.ok) {
        // Remover localmente para UX rápida
        setRoutines(prev => prev.filter(r => r._id !== id));
        router.refresh();
      }
    } catch (err) {
      console.error("Error archiving", err);
    }
  };

  if (loading) return <div className="text-zinc-500 font-mono text-sm uppercase">Cargando plantillas...</div>;
  if (routines.length === 0) return <div className="text-zinc-500 font-mono text-sm uppercase bg-black border-2 border-dashed border-zinc-800 p-8 text-center">No tienes plantillas activas. Crea una en el panel izquierdo.</div>;

  return (
    <div className="space-y-4">
      {routines.map(r => (
        <div key={r._id} className="bg-black border-2 border-zinc-800 p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-colors hover:border-zinc-700">
          <div>
            <h3 className="text-lg font-heading font-black text-white uppercase">{r.name}</h3>
            <div className="flex gap-2 mt-2">
              {r.assignedDays?.map((day: string) => (
                <span key={day} className="text-[10px] bg-zinc-900 text-zinc-400 font-mono font-bold px-2 py-1 uppercase tracking-widest border border-zinc-800">
                  {day}
                </span>
              ))}
              {!r.assignedDays?.length && (
                <span className="text-[10px] text-zinc-600 font-mono uppercase">Libre (Sin día asignado)</span>
              )}
            </div>
          </div>
          <button 
            onClick={() => handleArchive(r._id)}
            className="text-[10px] bg-red-900/20 text-red-500 border border-red-900/50 px-4 py-2 uppercase font-black tracking-widest hover:bg-red-600 hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
          >
            ARCHIVAR
          </button>
        </div>
      ))}
    </div>
  );
}
