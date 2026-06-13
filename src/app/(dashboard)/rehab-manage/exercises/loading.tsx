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
          style={{ width: 180, height: 24, borderRadius: 8 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 220, height: 14, borderRadius: 6, marginTop: 8 }}
        />
      </div>

      {/* 부위 필터 칩 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-block"
            style={{ width: 80, height: 36, borderRadius: 18, flexShrink: 0 }}
          />
        ))}
      </div>

      {/* 단계 필터 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 36, borderRadius: 12 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 36, borderRadius: 12 }}
        />
        <div
          className="skeleton-block"
          style={{ flex: 1, height: 36, borderRadius: 12 }}
        />
      </div>

      {/* 운동 카드 리스트 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="skeleton-block"
          style={{ height: 88, borderRadius: 16, marginBottom: 10 }}
        />
      ))}
    </div>
  );
}
