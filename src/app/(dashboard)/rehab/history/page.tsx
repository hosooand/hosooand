"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getExerciseLogs,
  getWeekLogDates,
  getMedicalImages,
  getPrescriptionByPatient,
} from "@/lib/rehab/actions";
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

      let weekLogs: ExerciseLog[] = [];
      let logDates: string[] = [];
      let medicalImages: MedicalImage[] = [];
      let prescription: Prescription | null = null;

      const [logsRes, datesRes, presRes, imgRes] = await Promise.allSettled([
        getExerciseLogs(userId, startDate, endDate),
        getWeekLogDates(userId, startDate, endDate),
        getPrescriptionByPatient(userId),
        getMedicalImages(userId),
      ]);

      if (logsRes.status === "fulfilled") weekLogs = logsRes.value;
      if (datesRes.status === "fulfilled") logDates = datesRes.value;
      if (presRes.status === "fulfilled") prescription = presRes.value;
      if (imgRes.status === "fulfilled") medicalImages = imgRes.value;

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
