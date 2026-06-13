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
          style={{ width: 160, height: 24, borderRadius: 8 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 200, height: 14, borderRadius: 6, marginTop: 8 }}
        />
      </div>

      {/* 검색 바 */}
      <div
        className="skeleton-block"
        style={{ height: 44, borderRadius: 12, marginBottom: 16 }}
      />

      {/* 환자 카드 리스트 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="skeleton-block"
          style={{ height: 80, borderRadius: 16, marginBottom: 10 }}
        />
      ))}
    </div>
  );
}
