import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { MealAnalysis } from '@/types/diary'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { imageUrl, date } = await req.json()
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl 필요' }, { status: 400 })

    // 이미지 fetch → base64 변환
    const imgRes = await fetch(imageUrl)
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    const arrayBuffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' })

    const prompt = `당신은 10년 경력의 영양사이자 다이어트 매니저입니다. 이 식사 사진을 분석하고 다이어트 관점에서 평가해주세요. JSON만 반환하세요. 다른 텍스트 금지.

{"calories":숫자,"carbs":숫자,"protein":숫자,"fat":숫자,"fiber":숫자,"foods":[{"name":"음식명","amount":"양","calories":숫자}],"feedback":"한국어로 2문장. 첫 문장은 이 식단의 다이어트 관점 평가, 두번째 문장은 개선을 위한 구체적인 조언.","analyzed_at":"${new Date().toISOString()}"}`

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

    const analysis: MealAnalysis = JSON.parse(raw)

    await supabase.from('daily_logs').upsert(
      { user_id: user.id, date, meal_image_url: imageUrl, meal_analysis: analysis },
      { onConflict: 'user_id,date' }
    )

    return NextResponse.json(analysis)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}