import {
  getPrescriptionByPatient,
  getWeeklyStats,
  getTodayLogs,
  getWeeklyExerciseLogs,
} from "@/lib/rehab/actions";
import { requireMember } from "@/lib/auth/dashboard";
import RehabDashboardClient from "./RehabDashboardClient";
import type { Prescription, ExerciseLog } from "@/types/rehab";
import type { WeeklyChartData } from "@/lib/rehab/actions";

export default async function RehabPage() {
  const { user, profile } = await requireMember();

  let prescription: Prescription | null = null;
  let weeklyCount = 0;
  let avgPain = 0;
  let todayLogs: ExerciseLog[] = [];
  let weeklyChartData7: WeeklyChartData[] = [];
  let weeklyChartData14: WeeklyChartData[] = [];

  try {
    prescription = await getPrescriptionByPatient(user.id);
    const stats = await getWeeklyStats(user.id);
    weeklyCount = stats.totalSessions;
    avgPain = stats.avgPain;
    todayLogs = await getTodayLogs(user.id);
    [weeklyChartData7, weeklyChartData14] = await Promise.all([
      getWeeklyExerciseLogs(user.id, 7),
      getWeeklyExerciseLogs(user.id, 14),
    ]);
  } catch {
    // DB tables may not exist yet
  }

  return (
    <RehabDashboardClient
      name={profile?.name || "환자"}
      prescription={prescription}
      weeklyCount={weeklyCount}
      avgPain={avgPain}
      todayLogExerciseIds={todayLogs.map((l) => l.exercise_id).filter(Boolean) as string[]}
      weeklyChartData7={weeklyChartData7}
      weeklyChartData14={weeklyChartData14}
    />
  );
}
