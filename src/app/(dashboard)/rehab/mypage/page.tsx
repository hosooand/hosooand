"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 20,
  border: "1px solid #e0f2fe",
  boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
  padding: 20,
  marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  paddingLeft: 16,
  paddingRight: 16,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

function roleLabel(
  role: string | null,
  isApproved: boolean | null
): string {
  if (role === "admin") return "관리자";
  if (role === "staff")
    return isApproved ? "치료사 · 승인됨" : "치료사 · 승인 대기";
  if (role === "member") return "회원";
  return role ?? "—";
}

export default function RehabMyPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [height, setHeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [avatar, setAvatar] = useState("duck");
  const [dbRole, setDbRole] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  const AVATARS = [
    { id: "duck", src: "/duck.png", label: "기본" },
    { id: "duck-run", src: "/duck-run.png", label: "달리기" },
    { id: "duck-pilates", src: "/duck-pilates.png", label: "필라테스" },
    { id: "duck-gym", src: "/duck-gym.png", label: "헬스" },
  ];

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("name, height, current_weight, avatar, role, is_approved")
        .eq("id", user.id)
        .single();

      if (data) {
        setName(data.name ?? "");
        setHeight(data.height?.toString() ?? "");
        setCurrentWeight(data.current_weight?.toString() ?? "");
        setAvatar(data.avatar ?? "duck");
        setDbRole(data.role ?? null);
        setIsApproved(data.is_approved ?? null);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        name,
        height: height ? Number(height) : null,
        current_weight: currentWeight ? Number(currentWeight) : null,
        avatar,
      })
      .eq("id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDelete() {
    setDeleting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
    router.push("/login");
  }

  const currentAvatarSrc =
    AVATARS.find((a) => a.id === avatar)?.src ?? "/duck.png";

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          background: "#f0f9ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "2px solid #bae6fd",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "24px 16px 120px 16px",
        minHeight: "100vh",
      }}
    >
      <button
        type="button"
        onClick={() => router.push("/select-service")}
        style={{
          fontSize: 13,
          color: "#0EA5E9",
          fontWeight: 600,
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: 0,
          marginBottom: 16,
        }}
      >
        ← 서비스 선택
      </button>

      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#0f172a",
            margin: 0,
          }}
        >
          마이페이지
        </h1>
        <p style={{ fontSize: 14, color: "#94a3b8", margin: "6px 0 0 0" }}>
          프로필 정보를 관리하세요
        </p>
      </div>

      {/* 권한 */}
      <div style={cardStyle}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#64748b", margin: "0 0 8px 0" }}>
          계정 권한
        </p>
        <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>
          {roleLabel(dbRole, isApproved)}
        </p>
      </div>

      {/* 아바타 */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{ position: "relative", width: 64, height: 64 }}>
            <Image src={currentAvatarSrc} alt="아바타" fill className="object-contain" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>
              {name || "이름 없음"}
            </p>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0 0" }}>{email}</p>
          </div>
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: "#64748b", margin: "0 0 8px 0" }}>
          아바타 선택
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAvatar(a.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: 8,
                borderRadius: 12,
                border:
                  avatar === a.id ? "2px solid #38bdf8" : "2px solid transparent",
                background: avatar === a.id ? "#e0f2fe" : "transparent",
                cursor: "pointer",
              }}
            >
              <div style={{ position: "relative", width: 48, height: 48 }}>
                <Image src={a.src} alt={a.label} fill className="object-contain" />
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: avatar === a.id ? "#0284c7" : "#94a3b8",
                }}
              >
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 기본 정보 */}
      <div style={cardStyle}>
        <p style={{ fontSize: 14, fontWeight: 800, color: "#334155", margin: "0 0 16px 0" }}>
          기본 정보
        </p>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            style={{
              ...inputStyle,
              borderColor: "#e2e8f0",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            이메일
          </label>
          <input
            type="email"
            value={email}
            readOnly
            style={{
              ...inputStyle,
              background: "#f8fafc",
              color: "#94a3b8",
              cursor: "not-allowed",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#64748b",
                marginBottom: 6,
              }}
            >
              키 (cm)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="예: 165"
              min={100}
              max={250}
              style={inputStyle}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#64748b",
                marginBottom: 6,
              }}
            >
              현재 체중 (kg)
            </label>
            <input
              type="number"
              value={currentWeight}
              onChange={(e) => setCurrentWeight(e.target.value)}
              placeholder="예: 58.5"
              min={20}
              max={300}
              step={0.1}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* BMI */}
      {height && currentWeight && (
        <div
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #e0f2fe, #f0f9ff)",
            border: "1px solid #bae6fd",
          }}
        >
          {(() => {
            const bmi = Number(currentWeight) / Math.pow(Number(height) / 100, 2);
            const bmiRounded = bmi.toFixed(1);
            const bmiLabel =
              bmi < 18.5
                ? { text: "저체중", color: "#2563eb" }
                : bmi < 23
                  ? { text: "정상", color: "#059669" }
                  : bmi < 25
                    ? { text: "과체중", color: "#d97706" }
                    : { text: "비만", color: "#dc2626" };
            return (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 4px 0" }}>나의 BMI</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1 }}>
                    {bmiRounded}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: bmiLabel.color }}>
                    {bmiLabel.text}
                  </span>
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0 0" }}>
                    정상 범위: 18.5 ~ 22.9
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          width: "100%",
          height: 52,
          borderRadius: 12,
          border: "none",
          background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 12,
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.65 : 1,
          boxShadow: "0 6px 20px rgba(14,165,233,0.35)",
        }}
      >
        {saving ? "저장 중…" : saved ? "✅ 저장 완료!" : "저장하기"}
      </button>

      <button
        type="button"
        onClick={handleLogout}
        style={{
          width: "100%",
          height: 48,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          background: "#fff",
          color: "#64748b",
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 12,
          cursor: "pointer",
        }}
      >
        로그아웃
      </button>

      {!showDeleteConfirm ? (
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 12,
            border: "1px solid #fecdd3",
            background: "#fff",
            color: "#f43f5e",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          회원 탈퇴
        </button>
      ) : (
        <div
          style={{
            borderRadius: 16,
            border: "1px solid #fecdd3",
            background: "#fff1f2",
            padding: 16,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 800, color: "#e11d48", margin: "0 0 4px 0" }}>
            정말 탈퇴하시겠어요?
          </p>
          <p style={{ fontSize: 12, color: "#fb7185", margin: "0 0 16px 0" }}>
            모든 기록이 삭제되며 복구할 수 없어요.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#64748b",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 8,
                border: "none",
                background: "#f43f5e",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: deleting ? "wait" : "pointer",
                opacity: deleting ? 0.65 : 1,
              }}
            >
              {deleting ? "처리 중…" : "탈퇴하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
