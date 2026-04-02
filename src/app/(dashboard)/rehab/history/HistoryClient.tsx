"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExerciseLog, MedicalImage, Prescription, Exercise } from "@/types/rehab";
import { IMAGE_TYPE_LABELS } from "@/types/rehab";
import {
  updateExerciseLog,
  createExerciseLog,
} from "@/lib/rehab/actions";
import { addDaysDateOnly } from "@/lib/rehab/date-only";

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

const cardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 20,
  border: "1px solid #e0f2fe",
  boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
  padding: 20,
  marginBottom: 12,
};

function painColor(level: number) {
  if (level <= 3) return "#059669";
  if (level <= 6) return "#d97706";
  return "#dc2626";
}

function painBtnStyle(n: number, selected: boolean): React.CSSProperties {
  let bg = "#f1f5f9";
  let fg = "#94a3b8";
  if (selected) {
    if (n <= 3) { bg = "#ecfdf5"; fg = "#059669"; }
    else if (n <= 6) { bg = "#fffbeb"; fg = "#d97706"; }
    else if (n <= 9) { bg = "#fef2f2"; fg = "#dc2626"; }
    else { bg = "#ef4444"; fg = "#ffffff"; }
  }
  return {
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
  };
}

function formatKoreanDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

interface Props {
  weekLogs: ExerciseLog[];
  logDates: string[];
  medicalImages: MedicalImage[];
  prescription: Prescription | null;
  weekStart: string;
  today: string;
}

export default function HistoryClient({
  weekLogs: initialWeekLogs,
  logDates: initialLogDates,
  medicalImages,
  prescription,
  weekStart,
  today,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"exercise" | "xray">("exercise");
  const [selectedDate, setSelectedDate] = useState(today);
  const [imageModal, setImageModal] = useState<MedicalImage | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareLeftIdx, setCompareLeftIdx] = useState(0);
  const [compareRightIdx, setCompareRightIdx] = useState(0);

  const [weekLogs, setWeekLogs] = useState(initialWeekLogs);
  const [logDates, setLogDates] = useState(initialLogDates);

  // edit state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editPain, setEditPain] = useState(5);
  const [editCount, setEditCount] = useState(10);
  const [isPending, startTransition] = useTransition();

  // new log state (for past dates)
  const [addingExerciseId, setAddingExerciseId] = useState<string | null>(null);
  const [newPain, setNewPain] = useState(5);
  const [newCount, setNewCount] = useState(10);

  const logDateSet = useMemo(() => new Set(logDates), [logDates]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = addDaysDateOnly(weekStart, i);
      const [, , dayNum] = dateStr.split("-").map(Number);
      return {
        dayName: DAY_NAMES[i],
        date: dayNum,
        dateStr,
        isToday: dateStr === today,
        hasLog: logDateSet.has(dateStr),
      };
    });
  }, [weekStart, today, logDateSet]);

  const filteredLogs = useMemo(
    () => weekLogs.filter((l) => l.performed_at === selectedDate),
    [weekLogs, selectedDate]
  );

  const isFutureDate = selectedDate > today;

  const unloggedExercises = useMemo(() => {
    if (!prescription?.exercises || isFutureDate) return [];
    const loggedExerciseIds = new Set(
      filteredLogs.map((l) => l.exercise_id).filter(Boolean)
    );
    return prescription.exercises.filter((ex) => !loggedExerciseIds.has(ex.id));
  }, [prescription, filteredLogs, isFutureDate]);

  const groupedImages = useMemo(() => {
    const groups: Record<string, MedicalImage[]> = {};
    for (const img of medicalImages) {
      const key = img.taken_at;
      if (!groups[key]) groups[key] = [];
      groups[key].push(img);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [medicalImages]);

  const handleStartEdit = (log: ExerciseLog) => {
    setEditingLogId(log.id);
    setEditPain(log.pain_level ?? 5);
    setEditCount(log.exercise_count ?? 10);
    setAddingExerciseId(null);
  };

  const handleSaveEdit = () => {
    if (!editingLogId) return;
    startTransition(async () => {
      try {
        const updated = await updateExerciseLog(editingLogId, editPain, editCount);
        setWeekLogs((prev) =>
          prev.map((l) => (l.id === editingLogId ? { ...l, ...updated } : l))
        );
        setEditingLogId(null);
      } catch {
        alert("수정에 실패했습니다.");
      }
    });
  };

  const handleStartAdd = (exerciseId: string) => {
    setAddingExerciseId(exerciseId);
    setNewPain(5);
    setNewCount(10);
    setEditingLogId(null);
  };

  const handleSaveNewLog = (exercise: Exercise) => {
    if (!prescription || !addingExerciseId) return;
    startTransition(async () => {
      try {
        const created = await createExerciseLog({
          prescription_id: prescription.id,
          exercise_id: addingExerciseId,
          pain_level: newPain,
          exercise_count: newCount,
          performed_at: selectedDate,
        });
        setWeekLogs((prev) => [
          { ...created, exercise } as ExerciseLog,
          ...prev,
        ]);
        if (!logDateSet.has(selectedDate)) {
          setLogDates((prev) => [...prev, selectedDate]);
        }
        setAddingExerciseId(null);
        router.refresh();
      } catch {
        alert("기록 저장에 실패했습니다.");
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
      {/* (a) 헤더 */}
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>
        내 기록
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#94a3b8",
          marginTop: 4,
          marginBottom: 24,
        }}
      >
        운동 기록과 영상기록을 확인하세요
      </p>

      {/* (b) 탭 전환 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          background: "#ffffff",
          borderRadius: 14,
          padding: 4,
          border: "1px solid #e0f2fe",
        }}
      >
        {(["exercise", "xray"] as const).map((t) => {
          const selected = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "12px 0",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                transition: "all 0.2s",
                backgroundColor: selected ? "#0EA5E9" : "transparent",
                color: selected ? "#ffffff" : "#94a3b8",
                boxShadow: selected
                  ? "0 2px 8px rgba(14,165,233,0.25)"
                  : "none",
              }}
            >
              {t === "exercise" ? "운동기록" : "영상기록"}
            </button>
          );
        })}
      </div>

      {/* (c) 운동 기록 탭 */}
      {tab === "exercise" && (
        <>
          {/* 주간 캘린더 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            {weekDays.map((wd) => {
              const isSelected = selectedDate === wd.dateStr;
              return (
                <button
                  key={wd.dateStr}
                  onClick={() => setSelectedDate(wd.dateStr)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                    padding: "8px 6px",
                    borderRadius: 12,
                    border: "none",
                    minWidth: 40,
                    backgroundColor: isSelected ? "#0EA5E9" : "transparent",
                    transition: "all 0.2s",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: isSelected ? "#ffffff" : "#94a3b8",
                    }}
                  >
                    {wd.dayName}
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: isSelected || wd.isToday ? 800 : 700,
                      color: isSelected ? "#ffffff" : "#334155",
                    }}
                  >
                    {wd.date}
                  </span>
                  {wd.hasLog && !isSelected && (
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        backgroundColor: "#0EA5E9",
                      }}
                    />
                  )}
                  {isSelected && (
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        backgroundColor: "#ffffff",
                      }}
                    />
                  )}
                  {!wd.hasLog && !isSelected && (
                    <div style={{ width: 5, height: 5 }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* 선택한 날짜의 기록 */}
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const isEditing = editingLogId === log.id;
              return (
                <div key={log.id} style={cardStyle}>
                  {/* 상단: 제목 + 부위 뱃지 */}
                  <div
                    onClick={() => !isEditing && handleStartEdit(log)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#0f172a",
                        margin: 0,
                      }}
                    >
                      {log.exercise?.title || "운동"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {log.exercise?.body_part && (
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor: "#e0f2fe",
                            color: "#0369a1",
                          }}
                        >
                          {log.exercise.body_part.name}
                        </span>
                      )}
                      {!isEditing && (
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>✏️</span>
                      )}
                    </div>
                  </div>

                  {!isEditing ? (
                    <>
                      {/* 중단: 통증 + 횟수 */}
                      <div
                        onClick={() => handleStartEdit(log)}
                        style={{
                          display: "flex",
                          gap: 16,
                          marginTop: 12,
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              fontSize: 11,
                              color: "#94a3b8",
                              margin: 0,
                              marginBottom: 2,
                            }}
                          >
                            통증
                          </p>
                          <p
                            style={{
                              fontSize: 18,
                              fontWeight: 800,
                              color: painColor(log.pain_level ?? 0),
                              margin: 0,
                            }}
                          >
                            {log.pain_level ?? "-"}/10
                          </p>
                        </div>
                        <div>
                          <p
                            style={{
                              fontSize: 11,
                              color: "#94a3b8",
                              margin: 0,
                              marginBottom: 2,
                            }}
                          >
                            횟수
                          </p>
                          <p
                            style={{
                              fontSize: 18,
                              fontWeight: 800,
                              color: "#0EA5E9",
                              margin: 0,
                            }}
                          >
                            {log.exercise_count ?? "-"}회
                          </p>
                        </div>
                      </div>

                      {/* 하단: 시간 */}
                      <p
                        suppressHydrationWarning
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          marginTop: 8,
                          marginBottom: 0,
                        }}
                      >
                        {log.created_at
                          ? new Date(log.created_at).toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </>
                  ) : (
                    /* 수정 폼 */
                    <div style={{ marginTop: 14 }}>
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
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <button
                            key={n}
                            onClick={() => setEditPain(n)}
                            style={painBtnStyle(n, editPain === n)}
                          >
                            {n}
                          </button>
                        ))}
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
                          onClick={() => setEditCount((p) => Math.max(1, p - 1))}
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
                          {editCount}
                        </span>
                        <button
                          onClick={() => setEditCount((p) => Math.min(99, p + 1))}
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
                        <span style={{ fontSize: 14, color: "#64748b" }}>회</span>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => setEditingLogId(null)}
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
                          onClick={handleSaveEdit}
                          disabled={isPending}
                          style={{
                            flex: 1,
                            height: 42,
                            background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: isPending ? "not-allowed" : "pointer",
                            opacity: isPending ? 0.5 : 1,
                          }}
                        >
                          {isPending ? "저장 중..." : "수정 저장"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : null}

          {/* 미기록 처방 운동 (과거/오늘 날짜) */}
          {unloggedExercises.length > 0 && (
            <div style={{ marginTop: filteredLogs.length > 0 ? 8 : 0 }}>
              {filteredLogs.length > 0 && (
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748b",
                    marginBottom: 10,
                    marginTop: 0,
                  }}
                >
                  미기록 운동
                </p>
              )}
              {unloggedExercises.map((ex) => {
                const isAdding = addingExerciseId === ex.id;
                return (
                  <div key={ex.id} style={cardStyle}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                        <div>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#0f172a",
                              margin: 0,
                            }}
                          >
                            {ex.title}
                          </p>
                          {ex.body_part && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                margin: 0,
                                marginTop: 2,
                              }}
                            >
                              {ex.body_part.name}
                            </p>
                          )}
                        </div>
                      </div>
                      {!isAdding && (
                        <button
                          onClick={() => handleStartAdd(ex.id)}
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
                          운동 완료
                        </button>
                      )}
                    </div>

                    {isAdding && (
                      <div style={{ marginTop: 14 }}>
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
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <button
                              key={n}
                              onClick={() => setNewPain(n)}
                              style={painBtnStyle(n, newPain === n)}
                            >
                              {n}
                            </button>
                          ))}
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
                            onClick={() => setNewCount((p) => Math.max(1, p - 1))}
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
                            {newCount}
                          </span>
                          <button
                            onClick={() => setNewCount((p) => Math.min(99, p + 1))}
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
                          <span style={{ fontSize: 14, color: "#64748b" }}>회</span>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setAddingExerciseId(null)}
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
                            onClick={() => handleSaveNewLog(ex)}
                            disabled={isPending}
                            style={{
                              flex: 1,
                              height: 42,
                              background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
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

          {/* 기록도 없고 미기록 운동도 없을 때 */}
          {filteredLogs.length === 0 && unloggedExercises.length === 0 && (
            <div
              style={{
                ...cardStyle,
                textAlign: "center",
                padding: "40px 20px",
              }}
            >
              <span style={{ fontSize: 28, display: "block", marginBottom: 10 }}>
                📝
              </span>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#94a3b8",
                  margin: 0,
                }}
              >
                {isFutureDate
                  ? "미래 날짜에는 기록할 수 없어요"
                  : "이 날은 운동 기록이 없어요"}
              </p>
            </div>
          )}
        </>
      )}

      {/* (d) 영상기록 탭 */}
      {tab === "xray" && (
        <>
          {medicalImages.length > 0 ? (
            <>
              {/* 전/후 비교 버튼 */}
              {medicalImages.length >= 2 && (
                <button
                  onClick={() => {
                    setCompareLeftIdx(medicalImages.length - 1);
                    setCompareRightIdx(0);
                    setShowCompare(true);
                  }}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  🔄 전/후 비교
                </button>
              )}

              {/* 날짜별 그룹 */}
              {groupedImages.map(([dateStr, images]) => (
                <div key={dateStr}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#334155",
                      marginBottom: 10,
                      marginTop: 20,
                    }}
                  >
                    {formatKoreanDate(dateStr)}
                  </p>
                  {images.map((img) => (
                    <div key={img.id} style={{ ...cardStyle, padding: 16 }}>
                      <img
                        src={img.image_url}
                        alt={img.body_part?.name || "의료 이미지"}
                        onClick={() => setImageModal(img)}
                        style={{
                          width: "100%",
                          borderRadius: 12,
                          objectFit: "cover",
                          maxHeight: 240,
                          cursor: "pointer",
                          display: "block",
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor:
                              img.image_type === "xray"
                                ? "#e0f2fe"
                                : img.image_type === "xbody"
                                  ? "#ecfdf5"
                                  : "#f1f5f9",
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
                            style={{
                              padding: "3px 10px",
                              borderRadius: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              backgroundColor: "#f1f5f9",
                              color: "#64748b",
                            }}
                          >
                            {img.body_part.name}
                          </span>
                        )}
                      </div>
                      {img.description && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            marginTop: 8,
                            marginBottom: 0,
                            lineHeight: 1.5,
                          }}
                        >
                          {img.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          ) : (
            <div
              style={{
                ...cardStyle,
                textAlign: "center",
                padding: "40px 20px",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: "#e0f2fe",
                  margin: "0 auto 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 28 }}>📷</span>
              </div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#334155",
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                아직 업로드된 영상기록이 없습니다
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "#94a3b8",
                  marginTop: 6,
                  marginBottom: 0,
                  textAlign: "center",
                  lineHeight: 1.6,
                }}
              >
                치료사가 영상기록을 업로드하면
                <br />
                이곳에서 확인할 수 있습니다.
              </p>
            </div>
          )}
        </>
      )}

      {/* 이미지 전체화면 모달 */}
      {imageModal && (
        <div
          onClick={() => setImageModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90%",
              width: 500,
            }}
          >
            <button
              onClick={() => setImageModal(null)}
              style={{
                position: "absolute",
                top: -44,
                right: 0,
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.2)",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
            <img
              src={imageModal.image_url}
              alt="확대 이미지"
              style={{
                width: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                borderRadius: 16,
                display: "block",
              }}
            />
            <div
              style={{
                marginTop: 12,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "#ffffff",
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                {formatKoreanDate(imageModal.taken_at)}
                {imageModal.body_part ? ` · ${imageModal.body_part.name}` : ""}
              </p>
              {imageModal.description && (
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.7)",
                    margin: 0,
                    marginTop: 4,
                  }}
                >
                  {imageModal.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 전/후 비교 모달 */}
      {showCompare && medicalImages.length >= 2 && (
        <div
          onClick={() => setShowCompare(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: 16,
              maxWidth: 500,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
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
                전/후 비교
              </p>
              <button
                onClick={() => setShowCompare(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {/* 왼쪽 (이전) */}
              <div style={{ flex: 1 }}>
                <select
                  value={compareLeftIdx}
                  onChange={(e) => setCompareLeftIdx(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 11,
                    color: "#334155",
                    marginBottom: 8,
                    outline: "none",
                  }}
                >
                  {medicalImages.map((img, idx) => (
                    <option key={img.id} value={idx}>
                      {img.taken_at}
                      {img.body_part ? ` · ${img.body_part.name}` : ""}
                    </option>
                  ))}
                </select>
                <img
                  src={medicalImages[compareLeftIdx].image_url}
                  alt="이전"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <p
                  style={{
                    fontSize: 10,
                    color: "#94a3b8",
                    textAlign: "center",
                    marginTop: 6,
                    margin: 0,
                  }}
                >
                  {formatKoreanDate(medicalImages[compareLeftIdx].taken_at)}
                </p>
              </div>
              {/* 오른쪽 (최근) */}
              <div style={{ flex: 1 }}>
                <select
                  value={compareRightIdx}
                  onChange={(e) => setCompareRightIdx(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 11,
                    color: "#334155",
                    marginBottom: 8,
                    outline: "none",
                  }}
                >
                  {medicalImages.map((img, idx) => (
                    <option key={img.id} value={idx}>
                      {img.taken_at}
                      {img.body_part ? ` · ${img.body_part.name}` : ""}
                    </option>
                  ))}
                </select>
                <img
                  src={medicalImages[compareRightIdx].image_url}
                  alt="최근"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <p
                  style={{
                    fontSize: 10,
                    color: "#94a3b8",
                    textAlign: "center",
                    marginTop: 6,
                    margin: 0,
                  }}
                >
                  {formatKoreanDate(medicalImages[compareRightIdx].taken_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
