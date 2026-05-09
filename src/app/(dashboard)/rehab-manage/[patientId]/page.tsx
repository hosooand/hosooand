import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/dashboard";
import {
  getPrescriptionByPatient,
  getPatientDetailExerciseBundle,
  getMedicalImages,
} from "@/lib/rehab/actions";
import PatientDetailClient from "./PatientDetailClient";
import type { ExerciseLog, MedicalImage } from "@/types/rehab";
import type {
  WeeklyChartData,
  PainTrendData,
  ExerciseStatsData,
} from "@/lib/rehab/actions";

interface Props {
  params: Promise<{ patientId: string }>;
}

const emptyStats: ExerciseStatsData = {
  totalDays: 0,
  totalCount: 0,
  avgPain: 0,
  thisWeekDays: 0,
};

export default async function PatientDetailPage({ params }: Props) {
  const { patientId } = await params;
  const { supabase } = await requireStaff();

  // patient + 3개 번들을 모두 병렬 호출
  const [patientRes, presRes, bundleRes, imgRes] = await Promise.allSettled([
    supabase
      .from("profiles")
      .select("id, name, member_number, role")
      .eq("id", patientId)
      .single(),
    getPrescriptionByPatient(patientId),
    getPatientDetailExerciseBundle(patientId),
    getMedicalImages(patientId, { limit: 5 }),
  ]);

  const patient =
    patientRes.status === "fulfilled" ? patientRes.value.data : null;
  if (!patient) redirect("/rehab-manage");

  const prescription =
    presRes.status === "fulfilled" ? presRes.value : null;

  let weeklyChartData7: WeeklyChartData[] = [];
  let weeklyChartData14: WeeklyChartData[] = [];
  let painTrendData7: PainTrendData[] = [];
  let painTrendData14: PainTrendData[] = [];
  let exerciseStats: ExerciseStatsData = emptyStats;
  let recentLogs: ExerciseLog[] = [];

  if (bundleRes.status === "fulfilled") {
    weeklyChartData7 = bundleRes.value.weeklyChartData7;
    weeklyChartData14 = bundleRes.value.weeklyChartData14;
    painTrendData7 = bundleRes.value.painTrendData7;
    painTrendData14 = bundleRes.value.painTrendData14;
    exerciseStats = bundleRes.value.exerciseStats;
    recentLogs = bundleRes.value.recentLogs;
  }

  const medicalImages: MedicalImage[] =
    imgRes.status === "fulfilled" ? imgRes.value : [];

  let bodyPartNames: Record<string, string> = {};
  if (prescription && prescription.body_part_ids.length > 0) {
    const { data: bpData } = await supabase
      .from("body_parts")
      .select("id, name")
      .in("id", prescription.body_part_ids);
    if (bpData) {
      bodyPartNames = Object.fromEntries(bpData.map((b) => [b.id, b.name]));
    }
  }

  return (
    <PatientDetailClient
      patient={{
        id: patient.id,
        name: patient.name || "이름 없음",
        member_number: patient.member_number || null,
      }}
      prescription={prescription}
      bodyPartNames={bodyPartNames}
      medicalImages={medicalImages}
      weeklyChartData7={weeklyChartData7}
      weeklyChartData14={weeklyChartData14}
      painTrendData7={painTrendData7}
      painTrendData14={painTrendData14}
      exerciseStats={exerciseStats}
      recentLogs={recentLogs}
    />
  );
}
