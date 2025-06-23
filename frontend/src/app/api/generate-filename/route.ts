import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { previews } = body

    if (!previews) {
      return NextResponse.json({ error: 'File previews are required' }, { status: 400 })
    }

    const response = await fetch(`${BACKEND_URL}/api/generate-filename`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ previews }),
    })

    if (!response.ok) {
      console.error('Backend error:', await response.text());
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error generating filename from backend:', error)
    return NextResponse.json(
      { error: 'Failed to generate filename from backend' },
      { status: 500 }
    )
  }
} 