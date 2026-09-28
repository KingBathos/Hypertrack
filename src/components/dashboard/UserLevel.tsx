import React from "react";

export function UserLevel() {
  // Datos simulados (luego puedes conectarlos a tu API real)
  const xpCurrent = 12500;
  const xpMax = 15000;
  const progress = (xpCurrent / xpMax) * 100;
  const streak = 5;

  return (
    <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/10 bg-zinc-900/50 p-5 backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-500/30">
      
      {/* 1. Indicador de Racha (Fire Streak) */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
          <span className="text-3xl drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">🔥</span>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Racha Actual</h3>
          <p className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-2xl font-black text-transparent drop-shadow-sm">
            {streak} Días
          </p>
        </div>
      </div>

      {/* 2. Barra de Experiencia (XP) RPG */}
      <div className="flex flex-1 flex-col justify-center sm:ml-12 max-w-lg">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black text-zinc-100">Nivel 12</h2>
            <p className="text-xs font-bold tracking-widest uppercase text-cyan-400">Vanguardia</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums text-zinc-300">
              {xpCurrent.toLocaleString()} <span className="text-xs font-medium text-zinc-500">/ {xpMax.toLocaleString()} XP</span>
            </p>
          </div>
        </div>
        
        {/* Contenedor de la barra y Glow de la barra */}
        <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-zinc-950/80 border border-white/5 shadow-inner">
          <div 
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

    </div>
  );
}
