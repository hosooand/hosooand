export default function Loading() {
  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "24px 20px 120px 20px",
        minHeight: "100vh",
      }}
    >
      {/* 헤더 */}
      <div style={{ paddingTop: 20, marginBottom: 20 }}>
        <div
          className="skeleton-block"
          style={{ width: 140, height: 24, borderRadius: 8 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 200, height: 14, borderRadius: 6, marginTop: 8 }}
        />
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 40, borderRadius: 12 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 40, borderRadius: 12 }}
        />
      </div>

      {/* 주간 캘린더 */}
      <div
        className="skeleton-block"
        style={{ height: 96, borderRadius: 16, marginBottom: 16 }}
      />

      {/* 일일 운동 기록 카드들 */}
      <div
        className="skeleton-block"
        style={{ height: 120, borderRadius: 16, marginBottom: 12 }}
      />
      <div
        className="skeleton-block"
        style={{ height: 120, borderRadius: 16, marginBottom: 12 }}
      />
      <div className="skeleton-block" style={{ height: 120, borderRadius: 16 }} />
    </div>
  );
}
