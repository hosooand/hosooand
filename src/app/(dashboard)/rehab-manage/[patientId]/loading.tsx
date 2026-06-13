export default function Loading() {
  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "24px 20px 120px 20px",
        minHeight: "100vh",
      }}
    >
      {/* 환자 정보 헤더 */}
      <div style={{ paddingTop: 8, marginBottom: 20 }}>
        <div
          className="skeleton-block"
          style={{ width: 80, height: 14, borderRadius: 6, marginBottom: 8 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 180, height: 26, borderRadius: 8 }}
        />
      </div>

      {/* 통계 카드 */}
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

      {/* 처방 정보 */}
      <div
        className="skeleton-block"
        style={{ height: 200, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 차트 */}
      <div
        className="skeleton-block"
        style={{ height: 240, borderRadius: 20, marginBottom: 16 }}
      />
      <div
        className="skeleton-block"
        style={{ height: 240, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 의료 이미지 */}
      <div className="skeleton-block" style={{ height: 180, borderRadius: 20 }} />
    </div>
  );
}
