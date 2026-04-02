"use client";

import { Video, FileImage } from "lucide-react";
import type { Exercise, ExerciseLevel } from "@/types/rehab";

const LEVEL_STYLE: Record<ExerciseLevel, string> = {
  1: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  2: "bg-amber-50 text-amber-600 border border-amber-200",
  3: "bg-red-50 text-red-600 border border-red-200",
};

const LEVEL_LABEL: Record<ExerciseLevel, string> = {
  1: "1단계",
  2: "2단계",
  3: "3단계",
};

interface ExerciseCardProps {
  exercise: Exercise;
  onClick: (exercise: Exercise) => void;
}

export default function ExerciseCard({ exercise, onClick }: ExerciseCardProps) {
  const level = exercise.level as ExerciseLevel;

  return (
    <button
      type="button"
      onClick={() => onClick(exercise)}
      className="w-full text-left bg-white rounded-[20px] border border-sky-100 shadow-[0_2px_12px_rgba(14,165,233,0.06)] p-4 transition-all hover:border-sky-200 active:bg-sky-50/50"
    >
      <div className="flex items-center gap-2 mb-2.5">
        {exercise.content_type === "video" ? (
          <div className="w-7 h-7 bg-sky-100 rounded-[8px] flex items-center justify-center shrink-0">
            <Video size={14} className="text-sky-600" />
          </div>
        ) : (
          <div className="w-7 h-7 bg-sky-100 rounded-[8px] flex items-center justify-center shrink-0">
            <FileImage size={14} className="text-sky-600" />
          </div>
        )}
        <h3 className="text-[15px] font-bold text-slate-900 truncate flex-1">
          {exercise.title}
        </h3>
        {!exercise.is_active && (
          <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
            비활성
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {exercise.body_part && (
          <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            {exercise.body_part.name}
          </span>
        )}
        <span
          className={`text-[10px] font-semibold px-3 py-1 rounded-full ${LEVEL_STYLE[level]}`}
        >
          {LEVEL_LABEL[level]}
        </span>
      </div>

      {exercise.description && (
        <p className="mt-2.5 text-[12px] text-slate-500 line-clamp-2 leading-relaxed">
          {exercise.description}
        </p>
      )}
    </button>
  );
}
