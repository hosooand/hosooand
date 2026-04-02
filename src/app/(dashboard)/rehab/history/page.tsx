import {
  getExerciseLogs,
  getWeekLogDates,
  getMedicalImages,
  getPrescriptionByPatient,
} from "@/lib/rehab/actions";
import { requireMember } from "@/lib/auth/dashboard";
import { weekRangeFromDate } from "@/lib/rehab/date-only";
import HistoryClient from "./HistoryClient";
import type { ExerciseLog, MedicalImage, Prescription } from "@/types/rehab";

export default async function HistoryPage() {
  const { user } = await requireMember();

  const today = new Date().toLocaleDateString('en-CA')
  const { start: startDate, end: endDate } = weekRangeFromDate(today)

  let weekLogs: ExerciseLog[] = [];
  let logDates: string[] = [];
  let medicalImages: MedicalImage[] = [];
  let prescription: Prescription | null = null;

  try {
    weekLogs = await getExerciseLogs(user.id, startDate, endDate);
    logDates = await getWeekLogDates(user.id, startDate, endDate);
    prescription = await getPrescriptionByPatient(user.id);
  } catch {
    // tables may not exist yet
  }

  try {
    medicalImages = await getMedicalImages(user.id);
  } catch {
    // table may not exist yet
  }

  return (
    <HistoryClient
      weekLogs={weekLogs}
      logDates={logDates}
      medicalImages={medicalImages}
      prescription={prescription}
      weekStart={startDate}
      today={today}
    />
  );
}
