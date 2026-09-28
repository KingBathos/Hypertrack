"use client";

import { useState, useEffect } from "react";

export default function AchievementsPage() {
  const [prs, setPrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPRs() {
      try {
        const res = await fetch("/api/analytics/prs");
        if (res.ok) {
          const data = await res.json();
          setPrs(data.prs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPRs();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-12 border-b-4 border-yellow-500 pb-6">
        <h1 className="text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
          SALÓN DE LA FAMA
        </h1>
        <p className="mt-2 text-lg text-yellow-500 font-mono uppercase tracking-widest font-bold">
          TUS RÉCORDS PERSONALES HISTÓRICOS (PRs)
        </p>
      </header>

      {loading ? (
        <div className="text-zinc-500 font-mono text-xl uppercase">Cargando tus logros...</div>
      ) : prs.length === 0 ? (
        <div className="bg-black border-2 border-dashed border-zinc-800 p-10 text-center text-zinc-500 font-mono font-bold uppercase text-lg">
          AÚN NO HAS REGISTRADO NINGÚN RÉCORD. ¡VE A ENTRENAR MÁS PESADO!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prs.map(pr => (
            <div key={pr._id} className="bg-black border-2 border-yellow-500 p-6 flex flex-col items-center text-center shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-shadow">
              <span className="text-5xl mb-4 drop-shadow-lg">🏆</span>
              <h3 className="text-xl font-heading font-black text-white uppercase mb-2">{pr._id}</h3>
              <div className="text-4xl font-black text-yellow-400 mb-4 drop-shadow-md">
                {pr.maxWeight}<span className="text-lg text-yellow-600 ml-1">KG</span>
              </div>
              <span className="text-[10px] bg-yellow-900/20 text-yellow-500 border border-yellow-900/50 px-3 py-1 font-mono uppercase font-bold tracking-widest">
                LOGRADO EL: {new Date(pr.lastPRDate).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
