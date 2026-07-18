"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMemberHistoryBundle } from "@/lib/rehab/actions";
import { weekRangeFromDate } from "@/lib/rehab/date-only";
import { useDashboardSession } from "../../_components/DashboardSessionContext";
import HistoryClient from "./HistoryClient";
import type { ExerciseLog, MedicalImage, Prescription } from "@/types/rehab";

interface PageData {
  weekLogs: ExerciseLog[];
  logDates: string[];
  medicalImages: MedicalImage[];
  prescription: Prescription | null;
  weekStart: string;
  today: string;
}

export default function HistoryPage() {
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
      const today = new Date().toLocaleDateString("en-CA");
      const { start: startDate, end: endDate } = weekRangeFromDate(today);

      // 서버 액션 하나로 통합: 서버 내부에서 로그·처방·의료이미지를 병렬 조회하고
      // 왕복 1회로 받아온다. (기존 서버 액션 3개 직렬 큐잉 제거)
      let weekLogs: ExerciseLog[] = [];
      let logDates: string[] = [];
      let medicalImages: MedicalImage[] = [];
      let prescription: Prescription | null = null;

      try {
        const bundle = await getMemberHistoryBundle(userId, startDate, endDate);
        weekLogs = bundle.weekLogs;
        logDates = bundle.logDates;
        medicalImages = bundle.medicalImages;
        prescription = bundle.prescription;
      } catch {
        // 테이블 미존재 등은 빈 상태로 처리
      }

      if (cancelled) return;
      setData({
        weekLogs,
        logDates,
        medicalImages,
        prescription,
        weekStart: startDate,
        today,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, profile]);

  if (!data) {
    return <HistorySkeleton />;
  }

  return (
    <HistoryClient
      weekLogs={data.weekLogs}
      logDates={data.logDates}
      medicalImages={data.medicalImages}
      prescription={data.prescription}
      weekStart={data.weekStart}
      today={data.today}
    />
  );
}

function HistorySkeleton() {
  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "24px 20px 120px 20px",
        minHeight: "100vh",
      }}
    >
      {/* 헤더 */}
      <div style={{ paddingTop: 20, marginBottom: 20 }}>
        <div
          className="skeleton-block"
          style={{ width: 140, height: 24, borderRadius: 8 }}
        />
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 40, borderRadius: 12 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 40, borderRadius: 12 }}
        />
      </div>

      {/* 주간 캘린더 */}
      <div
        className="skeleton-block"
        style={{ height: 96, borderRadius: 16, marginBottom: 16 }}
      />

      {/* 일일 운동 기록 카드들 */}
      <div
        className="skeleton-block"
        style={{ height: 120, borderRadius: 16, marginBottom: 12 }}
      />
      <div
        className="skeleton-block"
        style={{ height: 120, borderRadius: 16, marginBottom: 12 }}
      />
      <div
        className="skeleton-block"
        style={{ height: 120, borderRadius: 16 }}
      />
    </div>
  );
}
