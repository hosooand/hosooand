"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getBodyParts, getPrescriptionByPatient } from "@/lib/rehab/actions";
import { useDashboardSession } from "../../_components/DashboardSessionContext";
import PrescribeClient, {
  type PrescriptionDraft,
} from "./PrescribeClient";
import type {
  BodyPart,
  ExerciseLevel,
  Prescription,
} from "@/types/rehab";

interface Props {
  searchParams: Promise<{ patientId?: string; edit?: string }>;
}

interface PageData {
  patient: { id: string; name: string };
  bodyParts: BodyPart[];
  initialDraft: PrescriptionDraft | null;
}

function buildInitialDraftFromPrescription(
  prescription: Prescription | null
): PrescriptionDraft | null {
  if (!prescription?.body_part_ids?.length) return null;
  const parts = [...prescription.body_part_ids];
  const exercises = prescription.exercises ?? [];
  const exercisesByBodyPart: Record<string, string[]> = {};
  const levelsByBodyPart: Record<string, ExerciseLevel[]> = {};

  for (const pid of parts) {
    const exs = exercises.filter((e) => e.body_part_id === pid);
    if (exs.length === 0) {
      // 기존 단일 선택/빈 처방 호환: 기본 1단계
      levelsByBodyPart[pid] = [1];
      exercisesByBodyPart[pid] = [];
    } else {
      // 저장된 운동들의 단계 집합을 복원 (단일·다중 처방 모두 호환)
      const levels = Array.from(
        new Set(exs.map((e) => e.level as ExerciseLevel))
      ).sort((a, b) => a - b);
      levelsByBodyPart[pid] = levels.length > 0 ? levels : [1];
      exercisesByBodyPart[pid] = exs.map((e) => e.id);
    }
  }

  return {
    selectedBodyParts: parts,
    levelsByBodyPart,
    exercisesByBodyPart,
    note: prescription.note ?? "",
  };
}

export default function PrescribePage({ searchParams }: Props) {
  const { patientId, edit } = use(searchParams);
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
      if (!patientId) {
        router.replace("/rehab-manage");
        return;
      }

      const supabase = createClient();

      // patient + body parts + (편집 시 처방) 병렬
      const [patientRes, bodyPartsRes, prescriptionRes] =
        await Promise.allSettled([
          supabase
            .from("profiles")
            .select("id, name")
            .eq("id", patientId)
            .single(),
          getBodyParts(),
          edit === "1"
            ? getPrescriptionByPatient(patientId)
            : Promise.resolve(null),
        ]);

      const patientRow =
        patientRes.status === "fulfilled" ? patientRes.value.data : null;
      if (!patientRow) {
        router.replace("/rehab-manage");
        return;
      }

      const bodyParts: BodyPart[] =
        bodyPartsRes.status === "fulfilled" ? bodyPartsRes.value : [];

      let initialDraft: PrescriptionDraft | null = null;
      if (edit === "1" && prescriptionRes.status === "fulfilled") {
        initialDraft = buildInitialDraftFromPrescription(prescriptionRes.value);
      }

      if (cancelled) return;
      setData({
        patient: { id: patientRow.id, name: patientRow.name || "이름 없음" },
        bodyParts,
        initialDraft,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [patientId, edit, profile?.role, router]);

  if (!data) {
    return <PrescribeSkeleton />;
  }

  return (
    <PrescribeClient
      patient={data.patient}
      bodyParts={data.bodyParts}
      initialDraft={data.initialDraft}
    />
  );
}

function PrescribeSkeleton() {
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
          style={{ width: 180, height: 24, borderRadius: 8 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 120, height: 14, borderRadius: 6, marginTop: 8 }}
        />
      </div>

      {/* 부위 선택 영역 */}
      <div
        className="skeleton-block"
        style={{ height: 220, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 단계 / 운동 선택 영역 */}
      <div
        className="skeleton-block"
        style={{ height: 280, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 메모 */}
      <div
        className="skeleton-block"
        style={{ height: 96, borderRadius: 16, marginBottom: 16 }}
      />

      {/* 저장 버튼 */}
      <div
        className="skeleton-block"
        style={{ height: 52, borderRadius: 14 }}
      />
    </div>
  );
}
