import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  try {
    const response = await fetch(`${BACKEND_URL}/api/actions?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching actions from backend:', error)
    
    // Fallback to basic mock data if backend is not available
    const mockActions = [
      { id: 'search', label: 'search', description: 'Search through files and content' },
      { id: 'create', label: 'create', description: 'Create a new file or folder' },
      { id: 'edit', label: 'edit', description: 'Edit an existing file' },
    ]
    
    const filteredActions = mockActions.filter(action =>
      action.label.toLowerCase().includes(query.toLowerCase()) ||
      action.description.toLowerCase().includes(query.toLowerCase())
    )
    
    return NextResponse.json({ 
      actions: filteredActions,
      fallback: true,
      error: 'Backend not available, using fallback data'
    })
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
} 