export default function SelectServiceLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-sky-50"
      style={{ background: "#f0f9ff" }}
    >
      <div
        className="select-service-route-spinner"
        style={{
          width: 32,
          height: 32,
          border: "3px solid #e0f2fe",
          borderTop: "3px solid #0EA5E9",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
