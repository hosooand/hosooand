"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import RehabBottomNav from "./RehabBottomNav";
import type { UserRole } from "@/types/rehab";

function isRehabRoute(pathname: string) {
  if (!pathname) return false;
  if (pathname.startsWith("/rehab-manage")) return true;
  return /^\/rehab(\/|$)/.test(pathname);
}

function normalizeRole(role: string): UserRole {
  const r = (role ?? "member").toLowerCase();
  if (r === "member") return "member";
  if (r === "admin") return "admin";
  return "staff";
}

export default function NavWrapper({
  role,
  showAdminNav,
}: {
  role: string;
  showAdminNav: boolean;
}) {
  const pathname = usePathname() ?? "";

  if (pathname.startsWith("/select-service")) return null;

  if (isRehabRoute(pathname)) {
    const r = normalizeRole(role);
    if (r === "member") {
      return <RehabBottomNav role="member" />;
    }
    return <RehabBottomNav role={r} />;
  }

  return <BottomNav role={role} showAdminNav={showAdminNav} />;
}
