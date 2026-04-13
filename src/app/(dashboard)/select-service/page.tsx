import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/auth/session-profile";
import SelectServiceClient from "./SelectServiceClient";

export default async function SelectServicePage() {
  const { user, profile } = await getDashboardSession();
  if (!user) redirect("/login");

  return (
    <SelectServiceClient
      profile={{
        name: profile?.name ?? "",
        role: profile?.role ?? "member",
      }}
    />
  );
}
