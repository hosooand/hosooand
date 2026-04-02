"use client";

import type { ExerciseLevel } from "@/types/rehab";

interface LevelFilterProps {
  selected: ExerciseLevel | null;
  onChange: (level: ExerciseLevel | null) => void;
}

const LEVELS: {
  value: ExerciseLevel | null;
  label: string;
  activeClass: string;
}[] = [
  { value: null, label: "전체", activeClass: "bg-sky-500 text-white border-sky-500" },
  { value: 1, label: "1단계", activeClass: "bg-emerald-500 text-white border-emerald-500" },
  { value: 2, label: "2단계", activeClass: "bg-amber-500 text-white border-amber-500" },
  { value: 3, label: "3단계", activeClass: "bg-red-500 text-white border-red-500" },
];

export default function LevelFilter({ selected, onChange }: LevelFilterProps) {
  return (
    <div className="flex gap-2">
      {LEVELS.map((lv) => (
        <button
          key={lv.label}
          type="button"
          onClick={() => onChange(lv.value)}
          className={`px-4 py-2 rounded-full text-[12px] font-semibold border transition-all ${
            selected === lv.value
              ? `${lv.activeClass} shadow-sm`
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          {lv.label}
        </button>
      ))}
    </div>
  );
}
