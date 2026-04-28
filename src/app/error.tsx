"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f0f9ff",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>😢</div>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 8,
        }}
      >
        문제가 발생했어요
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "#94a3b8",
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        페이지를 새로고침해 주세요
      </p>
      <button
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          } else {
            reset();
          }
        }}
        style={{
          padding: "12px 32px",
          background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        새로고침
      </button>
    </div>
  );
}
