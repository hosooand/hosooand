"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  name: string;
  role: string;
}

const REHAB_COMING_SOON = true;

export default function SelectServicePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    }
    load();
  }, [supabase]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f0f9ff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
    }}>
      <h1 style={{
        fontSize: 24,
        fontWeight: 800,
        color: "#0f172a",
        marginBottom: 8,
        textAlign: "center",
      }}>
        안녕하세요, {profile?.name ?? ""}님 👋
      </h1>
      <p style={{
        fontSize: 14,
        color: "#94a3b8",
        marginBottom: 40,
        textAlign: "center",
      }}>
        이용할 서비스를 선택해주세요
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 360 }}>
        <button
          onClick={() => {
            if (REHAB_COMING_SOON) {
              setShowComingSoon(true);
              return;
            }
            if (profile?.role === "member") {
              router.push("/rehab");
            } else {
              router.push("/rehab-manage");
            }
          }}
          style={{
            width: "100%",
            padding: "28px 24px",
            backgroundColor: "#ffffff",
            borderRadius: 20,
            border: "1px solid #e0f2fe",
            boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
            }}>
              <Image src="/duck-run.png" alt="운동치료" width={48} height={48} style={{ objectFit: "contain" }} />
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>호수앤 통증클리닉</p>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>운동 처방 · 기록 · 체형교정 · 재활 치료</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/dashboard")}
          style={{
            width: "100%",
            padding: "28px 24px",
            backgroundColor: "#ffffff",
            borderRadius: 20,
            border: "1px solid #fce7f3",
            boxShadow: "0 2px 12px rgba(236,72,153,0.06)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
            }}>
              <Image src="/duck.png" alt="S바디" width={48} height={48} style={{ objectFit: "contain" }} />
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>호수앤 S바디</p>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>다이어트 · 식단 · 칼로리 관리 · 다이어리</p>
            </div>
          </div>
        </button>
      </div>

      <p style={{ fontSize: 11, color: "#cbd5e1", marginTop: 48, textAlign: "center" }}>
        호수앤마취통증의학과의원
      </p>

      {showComingSoon && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 24,
          }}
          onClick={() => setShowComingSoon(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 24,
              padding: "40px 32px",
              maxWidth: 320,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 20px",
            }}>
              🏗️
            </div>
            <h2 style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 8px",
            }}>
              서비스 준비 중입니다
            </h2>
            <p style={{
              fontSize: 14,
              color: "#94a3b8",
              lineHeight: 1.6,
              margin: "0 0 24px",
            }}>
              호수앤 통증클리닉 서비스는<br/>
              곧 오픈 예정입니다!
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
              style={{
                width: "100%",
                height: 48,
                background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                color: "#ffffff",
                border: "none",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
