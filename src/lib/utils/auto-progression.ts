import { Db, ObjectId } from "mongodb";

export async function applyAutoProgression(db: Db, userId: string, routines: any[]) {
  // El objetivo es analizar las rutinas que tocan hoy e inyectar sugerencias inteligentes
  for (const routine of routines) {
    for (const ex of routine.exercises) {
      const exName = ex.exerciseName.trim();
      
      // Buscar la última vez que el usuario hizo este ejercicio
      const lastSession = await db.collection("workout_sessions").aggregate([
        { $match: { clientId: new ObjectId(userId) } },
        { $sort: { startedAt: -1 } },
        { $unwind: "$exercises" },
        { $match: { "exercises.exerciseName": { $regex: new RegExp(`^${exName}$`, "i") } } },
        { $limit: 1 }
      ]).toArray();

      if (lastSession.length > 0) {
        const lastExerciseData = lastSession[0].exercises;
        
        let totalRpe = 0;
        let setsWithRpe = 0;
        let maxWeightLastTime = 0;
        
        for (const set of lastExerciseData.sets) {
          if (set.weight > maxWeightLastTime) maxWeightLastTime = set.weight;
          if (set.rpe) {
            totalRpe += set.rpe;
            setsWithRpe++;
          }
        }
        
        const avgRpe = setsWithRpe > 0 ? totalRpe / setsWithRpe : null;

        // Regla: Si la última vez reportó que fue "muy fácil o moderado" (RPE <= 7), subir peso.
        if (avgRpe !== null && avgRpe <= 7 && maxWeightLastTime > 0) {
          ex.isAutoProgressed = true;
          ex.autoProgressionType = "OVERLOAD";
          ex.previousWeight = maxWeightLastTime;
          
          for (const set of ex.sets) {
            set.weight = maxWeightLastTime + 2.5;
          }
        } 
        // Regla: Si fue extremadamente difícil o falló (RPE >= 9.5), sugerir descarga (Deload)
        else if (avgRpe !== null && avgRpe >= 9.5 && maxWeightLastTime > 0) {
           ex.isAutoProgressed = true;
           ex.autoProgressionType = "DELOAD";
           ex.previousWeight = maxWeightLastTime;
           
           for (const set of ex.sets) {
             set.weight = Math.max(0, maxWeightLastTime - 2.5);
           }
        }
      }
    }
  }
  return routines;
}
