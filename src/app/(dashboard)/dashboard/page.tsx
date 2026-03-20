import { createServerSupabaseClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import DashboardCharts from './_components/DashboardCharts'
import ClinicStatus from './_components/ClinicStatus'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user!.id)
    .single()

  const from = new Date()
  from.setDate(from.getDate() - 30)

  const { data: logs } = await supabase
    .from('daily_logs')
    .select('date, meal_analysis, water_intake, sleep_hours, condition, exercise_logs')
    .eq('user_id', user!.id)
    .gte('date', from.toISOString().split('T')[0])
    .order('date', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">

      {/* 인사 */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-800">
          안녕하세요, {profile?.name ?? ''}님 👋
        </h1>
        <p className="text-[14px] text-gray-400 mt-1">오늘도 건강한 하루 보내세요!</p>
      </div>

      {/* 바로가기 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link href="/diary"
          className="bg-white rounded-[20px] border border-pink-100 p-5 shadow-sm
            hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="text-3xl mb-3">📝</div>
          <p className="text-[15px] font-semibold text-gray-800">오늘의 기록</p>
          <p className="text-[12px] text-gray-400 mt-1">식단 · 운동 · 컨디션</p>
        </Link>

        <Link href="/mypage"
          className="bg-white rounded-[20px] border border-pink-100 p-5 shadow-sm
            hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="text-3xl mb-3">👤</div>
          <p className="text-[15px] font-semibold text-gray-800">마이페이지</p>
          <p className="text-[12px] text-gray-400 mt-1">프로필 · BMI</p>
        </Link>

        <a href="tel:041-900-2221"
          className="col-span-2 bg-gradient-to-r from-pink-500 to-rose-400
            rounded-[20px] p-5 shadow-[0_4px_16px_rgba(236,72,153,0.3)]
            hover:shadow-[0_6px_20px_rgba(236,72,153,0.4)]
            hover:-translate-y-0.5 transition-all
            flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-white">예약 / 문의</p>
            <p className="text-[13px] text-white/80 mt-0.5">041-900-2221</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-[24px]">📞</span>
          </div>
        </a>
      </div>

      {/* 통통이 배너 */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50
        rounded-[20px] border border-pink-100 p-4 mb-4
        flex items-center gap-4">
        <Image src="/duck.png" alt="통통이" width={60} height={60}
          className="object-contain flex-shrink-0" />
        <div>
          <p className="text-[14px] font-semibold text-pink-600 mb-0.5">통통이의 한마디 🏋️</p>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            오늘 식단 기록했나요? 작은 습관이 큰 변화를 만들어요!
          </p>
        </div>
      </div>

      {/* 차트 */}
      <DashboardCharts logs={logs ?? []} />

      {/* 운영시간 카드 */}
      <div className="bg-white rounded-[20px] border border-pink-100 p-5 shadow-sm mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[18px]">🕐</span>
          <p className="text-[15px] font-semibold text-gray-800">운영시간</p>
        </div>

        <div className="space-y-2">
          {[
            { day: '월 · 화 · 목 · 금', time: '10:30 - 19:00', sub: '점심 13:30 - 14:30'       },
            { day: '토요일',            time: '10:30 - 16:00', sub: '진료마감 15:00 · 점심없음' },
            { day: '수요일',            time: '휴진',           sub: null                        },
            { day: '일 · 공휴일',       time: '휴진',           sub: null                        },
          ].map(row => (
            <div key={row.day}
              className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-[13px] font-medium text-gray-500 w-28 flex-shrink-0">
                {row.day}
              </span>
              <div className="text-right">
                <p className={`text-[13px] font-semibold
                  ${row.time === '휴진' ? 'text-rose-400' : 'text-gray-700'}`}>
                  {row.time}
                </p>
                {row.sub && <p className="text-[11px] text-gray-400 mt-0.5">{row.sub}</p>}
              </div>
            </div>
          ))}
        </div>

        <ClinicStatus />
      </div>

    </div>
  )
}