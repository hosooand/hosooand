import { requireStaff } from "@/lib/auth/dashboard";
import PatientListClient from "./PatientListClient";

const PATIENT_SELECT =
  "id, name, member_number, avatar, created_at, prescriptions(status)";

export default async function RehabManagePage() {
  const { supabase } = await requireStaff();

  const { data: rows, error } = await supabase
    .from("profiles")
    .select(PATIENT_SELECT)
    .eq("role", "member")
    .order("created_at", { ascending: false })
    .limit(100);

  type RowWithRx = {
    id: string;
    name: string | null;
    member_number: string | null;
    prescriptions?: { status: string }[] | null;
  };

  let patientsWithStatus: {
    id: string;
    name: string | null;
    member_number: string | null;
    has_prescription: boolean;
  }[] = [];

  if (!error && rows) {
    patientsWithStatus = (rows as RowWithRx[]).map((p) => ({
      id: p.id,
      name: p.name || null,
      member_number: p.member_number || null,
      has_prescription: (p.prescriptions ?? []).some(
        (rx) => rx.status === "active"
      ),
    }));
  } else {
    const { data: fallback } = await supabase
      .from("profiles")
      .select("id, name, member_number, avatar, created_at")
      .eq("role", "member")
      .order("created_at", { ascending: false })
      .limit(100);
    const list = fallback ?? [];
    let activePrescriptionIds = new Set<string>();
    if (list.length > 0) {
      const ids = list.map((p) => p.id);
      const { data: prescriptions } = await supabase
        .from("prescriptions")
        .select("patient_id")
        .in("patient_id", ids)
        .eq("status", "active");
      activePrescriptionIds = new Set(
        (prescriptions ?? []).map((r) => r.patient_id)
      );
    }
    patientsWithStatus = list.map((p) => ({
      id: p.id,
      name: p.name || null,
      member_number: p.member_number || null,
      has_prescription: activePrescriptionIds.has(p.id),
    }));
  }

  return <PatientListClient patients={patientsWithStatus} />;
}
