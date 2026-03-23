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
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl 필요' }, { status: 400 })

    const imgRes = await fetch(imageUrl)
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    const arrayBuffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' })

    const prompt = `당신은 10년 경력의 영양사이자 다이어트 매니저입니다. 이 식사 사진을 분석하고 다이어트 관점에서 평가해주세요. JSON만 반환하세요. 다른 텍스트 금지.

필수 필드:
- calories: 식사 전체 추정 칼로리 (kcal). foods의 calories 합과 일치하도록 맞출 것.
- carbs, protein, fat, fiber: 각 그램(g) 단위 추정값
- sodium_mg: 추정 나트륨 (밀리그램 mg)
- sugar_g: 추정 당류 (그램 g, 추가당·과당 등)
- foods: 각 음식별 name, amount(양), calories(kcal)
- feedback: 한국어 2문장. 첫 문장은 다이어트 관점 평가, 두번째는 구체적 조언.
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
      { onConflict: 'user_id,date' }
    )

    return NextResponse.json(analysis)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
