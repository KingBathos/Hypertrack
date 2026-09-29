"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { logWorkoutSession } from "@/actions/workout";

const REST_DURATION = 90; // 90 seconds

export default function LiveWorkoutPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [startedAt] = useState(() => new Date().toISOString());
  const [programName, setProgramName] = useState("");
  const [isLoadingProgram, setIsLoadingProgram] = useState(true);
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, any>>({});
  
  // Timer Countdown Telemetry
  const [timeLeft, setTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((s) => s - 1);
      }, 1000);
    } else if (isResting && timeLeft === 0) {
      // Temporizador finalizado naturalmente
      setIsResting(false);
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 2000);
    } else if (timeLeft === 0) {
      setIsResting(false);
    }
    return () => clearInterval(interval);
  }, [isResting, timeLeft]);

  const startRest = () => {
    setTimeLeft(REST_DURATION);
    setIsResting(true);
  };

  const stopRest = () => {
    setIsResting(false);
    setTimeLeft(0);
  };

  const { register, control, handleSubmit, watch, reset } = useForm({
    defaultValues: {
      exercises: [
        {
          exerciseName: "",
          sets: [{ weight: "", reps: "", unit: "KG", rpe: "" }]
        }
      ]
    }
  });

  useEffect(() => {
    // Only run on client to avoid Next.js Suspense boundary hangs
    const params = new URLSearchParams(window.location.search);
    const currentMode = params.get("mode");
    
    // Fetch history regardless of mode
    fetch("/api/workouts/history/latest")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.history) {
          setExerciseHistory(data.history);
        }
      })
      .catch(console.error);

    if (currentMode === "program") {
      fetch("/api/routines/today")
        .then(res => res.json())
        .then(data => {
          if (data.routines && data.routines.length > 0) {
            const routine = data.routines[0];
            setProgramName(routine.name);
            const formattedExercises = routine.exercises.map((exe: any) => {
              const sets = [];
              const targetSets = exe.targetSets || 3;
              for (let i = 0; i < targetSets; i++) {
                sets.push({
                  weight: "",
                  reps: exe.targetReps?.toString() || "10",
                  unit: "KG",
                  rpe: exe.targetRpe?.toString() || ""
                });
              }
              return {
                exerciseName: exe.exerciseName,
                sets
              };
            });
            reset({ exercises: formattedExercises });
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingProgram(false));
    } else {
      setIsLoadingProgram(false);
    }
  }, [reset]);

  const { fields: exerciseFields, append: appendExercise, remove: removeExercise } = useFieldArray({
    control,
    name: "exercises"
  });

  // Telemetría de Volumen en Vivo
  const exercisesWatch = watch("exercises");
  const totalVolume = exercisesWatch.reduce((total, exe) => {
    if (!exe || !exe.sets) return total;
    const exeVol = exe.sets.reduce((setTotal, set) => {
      const w = Number(set.weight) || 0;
      const r = Number(set.reps) || 0;
      return setTotal + (w * r);
    }, 0);
    return total + exeVol;
  }, 0);

  const onSubmit = (data: any) => {
    startTransition(async () => {
      try {
        const audio = new Audio("https://actions.google.com/sounds/v1/ui/button_click.ogg");
        audio.play().catch(() => {});
        
        const payload = {
          type: (programName ? "PROGRAM" : "FREE") as "FREE" | "PROGRAM",
          name: programName ? programName : `Entrenamiento Libre - ${new Date().toLocaleDateString("es-ES", { day: '2-digit', month: 'short' })}`,
          startedAt,
          finishedAt: new Date().toISOString(),
          exercises: data.exercises.map((e: any) => ({
            exerciseName: e.exerciseName,
            sets: e.sets
          }))
        };
        
        await logWorkoutSession(payload);
        router.push("/dashboard");
      } catch (error) {
        console.error("Error al guardar la sesión:", error);
        alert("Hubo un error al transmitir los datos. Por favor intenta de nuevo.");
      }
    });
  };

  // SVG Circle calculation
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = isResting ? circumference - (timeLeft / REST_DURATION) * circumference : circumference;

  return (
    <div className="fixed inset-0 z-100 overflow-y-auto bg-black text-zinc-100 font-sans">
      <div className={`fixed top-0 left-0 w-full z-20 transition-colors duration-500 border-b-2 ${isResting ? 'bg-red-950 border-red-600' : 'bg-black border-zinc-800'}`}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 ${isResting ? 'bg-red-600 animate-pulse' : 'bg-zinc-500'}`} />
            <span className="font-mono text-sm font-black tracking-widest text-white uppercase">
              {isResting ? "RECUPERACIÓN" : "ENTRENANDO"}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {isResting && (
              <button type="button" onClick={stopRest} className="text-xs font-black text-red-500 hover:text-white transition-colors uppercase tracking-widest bg-zinc-900 px-3 py-1 border border-red-900">
                SALTAR
              </button>
            )}
            
            {/* Temporizador Circular (SVG) */}
            <div className="relative flex items-center justify-center w-12 h-12">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="24" cy="24" r={radius} className="stroke-zinc-800" strokeWidth="4" fill="none" />
                <circle 
                  cx="24" cy="24" r={radius} 
                  className={`transition-all duration-1000 ease-linear ${isResting ? 'stroke-red-600' : 'stroke-zinc-600'}`} 
                  strokeWidth="4" fill="none" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={dashoffset} 
                />
              </svg>
              <span className={`relative font-mono font-black text-sm ${isResting ? 'text-red-500' : 'text-zinc-500'}`}>
                {isResting ? timeLeft : "0"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-28 pb-32">
        <header className="mb-10 text-center flex flex-col items-center">
          <h1 className="text-5xl font-heading font-black tracking-tighter text-white uppercase">
            {programName ? programName : "MODO GIMNASIO"}
          </h1>
          {/* Telemetría Holográfica de Volumen */}
          <div className="mt-4 inline-flex items-center gap-2 bg-zinc-900 border-2 border-zinc-800 px-4 py-2">
            <span className="text-zinc-500 text-xs font-mono font-bold tracking-widest uppercase">VOLUMEN TOTAL:</span>
            <span className="font-black text-xl text-red-600">{totalVolume.toLocaleString()} <span className="text-xs font-bold text-zinc-500">KG</span></span>
          </div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {isLoadingProgram ? (
            <div className="text-center text-red-500 font-mono uppercase font-bold p-10 animate-pulse">
              CARGANDO PROGRAMA ACTIVO...
            </div>
          ) : (
            exerciseFields.map((exercise, exeIdx) => (
              <div key={exercise.id} className="animate-fade-slide-up">
                <ExerciseBlock 
                  exeIdx={exeIdx}
                  control={control}
                  register={register}
                  startRest={startRest}
                  removeExercise={() => removeExercise(exeIdx)}
                  history={exerciseHistory}
                />
              </div>
            )))}

          <button
            type="button"
            onClick={() => appendExercise({ exerciseName: "", sets: [{ weight: "", reps: "", unit: "KG", rpe: "" }] })}
            className="w-full py-5 border-2 border-dashed border-zinc-800 text-zinc-500 font-black hover:border-red-600 hover:text-red-500 transition-colors bg-zinc-900 uppercase tracking-widest"
          >
            + AÑADIR EJERCICIO
          </button>

          <div className="fixed bottom-0 left-0 w-full p-4 bg-black z-20 border-t-2 border-zinc-900">
            <div className="max-w-3xl mx-auto">
              <button 
                type="submit" 
                disabled={isPending}
                className="w-full relative bg-red-600 text-white font-black uppercase text-xl py-4 tracking-widest border-2 border-transparent hover:bg-black hover:border-red-600 hover:text-red-600 transition-all disabled:opacity-50"
              >
                {isPending ? "TRANSMITIENDO DATOS..." : "FINALIZAR ENTRENAMIENTO"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Overlay Visual de Alerta (Flash State) */}
      <div 
        className={`fixed inset-0 pointer-events-none z-110 transition-all duration-500 ease-in-out ${
          isFlashing 
            ? 'bg-red-600/20 shadow-[inset_0_0_100px_rgba(220,38,38,0.4)] animate-pulse' 
            : 'bg-transparent'
        }`} 
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(2rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-slide-up {
          animation: fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}} />
    </div>
  );
}

function ExerciseBlock({ exeIdx, control, register, startRest, removeExercise, history }: any) {
  const { fields: setFields, append: appendSet, remove: removeSet } = useFieldArray({
    control,
    name: `exercises.${exeIdx}.sets`
  });

  const currentName = useWatch({ control, name: `exercises.${exeIdx}.exerciseName` });
  const exeHistory = currentName && history ? history[currentName.trim().toLowerCase()] : null;

  return (
    <div className="brutalist-card p-6 relative group transition-all">
      <button 
        type="button" 
        onClick={removeExercise}
        className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 font-bold transition-colors opacity-0 group-hover:opacity-100 bg-zinc-950 px-2 py-1"
        title="Eliminar Ejercicio"
      >
        ✕ ELIMINAR
      </button>

      <div className="mb-6">
        <input 
          {...register(`exercises.${exeIdx}.exerciseName`)}
          className="w-full bg-transparent text-3xl font-heading font-black text-white placeholder-zinc-800 focus:outline-none border-b-2 border-zinc-800 focus:border-red-600 pb-2 transition-colors pr-24 uppercase"
          placeholder="EJ: PRESS DE BANCA PLANO"
        />
        {exeHistory && (
          <div className="text-xs text-zinc-500 font-mono mt-2 uppercase tracking-widest flex items-center gap-2">
            <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ÚLTIMA VEZ: <span className="text-zinc-300 font-bold">{exeHistory.weight}KG × {exeHistory.reps}</span> 
            <span className="text-[9px]">({new Date(exeHistory.date).toLocaleDateString("es-ES", { day: '2-digit', month: 'short' })})</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 sm:gap-3 px-2 text-[10px] sm:text-xs font-mono text-zinc-500 uppercase tracking-widest font-black">
          <div className="w-6 sm:w-8 text-center">SET</div>
          <div>PESO</div>
          <div>REPS</div>
          <div>RPE</div>
          <div className="w-10 sm:w-16"></div>
        </div>

        {setFields.map((item, setIdx) => (
          <div key={item.id} className="animate-fade-slide-up grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 sm:gap-3 items-center bg-zinc-950 p-2 sm:p-2 border-2 border-zinc-800 focus-within:border-red-600 transition-all">
            <div className="w-6 sm:w-8 text-center font-mono font-black text-white text-sm sm:text-base">
              {setIdx + 1}
            </div>
            
            <div className="relative">
              <input 
                type="number"
                step="any"
                {...register(`exercises.${exeIdx}.sets.${setIdx}.weight`)}
                className="w-full bg-zinc-900 pl-2 sm:pl-3 pr-6 sm:pr-8 py-2 sm:py-3 text-sm sm:text-lg font-black text-white focus:outline-none focus:ring-1 focus:ring-red-600"
                placeholder="--"
              />
              <select 
                {...register(`exercises.${exeIdx}.sets.${setIdx}.unit`)}
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-transparent text-[9px] sm:text-[10px] font-black text-zinc-500 focus:outline-none cursor-pointer"
              >
                <option value="KG">KG</option>
                <option value="LBS">LBS</option>
              </select>
            </div>

            <input 
              type="number"
              {...register(`exercises.${exeIdx}.sets.${setIdx}.reps`)}
              className="w-full bg-zinc-900 px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-lg font-black text-white text-center focus:outline-none focus:ring-1 focus:ring-red-600"
              placeholder="--"
            />

            <input 
              type="number"
              step="any"
              {...register(`exercises.${exeIdx}.sets.${setIdx}.rpe`)}
              className="w-full bg-zinc-900 px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-lg font-black text-white text-center focus:outline-none focus:ring-1 focus:ring-red-600"
              placeholder="--"
            />

            <button 
              type="button"
              onClick={() => {
                startRest();
              }}
              className="w-10 sm:w-16 h-10 sm:h-12 flex items-center justify-center bg-red-600/10 text-red-600 font-black hover:bg-red-600 hover:text-white transition-colors border border-red-600/30 active:scale-95"
              title="Completar y Descansar"
            >
              ✓
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => appendSet({ weight: "", reps: "", unit: "KG", rpe: "" })}
        className="w-full mt-2 py-2 text-xs font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-widest bg-zinc-900 border border-zinc-800"
      >
        + Añadir Set
      </button>
    </div>
  );
}
