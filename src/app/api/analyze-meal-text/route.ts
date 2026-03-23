import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { normalizeMealAnalysis } from '@/lib/meal-analysis-normalize'

/**
 * Vercel(및 로컬)에 필요한 환경 변수 — 이 라우트 + Supabase SSR
 *
 * 【필수】
 * - GEMINI_API_KEY … Google AI Studio / Vertex에서 발급한 API 키 (텍스트·이미지 분석 공통)
 * - NEXT_PUBLIC_SUPABASE_URL … Supabase 프로젝트 URL (createServerSupabaseClient)
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY … Supabase anon 키
 *
 * 【선택】
 * - GEMINI_MODEL … 기본값: gemini-2.5-flash (없으면 이 값 사용)
 *   예: gemini-2.5-flash, gemini-2.5-flash-preview-05-20 등
 *
 * Vercel 대시보드: Project → Settings → Environment Variables 에서
 * Production / Preview / Development 각각 동일하게 등록했는지 확인하세요.
 */

const ROUTE = '[analyze-meal-text]'
// gemini-2.5-flash: 최신 운영 기본 모델로 사용합니다.
const DEFAULT_MODEL = 'gemini-2.5-flash'
const ENV_MODEL = process.env.GEMINI_MODEL

// `gemini-flash-lite-latest`는 Gemini API에서 모델 ID로 문서에서 확인되지 않아,
// 실서비스에서 실수로 넣었을 때도 동작하도록 Gemini API 공식 모델로 매핑합니다.
const MODEL =
  ENV_MODEL === 'gemini-flash-lite-latest' ? DEFAULT_MODEL : ENV_MODEL ?? DEFAULT_MODEL

function log(step: string, detail?: unknown) {
  if (detail !== undefined) console.log(`${ROUTE} ${step}`, detail)
  else console.log(`${ROUTE} ${step}`)
}

type ErrorBody = {
  ok: false
  error: {
    message: string
    step: string
    code?: string
    details?: string
    hint?: string
    /** 개발 환경에서만 포함 */
    stack?: string
  }
}

function normalizeError(err: unknown, step: string): ErrorBody['error'] {
  const base: ErrorBody['error'] = { message: '알 수 없는 오류', step }

  if (err instanceof Error) {
    base.message = err.message || base.message
    if (process.env.NODE_ENV === 'development') base.stack = err.stack
  } else if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>
    if (typeof o.message === 'string') base.message = o.message
    if (typeof o.code === 'string') base.code = o.code
    if (typeof o.details === 'string') base.details = o.details
    if (typeof o.hint === 'string') base.hint = o.hint
  } else {
    base.message = String(err)
  }

  return base
}

function jsonError(status: number, err: unknown, step: string) {
  const body: ErrorBody = { ok: false, error: normalizeError(err, step) }
  console.error(`${ROUTE} JSON error response`, { status, ...body.error })
  return NextResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

/**
 * Gemini 응답에서 순수 JSON 객체 문자열만 추출
 * - ```json ... ``` fenced block 우선
 * - 실패 시 첫 '{' ~ 마지막 '}' 범위 사용
 */
function extractJsonOnly(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    return raw.slice(first, last + 1).trim()
  }
  return raw.trim()
}

export async function POST(req: NextRequest) {
  let lastStep = 'INIT'

  try {
    lastStep = 'STEP 1: createServerSupabaseClient'
    log(lastStep)
    const supabase = await createServerSupabaseClient()

    lastStep = 'STEP 2: supabase.auth.getUser()'
    log(lastStep)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError) console.error(`${ROUTE} STEP 2: auth error`, authError)
    if (!user) {
      log('STEP 2: no user → 401')
      return NextResponse.json(
        { ok: false, error: { message: '인증 필요', step: 'STEP 2' } },
        { status: 401 },
      )
    }
    log('STEP 2: user ok', { userId: user.id })

    lastStep = 'STEP 3: req.json()'
    log(lastStep)
    let body: { text?: string; date?: string }
    try {
      body = await req.json()
    } catch (e) {
      console.error(`${ROUTE} STEP 3: JSON body parse 실패`, e)
      return jsonError(400, e, 'STEP 3: req.json()')
    }
    const { text, date } = body
    if (!text) {
      log('STEP 3: missing text → 400')
      return NextResponse.json(
        { ok: false, error: { message: 'text 필요', step: 'STEP 3' } },
        { status: 400 },
      )
    }
    if (!date) {
      log('STEP 3: missing date → 400')
      return NextResponse.json(
        { ok: false, error: { message: 'date 필요', step: 'STEP 3' } },
        { status: 400 },
      )
    }
    log('STEP 3: body ok', { date, textPreview: String(text).slice(0, 80) })

    lastStep = 'STEP 4: GEMINI_API_KEY'
    const key = process.env.GEMINI_API_KEY
    log(lastStep, { defined: Boolean(key), length: key?.length ?? 0 })
    if (!key) {
      return jsonError(
        500,
        new Error('서버에 GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수를 확인하세요.'),
        lastStep,
      )
    }

    lastStep = 'STEP 5: GoogleGenerativeAI + model'
    log(lastStep, { requestedModel: ENV_MODEL ?? null, model: MODEL })
    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        // 가능한 한 순수 JSON만 받도록 (SDK/모델이 지원하는 경우)
        responseMimeType: 'application/json',
      },
    })

    const prompt = `당신은 10년 경력의 영양사이자 다이어트 매니저입니다. 아래 식단을 분석하고 다이어트 관점에서 평가해주세요. JSON만 반환하세요. 다른 텍스트 금지.

식단: ${text}

반환 JSON 필드:
- calories: 전체 kcal (foods의 calories 합과 일치)
- carbs, protein, fat, fiber: 그램(g)
- sodium_mg: 추정 나트륨 (mg)
- sugar_g: 추정 당류 (g)
- foods: [{name, amount, calories}]
- feedback: 한국어 2문장 (평가 + 조언)
- analyzed_at: "${new Date().toISOString()}" 형식 ISO 문자열`

    lastStep = 'STEP 6: model.generateContent()'
    log(`${lastStep} 호출 시작`)
    let result: Awaited<ReturnType<typeof model.generateContent>>
    try {
      result = await model.generateContent(prompt)
    } catch (e) {
      console.error(`${ROUTE} STEP 6: generateContent() 예외`, e)
      return jsonError(502, e, lastStep)
    }
    log('STEP 6: model.generateContent() 완료')

    lastStep = 'STEP 7: candidates'
    try {
      const candidates = result.response.candidates
      log('STEP 7: Gemini candidates (raw)', JSON.stringify(candidates, null, 2))
      const fr = candidates?.[0]?.finishReason
      if (fr) log('STEP 7: finishReason', fr)
    } catch (e) {
      console.error(`${ROUTE} STEP 7: candidates 직렬화 실패`, e)
    }

    lastStep = 'STEP 8: response.text()'
    let rawText: string
    try {
      rawText = result.response.text()
    } catch (e) {
      console.error(`${ROUTE} STEP 8: response.text() 실패`, e)
      return jsonError(502, e, lastStep)
    }

    console.log(`${ROUTE} STEP 8: Gemini Raw Response (가공 전 전체 문자열):\n`, rawText)

    lastStep = 'STEP 9: extractJsonOnly'
    const cleaned = extractJsonOnly(rawText)
    log('STEP 9: JSON 추출 후 (parse 직전, 앞 800자)', cleaned.slice(0, 800))

    lastStep = 'STEP 10: JSON.parse'
    let analysis: unknown
    try {
      analysis = JSON.parse(cleaned)
    } catch (e) {
      console.error(`${ROUTE} STEP 10: JSON.parse 실패`, e)
      console.error(`${ROUTE} STEP 10: parse 대상 전체:\n`, cleaned)
      return jsonError(422, {
        message: '모델 응답을 JSON으로 파싱할 수 없습니다',
        code: 'JSON_PARSE',
        details: cleaned.slice(0, 500),
      }, lastStep)
    }

    lastStep = 'STEP 10b: normalizeMealAnalysis'
    const normalized = normalizeMealAnalysis(analysis as Record<string, unknown>)

    lastStep = 'STEP 11: daily_logs upsert'
    log(lastStep)
    const { error: upsertError } = await supabase.from('daily_logs').upsert(
      { user_id: user.id, date, meal_analysis: normalized },
      { onConflict: 'user_id,date' },
    )
    if (upsertError) {
      console.error(`${ROUTE} STEP 11: upsert error`, upsertError)
      return jsonError(500, upsertError, lastStep)
    }

    lastStep = 'STEP 12: success'
    log(`${lastStep} → 200`)
    return NextResponse.json(normalized, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch (err: unknown) {
    console.error(`${ROUTE} CATCH: 예상 밖 예외`, { lastStep, err })
    return jsonError(500, err, lastStep)
  }
}
