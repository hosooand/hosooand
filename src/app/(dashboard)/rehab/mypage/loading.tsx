export default function Loading() {
  return (
    <div
      style={{
        background: "#f0f9ff",
        padding: "24px 16px 120px 16px",
        minHeight: "100vh",
      }}
    >
      {/* 뒤로가기 */}
      <div
        className="skeleton-block"
        style={{ width: 96, height: 16, borderRadius: 6, marginBottom: 16 }}
      />

      {/* 제목 */}
      <div style={{ marginBottom: 20 }}>
        <div
          className="skeleton-block"
          style={{ width: 120, height: 24, borderRadius: 8 }}
        />
        <div
          className="skeleton-block"
          style={{ width: 180, height: 14, borderRadius: 6, marginTop: 8 }}
        />
      </div>

      {/* 권한 카드 */}
      <div
        className="skeleton-block"
        style={{ height: 72, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 아바타 카드 */}
      <div
        className="skeleton-block"
        style={{ height: 180, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 기본 정보 카드 */}
      <div
        className="skeleton-block"
        style={{ height: 260, borderRadius: 20, marginBottom: 16 }}
      />

      {/* 저장 버튼 */}
      <div
        className="skeleton-block"
        style={{ height: 52, borderRadius: 12 }}
      />
    </div>
  );
}
