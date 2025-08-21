import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Minimal placeholder API to unblock build and baseline
// TODO: Replace with real implementation querying Supabase
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateFilter = searchParams.get('dateFilter') || 'today'
  const page = Number(searchParams.get('page') || '1')
  const pageSize = Number(searchParams.get('pageSize') || '15')

  const data: any[] = []

  const summary = dateFilter === 'today'
    ? {
        total_appointments: 0,
        today_count: 0,
        future_count: 0,
        past_count: 0,
      }
    : undefined

  const pagination = {
    page,
    pageSize,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  }

  return NextResponse.json({ data, ...(summary ? { summary } : {}), pagination })
}

export async function POST() {
  return NextResponse.json(
    { error: 'Not implemented' },
    { status: 501 }
  )
}
