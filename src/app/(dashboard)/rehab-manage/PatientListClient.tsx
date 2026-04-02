"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/shared/EmptyState";

interface Patient {
  id: string;
  name: string | null;
  member_number: string | null;
  has_prescription: boolean;
}

export default function PatientListClient({
  patients,
}: {
  patients: Patient[];
}) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setInputValue(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
      searchTimerRef.current = null;
    }, 300);
  };

  const filtered = patients.filter((p) => {
    if (!debouncedQuery.trim()) return true;
    const q = debouncedQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.member_number && p.member_number.toLowerCase().includes(q))
    );
  });

  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "28px 20px 120px 20px",
        minHeight: "100vh",
      }}
    >
      {/* (a) 헤더 */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "#0f172a",
          margin: 0,
        }}
      >
        환자 관리
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#94a3b8",
          marginTop: 4,
          marginBottom: 20,
        }}
      >
        총 {patients.length}명의 환자
      </p>

      {/* (b) 검색 바 */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 16,
            color: "#94a3b8",
          }}
        >
          🔍
        </span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="이름 또는 회원번호 검색"
          style={{
            width: "100%",
            height: 52,
            paddingLeft: 48,
            paddingRight: 16,
            backgroundColor: "#ffffff",
            border: "1.5px solid #e0f2fe",
            borderRadius: 16,
            fontSize: 14,
            color: "#0f172a",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* (c) 환자 카드 리스트 */}
      {filtered.length > 0 ? (
        <div>
          {filtered.map((patient) => (
            <div
              key={patient.id}
              onClick={() => router.push(`/rehab-manage/${patient.id}`)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 18px",
                backgroundColor: "#ffffff",
                borderRadius: 20,
                border: "1px solid #e0f2fe",
                boxShadow: "0 2px 12px rgba(14,165,233,0.06)",
                cursor: "pointer",
                transition: "all 0.2s",
                marginBottom: 12,
              }}
            >
              {/* 아바타 이니셜 */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  backgroundColor: "#e0f2fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0369a1",
                  flexShrink: 0,
                }}
              >
                {(patient.name || "?").charAt(0)}
              </div>

              {/* 중앙 정보 */}
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
                  {patient.name || "이름 없음"}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    margin: 0,
                    marginTop: 2,
                  }}
                >
                  {patient.member_number
                    ? `#${patient.member_number.padStart(4, "0")}`
                    : "(번호 미지정)"}
                </p>
              </div>

              {/* 처방 상태 뱃지 */}
              <span
                style={{
                  marginLeft: "auto",
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  ...(patient.has_prescription
                    ? {
                        backgroundColor: "#e0f2fe",
                        color: "#0369a1",
                        border: "1px solid #bae6fd",
                      }
                    : {
                        backgroundColor: "#f8fafc",
                        color: "#94a3b8",
                        border: "1px solid #e2e8f0",
                      }),
                }}
              >
                {patient.has_prescription ? "처방중" : "미처방"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ paddingTop: 80 }}>
          <EmptyState
            icon="👥"
            title={
              debouncedQuery.trim()
                ? "검색 결과가 없습니다"
                : "등록된 환자가 없습니다"
            }
            description={
              debouncedQuery.trim()
                ? "다른 이름으로 검색해 보세요."
                : "환자가 회원가입하면 이곳에 표시됩니다."
            }
          />
        </div>
      )}
    </div>
  );
}
