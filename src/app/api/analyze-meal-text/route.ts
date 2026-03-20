import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const ROUTE = '[analyze-meal-text]'
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

function log(step: string, detail?: unknown) {
  if (detail !== undefined) console.log(`${ROUTE} ${step}`, detail)
  else console.log(`${ROUTE} ${step}`)
}

export async function POST(req: NextRequest) {
  try {
    log('STEP 1: createServerSupabaseClient')
    const supabase = await createServerSupabaseClient()

    log('STEP 2: supabase.auth.getUser()')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError) console.error(`${ROUTE} STEP 2: auth error`, authError)
    if (!user) {
      log('STEP 2: no user → 401')
      return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    }
    log('STEP 2: user ok', { userId: user.id })

    log('STEP 3: req.json()')
    let body: { text?: string; date?: string }
    try {
      body = await req.json()
    } catch (e) {
      console.error(`${ROUTE} STEP 3: JSON body parse 실패`, e)
      throw e
    }
    const { text, date } = body
    if (!text) {
      log('STEP 3: missing text → 400')
      return NextResponse.json({ error: 'text 필요' }, { status: 400 })
    }
    if (!date) {
      log('STEP 3: missing date → 400')
      return NextResponse.json({ error: 'date 필요' }, { status: 400 })
    }
    log('STEP 3: body ok', { date, textPreview: String(text).slice(0, 80) })

    const key = process.env.GEMINI_API_KEY
    log('STEP 4: GEMINI_API_KEY', { defined: Boolean(key), length: key?.length ?? 0 })
    if (!key) {
      return NextResponse.json(
        { error: '서버에 GEMINI_API_KEY가 설정되지 않았습니다' },
        { status: 500 },
      )
    }

    log('STEP 5: GoogleGenerativeAI + model', { model: MODEL })
    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({ model: MODEL })

    const prompt = `당신은 10년 경력의 영양사이자 다이어트 매니저입니다. 아래 식단을 분석하고 다이어트 관점에서 평가해주세요. JSON만 반환하세요. 다른 텍스트 금지.\n\n식단: ${text}\n\n{"calories":숫자,"carbs":숫자,"protein":숫자,"fat":숫자,"fiber":숫자,"foods":[{"name":"음식명","amount":"양","calories":숫자}],"feedback":"한국어로 2문장. 첫 문장은 다이어트 관점 평가, 두번째 문장은 개선 조언.","analyzed_at":"${new Date().toISOString()}"}`

    log('STEP 6: model.generateContent() 호출 시작')
    let result: Awaited<ReturnType<typeof model.generateContent>>
    try {
      result = await model.generateContent(prompt)
    } catch (e) {
      console.error(`${ROUTE} STEP 6: generateContent() 예외 (네트워크/API/모델명 등)`, e)
      throw e
    }
    log('STEP 6: model.generateContent() 완료')

    // SDK 응답 메타(차단·finishReason 등) — text() 전에 확인
    try {
      const candidates = result.response.candidates
      log('STEP 7: Gemini candidates (raw)', JSON.stringify(candidates, null, 2))
      const fr = candidates?.[0]?.finishReason
      if (fr) log('STEP 7: finishReason', fr)
    } catch (e) {
      console.error(`${ROUTE} STEP 7: candidates 직렬화 실패`, e)
    }

    let rawText: string
    try {
      rawText = result.response.text()
    } catch (e) {
      console.error(
        `${ROUTE} STEP 8: response.text() 실패 (차단/빈 응답 등에서 자주 발생)`,
        e,
      )
      throw e
    }

    // 가공 전 원문 그대로 (요청하신 Raw Response)
    console.log(`${ROUTE} STEP 8: Gemini Raw Response (가공 전 전체 문자열):\n`, rawText)

    const cleaned = rawText.replace(/```json|```/g, '').trim()
    log('STEP 9: markdown 제거 후 (parse 직전, 앞 800자)', cleaned.slice(0, 800))

    let analysis: unknown
    try {
      analysis = JSON.parse(cleaned)
    } catch (e) {
      console.error(
        `${ROUTE} STEP 10: JSON.parse 실패 — 모델이 순수 JSON이 아닌 문자열을 반환했을 가능성`,
        e,
      )
      console.error(`${ROUTE} STEP 10: parse 대상 전체:\n`, cleaned)
      throw e
    }

    log('STEP 11: daily_logs upsert')
    const { error: upsertError } = await supabase.from('daily_logs').upsert(
      { user_id: user.id, date, meal_analysis: analysis },
      { onConflict: 'user_id,date' },
    )
    if (upsertError) {
      console.error(`${ROUTE} STEP 11: upsert error`, upsertError)
      throw upsertError
    }

    log('STEP 12: 성공 → 200')
    return NextResponse.json(analysis)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error(`${ROUTE} CATCH: 최종 예외`, { message, stack })
    return NextResponse.json(
      { error: message, step: 'see server logs for STEP n' },
      { status: 500 },
    )
  }
}
