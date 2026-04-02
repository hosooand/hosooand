"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Prescription, Exercise, ExerciseLevel } from "@/types/rehab";
import type { ChartDays, WeeklyChartData } from "@/lib/rehab/actions";
import { createExerciseLog } from "@/lib/rehab/actions";
import WeeklyBarChart from "@/components/rehab/WeeklyBarChart";

const LEVEL_COLORS: Record<ExerciseLevel, { bg: string; color: string }> = {
  1: { bg: "#ecfdf5", color: "#059669" },
  2: { bg: "#fffbeb", color: "#d97706" },
  3: { bg: "#fef2f2", color: "#dc2626" },
};

const LEVEL_LABELS: Record<ExerciseLevel, string> = {
  1: "1단계",
  2: "2단계",
  3: "3단계",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 20,
  border: "1px solid #e0f2fe",
  boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
  padding: 20,
  marginBottom: 16,
};

interface Props {
  name: string;
  prescription: Prescription | null;
  weeklyCount: number;
  avgPain: number;
  todayLogExerciseIds: string[];
  weeklyChartData7: WeeklyChartData[];
  weeklyChartData14: WeeklyChartData[];
}

export default function RehabDashboardClient({
  name,
  prescription,
  weeklyCount,
  avgPain,
  todayLogExerciseIds,
  weeklyChartData7,
  weeklyChartData14,
}: Props) {
  const [exerciseChartDays, setExerciseChartDays] = useState<ChartDays>(7);
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(todayLogExerciseIds)
  );
  const [loggingExerciseId, setLoggingExerciseId] = useState<string | null>(
    null
  );
  const [painLevel, setPainLevel] = useState(5);
  const [exerciseCount, setExerciseCount] = useState(10);
  const [isPending, startTransition] = useTransition();
  const [leafletModal, setLeafletModal] = useState<{
    images: string[];
    text: string | null;
    index: number;
  } | null>(null);

  const currentLevel = prescription?.current_level ?? 1;
  const levelColor = LEVEL_COLORS[currentLevel];

  const activeWeeklyChart =
    exerciseChartDays === 7 ? weeklyChartData7 : weeklyChartData14;
  const hasWeeklyExerciseData = activeWeeklyChart.some((d) => d.totalCount > 0);

  const chartTabStyle = (active: boolean): React.CSSProperties => ({
    backgroundColor: active ? "#0EA5E9" : "#f1f5f9",
    color: active ? "#fff" : "#94a3b8",
    borderRadius: 8,
    padding: "4px 12px",
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  });

  const painColor = (level: number) =>
    level <= 3 ? "#10b981" : level <= 6 ? "#f59e0b" : "#ef4444";

  const handleViewContent = (ex: Exercise) => {
    if (ex.content_type === "video") {
      if (ex.video_url) window.open(ex.video_url, "_blank");
      else alert("등록된 영상 주소가 없습니다.");
      return;
    }
    if (ex.content_type === "leaflet") {
      const imgs = (ex.leaflet_images ?? []).filter(Boolean) as string[];
      if (imgs.length === 0) {
        alert("등록된 리플렛 이미지가 없습니다.");
        return;
      }
      setLeafletModal({
        images: imgs,
        text: ex.leaflet_text ?? null,
        index: 0,
      });
    }
  };

  const handleStartLog = (exerciseId: string) => {
    if (completedIds.has(exerciseId)) return;
    setLoggingExerciseId(exerciseId);
    setPainLevel(5);
    setExerciseCount(10);
  };

  const handleSaveLog = () => {
    if (!loggingExerciseId || !prescription) return;
    startTransition(async () => {
      try {
        await createExerciseLog({
          prescription_id: prescription.id,
          exercise_id: loggingExerciseId,
          pain_level: painLevel,
          exercise_count: exerciseCount,
        });
        setCompletedIds((prev) => new Set(prev).add(loggingExerciseId));
        setLoggingExerciseId(null);
      } catch {
        alert("기록 저장에 실패했습니다.");
      }
    });
  };

  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "24px 20px 120px 20px",
        minHeight: "100vh",
      }}
    >
      {/* (a) 인사 섹션 */}
      <div style={{ paddingTop: 28, marginBottom: 20 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#0f172a",
            margin: 0,
          }}
        >
          안녕하세요, {name}님 👋
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#94a3b8",
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          오늘도 건강한 하루 보내세요!
        </p>
      </div>

      {/* (b) 퀵 액션 카드 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            flex: 1,
            background: "#ffffff",
            borderRadius: 20,
            border: "1px solid #e0f2fe",
            boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
            padding: "20px 16px",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#e0f2fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <img
              src="/duck-gym.png"
              alt="운동"
              style={{ width: 28, height: 28, objectFit: "contain" }}
            />
          </div>
          <p
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
            }}
          >
            오늘의 운동
          </p>
          <p
            style={{
              fontSize: 11,
              color: "#94a3b8",
              marginTop: 2,
              marginBottom: 0,
            }}
          >
            재활 운동 루틴
          </p>
        </div>

        <Link href="/rehab/mypage" style={{ flex: 1, textDecoration: "none" }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              border: "1px solid #e0f2fe",
              boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
              padding: "20px 16px",
              height: "100%",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "#e0f2fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>👤</span>
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
              }}
            >
              마이페이지
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginTop: 2,
                marginBottom: 0,
              }}
            >
              프로필 · 기록
            </p>
          </div>
        </Link>
      </div>

      {/* (c) 예약/문의 배너 */}
      <a
        href="tel:041-900-2225"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
          borderRadius: 16,
          padding: "16px 20px",
          color: "#ffffff",
          marginBottom: 16,
          boxShadow: "0 4px 14px rgba(14,165,233,0.2)",
          cursor: "pointer",
          textDecoration: "none",
        }}
      >
        <div>
          <p
            style={{ fontSize: 12, fontWeight: 800, margin: 0, color: "#ffffff" }}
          >
            예약 / 문의
          </p>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginTop: 2,
              marginBottom: 0,
              color: "#ffffff",
            }}
          >
            041-900-2225
          </p>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 18 }}>📞</span>
        </div>
      </a>

      {/* (d) 마스코트 말풍선 */}
      <div
        style={{
          ...cardStyle,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 20px",
        }}
      >
        <img
          src="/duck-run.png"
          alt="통통이"
          style={{ width: 44, height: 44, objectFit: "contain" }}
        />
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
            }}
          >
            호수앤의 한마디 💬
          </p>
          <p
            style={{
              fontSize: 11,
              color: "#64748b",
              marginTop: 4,
              marginBottom: 0,
              lineHeight: 1.5,
            }}
          >
            오늘 운동 기록했나요? 꾸준한 재활이 빠른 회복의 지름길!
          </p>
        </div>
      </div>

      {/* (e) 통계 카드 — 실제 데이터 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            flex: 1,
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e0f2fe",
            padding: "14px 8px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 4, marginTop: 0 }}>
            이번 주 운동
          </p>
          <p style={{ fontSize: 24, fontWeight: 800, color: "#0EA5E9", margin: 0 }}>
            {weeklyCount}
          </p>
          <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, marginBottom: 0 }}>
            회
          </p>
        </div>
        <div
          style={{
            flex: 1,
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e0f2fe",
            padding: "14px 8px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 4, marginTop: 0 }}>
            현재 단계
          </p>
          <p
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: levelColor.color,
              margin: 0,
            }}
          >
            {currentLevel}
          </p>
          <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, marginBottom: 0 }}>
            단계
          </p>
        </div>
        <div
          style={{
            flex: 1,
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e0f2fe",
            padding: "14px 8px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 4, marginTop: 0 }}>
            평균 통증
          </p>
          <p
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: painColor(avgPain),
              margin: 0,
            }}
          >
            {avgPain > 0 ? avgPain.toFixed(1) : "-"}
          </p>
          <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, marginBottom: 0 }}>
            /10
          </p>
        </div>
      </div>

      {/* 처방 운동 카드 */}
      {prescription && prescription.exercises && prescription.exercises.length > 0 && (
        <div style={cardStyle}>
          {prescription.note?.trim() ? (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                border: "1px solid #e0f2fe",
                padding: "14px 18px",
                marginBottom: 12,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#0EA5E9",
                  marginBottom: 6,
                  marginTop: 0,
                }}
              >
                💬 치료사 메모
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: "#334155",
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {prescription.note.trim()}
              </p>
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
              }}
            >
              오늘의 운동
            </p>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: levelColor.bg,
                color: levelColor.color,
              }}
            >
              {LEVEL_LABELS[currentLevel]}
            </span>
          </div>

          {prescription.exercises.map((ex) => {
            const isDone = completedIds.has(ex.id);
            const isLogging = loggingExerciseId === ex.id;

            const contentHint =
              ex.content_type === "video"
                ? "🎬 영상 보기"
                : "📋 리플렛 보기";

            return (
              <div key={ex.id} style={{ marginBottom: 10 }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleViewContent(ex)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleViewContent(ex);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    backgroundColor: isDone ? "#f0fdf4" : "#f8fafc",
                    borderRadius: 14,
                    border: isDone
                      ? "1.5px solid #bbf7d0"
                      : "1.5px solid #e2e8f0",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: isDone ? "#dcfce7" : "#e0f2fe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {isDone
                      ? "✅"
                      : ex.content_type === "video"
                        ? "🎬"
                        : "📋"}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: isDone ? "#16a34a" : "#0f172a",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ex.title}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#0EA5E9",
                        fontWeight: 600,
                        marginTop: 4,
                        marginBottom: 0,
                        cursor: "pointer",
                      }}
                    >
                      {contentHint}
                    </p>
                    {(isDone || ex.body_part) && (
                      <p
                        style={{
                          fontSize: 11,
                          color: isDone ? "#86efac" : "#94a3b8",
                          marginTop: 4,
                          marginBottom: 0,
                        }}
                      >
                        {isDone ? "기록 완료" : ex.body_part?.name}
                      </p>
                    )}
                  </div>

                  {!isDone && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartLog(ex.id);
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        backgroundColor: "#0EA5E9",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      완료
                    </button>
                  )}
                </div>

                {/* 운동 기록 폼 */}
                {isLogging && (
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 14,
                      border: "1.5px solid #e0f2fe",
                      padding: 16,
                      marginTop: 8,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#475569",
                        margin: 0,
                        marginBottom: 10,
                      }}
                    >
                      통증 정도
                    </p>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 4,
                        marginBottom: 6,
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                        const selected = painLevel === n;
                        let bg = "#f1f5f9";
                        let fg = "#94a3b8";
                        if (selected) {
                          if (n <= 3) { bg = "#ecfdf5"; fg = "#059669"; }
                          else if (n <= 6) { bg = "#fffbeb"; fg = "#d97706"; }
                          else if (n <= 9) { bg = "#fef2f2"; fg = "#dc2626"; }
                          else { bg = "#ef4444"; fg = "#ffffff"; }
                        }
                        return (
                          <button
                            key={n}
                            onClick={() => setPainLevel(n)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              border: "none",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: "pointer",
                              backgroundColor: bg,
                              color: fg,
                              transition: "all 0.15s",
                            }}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                    <p
                      style={{
                        fontSize: 10,
                        color: "#94a3b8",
                        textAlign: "center",
                        marginTop: 6,
                        marginBottom: 14,
                      }}
                    >
                      1: 거의 없음 ←→ 10: 극심한 통증
                    </p>

                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#475569",
                        margin: 0,
                        marginBottom: 10,
                      }}
                    >
                      운동 횟수
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 16,
                        marginBottom: 14,
                      }}
                    >
                      <button
                        onClick={() =>
                          setExerciseCount((prev) => Math.max(1, prev - 1))
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          backgroundColor: "#f1f5f9",
                          border: "none",
                          fontSize: 18,
                          cursor: "pointer",
                          color: "#64748b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          fontSize: 24,
                          fontWeight: 800,
                          color: "#0f172a",
                          minWidth: 48,
                          textAlign: "center",
                        }}
                      >
                        {exerciseCount}
                      </span>
                      <button
                        onClick={() =>
                          setExerciseCount((prev) =>
                            Math.min(99, prev + 1)
                          )
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          backgroundColor: "#e0f2fe",
                          border: "none",
                          fontSize: 18,
                          cursor: "pointer",
                          color: "#0EA5E9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        +
                      </button>
                      <span
                        style={{
                          fontSize: 14,
                          color: "#64748b",
                        }}
                      >
                        회
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setLoggingExerciseId(null)}
                        style={{
                          flex: 1,
                          height: 42,
                          backgroundColor: "#ffffff",
                          border: "1.5px solid #e2e8f0",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSaveLog}
                        disabled={isPending}
                        style={{
                          flex: 1,
                          height: 42,
                          background:
                            "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: isPending ? "not-allowed" : "pointer",
                          opacity: isPending ? 0.5 : 1,
                        }}
                      >
                        {isPending ? "저장 중..." : "기록 저장"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 처방 없을 때 */}
      {!prescription && (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "32px 20px",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: "#e0f2fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <span style={{ fontSize: 24 }}>📋</span>
          </div>
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#334155",
              margin: 0,
              marginBottom: 4,
            }}
          >
            아직 처방된 운동이 없습니다
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#94a3b8",
              margin: 0,
            }}
          >
            담당 치료사에게 문의해주세요
          </p>
        </div>
      )}

      {/* (f) 주간 차트 — Recharts */}
      <div style={cardStyle}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "#0f172a",
            margin: 0,
            marginBottom: 12,
          }}
        >
          주간 운동 횟수
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {([7, 14] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setExerciseChartDays(d)}
              style={chartTabStyle(exerciseChartDays === d)}
            >
              {d}일
            </button>
          ))}
        </div>
        {hasWeeklyExerciseData ? (
          <WeeklyBarChart data={activeWeeklyChart} height={160} />
        ) : (
          <p
            style={{
              fontSize: 13,
              color: "#94a3b8",
              textAlign: "center",
              padding: "20px 0",
              margin: 0,
            }}
          >
            {exerciseChartDays === 7
              ? "이번 주 운동 기록이 없습니다"
              : "최근 14일 운동 기록이 없습니다"}
          </p>
        )}
      </div>

      {leafletModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
          onClick={() => setLeafletModal(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLeafletModal(null);
            }}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "#fff",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
            aria-label="닫기"
          >
            ✕
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              maxWidth: "100%",
              padding: "0 56px",
              boxSizing: "border-box",
            }}
          >
            {leafletModal.images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLeafletModal((m) =>
                    m
                      ? {
                          ...m,
                          index:
                            (m.index - 1 + m.images.length) %
                            m.images.length,
                        }
                      : null
                  );
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontSize: 22,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                aria-label="이전 이미지"
              >
                ‹
              </button>
            )}
            <img
              src={leafletModal.images[leafletModal.index]}
              alt={`리플렛 ${leafletModal.index + 1}/${leafletModal.images.length}`}
              style={{
                maxWidth: "90%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: 12,
                display: "block",
              }}
            />
            {leafletModal.images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLeafletModal((m) =>
                    m
                      ? {
                          ...m,
                          index: (m.index + 1) % m.images.length,
                        }
                      : null
                  );
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontSize: 22,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                aria-label="다음 이미지"
              >
                ›
              </button>
            )}
          </div>

          {leafletModal.images.length > 1 && (
            <p
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: 12,
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              {leafletModal.index + 1} / {leafletModal.images.length}
            </p>
          )}

          {leafletModal.text ? (
            <p
              style={{
                color: "#fff",
                fontSize: 14,
                marginTop: 16,
                maxWidth: "90%",
                textAlign: "center",
                lineHeight: 1.6,
                marginBottom: 0,
              }}
            >
              {leafletModal.text}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
