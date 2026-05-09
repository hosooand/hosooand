"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getPrescriptionByPatient,
  getPatientDetailExerciseBundle,
  getMedicalImages,
} from "@/lib/rehab/actions";
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

const emptyStats: ExerciseStatsData = {
  totalDays: 0,
  totalCount: 0,
  avgPain: 0,
  thisWeekDays: 0,
};

export default function PatientDetailPage({ params }: Props) {
  const { patientId } = use(params);
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
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profile) {
        router.replace("/login");
        return;
      }
      if (profile.role === "member") {
        router.replace("/rehab");
        return;
      }

      // patient + 3 번들 + 인증 후 한 번에 병렬 호출
      const [patientRes, presRes, bundleRes, imgRes] =
        await Promise.allSettled([
          supabase
            .from("profiles")
            .select("id, name, member_number, role")
            .eq("id", patientId)
            .single(),
          getPrescriptionByPatient(patientId),
          getPatientDetailExerciseBundle(patientId),
          getMedicalImages(patientId, { limit: 5 }),
        ]);

      const patientRow =
        patientRes.status === "fulfilled" ? patientRes.value.data : null;
      if (!patientRow) {
        router.replace("/rehab-manage");
        return;
      }

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
          bodyPartNames = Object.fromEntries(
            bpData.map((b) => [b.id, b.name])
          );
        }
      }

      if (cancelled) return;
      setData({
        patient: {
          id: patientRow.id,
          name: patientRow.name || "이름 없음",
          member_number: patientRow.member_number || null,
        },
        prescription,
        bodyPartNames,
        medicalImages,
        weeklyChartData7,
        weeklyChartData14,
        painTrendData7,
        painTrendData14,
        exerciseStats,
        recentLogs,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [patientId, router]);

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
