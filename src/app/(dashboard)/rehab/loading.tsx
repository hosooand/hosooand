export default function Loading() {
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
        <div
          className="skeleton-block"
          style={{ width: 220, height: 26, borderRadius: 8 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 160, height: 14, borderRadius: 6, marginTop: 8 }}
        />
      </div>

      {/* (b) 퀵 액션 카드 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 100, borderRadius: 20 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 100, borderRadius: 20 }}
        />
      </div>

      {/* (c) 예약/문의 배너 */}
      <div
        className="skeleton-block"
        style={{ height: 64, borderRadius: 16, marginBottom: 16 }}
      />

      {/* (d) 마스코트 말풍선 */}
      <div
        className="skeleton-block"
        style={{ height: 76, borderRadius: 20, marginBottom: 16 }}
      />

      {/* (e) 통계 카드 3개 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 84, borderRadius: 16 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 84, borderRadius: 16 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 84, borderRadius: 16 }}
        />
      </div>

      {/* 처방 운동 카드 */}
      <div
        className="skeleton-block"
        style={{ height: 220, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 주간 차트 */}
      <div className="skeleton-block" style={{ height: 220, borderRadius: 20 }} />
    </div>
  );
}
