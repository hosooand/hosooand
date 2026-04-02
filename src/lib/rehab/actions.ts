"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  toDateOnlyString,
  normalizeDateOnlyInput,
  addDaysDateOnly,
  weekRangeFromDate,
} from "@/lib/rehab/date-only";
import type {
  Exercise,
  BodyPart,
  ExerciseLevel,
  Prescription,
  ExerciseLog,
  MedicalImage,
} from "@/types/rehab";
import type { AvatarKey } from "@/lib/avatar";

const KNOWN_USER_ERRORS = new Set([
  "인증이 필요합니다.",
  "파일이 없습니다.",
  "필수 항목이 누락되었습니다.",
  "회원번호 저장 실패",
  "회원번호를 저장할 수 없습니다. 권한을 확인해주세요.",
]);

function actionFail(context: string, err: unknown): never {
  console.error(`[rehab] ${context}`, err);
  throw new Error(`${context}에 실패했습니다. 잠시 후 다시 시도해주세요.`);
}

async function withError<T>(
  context: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Error && KNOWN_USER_ERRORS.has(e.message)) throw e;
    actionFail(context, e);
  }
}

export async function getBodyParts(): Promise<BodyPart[]> {
  return withError("부위 목록 조회", async () => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("body_parts")
      .select("id, name, category, display_order")
      .order("display_order");

    if (error) throw error;
    return data ?? [];
  });
}

export async function getExercises(
  bodyPartId?: string,
  level?: ExerciseLevel
): Promise<Exercise[]> {
  return withError("운동 목록 조회", async () => {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("exercises")
      .select("*, body_part:body_parts(*)")
      .order("created_at", { ascending: false });

    if (bodyPartId) {
      query = query.eq("body_part_id", bodyPartId);
    }
    if (level) {
      query = query.eq("level", level);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  });
}

interface CreateExerciseInput {
  title: string;
  description?: string;
  body_part_id: string;
  content_type: "video" | "leaflet";
  video_url?: string;
  leaflet_images?: string[];
  leaflet_text?: string;
  level: ExerciseLevel;
}

export async function createExercise(input: CreateExerciseInput) {
  return withError("운동 등록", async () => {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("인증이 필요합니다.");

    const { data, error } = await supabase
      .from("exercises")
      .insert({
        title: input.title,
        description: input.description || null,
        body_part_id: input.body_part_id,
        content_type: input.content_type,
        video_url: input.content_type === "video" ? input.video_url || null : null,
        leaflet_images:
          input.content_type === "leaflet" ? input.leaflet_images || null : null,
        leaflet_text:
          input.content_type === "leaflet" ? input.leaflet_text || null : null,
        level: input.level,
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

interface UpdateExerciseInput {
  title: string;
  description?: string;
  body_part_id: string;
  content_type: "video" | "leaflet";
  video_url?: string;
  leaflet_images?: string[];
  leaflet_text?: string;
  level: ExerciseLevel;
}

export async function updateExercise(id: string, input: UpdateExerciseInput) {
  return withError("운동 수정", async () => {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("exercises")
      .update({
        title: input.title,
        description: input.description || null,
        body_part_id: input.body_part_id,
        content_type: input.content_type,
        video_url: input.content_type === "video" ? input.video_url || null : null,
        leaflet_images:
          input.content_type === "leaflet" ? input.leaflet_images || null : null,
        leaflet_text:
          input.content_type === "leaflet" ? input.leaflet_text || null : null,
        level: input.level,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

export async function toggleExerciseActive(id: string, isActive: boolean) {
  return withError("운동 활성 상태 변경", async () => {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("exercises")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  });
}

export async function uploadLeafletImage(formData: FormData): Promise<string> {
  return withError("리플렛 이미지 업로드", async () => {
    const supabase = await createServerSupabaseClient();
    const file = formData.get("file") as File;

    if (!file) throw new Error("파일이 없습니다.");

    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `leaflets/${fileName}`;

    const { error } = await supabase.storage
      .from("exercise-leaflets")
      .upload(filePath, file);

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("exercise-leaflets").getPublicUrl(filePath);

    return publicUrl;
  });
}

export async function updateAvatar(avatar: AvatarKey) {
  return withError("아바타 저장", async () => {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("인증이 필요합니다.");

    const { error } = await supabase
      .from("profiles")
      .update({ avatar })
      .eq("id", user.id);

    if (error) throw error;
  });
}

export interface UpdateMyProfileInput {
  name: string | null;
  height: number | null;
  current_weight: number | null;
  avatar: AvatarKey;
}

export async function updateMyProfile(input: UpdateMyProfileInput) {
  return withError("프로필 저장", async () => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("인증이 필요합니다.");

    const { error } = await supabase
      .from("profiles")
      .update({
        name: input.name,
        height: input.height,
        current_weight: input.current_weight,
        avatar: input.avatar,
      })
      .eq("id", user.id);

    if (error) throw error;
  });
}

/** 치료사/관리자: 환자 회원번호 지정·수정 */
export async function updateMemberNumber(
  patientId: string,
  memberNumber: string | null
): Promise<{ success: true }> {
  return withError("회원번호 저장", async () => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("인증이 필요합니다.");

    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (meErr) throw meErr;
    if (!me || me.role === "member") {
      throw new Error("인증이 필요합니다.");
    }

    const trimmed =
      memberNumber == null || memberNumber.trim() === ""
        ? null
        : memberNumber.trim();

    console.log("회원번호 저장:", { patientId, memberNumber: trimmed });

    const { data, error } = await supabase
      .from("profiles")
      .update({ member_number: trimmed })
      .eq("id", patientId)
      .select("id, member_number");

    const result = { data, error };
    console.log("저장 결과:", result);

    if (error) throw new Error("회원번호 저장 실패");
    if (!data || data.length === 0) {
      throw new Error(
        "회원번호를 저장할 수 없습니다. 권한을 확인해주세요."
      );
    }

    return { success: true };
  });
}

// ─── 처방 관련 ───

export interface CreatePrescriptionInput {
  patient_id: string;
  body_part_ids: string[];
  /** 부위별 독립 단계 (미지정 시 1단계로 간주) */
  levelByBodyPart: Record<string, ExerciseLevel>;
  /** 부위별 선택 운동 id (순서는 body_part_ids 순, 각 부위 내 배열 순) */
  exercisesByBodyPart: Record<string, string[]>;
  note?: string | null;
}

export async function createPrescription(input: CreatePrescriptionInput) {
  return withError("처방 등록", async () => {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("인증이 필요합니다.");

    if (input.body_part_ids.length === 0) {
      throw new Error("통증 부위를 선택해주세요.");
    }

    const { error: closeErr } = await supabase
      .from("prescriptions")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("patient_id", input.patient_id)
      .eq("status", "active");
    if (closeErr) throw closeErr;

    const levels = input.body_part_ids.map(
      (id) => input.levelByBodyPart[id] ?? 1
    );
    const minLevel = Math.min(...levels) as ExerciseLevel;

    const { data: prescription, error: pErr } = await supabase
      .from("prescriptions")
      .insert({
        patient_id: input.patient_id,
        staff_id: user.id,
        body_part_ids: input.body_part_ids,
        current_level: minLevel,
        note: input.note?.trim() ? input.note.trim() : null,
        status: "active",
      })
      .select()
      .single();

    if (pErr || !prescription) throw pErr ?? new Error("처방 생성 실패");

    const allExercises: {
      prescription_id: string;
      exercise_id: string;
      display_order: number;
    }[] = [];
    let order = 1;
    for (const bodyPartId of input.body_part_ids) {
      const exerciseIds = input.exercisesByBodyPart[bodyPartId] ?? [];
      for (const exerciseId of exerciseIds) {
        allExercises.push({
          prescription_id: prescription.id,
          exercise_id: exerciseId,
          display_order: order++,
        });
      }
    }

    if (allExercises.length > 0) {
      const { error: peErr } = await supabase
        .from("prescription_exercises")
        .insert(allExercises);
      if (peErr) {
        await supabase.from("prescriptions").delete().eq("id", prescription.id);
        throw peErr;
      }
    }

    return prescription;
  });
}

export async function getPrescriptionByPatient(
  patientId: string
): Promise<Prescription | null> {
  return withError("처방 조회", async () => {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("prescriptions")
      .select(
        "id, patient_id, staff_id, body_part_ids, current_level, note, status, created_at, updated_at"
      )
      .eq("patient_id", patientId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const { data: peData } = await supabase
      .from("prescription_exercises")
      .select(
        "display_order, exercise:exercises(id, title, content_type, level, body_part_id, video_url, leaflet_images, leaflet_text, body_part:body_parts(id, name))"
      )
      .eq("prescription_id", data.id)
      .order("display_order");

    const exercises = (peData ?? []).map((pe: any) => pe.exercise).filter(Boolean);

    return { ...data, exercises } as Prescription;
  });
}

export async function updatePrescriptionLevel(
  prescriptionId: string,
  level: ExerciseLevel
) {
  return withError("처방 단계 변경", async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("prescriptions")
      .update({ current_level: level, updated_at: new Date().toISOString() })
      .eq("id", prescriptionId);
    if (error) throw error;
  });
}

export async function completePrescription(prescriptionId: string) {
  return withError("처방 종료", async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("prescriptions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", prescriptionId);
    if (error) throw error;
  });
}

export async function getExercisesByBodyParts(
  bodyPartIds: string[]
): Promise<Exercise[]> {
  if (bodyPartIds.length === 0) return [];
  return withError("부위별 운동 조회", async () => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("exercises")
      .select("*, body_part:body_parts(*)")
      .in("body_part_id", bodyPartIds)
      .eq("is_active", true)
      .order("title");
    if (error) throw error;
    return data ?? [];
  });
}

// ─── 운동 기록 관련 ───

interface CreateExerciseLogInput {
  prescription_id: string;
  exercise_id: string;
  pain_level: number;
  exercise_count: number;
  performed_at?: string;
  memo?: string;
}

export async function createExerciseLog(input: CreateExerciseLogInput) {
  return withError("운동 기록 저장", async () => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("인증이 필요합니다.");

    const patientId = user.id;
    const prescriptionId = input.prescription_id;
    const exerciseId = input.exercise_id;
    const painLevel = input.pain_level;
    const exerciseCount = input.exercise_count;

    const date =
      input.performed_at?.trim() || new Date().toISOString().split("T")[0];
    const performedAt = new Date(date).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("exercise_logs")
      .upsert(
        {
          patient_id: patientId,
          prescription_id: prescriptionId,
          exercise_id: exerciseId,
          performed_at: performedAt,
          completed: true,
          pain_level: painLevel,
          exercise_count: exerciseCount,
          memo: input.memo ?? null,
        },
        {
          onConflict: "patient_id,exercise_id,performed_at",
        }
      )
      .select("*, exercise:exercises(*, body_part:body_parts(*))")
      .single();

    if (error) throw error;
    return data;
  });
}

export async function updateExerciseLog(
  logId: string,
  painLevel: number,
  exerciseCount: number
) {
  return withError("운동 기록 수정", async () => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("인증이 필요합니다.");

    const { data, error } = await supabase
      .from("exercise_logs")
      .update({
        pain_level: painLevel,
        exercise_count: exerciseCount,
      })
      .eq("id", logId)
      .eq("patient_id", user.id)
      .select("*, exercise:exercises(*, body_part:body_parts(*))")
      .single();

    if (error) throw error;
    return data;
  });
}

export async function getExerciseLogs(
  patientId: string,
  startDate: string,
  endDate: string
): Promise<ExerciseLog[]> {
  return withError("운동 기록 조회", async () => {
    const supabase = await createServerSupabaseClient();
    const normStart = normalizeDateOnlyInput(startDate);
    const normEnd = normalizeDateOnlyInput(endDate);

    const { data, error } = await supabase
      .from("exercise_logs")
      .select("*, exercise:exercises(*, body_part:body_parts(*))")
      .eq("patient_id", patientId)
      .gte("performed_at", normStart)
      .lte("performed_at", normEnd)
      .order("performed_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as ExerciseLog[];
  });
}

export async function getTodayLogs(
  patientId: string
): Promise<ExerciseLog[]> {
  const today = toDateOnlyString(new Date());
  return getExerciseLogs(patientId, today, today);
}

export async function getWeeklyStats(patientId: string) {
  const todayStr = new Date().toLocaleDateString('en-CA')
  const { start: startDate, end: endDate } = weekRangeFromDate(todayStr)

  const logs = await getExerciseLogs(patientId, startDate, endDate);
  const uniqueDays = new Set(logs.map((l) => l.performed_at));

  const avgPain =
    logs.length > 0
      ? logs.reduce((s, l) => s + (l.pain_level ?? 0), 0) / logs.length
      : 0;
  const totalExerciseCount = logs.reduce(
    (s, l) => s + (l.exercise_count ?? 0),
    0
  );

  return {
    totalSessions: uniqueDays.size,
    avgPain: Math.round(avgPain * 10) / 10,
    totalExerciseCount,
    logs,
  };
}

// ─── 환자 목록 (처방 상태 포함) ───

export async function getPatientsWithPrescription() {
  return withError("환자 목록 조회", async () => {
    const supabase = await createServerSupabaseClient();

    const { data: rows, error: pErr } = await supabase
      .from("profiles")
      .select("id, name, member_number, created_at, prescriptions(status)")
      .eq("role", "member")
      .order("created_at", { ascending: false })
      .limit(100);

    if (pErr) throw pErr;
    const list = rows ?? [];

    return list.map((p: any) => ({
      id: p.id,
      name: p.name || null,
      member_number: p.member_number || null,
      has_prescription: (p.prescriptions ?? []).some(
        (rx: { status: string }) => rx.status === "active"
      ),
    }));
  });
}

export type MemberSearchRow = {
  id: string;
  name: string | null;
  member_number: string | null;
};

/** 사진 업로드 환자 검색 — 스태프만, debounce 후 호출 */
export async function searchMembersForUpload(
  query: string
): Promise<MemberSearchRow[]> {
  return withError("환자 검색", async () => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("인증이 필요합니다.");

    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (me?.role === "member") throw new Error("인증이 필요합니다.");

    const sanitized = query.trim().replace(/[%,_\\,]/g, "").slice(0, 80);
    if (!sanitized) return [];

    const esc = sanitized.replace(/"/g, '\\"');
    const pattern = `"%${esc}%"`;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, member_number")
      .eq("role", "member")
      .or(`name.ilike.${pattern},member_number.ilike.${pattern}`)
      .limit(40);

    if (error) throw error;
    return (data ?? []) as MemberSearchRow[];
  });
}

// ─── 주간 운동 기록 날짜 목록 ───

export async function getWeekLogDates(
  patientId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  return withError("운동 기록 날짜 조회", async () => {
    const supabase = await createServerSupabaseClient();
    const normStart = normalizeDateOnlyInput(startDate);
    const normEnd = normalizeDateOnlyInput(endDate);

    const { data, error } = await supabase
      .from("exercise_logs")
      .select("performed_at")
      .eq("patient_id", patientId)
      .gte("performed_at", normStart)
      .lte("performed_at", normEnd);

    if (error) throw error;
    const dates = new Set((data ?? []).map((d) => d.performed_at));
    return Array.from(dates);
  });
}

// ─── 차트용 통계 ───

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function getMondayAndSunday() {
  const todayStr = new Date().toLocaleDateString('en-CA')
  const { start: monday, end: sunday } = weekRangeFromDate(todayStr)
  return { monday, sunday }
}

export interface WeeklyChartData {
  day: string;
  date: string;
  totalCount: number;
  avgPain: number;
  exercisesDone: number;
}

export type ChartDays = 7 | 14;

function dateToMMDD(dateStr: string): string {
  const n = normalizeDateOnlyInput(dateStr);
  return `${n.slice(5, 7)}/${n.slice(8, 10)}`;
}

export async function getWeeklyExerciseLogs(
  patientId: string,
  days: ChartDays = 7
): Promise<WeeklyChartData[]> {
  if (days === 7) {
    const { monday, sunday } = getMondayAndSunday();
    const logs = await getExerciseLogs(patientId, monday, sunday);
    const result: WeeklyChartData[] = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = addDaysDateOnly(monday, i);
      const dayLogs = logs.filter((l) => l.performed_at === dateStr);
      const totalCount = dayLogs.reduce(
        (s, l) => s + (l.exercise_count ?? 0),
        0
      );
      const avgPain =
        dayLogs.length > 0
          ? dayLogs.reduce((s, l) => s + (l.pain_level ?? 0), 0) /
            dayLogs.length
          : 0;
      result.push({
        day: DAY_NAMES[(i + 1) % 7],
        date: dateStr,
        totalCount,
        avgPain: Math.round(avgPain * 10) / 10,
        exercisesDone: dayLogs.length,
      });
    }
    return result;
  }

  const end = toDateOnlyString(new Date());
  const start = addDaysDateOnly(end, -13);
  const logs = await getExerciseLogs(patientId, start, end);
  const result: WeeklyChartData[] = [];
  for (let i = 0; i < 14; i++) {
    const dateStr = addDaysDateOnly(start, i);
    const dayLogs = logs.filter((l) => l.performed_at === dateStr);
    const totalCount = dayLogs.reduce(
      (s, l) => s + (l.exercise_count ?? 0),
      0
    );
    const avgPain =
      dayLogs.length > 0
        ? dayLogs.reduce((s, l) => s + (l.pain_level ?? 0), 0) / dayLogs.length
        : 0;
    result.push({
      day: dateToMMDD(dateStr),
      date: dateStr,
      totalCount,
      avgPain: Math.round(avgPain * 10) / 10,
      exercisesDone: dayLogs.length,
    });
  }
  return result;
}

export interface PainTrendData {
  date: string;
  avgPain: number;
}

export async function getMonthlyPainTrend(
  patientId: string
): Promise<PainTrendData[]> {
  const now = new Date();
  const end = toDateOnlyString(now);
  const startAnchor = new Date(now);
  startAnchor.setDate(now.getDate() - 29);
  const startStr = toDateOnlyString(startAnchor);

  const logs = await getExerciseLogs(patientId, startStr, end);

  const byDate: Record<string, number[]> = {};
  for (const l of logs) {
    if (l.pain_level != null) {
      if (!byDate[l.performed_at]) byDate[l.performed_at] = [];
      byDate[l.performed_at].push(l.pain_level);
    }
  }

  const result: PainTrendData[] = [];
  for (let i = 0; i < 30; i++) {
    const dateStr = addDaysDateOnly(startStr, i);
    const pains = byDate[dateStr];
    if (pains && pains.length > 0) {
      const avg = pains.reduce((a, b) => a + b, 0) / pains.length;
      result.push({
        date: dateStr,
        avgPain: Math.round(avg * 10) / 10,
      });
    }
  }

  return result;
}

function painTrendWeekFromLogs(
  logs: ExerciseLog[],
  monday: string,
  sunday: string
): PainTrendData[] {
  const slice = logs.filter(
    (l) => l.performed_at >= monday && l.performed_at <= sunday
  );
  const byDate: Record<string, number[]> = {};
  for (const l of slice) {
    if (l.pain_level != null) {
      if (!byDate[l.performed_at]) byDate[l.performed_at] = [];
      byDate[l.performed_at].push(l.pain_level);
    }
  }
  const result: PainTrendData[] = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = addDaysDateOnly(monday, i);
    const pains = byDate[dateStr];
    if (pains && pains.length > 0) {
      const avg = pains.reduce((a, b) => a + b, 0) / pains.length;
      result.push({
        date: dateStr,
        avgPain: Math.round(avg * 10) / 10,
      });
    }
  }
  return result;
}

function painTrendRollNDaysFromLogs(
  logs: ExerciseLog[],
  startStr: string,
  endStr: string,
  numDays: number
): PainTrendData[] {
  const slice = logs.filter(
    (l) => l.performed_at >= startStr && l.performed_at <= endStr
  );
  const byDate: Record<string, number[]> = {};
  for (const l of slice) {
    if (l.pain_level != null) {
      if (!byDate[l.performed_at]) byDate[l.performed_at] = [];
      byDate[l.performed_at].push(l.pain_level);
    }
  }
  const result: PainTrendData[] = [];
  for (let i = 0; i < numDays; i++) {
    const dateStr = addDaysDateOnly(startStr, i);
    const pains = byDate[dateStr];
    if (pains && pains.length > 0) {
      const avg = pains.reduce((a, b) => a + b, 0) / pains.length;
      result.push({
        date: dateStr,
        avgPain: Math.round(avg * 10) / 10,
      });
    }
  }
  return result;
}

/** 이번 주(월~일) 또는 최근 14일 구간의 날짜별 평균 통증 — 통증 추이 차트용 */
export async function getWeeklyPainTrend(
  patientId: string,
  days: ChartDays = 7
): Promise<PainTrendData[]> {
  const end = toDateOnlyString(new Date());
  if (days === 7) {
    const { monday, sunday } = getMondayAndSunday();
    const logs = await getExerciseLogs(patientId, monday, sunday);
    return painTrendWeekFromLogs(logs, monday, sunday);
  }
  const startStr = addDaysDateOnly(end, -13);
  const logs = await getExerciseLogs(patientId, startStr, end);
  return painTrendRollNDaysFromLogs(logs, startStr, end, 14);
}

export interface ExerciseStatsData {
  totalDays: number;
  totalCount: number;
  avgPain: number;
  thisWeekDays: number;
}

export async function getExerciseStats(
  patientId: string
): Promise<ExerciseStatsData> {
  return withError("운동 통계 조회", async () => {
    const supabase = await createServerSupabaseClient();

    const end = toDateOnlyString(new Date());
    const start365 = addDaysDateOnly(end, -365);

    const { data: allLogs, error } = await supabase
      .from("exercise_logs")
      .select("performed_at, pain_level, exercise_count")
      .eq("patient_id", patientId)
      .gte("performed_at", start365)
      .lte("performed_at", end);
    if (error) throw error;

    const logs = allLogs ?? [];
    const totalDays = new Set(logs.map((l) => l.performed_at)).size;
    const totalCount = logs.reduce(
      (s, l) => s + (l.exercise_count ?? 0),
      0
    );
    const painValues = logs
      .map((l) => l.pain_level)
      .filter((v): v is number => v != null);
    const avgPain =
      painValues.length > 0
        ? Math.round(
            (painValues.reduce((a, b) => a + b, 0) / painValues.length) * 10
          ) / 10
        : 0;

    const { monday, sunday } = getMondayAndSunday();
    const thisWeekDays = new Set(
      logs
        .filter((l) => l.performed_at >= monday && l.performed_at <= sunday)
        .map((l) => l.performed_at)
    ).size;

    return { totalDays, totalCount, avgPain, thisWeekDays };
  });
}

const EXERCISE_LOG_DETAIL_SELECT = `
  id, patient_id, prescription_id, exercise_id, performed_at, completed,
  pain_level, exercise_count, memo, created_at,
  exercise:exercises(id, title)
`;

function weeklyChartFromLogs(
  logs: ExerciseLog[],
  monday: string,
  sunday: string
): WeeklyChartData[] {
  const weekLogs = logs.filter(
    (l) => l.performed_at >= monday && l.performed_at <= sunday
  );
  const result: WeeklyChartData[] = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = addDaysDateOnly(monday, i);
    const dayLogs = weekLogs.filter((l) => l.performed_at === dateStr);
    const totalCount = dayLogs.reduce(
      (s, l) => s + (l.exercise_count ?? 0),
      0
    );
    const avgPain =
      dayLogs.length > 0
        ? dayLogs.reduce((s, l) => s + (l.pain_level ?? 0), 0) / dayLogs.length
        : 0;
    result.push({
      day: DAY_NAMES[(i + 1) % 7],
      date: dateStr,
      totalCount,
      avgPain: Math.round(avgPain * 10) / 10,
      exercisesDone: dayLogs.length,
    });
  }
  return result;
}

function weeklyChartLast14FromLogs(
  logs: ExerciseLog[],
  end: string
): WeeklyChartData[] {
  const start = addDaysDateOnly(end, -13);
  const slice = logs.filter(
    (l) => l.performed_at >= start && l.performed_at <= end
  );
  const result: WeeklyChartData[] = [];
  for (let i = 0; i < 14; i++) {
    const dateStr = addDaysDateOnly(start, i);
    const dayLogs = slice.filter((l) => l.performed_at === dateStr);
    const totalCount = dayLogs.reduce(
      (s, l) => s + (l.exercise_count ?? 0),
      0
    );
    const avgPain =
      dayLogs.length > 0
        ? dayLogs.reduce((s, l) => s + (l.pain_level ?? 0), 0) / dayLogs.length
        : 0;
    result.push({
      day: dateToMMDD(dateStr),
      date: dateStr,
      totalCount,
      avgPain: Math.round(avgPain * 10) / 10,
      exercisesDone: dayLogs.length,
    });
  }
  return result;
}

function exerciseStatsFromLogs(
  logs: ExerciseLog[],
  monday: string,
  sunday: string
): ExerciseStatsData {
  const totalDays = new Set(logs.map((l) => l.performed_at)).size;
  const totalCount = logs.reduce(
    (s, l) => s + (l.exercise_count ?? 0),
    0
  );
  const painValues = logs
    .map((l) => l.pain_level)
    .filter((v): v is number => v != null);
  const avgPain =
    painValues.length > 0
      ? Math.round(
          (painValues.reduce((a, b) => a + b, 0) / painValues.length) * 10
        ) / 10
      : 0;
  const thisWeekDays = new Set(
    logs
      .filter((l) => l.performed_at >= monday && l.performed_at <= sunday)
      .map((l) => l.performed_at)
  ).size;
  return { totalDays, totalCount, avgPain, thisWeekDays };
}

/** 환자 상세: 운동 로그 1회 조회로 차트·통계·최근 기록 생성 */
export async function getPatientDetailExerciseBundle(patientId: string) {
  return withError("환자 운동 요약 조회", async () => {
    const supabase = await createServerSupabaseClient();
    const end = toDateOnlyString(new Date());
    const start365 = addDaysDateOnly(end, -365);
    const normStart = normalizeDateOnlyInput(start365);
    const normEnd = normalizeDateOnlyInput(end);

    const { data, error } = await supabase
      .from("exercise_logs")
      .select(EXERCISE_LOG_DETAIL_SELECT)
      .eq("patient_id", patientId)
      .gte("performed_at", normStart)
      .lte("performed_at", normEnd)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const logs = (data ?? []) as unknown as ExerciseLog[];

    const { monday, sunday } = getMondayAndSunday();
    const weeklyChartData7 = weeklyChartFromLogs(logs, monday, sunday);
    const weeklyChartData14 = weeklyChartLast14FromLogs(logs, end);
    const painTrendData7 = painTrendWeekFromLogs(logs, monday, sunday);
    const painStart14 = addDaysDateOnly(end, -13);
    const painTrendData14 = painTrendRollNDaysFromLogs(
      logs,
      painStart14,
      end,
      14
    );
    const exerciseStats = exerciseStatsFromLogs(logs, monday, sunday);

    const start30 = addDaysDateOnly(end, -30);
    const recentLogs = logs
      .filter((l) => l.performed_at >= start30 && l.performed_at <= end)
      .slice(0, 5);

    return {
      weeklyChartData7,
      weeklyChartData14,
      painTrendData7,
      painTrendData14,
      exerciseStats,
      recentLogs,
    };
  });
}

// ─── 의료 이미지 ───

export async function getMedicalImages(
  patientId: string,
  options?: { limit?: number }
): Promise<MedicalImage[]> {
  return withError("의료 이미지 조회", async () => {
    const supabase = await createServerSupabaseClient();
    let q = supabase
      .from("medical_images")
      .select(
        "id, patient_id, uploaded_by, image_type, body_part_id, image_url, storage_path, taken_at, description, created_at, body_part:body_parts(id, name, category, display_order)"
      )
      .eq("patient_id", patientId)
      .order("taken_at", { ascending: false });
    if (options?.limit != null) {
      q = q.limit(options.limit);
    }
    const { data, error } = await q;
    if (error) throw error;
    const images = (data ?? []) as unknown as MedicalImage[];

    await Promise.all(
      images.map(async (img) => {
        if (img.storage_path) {
          const { data: signed } = await supabase.storage
            .from("medical-images")
            .createSignedUrl(img.storage_path, 3600);
          if (signed?.signedUrl) {
            img.image_url = signed.signedUrl;
          }
        }
      })
    );

    return images;
  });
}

export async function uploadMedicalImage(formData: FormData) {
  return withError("의료 이미지 업로드", async () => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("인증이 필요합니다.");

    const file = formData.get("file") as File;
    const patientId = formData.get("patientId") as string;
    const imageType = formData.get("imageType") as string;
    const bodyPartId = formData.get("bodyPartId") as string;
    const takenAt = formData.get("takenAt") as string;
    const description = (formData.get("description") as string) || null;

    if (!file || !patientId || !imageType || !takenAt) {
      throw new Error("필수 항목이 누락되었습니다.");
    }

    const ext = file.name.split(".").pop();
    const storagePath = `${patientId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("medical-images")
      .upload(storagePath, file);
    if (uploadErr) throw uploadErr;

    const { data: signed } = await supabase.storage
      .from("medical-images")
      .createSignedUrl(storagePath, 3600);
    const imageUrl = signed?.signedUrl || "";

    const { data, error: insertErr } = await supabase
      .from("medical_images")
      .insert({
        patient_id: patientId,
        uploaded_by: user.id,
        image_type: imageType,
        body_part_id: bodyPartId || null,
        image_url: imageUrl,
        storage_path: storagePath,
        taken_at: takenAt,
        description,
      })
      .select("*, body_part:body_parts(*)")
      .single();

    if (insertErr) throw insertErr;

    const result = data as MedicalImage;
    result.image_url = imageUrl;
    return result;
  });
}

export async function deleteMedicalImage(imageId: string) {
  return withError("의료 이미지 삭제", async () => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("인증이 필요합니다.");

    const { data: image, error: fetchErr } = await supabase
      .from("medical_images")
      .select("storage_path")
      .eq("id", imageId)
      .single();
    if (fetchErr) throw fetchErr;

    if (image?.storage_path) {
      await supabase.storage
        .from("medical-images")
        .remove([image.storage_path]);
    }

    const { error: deleteErr } = await supabase
      .from("medical_images")
      .delete()
      .eq("id", imageId);
    if (deleteErr) throw deleteErr;
  });
}
