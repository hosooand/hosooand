"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  Upload,
  User,
  Dumbbell,
  Image,
} from "lucide-react";
import type { UserRole } from "@/types/rehab";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
}

const MEMBER_NAV: NavItem[] = [
  { href: "/rehab", label: "홈", icon: Home },
  { href: "/rehab/history", label: "기록", icon: Image },
  { href: "/rehab/mypage", label: "마이", icon: User },
];

const STAFF_NAV: NavItem[] = [
  { href: "/rehab-manage", label: "환자관리", icon: ClipboardList },
  { href: "/rehab-manage/exercises", label: "운동관리", icon: Dumbbell },
  { href: "/rehab-manage/upload", label: "사진업로드", icon: Upload },
  { href: "/rehab/mypage", label: "마이", icon: User },
];

export default function RehabBottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const navItems = role === "member" ? MEMBER_NAV : STAFF_NAV;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-sky-100">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-around h-[56px] pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/rehab/mypage" &&
              item.href !== "/rehab" &&
              item.href !== "/rehab-manage" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-colors ${
                isActive
                  ? "text-sky-500"
                  : "text-slate-400"
              }`}
            >
              <Icon size={22} className={isActive ? "text-sky-500" : "text-slate-400"} />
              <span className={`text-[9px] ${isActive ? "font-bold" : "font-semibold"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
