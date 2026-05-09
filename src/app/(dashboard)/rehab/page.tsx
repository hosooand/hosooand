"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getPrescriptionByPatient,
  getWeeklyStats,
  getTodayLogs,
  getWeeklyExerciseLogs,
} from "@/lib/rehab/actions";
import RehabDashboardClient from "./RehabDashboardClient";
import type { Prescription } from "@/types/rehab";
import type { WeeklyChartData } from "@/lib/rehab/actions";

interface PageData {
  name: string;
  prescription: Prescription | null;
  weeklyCount: number;
  avgPain: number;
  todayLogExerciseIds: string[];
  weeklyChartData7: WeeklyChartData[];
  weeklyChartData14: WeeklyChartData[];
}

export default function RehabPage() {
  const router = useRouter();
  const [data, setData] = useState<PageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .single();

      if (!profile) {
        router.replace("/login");
        return;
      }
      if (profile.role !== "member") {
        router.replace("/rehab-manage");
        return;
      }

      let prescription: Prescription | null = null;
      let weeklyCount = 0;
      let avgPain = 0;
      let todayExerciseIds: string[] = [];
      let weeklyChartData7: WeeklyChartData[] = [];
      let weeklyChartData14: WeeklyChartData[] = [];

      try {
        const [pres, stats, todayLogs, weekly7, weekly14] = await Promise.all([
          getPrescriptionByPatient(user.id),
          getWeeklyStats(user.id),
          getTodayLogs(user.id),
          getWeeklyExerciseLogs(user.id, 7),
          getWeeklyExerciseLogs(user.id, 14),
        ]);

        prescription = pres;
        weeklyCount = stats.totalSessions;
        avgPain = stats.avgPain;
        todayExerciseIds = todayLogs
          .map((l) => l.exercise_id)
          .filter(Boolean) as string[];
        weeklyChartData7 = weekly7;
        weeklyChartData14 = weekly14;
      } catch {
        // DB tables may not exist yet
      }

      if (cancelled) return;
      setData({
        name: profile.name || "환자",
        prescription,
        weeklyCount,
        avgPain,
        todayLogExerciseIds: todayExerciseIds,
        weeklyChartData7,
        weeklyChartData14,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!data) {
    return <RehabDashboardSkeleton />;
  }

  return (
    <RehabDashboardClient
      name={data.name}
      prescription={data.prescription}
      weeklyCount={data.weeklyCount}
      avgPain={data.avgPain}
      todayLogExerciseIds={data.todayLogExerciseIds}
      weeklyChartData7={data.weeklyChartData7}
      weeklyChartData14={data.weeklyChartData14}
    />
  );
}

/** RehabDashboardClient의 레이아웃과 동일한 골격 */
function RehabDashboardSkeleton() {
  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "24px 20px 120px 20px",
        minHeight: "100vh",
      }}
    >
      {/* (a) 인사 섹션 */}
      <div style={{ paddingTop: 28, marginBottom: 20 }}>
        <div
          className="skeleton-block"
          style={{ width: 220, height: 26, borderRadius: 8 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 160, height: 14, borderRadius: 6, marginTop: 8 }}
        />
      </div>

      {/* (b) 퀵 액션 카드 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 100, borderRadius: 20 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 100, borderRadius: 20 }}
        />
      </div>

      {/* (c) 예약/문의 배너 */}
      <div
        className="skeleton-block"
        style={{ height: 64, borderRadius: 16, marginBottom: 16 }}
      />

      {/* (d) 마스코트 말풍선 */}
      <div
        className="skeleton-block"
        style={{ height: 76, borderRadius: 20, marginBottom: 16 }}
      />

      {/* (e) 통계 카드 3개 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 84, borderRadius: 16 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 84, borderRadius: 16 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 84, borderRadius: 16 }}
        />
      </div>

      {/* 처방 운동 카드 */}
      <div
        className="skeleton-block"
        style={{ height: 220, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 주간 차트 */}
      <div
        className="skeleton-block"
        style={{ height: 220, borderRadius: 20 }}
      />
    </div>
  );
}
