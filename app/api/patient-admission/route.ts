import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Minimal placeholder API to satisfy Next.js module requirements
export async function GET() {
  return NextResponse.json({ message: 'patient-admission API' })
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented' },
    { status: 501 }
  )
}
