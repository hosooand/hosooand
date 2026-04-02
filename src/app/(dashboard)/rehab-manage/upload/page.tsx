import { requireStaff } from "@/lib/auth/dashboard";
import { getMedicalImages } from "@/lib/rehab/actions";
import UploadClient from "./UploadClient";
import type { MedicalImage } from "@/types/rehab";
import type { MemberSearchRow } from "@/lib/rehab/actions";

interface Props {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function UploadPage({ searchParams }: Props) {
  const { patientId: initialPatientId } = await searchParams;
  const { supabase } = await requireStaff();

  let initialPatient: MemberSearchRow | null = null;
  if (initialPatientId) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, member_number")
      .eq("id", initialPatientId)
      .eq("role", "member")
      .maybeSingle();
    initialPatient = data as MemberSearchRow | null;
  }

  let initialImages: MedicalImage[] = [];
  if (initialPatientId) {
    try {
      initialImages = await getMedicalImages(initialPatientId, { limit: 80 });
    } catch {
      // table may not exist
    }
  }

  return (
    <UploadClient
      initialPatient={initialPatient}
      initialPatientId={initialPatientId || ""}
      initialImages={initialImages}
    />
  );
}
