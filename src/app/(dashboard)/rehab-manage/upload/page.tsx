"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getMedicalImages } from "@/lib/rehab/actions";
import UploadClient from "./UploadClient";
import type { MedicalImage } from "@/types/rehab";
import type { MemberSearchRow } from "@/lib/rehab/actions";

interface Props {
  searchParams: Promise<{ patientId?: string }>;
}

interface PageData {
  initialPatient: MemberSearchRow | null;
  initialPatientId: string;
  initialImages: MedicalImage[];
}

export default function UploadPage({ searchParams }: Props) {
  const { patientId: initialPatientId } = use(searchParams);
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

      let initialPatient: MemberSearchRow | null = null;
      let initialImages: MedicalImage[] = [];

      if (initialPatientId) {
        const [patientRes, imagesRes] = await Promise.allSettled([
          supabase
            .from("profiles")
            .select("id, name, member_number")
            .eq("id", initialPatientId)
            .eq("role", "member")
            .maybeSingle(),
          getMedicalImages(initialPatientId, { limit: 80 }),
        ]);

        if (patientRes.status === "fulfilled") {
          initialPatient = (patientRes.value.data ?? null) as MemberSearchRow | null;
        }
        if (imagesRes.status === "fulfilled") {
          initialImages = imagesRes.value;
        }
      }

      if (cancelled) return;
      setData({
        initialPatient,
        initialPatientId: initialPatientId || "",
        initialImages,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [initialPatientId, router]);

  if (!data) {
    return <UploadSkeleton />;
  }

  return (
    <UploadClient
      initialPatient={data.initialPatient}
      initialPatientId={data.initialPatientId}
      initialImages={data.initialImages}
    />
  );
}

function UploadSkeleton() {
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
      </div>

      {/* 환자 검색 박스 */}
      <div
        className="skeleton-block"
        style={{ height: 56, borderRadius: 14, marginBottom: 16 }}
      />

      {/* 업로드 영역 */}
      <div
        className="skeleton-block"
        style={{ height: 180, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 이미지 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-block"
            style={{ aspectRatio: "1 / 1", borderRadius: 12 }}
          />
        ))}
      </div>
    </div>
  );
}
