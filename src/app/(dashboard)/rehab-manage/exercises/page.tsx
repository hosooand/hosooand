"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getExercises, getBodyParts } from "@/lib/rehab/actions";
import ExercisesClient from "./ExercisesClient";
import type { Exercise, BodyPart } from "@/types/rehab";

interface PageData {
  exercises: Exercise[];
  bodyParts: BodyPart[];
}

export default function ExercisesPage() {
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

      const [exercises, bodyParts] = await Promise.all([
        getExercises(),
        getBodyParts(),
      ]);

      if (cancelled) return;
      setData({ exercises, bodyParts });
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!data) {
    return <ExercisesSkeleton />;
  }

  return (
    <ExercisesClient
      initialExercises={data.exercises}
      bodyParts={data.bodyParts}
    />
  );
}

function ExercisesSkeleton() {
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
          style={{ width: 220, height: 14, borderRadius: 6, marginTop: 8 }}
        />
      </div>

      {/* 부위 필터 칩 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-block"
            style={{ width: 80, height: 36, borderRadius: 18, flexShrink: 0 }}
          />
        ))}
      </div>

      {/* 단계 필터 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 36, borderRadius: 12 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 36, borderRadius: 12 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 36, borderRadius: 12 }}
        />
      </div>

      {/* 운동 카드 리스트 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="skeleton-block"
          style={{ height: 88, borderRadius: 16, marginBottom: 10 }}
        />
      ))}
    </div>
  );
}
