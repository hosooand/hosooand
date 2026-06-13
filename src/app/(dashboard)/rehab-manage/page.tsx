"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDashboardSession } from "../_components/DashboardSessionContext";
import PatientListClient from "./PatientListClient";

interface PatientRow {
  id: string;
  name: string | null;
  member_number: string | null;
  has_prescription: boolean;
}

export default function RehabManagePage() {
  const router = useRouter();
  const { profile } = useDashboardSession();
  const [patients, setPatients] = useState<PatientRow[] | null>(null);

  // role 가드: layout이 인증/승인까지 처리. 페이지는 잘못된 진입만 차단.
  useEffect(() => {
    if (profile?.role === "member") {
      router.replace("/rehab");
    }
  }, [profile?.role, router]);

  useEffect(() => {
    if (profile?.role === "member") return; // 곧 redirect됨
    let cancelled = false;
    (async () => {
      const supabase = createClient();

      // 회원 목록 + 활성 처방 보유자 ID를 병렬 조회.
      // (기존엔 무거운 embedded join `prescriptions(status)`로 회원별 전체 처방 행을
      //  끌어와 느렸음 → 필요한 컬럼만 + 활성 처방만 가볍게 조회하도록 분리)
      const [membersRes, activeRxRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, member_number, created_at")
          .eq("role", "member")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("prescriptions")
          .select("patient_id")
          .eq("status", "active"),
      ]);

      const rows = membersRes.data ?? [];
      const activePrescriptionIds = new Set(
        (activeRxRes.data ?? []).map((r) => r.patient_id)
      );

      const patientsWithStatus: PatientRow[] = rows.map((p) => ({
        id: p.id,
        name: p.name || null,
        member_number: p.member_number || null,
        has_prescription: activePrescriptionIds.has(p.id),
      }));

      if (cancelled) return;
      setPatients(patientsWithStatus);
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.role]);

  if (!patients) {
    return <PatientListSkeleton />;
  }

  return <PatientListClient patients={patients} />;
}

function PatientListSkeleton() {
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
          style={{ width: 160, height: 24, borderRadius: 8 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 200, height: 14, borderRadius: 6, marginTop: 8 }}
        />
      </div>

      {/* 검색 바 */}
      <div
        className="skeleton-block"
        style={{ height: 44, borderRadius: 12, marginBottom: 16 }}
      />

      {/* 환자 카드 리스트 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="skeleton-block"
          style={{ height: 80, borderRadius: 16, marginBottom: 10 }}
        />
      ))}
    </div>
  );
}
