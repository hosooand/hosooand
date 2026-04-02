"use client";

import type { BodyPart } from "@/types/rehab";

interface BodyPartFilterProps {
  bodyParts: BodyPart[];
  selected: string;
  onChange: (id: string) => void;
}

export default function BodyPartFilter({
  bodyParts,
  selected,
  onChange,
}: BodyPartFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        type="button"
        onClick={() => onChange("")}
        className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold border transition-all ${
          selected === ""
            ? "bg-sky-500 text-white border-sky-500 shadow-sm"
            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
        }`}
      >
        전체
      </button>
      {bodyParts.map((bp) => (
        <button
          key={bp.id}
          type="button"
          onClick={() => onChange(bp.id)}
          className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold border transition-all ${
            selected === bp.id
              ? "bg-sky-500 text-white border-sky-500 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          {bp.name}
        </button>
      ))}
    </div>
  );
}
