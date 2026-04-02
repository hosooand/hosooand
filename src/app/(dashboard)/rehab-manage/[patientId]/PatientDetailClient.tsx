"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Prescription, ExerciseLevel, ExerciseLog, MedicalImage } from "@/types/rehab";
import { IMAGE_TYPE_LABELS } from "@/types/rehab";
import type {
  ChartDays,
  WeeklyChartData,
  PainTrendData,
  ExerciseStatsData,
} from "@/lib/rehab/actions";
import {
  updatePrescriptionLevel,
  completePrescription,
  updateMemberNumber,
} from "@/lib/rehab/actions";
import WeeklyBarChart from "@/components/rehab/WeeklyBarChart";
import PainTrendChart from "@/components/rehab/PainTrendChart";

const LEVEL_COLORS: Record<ExerciseLevel, { bg: string; color: string }> = {
  1: { bg: "#ecfdf5", color: "#059669" },
  2: { bg: "#fffbeb", color: "#d97706" },
  3: { bg: "#fef2f2", color: "#dc2626" },
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 20,
  border: "1px solid #e0f2fe",
  boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
  padding: 24,
  marginBottom: 16,
};

interface PatientInfo {
  id: string;
  name: string;
  member_number: string | null;
}

interface Props {
  patient: PatientInfo;
  prescription: Prescription | null;
  bodyPartNames: Record<string, string>;
  medicalImages: MedicalImage[];
  weeklyChartData7: WeeklyChartData[];
  weeklyChartData14: WeeklyChartData[];
  painTrendData7: PainTrendData[];
  painTrendData14: PainTrendData[];
  exerciseStats: ExerciseStatsData;
  recentLogs: ExerciseLog[];
}

export default function PatientDetailClient({
  patient,
  prescription,
  bodyPartNames,
  medicalImages,
  weeklyChartData7,
  weeklyChartData14,
  painTrendData7,
  painTrendData14,
  exerciseStats,
  recentLogs,
}: Props) {
  const router = useRouter();
  const [exerciseChartDays, setExerciseChartDays] = useState<ChartDays>(7);
  const [painChartDays, setPainChartDays] = useState<ChartDays>(7);
  const activeWeeklyChart =
    exerciseChartDays === 7 ? weeklyChartData7 : weeklyChartData14;
  const hasWeeklyExerciseData = activeWeeklyChart.some((d) => d.totalCount > 0);
  const activePainTrend =
    painChartDays === 7 ? painTrendData7 : painTrendData14;

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

  const [isPending, startTransition] = useTransition();
  const [memberNumberDraft, setMemberNumberDraft] = useState(
    patient.member_number ?? ""
  );
  const [memberSaveBtnLabel, setMemberSaveBtnLabel] = useState("저장");
  const memberSaveResetRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    setMemberNumberDraft(patient.member_number ?? "");
  }, [patient.member_number]);

  useEffect(() => {
    return () => {
      if (memberSaveResetRef.current) clearTimeout(memberSaveResetRef.current);
    };
  }, []);

  const [currentLevel, setCurrentLevel] = useState<ExerciseLevel>(
    prescription?.current_level ?? 1
  );

  const handleLevelChange = (level: ExerciseLevel) => {
    if (!prescription || level === currentLevel) return;
    setCurrentLevel(level);
    startTransition(async () => {
      try {
        await updatePrescriptionLevel(prescription.id, level);
      } catch {
        setCurrentLevel(prescription.current_level);
      }
    });
  };

  const handleComplete = () => {
    if (!prescription) return;
    if (!confirm("이 처방을 종료하시겠습니까?")) return;
    startTransition(async () => {
      try {
        await completePrescription(prescription.id);
        router.refresh();
      } catch {
        alert("처방 종료에 실패했습니다.");
      }
    });
  };

  const handleSaveMemberNumber = () => {
    startTransition(async () => {
      try {
        const payload =
          memberNumberDraft.trim() === "" ? null : memberNumberDraft.trim();
        console.log("회원번호 저장:", {
          patientId: patient.id,
          memberNumber: payload,
        });
        const result = await updateMemberNumber(patient.id, payload);
        console.log("저장 결과:", result);
        if (memberSaveResetRef.current) clearTimeout(memberSaveResetRef.current);
        setMemberSaveBtnLabel("✓ 저장됨");
        memberSaveResetRef.current = setTimeout(() => {
          setMemberSaveBtnLabel("저장");
          memberSaveResetRef.current = null;
        }, 2000);
        router.refresh();
      } catch (e) {
        alert(
          e instanceof Error ? e.message : "회원번호 저장에 실패했습니다."
        );
      }
    });
  };

  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "28px 20px 120px 20px",
        minHeight: "100vh",
      }}
    >
      {/* 뒤로가기 */}
      <Link
        href="/rehab-manage"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 13,
          fontWeight: 600,
          color: "#0EA5E9",
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        ← 환자 목록
      </Link>

      {/* (a) 환자 정보 헤더 */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              backgroundColor: "#e0f2fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 800,
              color: "#0369a1",
              flexShrink: 0,
            }}
          >
            {patient.name.charAt(0)}
          </div>
          <div>
            <p
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
              }}
            >
              {patient.name}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "#94a3b8",
                marginTop: 2,
                marginBottom: 0,
              }}
            >
              {patient.member_number
                ? `#${patient.member_number.padStart(4, "0")}`
                : "(번호 미지정)"}
            </p>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#475569",
              display: "block",
              marginBottom: 8,
            }}
          >
            회원번호
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={memberNumberDraft}
              onChange={(e) => setMemberNumberDraft(e.target.value)}
              placeholder="예: 0001"
              style={{
                flex: 1,
                height: 42,
                paddingLeft: 12,
                backgroundColor: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                fontSize: 14,
                color: "#0f172a",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={handleSaveMemberNumber}
              disabled={isPending}
              style={{
                padding: "0 16px",
                minWidth: 88,
                height: 42,
                backgroundColor: "#0EA5E9",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.6 : 1,
                flexShrink: 0,
              }}
            >
              {isPending ? "저장 중…" : memberSaveBtnLabel}
            </button>
          </div>
        </div>
      </div>

      {/* (b) 현재 처방 카드 */}
      {prescription ? (
        <div style={cardStyle}>
          <p
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
              marginBottom: 16,
            }}
          >
            현재 처방
          </p>

          {/* 부위 뱃지 */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {prescription.body_part_ids.map((bpId) => (
              <span
                key={bpId}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: "#e0f2fe",
                  color: "#0369a1",
                }}
              >
                {bodyPartNames[bpId] || bpId}
              </span>
            ))}
          </div>

          {/* 단계 스위치 */}
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#64748b",
              marginBottom: 8,
              marginTop: 0,
            }}
          >
            운동 단계
          </p>
          <div
            style={{ display: "flex", gap: 8, marginBottom: 20 }}
          >
            {([1, 2, 3] as ExerciseLevel[]).map((lv) => {
              const isActive = currentLevel === lv;
              const colors = LEVEL_COLORS[lv];
              return (
                <button
                  key={lv}
                  onClick={() => handleLevelChange(lv)}
                  disabled={isPending}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    cursor: isPending ? "not-allowed" : "pointer",
                    backgroundColor: isActive ? colors.bg : "#f8fafc",
                    color: isActive ? colors.color : "#94a3b8",
                    transition: "all 0.2s",
                  }}
                >
                  {lv}단계
                </button>
              );
            })}
          </div>

          {/* 처방된 운동 목록 */}
          {prescription.exercises && prescription.exercises.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748b",
                  marginBottom: 8,
                  marginTop: 0,
                }}
              >
                처방 운동
              </p>
              {prescription.exercises.map((ex) => (
                <div
                  key={ex.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    backgroundColor: "#f8fafc",
                    borderRadius: 14,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: "#e0f2fe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {ex.content_type === "video" ? "🎬" : "📋"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0f172a",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ex.title}
                    </p>
                    {ex.body_part && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          marginTop: 2,
                          marginBottom: 0,
                        }}
                      >
                        {ex.body_part.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 메모 */}
          {prescription.note && (
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "#f8fafc",
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748b",
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                처방 메모
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "#334155",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {prescription.note}
              </p>
            </div>
          )}

          {/* 액션 버튼 */}
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href={`/rehab-manage/prescribe?patientId=${patient.id}&edit=1`}
              style={{
                flex: 1,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 600,
                color: "#64748b",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              처방 수정
            </Link>
            <button
              onClick={handleComplete}
              disabled={isPending}
              style={{
                flex: 1,
                height: 48,
                backgroundColor: "#ffffff",
                border: "1.5px solid #fecaca",
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 600,
                color: "#dc2626",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.5 : 1,
              }}
            >
              처방 종료
            </button>
          </div>
        </div>
      ) : (
        /* (c) 처방 없을 때 */
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "40px 24px",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: "#e0f2fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <span style={{ fontSize: 28 }}>📋</span>
          </div>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#334155",
              marginBottom: 4,
              marginTop: 0,
            }}
          >
            활성 처방이 없습니다
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#94a3b8",
              marginBottom: 20,
              marginTop: 0,
            }}
          >
            환자에게 맞춤 운동을 처방해보세요
          </p>
          <Link
            href={`/rehab-manage/prescribe?patientId=${patient.id}`}
            style={{
              display: "inline-block",
              padding: "12px 32px",
              background:
                "linear-gradient(135deg, #38bdf8, #0ea5e9, #0284c7)",
              color: "#ffffff",
              border: "none",
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(14,165,233,0.3)",
            }}
          >
            운동 처방하기
          </Link>
        </div>
      )}

      {/* (d-1) 운동 통계 요약 카드 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            flex: 1,
            backgroundColor: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e0f2fe",
            padding: "14px 8px",
            textAlign: "center" as const,
          }}
        >
          <p style={{ fontSize: 11, color: "#64748b", margin: 0, marginBottom: 6 }}>
            총 운동 일수
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#0EA5E9", margin: 0 }}>
            {exerciseStats.totalDays}
          </p>
          <p style={{ fontSize: 10, color: "#94a3b8", margin: 0, marginTop: 2 }}>일</p>
        </div>
        <div
          style={{
            flex: 1,
            backgroundColor: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e0f2fe",
            padding: "14px 8px",
            textAlign: "center" as const,
          }}
        >
          <p style={{ fontSize: 11, color: "#64748b", margin: 0, marginBottom: 6 }}>
            총 운동 횟수
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#0EA5E9", margin: 0 }}>
            {exerciseStats.totalCount}
          </p>
          <p style={{ fontSize: 10, color: "#94a3b8", margin: 0, marginTop: 2 }}>회</p>
        </div>
        <div
          style={{
            flex: 1,
            backgroundColor: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e0f2fe",
            padding: "14px 8px",
            textAlign: "center" as const,
          }}
        >
          <p style={{ fontSize: 11, color: "#64748b", margin: 0, marginBottom: 6 }}>
            평균 통증
          </p>
          <p
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
              color:
                exerciseStats.avgPain <= 3
                  ? "#059669"
                  : exerciseStats.avgPain <= 6
                    ? "#d97706"
                    : "#dc2626",
            }}
          >
            {exerciseStats.avgPain > 0 ? exerciseStats.avgPain : "-"}
          </p>
          <p style={{ fontSize: 10, color: "#94a3b8", margin: 0, marginTop: 2 }}>/10</p>
        </div>
      </div>

      {/* (d-2) 주간 운동 횟수 바 차트 */}
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
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
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
          <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "20px 0", margin: 0 }}>
            {exerciseChartDays === 7
              ? "이번 주 운동 기록이 없습니다"
              : "최근 14일 운동 기록이 없습니다"}
          </p>
        )}
      </div>

      {/* (d-3) 통증 추이 라인 차트 */}
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
          통증 추이
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {([7, 14] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPainChartDays(d)}
              style={chartTabStyle(painChartDays === d)}
            >
              {d}일
            </button>
          ))}
        </div>
        {activePainTrend.length > 0 ? (
          <>
            <PainTrendChart
              data={activePainTrend}
              height={200}
              xAxisMode={painChartDays === 14 ? "md" : "weekday"}
            />
            {(() => {
              const n = activePainTrend.length;
              if (n < 4) return null;
              const firstLen = Math.floor(n / 2);
              const firstHalf = activePainTrend.slice(0, firstLen);
              const secondHalf = activePainTrend.slice(firstLen);
              if (firstHalf.length === 0 || secondHalf.length === 0) return null;
              const earlyAvg =
                firstHalf.reduce((s, d) => s + d.avgPain, 0) / firstHalf.length;
              const lateAvg =
                secondHalf.reduce((s, d) => s + d.avgPain, 0) /
                secondHalf.length;
              const diff = lateAvg - earlyAvg;
              if (Math.abs(diff) < 0.3) return null;
              return (
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: diff < 0 ? "#059669" : "#dc2626",
                    textAlign: "center",
                    margin: 0,
                    marginTop: 12,
                  }}
                >
                  {diff < 0
                    ? "📉 통증이 감소하고 있어요!"
                    : "📈 통증이 증가하고 있어요"}
                </p>
              );
            })()}
          </>
        ) : (
          <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "20px 0", margin: 0 }}>
            통증 기록이 없습니다
          </p>
        )}
      </div>

      {/* (d-4) 최근 운동 기록 리스트 */}
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
          최근 운동 기록
        </p>
        {recentLogs.length > 0 ? (
          recentLogs.map((log, idx) => {
            const prevDate =
              idx > 0 ? recentLogs[idx - 1].performed_at : null;
            const showDate = log.performed_at !== prevDate;
            return (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "12px 0",
                  borderTop:
                    showDate && idx > 0 ? "1px solid #e0f2fe" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: showDate ? "#94a3b8" : "transparent",
                    minWidth: 90,
                    flexShrink: 0,
                    alignSelf: "flex-start",
                    paddingTop: 1,
                  }}
                >
                  {showDate ? log.performed_at : ""}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {log.exercise?.title || "운동"}
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexShrink: 0,
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color:
                        (log.pain_level ?? 0) <= 3
                          ? "#059669"
                          : (log.pain_level ?? 0) <= 6
                            ? "#d97706"
                            : "#dc2626",
                    }}
                  >
                    {log.pain_level ?? "-"}/10
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#0EA5E9",
                    }}
                  >
                    {log.exercise_count ?? "-"}회
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "20px 0", margin: 0 }}>
            운동 기록이 없습니다
          </p>
        )}
      </div>

      {/* (e) 영상기록 */}
      <div style={cardStyle}>
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
              fontSize: 16,
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
            }}
          >
            영상기록
          </p>
          <Link
            href={`/rehab-manage/upload?patientId=${patient.id}`}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#0EA5E9",
              textDecoration: "none",
            }}
          >
            전체 보기 →
          </Link>
        </div>

        {medicalImages.length > 0 ? (
          medicalImages.map((img) => (
            <div
              key={img.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: "10px 14px",
                backgroundColor: "#f8fafc",
                borderRadius: 12,
                marginBottom: 6,
              }}
            >
              <img
                src={img.image_url}
                alt=""
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      backgroundColor:
                        img.image_type === "xray"
                          ? "#e0f2fe"
                          : img.image_type === "xbody"
                            ? "#ecfdf5"
                            : "#f8fafc",
                      color:
                        img.image_type === "xray"
                          ? "#0369a1"
                          : img.image_type === "xbody"
                            ? "#059669"
                            : "#64748b",
                    }}
                  >
                    {IMAGE_TYPE_LABELS[img.image_type] || img.image_type}
                  </span>
                  {img.body_part && (
                    <span
                      style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}
                    >
                      {img.body_part.name}
                    </span>
                  )}
                </div>
                <p
                  style={{ fontSize: 10, color: "#94a3b8", margin: 0 }}
                >
                  {img.taken_at}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: "24px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
              아직 업로드된 영상기록이 없습니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
