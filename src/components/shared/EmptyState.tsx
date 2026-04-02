"use client";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
        {icon}
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#334155", marginTop: 16 }}>{title}</p>
      {description && <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, textAlign: "center", lineHeight: 1.6 }}>{description}</p>}
    </div>
  );
}
