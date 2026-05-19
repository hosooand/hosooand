"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDashboardSession } from "../_components/DashboardSessionContext";
import PatientListClient from "./PatientListClient";

const PATIENT_SELECT =
  "id, name, member_number, avatar, created_at, prescriptions(status)";

interface PatientRow {
  id: string;
  name: string | null;
  member_number: string | null;
  has_prescription: boolean;
}

type RowWithRx = {
  id: string;
  name: string | null;
  member_number: string | null;
  prescriptions?: { status: string }[] | null;
};

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

      const { data: rows, error } = await supabase
        .from("profiles")
        .select(PATIENT_SELECT)
        .eq("role", "member")
        .order("created_at", { ascending: false })
        .limit(100);

      let patientsWithStatus: PatientRow[] = [];

      if (!error && rows) {
        patientsWithStatus = (rows as unknown as RowWithRx[]).map((p) => ({
          id: p.id,
          name: p.name || null,
          member_number: p.member_number || null,
          has_prescription: (p.prescriptions ?? []).some(
            (rx) => rx.status === "active"
          ),
        }));
      } else {
        const { data: fallback } = await supabase
          .from("profiles")
          .select("id, name, member_number, avatar, created_at")
          .eq("role", "member")
          .order("created_at", { ascending: false })
          .limit(100);
        const list = fallback ?? [];
        let activePrescriptionIds = new Set<string>();
        if (list.length > 0) {
          const ids = list.map((p) => p.id);
          const { data: prescriptions } = await supabase
            .from("prescriptions")
            .select("patient_id")
            .in("patient_id", ids)
            .eq("status", "active");
          activePrescriptionIds = new Set(
            (prescriptions ?? []).map((r) => r.patient_id)
          );
        }
        patientsWithStatus = list.map((p) => ({
          id: p.id,
          name: p.name || null,
          member_number: p.member_number || null,
          has_prescription: activePrescriptionIds.has(p.id),
        }));
      }

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
