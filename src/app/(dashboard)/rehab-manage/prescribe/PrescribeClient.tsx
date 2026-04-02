"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BodyPart, Exercise, ExerciseLevel } from "@/types/rehab";
import {
  getExercisesByBodyParts,
  createPrescription,
} from "@/lib/rehab/actions";

export interface PrescriptionDraft {
  selectedBodyParts: string[];
  levelByBodyPart: Record<string, ExerciseLevel>;
  exercisesByBodyPart: Record<string, string[]>;
  note: string;
}

const LEVEL_COLORS: Record<
  ExerciseLevel,
  { bg: string; color: string; inactive: string }
> = {
  1: { bg: "#ecfdf5", color: "#059669", inactive: "#94a3b8" },
  2: { bg: "#fffbeb", color: "#d97706", inactive: "#94a3b8" },
  3: { bg: "#fef2f2", color: "#dc2626", inactive: "#94a3b8" },
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 20,
  border: "1px solid #e0f2fe",
  boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
  padding: 24,
  marginBottom: 16,
};

const STEP_LABELS = [
  { n: 1, title: "통증 부위" },
  { n: 2, title: "단계 선택" },
  { n: 3, title: "운동 선택" },
  { n: 4, title: "메모" },
];

interface Props {
  patient: { id: string; name: string };
  bodyParts: BodyPart[];
  initialDraft: PrescriptionDraft | null;
}

function emptyDraft(): PrescriptionDraft {
  return {
    selectedBodyParts: [],
    levelByBodyPart: {},
    exercisesByBodyPart: {},
    note: "",
  };
}

export default function PrescribeClient({
  patient,
  bodyParts,
  initialDraft,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<PrescriptionDraft>(() =>
    initialDraft ? { ...initialDraft, note: initialDraft.note ?? "" } : emptyDraft()
  );
  const [exercisesCache, setExercisesCache] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  const { selectedBodyParts, levelByBodyPart, exercisesByBodyPart, note } =
    draft;

  const setNote = (v: string) =>
    setDraft((d) => ({ ...d, note: v }));

  const toggleBodyPart = (id: string) => {
    setDraft((d) => {
      const has = d.selectedBodyParts.includes(id);
      if (has) {
        const nextParts = d.selectedBodyParts.filter((x) => x !== id);
        const nextLevel = { ...d.levelByBodyPart };
        const nextEx = { ...d.exercisesByBodyPart };
        delete nextLevel[id];
        delete nextEx[id];
        return {
          ...d,
          selectedBodyParts: nextParts,
          levelByBodyPart: nextLevel,
          exercisesByBodyPart: nextEx,
        };
      }
      return {
        ...d,
        selectedBodyParts: [...d.selectedBodyParts, id],
        levelByBodyPart: { ...d.levelByBodyPart, [id]: 1 },
        exercisesByBodyPart: { ...d.exercisesByBodyPart, [id]: [] },
      };
    });
  };

  const setLevelForPart = (bodyPartId: string, level: ExerciseLevel) => {
    setDraft((d) => {
      const nextLevel = { ...d.levelByBodyPart, [bodyPartId]: level };
      const allowed = exercisesCache.filter(
        (e) =>
          e.body_part_id === bodyPartId &&
          e.level === level &&
          e.is_active
      );
      const allowedIds = new Set(allowed.map((e) => e.id));
      const prevIds = d.exercisesByBodyPart[bodyPartId] ?? [];
      const nextIds = prevIds.filter((eid) => allowedIds.has(eid));
      return {
        ...d,
        levelByBodyPart: nextLevel,
        exercisesByBodyPart: {
          ...d.exercisesByBodyPart,
          [bodyPartId]: nextIds,
        },
      };
    });
  };

  const toggleExercise = (bodyPartId: string, exerciseId: string) => {
    setDraft((d) => {
      const list = d.exercisesByBodyPart[bodyPartId] ?? [];
      const has = list.includes(exerciseId);
      const nextList = has
        ? list.filter((x) => x !== exerciseId)
        : [...list, exerciseId];
      return {
        ...d,
        exercisesByBodyPart: {
          ...d.exercisesByBodyPart,
          [bodyPartId]: nextList,
        },
      };
    });
  };

  const exercisesForPartAndLevel = useCallback(
    (bodyPartId: string) => {
      const lv = levelByBodyPart[bodyPartId] ?? 1;
      return exercisesCache.filter(
        (e) =>
          e.body_part_id === bodyPartId &&
          e.level === lv &&
          e.is_active
      );
    },
    [exercisesCache, levelByBodyPart]
  );

  useEffect(() => {
    if (selectedBodyParts.length === 0) {
      setExercisesCache([]);
      return;
    }
    setLoadingExercises(true);
    getExercisesByBodyParts(selectedBodyParts)
      .then((data) => setExercisesCache(data))
      .finally(() => setLoadingExercises(false));
  }, [selectedBodyParts]);

  useEffect(() => {
    if (exercisesCache.length === 0) return;
    setDraft((d) => {
      let changed = false;
      const nextEx = { ...d.exercisesByBodyPart };
      for (const bpId of d.selectedBodyParts) {
        const lv = d.levelByBodyPart[bpId] ?? 1;
        const allowed = new Set(
          exercisesCache
            .filter(
              (e) =>
                e.body_part_id === bpId && e.level === lv && e.is_active
            )
            .map((e) => e.id)
        );
        const list = nextEx[bpId] ?? [];
        const filtered = list.filter((id) => allowed.has(id));
        if (filtered.length !== list.length) {
          nextEx[bpId] = filtered;
          changed = true;
        }
      }
      return changed ? { ...d, exercisesByBodyPart: nextEx } : d;
    });
  }, [exercisesCache]);

  const bpByCategory: Record<string, BodyPart[]> = {};
  bodyParts.forEach((bp) => {
    const cat = bp.category || "기타";
    if (!bpByCategory[cat]) bpByCategory[cat] = [];
    bpByCategory[cat].push(bp);
  });

  const bodyPartName = (id: string) =>
    bodyParts.find((b) => b.id === id)?.name ?? "부위";

  const canGoNext = () => {
    if (step === 1) return selectedBodyParts.length >= 1;
    if (step === 2) {
      return selectedBodyParts.every(
        (id) => (levelByBodyPart[id] ?? 1) >= 1
      );
    }
    if (step === 3) {
      if (loadingExercises) return false;
      return selectedBodyParts.every(
        (id) => (exercisesByBodyPart[id]?.length ?? 0) >= 1
      );
    }
    return true;
  };

  const handleSubmit = () => {
    if (selectedBodyParts.length === 0) {
      alert("통증 부위를 선택해주세요.");
      return;
    }
    const missing = selectedBodyParts.filter(
      (id) => (exercisesByBodyPart[id]?.length ?? 0) < 1
    );
    if (missing.length > 0) {
      alert("각 통증 부위마다 최소 1개 이상의 운동을 선택해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        await createPrescription({
          patient_id: patient.id,
          body_part_ids: selectedBodyParts,
          levelByBodyPart,
          exercisesByBodyPart,
          note: note.trim() || undefined,
        });
        router.push(`/rehab-manage/${patient.id}`);
      } catch (e) {
        alert(
          e instanceof Error ? e.message : "처방 저장에 실패했습니다."
        );
      }
    });
  };

  const goNext = () => {
    if (step < 4) {
      if (!canGoNext()) {
        if (step === 1) alert("통증 부위를 최소 1개 선택해주세요.");
        else if (step === 3)
          alert("각 부위별로 운동을 최소 1개 이상 선택해주세요.");
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    handleSubmit();
  };

  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  const renderStepNav = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 28,
        padding: "0 8px",
      }}
    >
      {STEP_LABELS.map((s, idx) => {
        const done = step > s.n;
        const current = step === s.n;
        const circleBg =
          done || current ? "#0EA5E9" : "#e2e8f0";
        const circleColor =
          done || current ? "#fff" : "#94a3b8";
        return (
          <div
            key={s.n}
            style={{
              display: "flex",
              alignItems: "center",
              flex: idx < STEP_LABELS.length - 1 ? 1 : 0,
              minWidth: 0,
            }}
          >
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: circleBg,
                  color: circleColor,
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 6px",
                }}
              >
                {done ? "✓" : s.n}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: current ? 700 : 500,
                  color: current ? "#0EA5E9" : "#94a3b8",
                  whiteSpace: "nowrap",
                }}
              >
                {s.title}
              </div>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div
                style={{
                  height: 2,
                  flex: 1,
                  margin: "0 8px",
                  marginBottom: 28,
                  backgroundColor: step > s.n ? "#0EA5E9" : "#e2e8f0",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div style={cardStyle}>
      <p
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: "#0f172a",
          margin: 0,
          marginBottom: 4,
        }}
      >
        Step 1. 통증 부위 선택
      </p>
      <p
        style={{
          fontSize: 12,
          color: "#94a3b8",
          marginTop: 0,
          marginBottom: 16,
        }}
      >
        복수 선택 가능
      </p>
      {Object.entries(bpByCategory).map(([cat, parts]) => (
        <div key={cat} style={{ marginBottom: 14 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#94a3b8",
              marginBottom: 8,
              marginTop: 0,
              textTransform: "uppercase",
            }}
          >
            {cat}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {parts.map((bp) => {
              const isActive = selectedBodyParts.includes(bp.id);
              return (
                <button
                  key={bp.id}
                  type="button"
                  onClick={() => toggleBodyPart(bp.id)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: isActive ? "none" : "1.5px solid #e2e8f0",
                    backgroundColor: isActive ? "#0EA5E9" : "#fff",
                    color: isActive ? "#fff" : "#334155",
                    transition: "all 0.2s",
                  }}
                >
                  {isActive ? "✓ " : ""}
                  {bp.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderStep2 = () => (
    <div>
      {selectedBodyParts.map((bpId) => {
        const name = bodyPartName(bpId);
        const lv = levelByBodyPart[bpId] ?? 1;
        return (
          <div
            key={bpId}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              border: "1px solid #e0f2fe",
              boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
              padding: 20,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "6px 12px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                marginBottom: 14,
              }}
            >
              {name}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {([1, 2, 3] as ExerciseLevel[]).map((levelOpt) => {
                const active = lv === levelOpt;
                const c = LEVEL_COLORS[levelOpt];
                return (
                  <button
                    key={levelOpt}
                    type="button"
                    onClick={() => setLevelForPart(bpId, levelOpt)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 10,
                      textAlign: "center",
                      fontSize: 13,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: active ? 700 : 500,
                      backgroundColor: active ? c.bg : "#f8fafc",
                      color: active ? c.color : c.inactive,
                    }}
                  >
                    {levelOpt}단계
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderStep3 = () => {
    if (selectedBodyParts.length === 0) {
      return (
        <p
          style={{
            fontSize: 13,
            color: "#94a3b8",
            textAlign: "center",
            padding: 24,
          }}
        >
          먼저 통증 부위를 선택해주세요
        </p>
      );
    }
    if (loadingExercises) {
      return (
        <p
          style={{
            fontSize: 13,
            color: "#94a3b8",
            textAlign: "center",
            padding: 24,
          }}
        >
          운동을 불러오는 중...
        </p>
      );
    }
    return (
      <div>
        {selectedBodyParts.map((bpId) => {
          const name = bodyPartName(bpId);
          const lv = levelByBodyPart[bpId] ?? 1;
          const list = exercisesForPartAndLevel(bpId);
          const selected = exercisesByBodyPart[bpId] ?? [];
          const lvlColor = LEVEL_COLORS[lv];
          return (
            <div key={bpId} style={{ marginBottom: 24 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span>{name}</span>
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: lvlColor.bg,
                    color: lvlColor.color,
                  }}
                >
                  {lv}단계
                </span>
                <span style={{ color: "#64748b", fontWeight: 600 }}>
                  운동
                </span>
              </p>
              {list.length === 0 ? (
                <div
                  style={{
                    ...cardStyle,
                    padding: 20,
                    marginBottom: 0,
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: "#94a3b8",
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    해당 조건의 운동이 없습니다. 운동 라이브러리에서 먼저
                    등록해주세요.
                  </p>
                  <Link
                    href="/rehab-manage/exercises"
                    style={{
                      display: "inline-block",
                      marginTop: 12,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0EA5E9",
                      textDecoration: "none",
                    }}
                  >
                    운동 라이브러리 →
                  </Link>
                </div>
              ) : (
                list.map((ex) => {
                  const isChecked = selected.includes(ex.id);
                  return (
                    <div
                      key={ex.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleExercise(bpId, ex.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          toggleExercise(bpId, ex.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 16px",
                        backgroundColor: isChecked ? "#f0f9ff" : "#fff",
                        borderRadius: 14,
                        border: isChecked
                          ? "2px solid #0EA5E9"
                          : "1px solid #e0f2fe",
                        marginBottom: 8,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: isChecked ? "none" : "1.5px solid #cbd5e1",
                          backgroundColor: isChecked ? "#0EA5E9" : "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: 13,
                          color: "#fff",
                          fontWeight: 800,
                        }}
                      >
                        {isChecked ? "✓" : ""}
                      </div>
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
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            marginTop: 4,
                          }}
                        >
                          {ex.body_part && (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 20,
                                fontSize: 10,
                                fontWeight: 700,
                                backgroundColor: "#e0f2fe",
                                color: "#0369a1",
                              }}
                            >
                              {ex.body_part.name}
                            </span>
                          )}
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              backgroundColor: lvlColor.bg,
                              color: lvlColor.color,
                            }}
                          >
                            {lv}단계
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStep4 = () => (
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
        Step 4. 처방 메모
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="하루에 10번씩 총 5set를 목표로 해주세요!"
        style={{
          width: "100%",
          height: 100,
          padding: "12px 16px",
          backgroundColor: "#f8fafc",
          border: "1.5px solid #e2e8f0",
          borderRadius: 12,
          fontSize: 14,
          color: "#0f172a",
          outline: "none",
          boxSizing: "border-box",
          resize: "none",
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "28px 20px 120px 20px",
        minHeight: "100vh",
      }}
    >
      <Link
        href={`/rehab-manage/${patient.id}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 13,
          fontWeight: 600,
          color: "#0EA5E9",
          textDecoration: "none",
          marginBottom: 16,
        }}
      >
        ← 뒤로
      </Link>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "#0f172a",
          margin: 0,
        }}
      >
        운동 처방
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#94a3b8",
          marginTop: 4,
          marginBottom: 8,
        }}
      >
        {patient.name}님에게 맞춤 운동을 처방합니다
      </p>

      <p
        style={{
          fontSize: 12,
          color: "#94a3b8",
          marginTop: 0,
          marginBottom: 20,
        }}
      >
        Step {step} / 4
        {step < 4 ? `  →  ${STEP_LABELS[step - 1]?.title ?? ""}` : ""}
      </p>

      {renderStepNav()}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 1 || isPending}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 700,
            backgroundColor: "#fff",
            border: "1.5px solid #e2e8f0",
            color: "#64748b",
            cursor: step === 1 ? "not-allowed" : "pointer",
            opacity: step === 1 ? 0.5 : 1,
          }}
        >
          이전
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={isPending}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 700,
            background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
            color: "#fff",
            border: "none",
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
            boxShadow: "0 4px 14px rgba(14,165,233,0.25)",
          }}
        >
          {isPending
            ? "처리 중..."
            : step === 4
              ? "처방하기"
              : "다음"}
        </button>
      </div>
    </div>
  );
}
