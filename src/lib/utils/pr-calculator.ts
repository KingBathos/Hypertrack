import { Db, ObjectId } from "mongodb";

export async function calculateAndMarkPRs(db: Db, userId: ObjectId, exercises: any[]) {
  const enrichedExercises = [];
  let prsBroken = 0;

  for (const ex of exercises) {
    const exName = ex.exerciseName.trim();
    
    // Buscar el máximo peso levantado por este usuario para este ejercicio en la historia
    const cursor = db.collection("workout_sessions").aggregate([
      { $match: { clientId: userId } },
      { $unwind: "$exercises" },
      { $match: { "exercises.exerciseName": { $regex: new RegExp(`^${exName}$`, "i") } } },
      { $unwind: "$exercises.sets" },
      { $group: { _id: null, maxWeight: { $max: "$exercises.sets.weight" } } }
    ]);
    
    const result = await cursor.toArray();
    const maxHistoricalWeight = result.length > 0 ? result[0].maxWeight : 0;
    
    // NOTA: Para no romper múltiples PRs en el mismo ejercicio en una sola sesión (si hace 3 sets subiendo peso),
    // Llevaremos cuenta del nuevo max local.
    let currentLocalMax = maxHistoricalWeight;

    const enrichedSets = ex.sets.map((set: any) => {
      // Es un PR si el peso actual es mayor que el máximo histórico conocido hasta este set
      const isPR = set.weight > currentLocalMax && set.weight > 0;
      
      if (isPR) {
        prsBroken++;
        currentLocalMax = set.weight; // Actualizar para que los siguientes sets comparen contra este nuevo PR
      }
      
      return {
        ...set,
        isPR
      };
    });

    enrichedExercises.push({
      ...ex,
      sets: enrichedSets
    });
  }

  return { enrichedExercises, prsBroken };
}
