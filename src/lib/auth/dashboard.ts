import { getAuthProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireStaff() {
  const { user, profile, supabase } = await getAuthProfile();
  if (!user) redirect("/login");
  if (!profile || profile.role === "member") redirect("/rehab");
  return { supabase, user, profile };
}

export async function requireMember() {
  const { user, profile, supabase } = await getAuthProfile();
  if (!user) redirect("/login");
  if (!profile) redirect("/login");
  if (profile.role !== "member") redirect("/rehab-manage");
  return { supabase, user, profile };
}
