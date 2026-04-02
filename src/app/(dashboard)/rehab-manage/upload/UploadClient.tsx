"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import type { MedicalImage, ImageType } from "@/types/rehab";
import { IMAGE_TYPE_LABELS } from "@/types/rehab";
import type { MemberSearchRow } from "@/lib/rehab/actions";
import {
  uploadMedicalImage,
  deleteMedicalImage,
  getMedicalImages,
  searchMembersForUpload,
} from "@/lib/rehab/actions";

const IMAGE_TYPES: { key: ImageType; label: string }[] = [
  { key: "xray", label: "엑스레이" },
  { key: "xbody", label: "엑스바디" },
  { key: "other", label: "기타" },
];

const TYPE_BADGE: Record<ImageType, { bg: string; color: string }> = {
  xray: { bg: "#e0f2fe", color: "#0369a1" },
  xbody: { bg: "#ecfdf5", color: "#059669" },
  other: { bg: "#f8fafc", color: "#64748b" },
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 20,
  border: "1px solid #e0f2fe",
  boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
  padding: 24,
  marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
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
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
  marginBottom: 8,
  display: "block",
};

interface Props {
  initialPatient: MemberSearchRow | null;
  initialPatientId: string;
  initialImages: MedicalImage[];
}

export default function UploadClient({
  initialPatient,
  initialPatientId,
  initialImages,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  const patientLabelDisplay = (p: {
    name: string | null;
    member_number: string | null;
  }) => {
    const name = p.name || "이름 없음";
    if (p.member_number) {
      return `${name} (#${p.member_number.padStart(4, "0")})`;
    }
    return `${name} (번호 미지정)`;
  };

  const [patientId, setPatientId] = useState(initialPatientId);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState(() =>
    initialPatient ? patientLabelDisplay(initialPatient) : ""
  );
  const [selectedLabel, setSelectedLabel] = useState(() =>
    initialPatient &&
    initialPatientId &&
    initialPatient.id === initialPatientId
      ? patientLabelDisplay(initialPatient)
      : ""
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<MemberSearchRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageType, setImageType] = useState<ImageType>("xray");
  const [takenAt, setTakenAt] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");

  const [images, setImages] = useState<MedicalImage[]>(initialImages);

  const loadImagesForPatient = (newPatientId: string) => {
    if (!newPatientId) {
      setImages([]);
      return;
    }
    startTransition(async () => {
      try {
        const imgs = await getMedicalImages(newPatientId);
        setImages(imgs);
      } catch {
        setImages([]);
      }
    });
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(patientQuery), 300);
    return () => clearTimeout(t);
  }, [patientQuery]);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (q.length < 1) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    if (
      patientId &&
      selectedLabel &&
      debouncedSearch.trim() === selectedLabel.trim()
    ) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    searchMembersForUpload(q)
      .then((rows) => {
        if (!cancelled) setSearchResults(rows);
      })
      .catch(() => {
        if (!cancelled) setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, patientId, selectedLabel]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setPatientSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectPatient = (p: MemberSearchRow) => {
    const label = patientLabelDisplay(p);
    setPatientId(p.id);
    setPatientQuery(label);
    setSelectedLabel(label);
    setPatientSearchOpen(false);
    loadImagesForPatient(p.id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageType("xray");
    setTakenAt(new Date().toISOString().split("T")[0]);
    setDescription("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = () => {
    if (!selectedFile || !patientId) return;
    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("patientId", patientId);
    fd.append("imageType", imageType);
    fd.append("takenAt", takenAt);
    fd.append("description", description);

    startTransition(async () => {
      try {
        const created = await uploadMedicalImage(fd);
        setImages((prev) => [created, ...prev]);
        resetForm();
      } catch {
        alert("업로드에 실패했습니다.");
      }
    });
  };

  const handleDelete = (imageId: string) => {
    if (!confirm("이 사진을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      try {
        await deleteMedicalImage(imageId);
        setImages((prev) => prev.filter((img) => img.id !== imageId));
      } catch {
        alert("삭제에 실패했습니다.");
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
      {/* 헤더 */}
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>
        사진 업로드
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#94a3b8",
          marginTop: 4,
          marginBottom: 24,
        }}
      >
        환자 영상기록을 업로드합니다
      </p>

      {/* (a) 환자 검색 선택 */}
      <div style={cardStyle}>
        <label style={labelStyle}>환자 선택</label>
        <div ref={searchWrapRef} style={{ position: "relative", marginBottom: 20 }}>
          <span
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 16,
              pointerEvents: "none",
              zIndex: 1,
            }}
            aria-hidden
          >
            🔍
          </span>
          <input
            type="text"
            value={patientQuery}
            onChange={(e) => {
              setPatientQuery(e.target.value);
              setPatientId("");
              setSelectedLabel("");
              setImages([]);
              setPatientSearchOpen(true);
            }}
            onFocus={() => setPatientSearchOpen(true)}
            placeholder="환자 이름 또는 회원번호 검색"
            style={{
              width: "100%",
              height: 50,
              paddingLeft: 48,
              paddingRight: 16,
              backgroundColor: "#f8fafc",
              border: "1.5px solid #e2e8f0",
              borderRadius: 12,
              fontSize: 14,
              color: "#0f172a",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {patientSearchOpen && (
            <div
              style={{
                position: "absolute",
                top: 54,
                left: 0,
                right: 0,
                backgroundColor: "#ffffff",
                borderRadius: 12,
                border: "1.5px solid #e0f2fe",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                maxHeight: 240,
                overflowY: "auto",
                zIndex: 50,
              }}
            >
              {patientQuery.trim().length < 1 ? (
                <div
                  style={{
                    padding: "14px 16px",
                    fontSize: 13,
                    color: "#94a3b8",
                  }}
                >
                  이름 또는 회원번호를 입력하세요
                </div>
              ) : patientId &&
                selectedLabel &&
                patientQuery.trim() === selectedLabel.trim() ? (
                <div
                  style={{
                    padding: "14px 16px",
                    fontSize: 13,
                    color: "#94a3b8",
                  }}
                >
                  다른 환자를 찾으려면 검색어를 수정하세요
                </div>
              ) : searchLoading ? (
                <div
                  style={{
                    padding: "14px 16px",
                    fontSize: 13,
                    color: "#94a3b8",
                  }}
                >
                  검색 중…
                </div>
              ) : searchResults.length === 0 ? (
                <div
                  style={{
                    padding: "14px 16px",
                    fontSize: 13,
                    color: "#94a3b8",
                  }}
                >
                  검색 결과가 없습니다
                </div>
              ) : (
                searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectPatient(p)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "12px 16px",
                      border: "none",
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0f9ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#0f172a",
                      }}
                    >
                      {p.name || "이름 없음"}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#94a3b8",
                        marginLeft: 8,
                      }}
                    >
                      {p.member_number
                        ? `#${p.member_number.padStart(4, "0")}`
                        : "(번호 미지정)"}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* (b) 업로드 영역 — 환자 선택 후 */}
      {patientId && (
        <>
          {/* 파일 선택 영역 */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              border: "2px dashed #bae6fd",
              padding: selectedFile ? "24px 20px" : "48px 20px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 16,
              transition: "all 0.2s",
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="미리보기"
                style={{
                  maxWidth: "100%",
                  maxHeight: 200,
                  borderRadius: 12,
                  objectFit: "contain",
                  margin: "0 auto 12px",
                  display: "block",
                }}
              />
            ) : (
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
                <span style={{ fontSize: 28 }}>📤</span>
              </div>
            )}
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#334155",
                margin: 0,
              }}
            >
              {selectedFile ? selectedFile.name : "사진을 선택하거나 드래그하세요"}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "#94a3b8",
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              JPG, PNG 파일 (최대 10MB)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          {/* 업로드 폼 — 파일 선택 후 */}
          {selectedFile && (
            <div style={cardStyle}>
              {/* 이미지 타입 */}
              <label style={labelStyle}>이미지 타입</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {IMAGE_TYPES.map((t) => {
                  const isActive = imageType === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setImageType(t.key)}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: "10px 0",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        border: isActive ? "none" : "1.5px solid #e2e8f0",
                        backgroundColor: isActive ? "#0EA5E9" : "#f8fafc",
                        color: isActive ? "#fff" : "#94a3b8",
                        transition: "all 0.2s",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* 촬영 날짜 */}
              <label style={labelStyle}>촬영 날짜</label>
              <input
                type="date"
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
                style={inputStyle}
              />

              {/* 설명 */}
              <label style={labelStyle}>설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="사진에 대한 설명을 입력하세요 (선택)"
                style={{
                  width: "100%",
                  height: 80,
                  padding: "12px 16px",
                  backgroundColor: "#f8fafc",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 14,
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                  resize: "none",
                  marginBottom: 20,
                }}
              />

              {/* 업로드 버튼 */}
              <button
                type="button"
                onClick={handleUpload}
                disabled={isPending}
                style={{
                  width: "100%",
                  height: 52,
                  background:
                    "linear-gradient(135deg, #38bdf8, #0ea5e9, #0284c7)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: isPending ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(14,165,233,0.3)",
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                {isPending ? "업로드 중..." : "업로드하기"}
              </button>
            </div>
          )}

          {/* (c) 히스토리 */}
          {images.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                업로드 기록
              </p>
              {images.map((img) => {
                const badge = TYPE_BADGE[img.image_type] || TYPE_BADGE.other;
                return (
                  <div
                    key={img.id}
                    style={{
                      ...cardStyle,
                      padding: 14,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 10,
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
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {IMAGE_TYPES.find((t) => t.key === img.image_type)
                            ?.label ||
                            IMAGE_TYPE_LABELS[img.image_type] ||
                            img.image_type}
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
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          margin: 0,
                        }}
                      >
                        {img.taken_at}
                        {img.description ? ` · ${img.description}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(img.id)}
                      disabled={isPending}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        backgroundColor: "#fef2f2",
                        border: "none",
                        cursor: isPending ? "not-allowed" : "pointer",
                        fontSize: 14,
                        color: "#dc2626",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
