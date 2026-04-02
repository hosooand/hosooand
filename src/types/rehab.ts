export type UserRole = "admin" | "staff" | "member";

export interface Profile {
  id: string;
  email: string;
  nickname: string;
  role: UserRole;
  created_at: string;
}

export interface BodyPart {
  id: string;
  name: string;
  category: string | null;
  display_order: number;
}

export type ExerciseLevel = 1 | 2 | 3;

export type ContentType = "video" | "leaflet";

export interface Exercise {
  id: string;
  title: string;
  description: string | null;
  body_part_id: string | null;
  content_type: ContentType;
  video_url: string | null;
  leaflet_images: string[] | null;
  leaflet_text: string | null;
  level: ExerciseLevel;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  body_part?: BodyPart;
}

export type PrescriptionStatus = "active" | "completed" | "paused";

export interface Prescription {
  id: string;
  patient_id: string;
  staff_id: string;
  body_part_ids: string[];
  current_level: ExerciseLevel;
  note: string | null;
  status: PrescriptionStatus;
  created_at: string;
  updated_at: string;
  patient?: Profile;
  staff?: Profile;
  exercises?: Exercise[];
}

export interface PrescriptionExercise {
  id: string;
  prescription_id: string;
  exercise_id: string;
  display_order: number;
  created_at: string;
  exercise?: Exercise;
}

export interface ExerciseLog {
  id: string;
  patient_id: string;
  prescription_id: string | null;
  exercise_id: string | null;
  performed_at: string;
  completed: boolean;
  pain_level: number | null;
  exercise_count: number | null;
  memo: string | null;
  created_at: string;
  exercise?: Exercise;
}

export interface XrayRecord {
  id: string;
  patient_id: string;
  uploaded_by: string;
  image_url: string;
  taken_date: string;
  body_part: BodyPart;
  notes: string | null;
  created_at: string;
  patient?: Profile;
}

export type ImageType = "xray" | "xbody" | "other";

export interface MedicalImage {
  id: string;
  patient_id: string;
  uploaded_by: string;
  image_type: ImageType;
  body_part_id: string | null;
  image_url: string;
  storage_path: string;
  taken_at: string;
  description: string | null;
  created_at: string;
  body_part?: BodyPart;
}

export const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
  xray: "영상기록",
  xbody: "엑스바디",
  other: "기타",
};

export const LEVEL_LABELS: Record<ExerciseLevel, string> = {
  1: "1단계",
  2: "2단계",
  3: "3단계",
};
