"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPatientDetailBundle } from "@/lib/rehab/actions";
import { useDashboardSession } from "../../_components/DashboardSessionContext";
import PatientDetailClient from "./PatientDetailClient";
import type { ExerciseLog, MedicalImage, Prescription } from "@/types/rehab";
import type {
  WeeklyChartData,
  PainTrendData,
  ExerciseStatsData,
} from "@/lib/rehab/actions";

interface Props {
  params: Promise<{ patientId: string }>;
}

interface PageData {
  patient: { id: string; name: string; member_number: string | null };
  prescription: Prescription | null;
  bodyPartNames: Record<string, string>;
  medicalImages: MedicalImage[];
  weeklyChartData7: WeeklyChartData[];
  weeklyChartData14: WeeklyChartData[];
  painTrendData7: PainTrendData[];
  painTrendData14: PainTrendData[];
  exerciseStats: ExerciseStatsData;
  recentLogs: ExerciseLog[];
}

export default function PatientDetailPage({ params }: Props) {
  const { patientId } = use(params);
  const router = useRouter();
  const { profile } = useDashboardSession();
  const [data, setData] = useState<PageData | null>(null);

  useEffect(() => {
    if (profile?.role === "member") {
      router.replace("/rehab");
    }
  }, [profile?.role, router]);

  useEffect(() => {
    if (profile?.role === "member") return;
    let cancelled = false;
    (async () => {
      // 서버 액션 하나로 통합: 서버 내부에서 모든 쿼리를 병렬(Promise.all) 실행하고
      // 왕복 1회로 전체 데이터를 받아온다. (기존 서버 액션 4개 직렬 큐잉 제거)
      let bundle;
      try {
        bundle = await getPatientDetailBundle(patientId);
      } catch {
        if (!cancelled) router.replace("/rehab-manage");
        return;
      }

      if (cancelled) return;
      if (!bundle.patient) {
        router.replace("/rehab-manage");
        return;
      }

      setData({
        patient: bundle.patient,
        prescription: bundle.prescription,
        bodyPartNames: bundle.bodyPartNames,
        medicalImages: bundle.medicalImages,
        weeklyChartData7: bundle.weeklyChartData7,
        weeklyChartData14: bundle.weeklyChartData14,
        painTrendData7: bundle.painTrendData7,
        painTrendData14: bundle.painTrendData14,
        exerciseStats: bundle.exerciseStats,
        recentLogs: bundle.recentLogs,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [patientId, profile?.role, router]);

  if (!data) {
    return <PatientDetailSkeleton />;
  }

  return (
    <PatientDetailClient
      patient={data.patient}
      prescription={data.prescription}
      bodyPartNames={data.bodyPartNames}
      medicalImages={data.medicalImages}
      weeklyChartData7={data.weeklyChartData7}
      weeklyChartData14={data.weeklyChartData14}
      painTrendData7={data.painTrendData7}
      painTrendData14={data.painTrendData14}
      exerciseStats={data.exerciseStats}
      recentLogs={data.recentLogs}
    />
  );
}

function PatientDetailSkeleton() {
  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "24px 20px 120px 20px",
        minHeight: "100vh",
      }}
    >
      {/* 환자 정보 헤더 */}
      <div style={{ paddingTop: 8, marginBottom: 20 }}>
        <div
          className="skeleton-block"
          style={{ width: 80, height: 14, borderRadius: 6, marginBottom: 8 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 180, height: 26, borderRadius: 8 }}
        />
      </div>

      {/* 통계 카드 */}
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

      {/* 처방 정보 */}
      <div
        className="skeleton-block"
        style={{ height: 200, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 차트 */}
      <div
        className="skeleton-block"
        style={{ height: 240, borderRadius: 20, marginBottom: 16 }}
      />
      <div
        className="skeleton-block"
        style={{ height: 240, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 의료 이미지 */}
      <div
        className="skeleton-block"
        style={{ height: 180, borderRadius: 20 }}
      />
    </div>
  );
}
