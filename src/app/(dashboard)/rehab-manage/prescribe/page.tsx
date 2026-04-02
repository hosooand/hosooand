import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/dashboard";
import { getBodyParts, getPrescriptionByPatient } from "@/lib/rehab/actions";
import PrescribeClient, {
  type PrescriptionDraft,
} from "./PrescribeClient";
import type { ExerciseLevel, Prescription } from "@/types/rehab";

interface Props {
  searchParams: Promise<{ patientId?: string; edit?: string }>;
}

function buildInitialDraftFromPrescription(
  prescription: Prescription | null
): PrescriptionDraft | null {
  if (!prescription?.body_part_ids?.length) return null;
  const parts = [...prescription.body_part_ids];
  const exercises = prescription.exercises ?? [];
  const exercisesByBodyPart: Record<string, string[]> = {};
  const levelByBodyPart: Record<string, ExerciseLevel> = {};

  for (const id of parts) {
    exercisesByBodyPart[id] = [];
  }

  for (const pid of parts) {
    const exs = exercises.filter((e) => e.body_part_id === pid);
    if (exs.length === 0) {
      levelByBodyPart[pid] = 1;
      exercisesByBodyPart[pid] = [];
    } else {
      const lv = Math.min(...exs.map((e) => e.level as number)) as ExerciseLevel;
      levelByBodyPart[pid] = lv;
      exercisesByBodyPart[pid] = exs
        .filter((e) => e.level === lv)
        .map((e) => e.id);
    }
  }

  return {
    selectedBodyParts: parts,
    levelByBodyPart,
    exercisesByBodyPart,
    note: prescription.note ?? "",
  };
}

export default async function PrescribePage({ searchParams }: Props) {
  const { patientId, edit } = await searchParams;
  const { supabase } = await requireStaff();

  if (!patientId) redirect("/rehab-manage");

  const { data: patient } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", patientId)
    .single();

  if (!patient) redirect("/rehab-manage");

  const bodyParts = await getBodyParts();

  let initialDraft = null;
  if (edit === "1") {
    try {
      const prescription = await getPrescriptionByPatient(patientId);
      initialDraft = buildInitialDraftFromPrescription(prescription);
    } catch {
      initialDraft = null;
    }
  }

  return (
    <PrescribeClient
      patient={{ id: patient.id, name: patient.name || "이름 없음" }}
      bodyParts={bodyParts}
      initialDraft={initialDraft}
    />
  );
}
