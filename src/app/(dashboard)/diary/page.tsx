"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DiaryClient from "./_components/DiaryClient";
import type { DailyLog } from "@/types/diary";

interface Props {
  searchParams: Promise<{ date?: string }>;
}

interface PageData {
  userId: string;
  date: string;
  log: DailyLog | null;
  profile: {
    name: string;
    target_weight: number | null;
    target_calories: number | null;
  };
}

export default function DiaryPage({ searchParams }: Props) {
  const params = use(searchParams);
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

      const date = params.date ?? new Date().toLocaleDateString("en-CA");

      const [logRes, profileRes] = await Promise.all([
        supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", date)
          .single(),
        supabase
          .from("profiles")
          .select("name, target_weight, target_calories")
          .eq("id", user.id)
          .single(),
      ]);

      if (cancelled) return;
      setData({
        userId: user.id,
        date,
        log: (logRes.data as DailyLog | null) ?? null,
        profile: {
          name: profileRes.data?.name ?? "",
          target_weight: profileRes.data?.target_weight ?? null,
          target_calories: profileRes.data?.target_calories ?? null,
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [params.date, router]);

  if (!data) {
    return <DiarySkeleton />;
  }

  return (
    <DiaryClient
      date={data.date}
      initialLog={data.log}
      profile={data.profile}
      userId={data.userId}
    />
  );
}

function DiarySkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      {/* 날짜 네비게이션 */}
      <div className="flex items-center justify-between mb-6">
        <div
          className="skeleton-block"
          style={{ width: 32, height: 32, borderRadius: 16 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 180, height: 24, borderRadius: 8 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 32, height: 32, borderRadius: 16 }}
        />
      </div>

      {/* 식단 섹션 */}
      <div
        className="skeleton-block"
        style={{ height: 220, borderRadius: 20, marginBottom: 12 }}
      />

      {/* 운동 섹션 */}
      <div
        className="skeleton-block"
        style={{ height: 180, borderRadius: 20, marginBottom: 12 }}
      />

      {/* 컨디션 / 수면 / 물 */}
      <div
        className="skeleton-block"
        style={{ height: 120, borderRadius: 20, marginBottom: 12 }}
      />
      <div
        className="skeleton-block"
        style={{ height: 100, borderRadius: 20, marginBottom: 12 }}
      />
      <div
        className="skeleton-block"
        style={{ height: 100, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 저장 버튼 */}
      <div
        className="skeleton-block"
        style={{ height: 52, borderRadius: 14 }}
      />
    </div>
  );
}
