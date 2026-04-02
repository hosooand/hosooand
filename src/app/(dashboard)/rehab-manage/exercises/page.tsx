import { getExercises, getBodyParts } from "@/lib/rehab/actions";
import { requireStaff } from "@/lib/auth/dashboard";
import ExercisesClient from "./ExercisesClient";

export default async function ExercisesPage() {
  await requireStaff();
  const [exercises, bodyParts] = await Promise.all([
    getExercises(),
    getBodyParts(),
  ]);

  return <ExercisesClient initialExercises={exercises} bodyParts={bodyParts} />;
}
