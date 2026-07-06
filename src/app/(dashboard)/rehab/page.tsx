"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getMemberDashboardBundle } from "@/lib/rehab/actions";
import { useDashboardSession } from "../_components/DashboardSessionContext";
import RehabDashboardClient from "./RehabDashboardClient";
import type { Prescription } from "@/types/rehab";
import type { WeeklyChartData } from "@/lib/rehab/actions";

interface PageData {
  name: string;
  avatar: string;
  prescription: Prescription | null;
  weeklyCount: number;
  avgPain: number;
  todayLogExerciseIds: string[];
  weeklyChartData7: WeeklyChartData[];
  weeklyChartData14: WeeklyChartData[];
}

export default function RehabPage() {
  const router = useRouter();
  const { userId, profile } = useDashboardSession();
  const [data, setData] = useState<PageData | null>(null);

  useEffect(() => {
    if (profile && profile.role !== "member") {
      router.replace("/rehab-manage");
    }
  }, [profile, router]);

  useEffect(() => {
    if (!profile || profile.role !== "member") return;
    let cancelled = false;
    (async () => {
      let prescription: Prescription | null = null;
      let weeklyCount = 0;
      let avgPain = 0;
      let todayExerciseIds: string[] = [];
      let weeklyChartData7: WeeklyChartData[] = [];
      let weeklyChartData14: WeeklyChartData[] = [];

      // 아바타는 세션 컨텍스트(SSR 1회 로드)라 마이페이지 변경이 반영 안 됨 →
      // 홈 진입 시마다 profiles.avatar를 최신으로 다시 읽어 실시간 반영한다.
      let avatarValue = profile.avatar || "duck";

      try {
        const supabase = createClient();
        const [bundle, profileRes] = await Promise.all([
          getMemberDashboardBundle(userId),
          supabase.from("profiles").select("avatar").eq("id", userId).single(),
        ]);

        prescription = bundle.prescription;
        weeklyCount = bundle.weeklyCount;
        avgPain = bundle.avgPain;
        todayExerciseIds = bundle.todayExerciseIds;
        weeklyChartData7 = bundle.weeklyChartData7;
        weeklyChartData14 = bundle.weeklyChartData14;

        if (profileRes.data?.avatar) avatarValue = profileRes.data.avatar;
      } catch {
        // DB tables may not exist yet
      }

      if (cancelled) return;
      setData({
        name: profile.name || "환자",
        avatar: avatarValue,
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
  }, [userId, profile]);

  if (!data) {
    return <RehabDashboardSkeleton />;
  }

  return (
    <RehabDashboardClient
      name={data.name}
      avatar={data.avatar}
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
