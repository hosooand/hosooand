"use client";

import { useState, useEffect, useTransition } from "react";
import type {
  Exercise,
  BodyPart,
  ExerciseLevel,
  ContentType,
} from "@/types/rehab";
import {
  createExercise,
  updateExercise,
  toggleExerciseActive,
  uploadLeafletImage,
} from "@/lib/rehab/actions";

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  exercise: Exercise | null;
  bodyParts: BodyPart[];
}

const LEVEL_SELECTED: Record<ExerciseLevel, { bg: string; color: string }> = {
  1: { bg: "#ecfdf5", color: "#059669" },
  2: { bg: "#fffbeb", color: "#d97706" },
  3: { bg: "#fef2f2", color: "#dc2626" },
};

const inputBase: React.CSSProperties = {
  width: "100%",
  height: 50,
  padding: "0 16px",
  backgroundColor: "#f8fafc",
  border: "1.5px solid #e2e8f0",
  borderRadius: 12,
  fontSize: 14,
  color: "#0f172a",
  outline: "none",
  boxSizing: "border-box",
};

function getYoutubeThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    } else {
      videoId = u.searchParams.get("v");
    }
    return videoId
      ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      : null;
  } catch {
    return null;
  }
}

export default function ExerciseModal({
  isOpen,
  onClose,
  onSaved,
  exercise,
  bodyParts,
}: ExerciseModalProps) {
  const isEdit = !!exercise;
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bodyPartId, setBodyPartId] = useState("");
  const [level, setLevel] = useState<ExerciseLevel>(1);
  const [contentType, setContentType] = useState<ContentType>("video");
  const [videoUrl, setVideoUrl] = useState("");
  const [leafletImages, setLeafletImages] = useState<string[]>([]);
  const [leafletText, setLeafletText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (exercise) {
      setTitle(exercise.title);
      setDescription(exercise.description ?? "");
      setBodyPartId(exercise.body_part_id ?? "");
      setLevel(exercise.level);
      setContentType(exercise.content_type);
      setVideoUrl(exercise.video_url ?? "");
      setLeafletImages(exercise.leaflet_images ?? []);
      setLeafletText(exercise.leaflet_text ?? "");
    } else {
      setTitle("");
      setDescription("");
      setBodyPartId("");
      setLevel(1);
      setContentType("video");
      setVideoUrl("");
      setLeafletImages([]);
      setLeafletText("");
    }
    setError("");
  }, [exercise, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title.trim()) {
      setError("운동 제목을 입력해주세요.");
      return;
    }
    if (!bodyPartId) {
      setError("통증 부위를 선택해주세요.");
      return;
    }
    if (contentType === "video" && !videoUrl.trim()) {
      setError("유튜브 URL을 입력해주세요.");
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const input = {
          title: title.trim(),
          description: description.trim() || undefined,
          body_part_id: bodyPartId,
          content_type: contentType,
          video_url: contentType === "video" ? videoUrl.trim() : undefined,
          leaflet_images:
            contentType === "leaflet" ? leafletImages : undefined,
          leaflet_text:
            contentType === "leaflet"
              ? leafletText.trim() || undefined
              : undefined,
          level,
        };

        if (isEdit) {
          await updateExercise(exercise.id, input);
        } else {
          await createExercise(input);
        }
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      }
    });
  };

  const handleToggleActive = () => {
    if (!exercise) return;
    startTransition(async () => {
      try {
        await toggleExerciseActive(exercise.id, !exercise.is_active);
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "상태 변경에 실패했습니다.");
      }
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const url = await uploadLeafletImage(formData);
      setLeafletImages((prev) => [...prev, url]);
    } catch {
      setError("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setLeafletImages((prev) => prev.filter((_, i) => i !== index));
  };

  const thumbnail =
    contentType === "video" && videoUrl
      ? getYoutubeThumbnail(videoUrl)
      : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* Overlay click */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 430,
          maxHeight: "85vh",
          backgroundColor: "#ffffff",
          borderRadius: "24px 24px 0 0",
          padding: "12px 24px 32px",
          overflowY: "auto",
        }}
      >
        {/* 핸들바 */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#d1d5db",
            margin: "0 auto 20px",
          }}
        />

        {/* 모달 제목 */}
        <h2
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: 24,
            marginTop: 0,
          }}
        >
          {isEdit ? "운동 수정" : "운동 등록"}
        </h2>

        {/* 운동 제목 */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#475569",
              marginBottom: 8,
              display: "block",
            }}
          >
            운동 제목 <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 맥켄지 신전 운동"
            style={inputBase}
          />
        </div>

        {/* 통증 부위 */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#475569",
              marginBottom: 8,
              display: "block",
            }}
          >
            통증 부위 <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <select
            value={bodyPartId}
            onChange={(e) => setBodyPartId(e.target.value)}
            style={inputBase}
          >
            <option value="">부위를 선택하세요</option>
            {bodyParts.map((bp) => (
              <option key={bp.id} value={bp.id}>
                {bp.name}
              </option>
            ))}
          </select>
        </div>

        {/* 단계 선택 */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#475569",
              marginBottom: 8,
              display: "block",
            }}
          >
            단계 <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {([1, 2, 3] as ExerciseLevel[]).map((lv) => {
              const isActive = level === lv;
              const activeStyle = LEVEL_SELECTED[lv];
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setLevel(lv)}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "10px 0",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    backgroundColor: isActive ? activeStyle.bg : "#f8fafc",
                    color: isActive ? activeStyle.color : "#94a3b8",
                    transition: "all 0.2s",
                  }}
                >
                  {lv}단계
                </button>
              );
            })}
          </div>
        </div>

        {/* 설명 */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#475569",
              marginBottom: 8,
              display: "block",
            }}
          >
            설명 / 주의사항
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="운동 방법이나 주의사항을 입력하세요"
            rows={3}
            style={{
              ...inputBase,
              height: 100,
              paddingTop: 12,
              resize: "none",
            }}
          />
        </div>

        {/* 콘텐츠 타입 탭 */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#475569",
              marginBottom: 8,
              display: "block",
            }}
          >
            콘텐츠 타입
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setContentType("video")}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 0",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  contentType === "video" ? "#0EA5E9" : "#f1f5f9",
                color: contentType === "video" ? "#fff" : "#64748b",
                transition: "all 0.2s",
              }}
            >
              영상 (유튜브)
            </button>
            <button
              type="button"
              onClick={() => setContentType("leaflet")}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 0",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  contentType === "leaflet" ? "#0EA5E9" : "#f1f5f9",
                color: contentType === "leaflet" ? "#fff" : "#64748b",
                transition: "all 0.2s",
              }}
            >
              리플렛 (이미지)
            </button>
          </div>
        </div>

        {/* Video URL */}
        {contentType === "video" && (
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 8,
                display: "block",
              }}
            >
              유튜브 URL <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              style={inputBase}
            />
            {thumbnail && (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #e0f2fe",
                }}
              >
                <img
                  src={thumbnail}
                  alt="미리보기"
                  style={{
                    width: "100%",
                    aspectRatio: "16/9",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Leaflet */}
        {contentType === "leaflet" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: 8,
                  display: "block",
                }}
              >
                리플렛 이미지
              </label>
              {leafletImages.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {leafletImages.map((url, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img
                        src={url}
                        alt={`리플렛 ${i + 1}`}
                        style={{
                          width: "100%",
                          aspectRatio: "1",
                          objectFit: "cover",
                          borderRadius: 10,
                          border: "1px solid #e0f2fe",
                          display: "block",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          backgroundColor: "rgba(0,0,0,0.6)",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 52,
                  border: "1.5px dashed #cbd5e1",
                  borderRadius: 14,
                  fontSize: 13,
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                📎 {uploading ? "업로드 중..." : "이미지 추가"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: 8,
                  display: "block",
                }}
              >
                리플렛 텍스트 설명
              </label>
              <textarea
                value={leafletText}
                onChange={(e) => setLeafletText(e.target.value)}
                placeholder="리플렛에 대한 추가 설명을 입력하세요"
                rows={3}
                style={{
                  ...inputBase,
                  height: 100,
                  paddingTop: 12,
                  resize: "none",
                }}
              />
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <p
            style={{
              fontSize: 13,
              color: "#ef4444",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {error}
          </p>
        )}

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          style={{
            width: "100%",
            height: 52,
            background: "linear-gradient(135deg, #38bdf8, #0ea5e9, #0284c7)",
            color: "#ffffff",
            border: "none",
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 800,
            cursor: isPending ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(14,165,233,0.3)",
            marginTop: 8,
            opacity: isPending ? 0.5 : 1,
          }}
        >
          {isPending ? "저장 중..." : isEdit ? "수정 완료" : "등록하기"}
        </button>

        {/* 비활성화 버튼 */}
        {isEdit && (
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={isPending}
            style={{
              width: "100%",
              height: 48,
              backgroundColor: "#ffffff",
              border: "1.5px solid #e2e8f0",
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 600,
              color: "#94a3b8",
              cursor: isPending ? "not-allowed" : "pointer",
              marginTop: 10,
              opacity: isPending ? 0.5 : 1,
            }}
          >
            {exercise.is_active ? "비활성화" : "다시 활성화"}
          </button>
        )}
      </div>
    </div>
  );
}
