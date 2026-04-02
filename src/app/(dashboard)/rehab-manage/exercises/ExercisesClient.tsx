"use client";

import { useState, useCallback, useTransition } from "react";
import type { Exercise, BodyPart, ExerciseLevel } from "@/types/rehab";
import { getExercises } from "@/lib/rehab/actions";
import ExerciseModal from "@/components/rehab/ExerciseModal";

const LEVEL_COLORS: Record<
  ExerciseLevel,
  { bg: string; color: string }
> = {
  1: { bg: "#ecfdf5", color: "#059669" },
  2: { bg: "#fffbeb", color: "#d97706" },
  3: { bg: "#fef2f2", color: "#dc2626" },
};

const LEVEL_CHIP_ACTIVE: Record<string, { bg: string }> = {
  all: { bg: "#0EA5E9" },
  "1": { bg: "#10b981" },
  "2": { bg: "#f59e0b" },
  "3": { bg: "#ef4444" },
};

interface ExercisesClientProps {
  initialExercises: Exercise[];
  bodyParts: BodyPart[];
}

export default function ExercisesClient({
  initialExercises,
  bodyParts,
}: ExercisesClientProps) {
  const [exercises, setExercises] = useState(initialExercises);
  const [selectedBodyPart, setSelectedBodyPart] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<ExerciseLevel | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Exercise | null>(null);
  const [, startTransition] = useTransition();

  const refetch = useCallback(
    (bodyPartId?: string, level?: ExerciseLevel | null) => {
      startTransition(async () => {
        const data = await getExercises(
          bodyPartId || undefined,
          level ?? undefined
        );
        setExercises(data);
      });
    },
    []
  );

  const handleBodyPartChange = (id: string) => {
    setSelectedBodyPart(id);
    refetch(id, selectedLevel);
  };

  const handleLevelChange = (level: ExerciseLevel | null) => {
    setSelectedLevel(level);
    refetch(selectedBodyPart, level);
  };

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (exercise: Exercise) => {
    setEditTarget(exercise);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditTarget(null);
    refetch(selectedBodyPart, selectedLevel);
  };

  const levelChipKey = selectedLevel === null ? "all" : String(selectedLevel);

  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "28px 20px 120px 20px",
        minHeight: "100vh",
      }}
    >
      {/* (a) 헤더 행 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
            }}
          >
            운동 라이브러리
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#94a3b8",
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            운동 콘텐츠를 등록하고 관리합니다
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding: "10px 18px",
            background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
            color: "#ffffff",
            border: "none",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 3px 10px rgba(14,165,233,0.25)",
            whiteSpace: "nowrap",
          }}
        >
          + 운동 등록
        </button>
      </div>

      {/* (b) 부위 필터 칩 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          marginBottom: 12,
          paddingBottom: 4,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <button
          onClick={() => handleBodyPartChange("")}
          style={{
            padding: "8px 16px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.2s",
            border: selectedBodyPart === "" ? "none" : "1.5px solid #e2e8f0",
            backgroundColor:
              selectedBodyPart === "" ? "#0EA5E9" : "#ffffff",
            color: selectedBodyPart === "" ? "#ffffff" : "#64748b",
            boxShadow:
              selectedBodyPart === ""
                ? "0 2px 8px rgba(14,165,233,0.25)"
                : "none",
            flexShrink: 0,
          }}
        >
          전체
        </button>
        {bodyParts.map((bp) => (
          <button
            key={bp.id}
            onClick={() => handleBodyPartChange(bp.id)}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
              border:
                selectedBodyPart === bp.id ? "none" : "1.5px solid #e2e8f0",
              backgroundColor:
                selectedBodyPart === bp.id ? "#0EA5E9" : "#ffffff",
              color: selectedBodyPart === bp.id ? "#ffffff" : "#64748b",
              boxShadow:
                selectedBodyPart === bp.id
                  ? "0 2px 8px rgba(14,165,233,0.25)"
                  : "none",
              flexShrink: 0,
            }}
          >
            {bp.name}
          </button>
        ))}
      </div>

      {/* (c) 단계 필터 칩 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(
          [
            { value: null, label: "전체", key: "all" },
            { value: 1 as ExerciseLevel, label: "1단계", key: "1" },
            { value: 2 as ExerciseLevel, label: "2단계", key: "2" },
            { value: 3 as ExerciseLevel, label: "3단계", key: "3" },
          ] as const
        ).map((lv) => {
          const isActive = selectedLevel === lv.value;
          return (
            <button
              key={lv.key}
              onClick={() => handleLevelChange(lv.value)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
                border: isActive ? "none" : "1.5px solid #e2e8f0",
                backgroundColor: isActive
                  ? LEVEL_CHIP_ACTIVE[lv.key].bg
                  : "#ffffff",
                color: isActive ? "#ffffff" : "#64748b",
                boxShadow: isActive
                  ? "0 2px 8px rgba(14,165,233,0.25)"
                  : "none",
              }}
            >
              {lv.label}
            </button>
          );
        })}
      </div>

      {/* (d) 운동 카드 리스트 */}
      {exercises.length > 0 ? (
        <div>
          {exercises.map((ex) => {
            const lvl = ex.level as ExerciseLevel;
            const lvlColor = LEVEL_COLORS[lvl];
            return (
              <div
                key={ex.id}
                onClick={() => openEdit(ex)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "18px 20px",
                  backgroundColor: "#ffffff",
                  borderRadius: 20,
                  border: "1px solid #e0f2fe",
                  boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  marginBottom: 12,
                }}
              >
                {/* 아이콘 */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: "#e0f2fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {ex.content_type === "video" ? "🎬" : "📋"}
                </div>

                {/* 중앙 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 15,
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
                    style={{ display: "flex", gap: 6, marginTop: 6 }}
                  >
                    {ex.body_part && (
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
                        {ex.body_part.name}
                      </span>
                    )}
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        backgroundColor: lvlColor.bg,
                        color: lvlColor.color,
                      }}
                    >
                      {lvl}단계
                    </span>
                    {!ex.is_active && (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: "#f1f5f9",
                          color: "#94a3b8",
                        }}
                      >
                        비활성
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* (f) 빈 상태 */
        <div
          style={{
            paddingTop: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "#e0f2fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 28 }}>🏋️</span>
          </div>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#334155",
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            등록된 운동이 없습니다
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#94a3b8",
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            운동을 등록해보세요
          </p>
        </div>
      )}

      {/* Modal */}
      <ExerciseModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(null);
        }}
        onSaved={handleSaved}
        exercise={editTarget}
        bodyParts={bodyParts}
      />
    </div>
  );
}
