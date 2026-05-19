import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { normalizeMealAnalysis } from '@/lib/meal-analysis-normalize'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { imageUrl, date } = await req.json()
    console.log('[analyze-meal] 요청 date', {
      date,
      dateType: typeof date,
      dateIsValidFormat: typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date),
    })
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl 필요' }, { status: 400 })
    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date(YYYY-MM-DD) 필요' }, { status: 400 })
    }

    const imgRes = await fetch(imageUrl)
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    const arrayBuffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' })

    const prompt = `당신은 10년 경력의 영양사이자 다이어트 매니저입니다. 이 식사 사진을 분석하고 다이어트 관점에서 평가해주세요. JSON만 반환하세요. 다른 텍스트 금지.

## 사용자 정보
- 이 사용자의 하루 권장 칼로리는 1100kcal입니다.
- 사용자는 다이어트 중입니다.

## 피드백(feedback) 작성 규칙 — 반드시 지킬 것
1. 절대로 "더 드세요", "부족합니다", "더 섭취하세요", "양이 적습니다", "충분히 드세요" 같은 표현을 사용하지 마세요.
2. 칼로리가 낮은 식사에 대해서는 긍정적으로 반응하세요.
   - 예: "가볍게 드셨네요! 좋은 선택입니다."
   - 예: "칼로리를 잘 조절하고 계시네요."
   - 예: "다이어트에 도움이 되는 식사예요."
3. 영양 균형에 대한 조언은 하되, 더 먹으라는 표현은 절대 하지 마세요.
   (대안 예: "다음 식사에 단백질을 보강하면 좋아요" → 양은 그대로 유지)
4. 나트륨(sodium_mg)이 700mg 이상이거나 당류(sugar_g)가 15g 이상이면 경고 문구를 포함하세요.
5. 톤은 따뜻하고 격려하는 다이어트 코치 스타일.

## 필수 필드
- calories: 식사 전체 추정 칼로리 (kcal). foods의 calories 합과 일치하도록 맞출 것.
- carbs, protein, fat, fiber: 각 그램(g) 단위 추정값
- sodium_mg: 추정 나트륨 (밀리그램 mg)
- sugar_g: 추정 당류 (그램 g, 추가당·과당 등)
- foods: 각 음식별 name, amount(양), calories(kcal)
- feedback: 한국어 2문장. 위 규칙을 반드시 따를 것.
- analyzed_at: ISO 날짜 문자열

예시 형식:
{"calories":500,"carbs":60,"protein":25,"fat":18,"fiber":5,"sodium_mg":800,"sugar_g":12,"foods":[{"name":"음식명","amount":"양","calories":200}],"feedback":"...","analyzed_at":"${new Date().toISOString()}"}`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: contentType,
          data: base64,
        },
      },
    ])

    const raw = result.response.text()
      .replace(/```json|```/g, '')
      .trim()

    const parsed = JSON.parse(raw) as Record<string, unknown>
    const analysis = normalizeMealAnalysis(parsed)

    await supabase.from('daily_logs').upsert(
      { user_id: user.id, date, meal_image_url: imageUrl, meal_analysis: analysis },
      { onConflict: 'user_id,date' },
    )

    return NextResponse.json(analysis)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
