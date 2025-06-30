import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  try {
    const response = await fetch(`${BACKEND_URL}/api/files?q=${encodeURIComponent(query)}`, {
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
    console.error('Error fetching files from backend:', error)
    
    // Fallback to basic mock data if backend is not available
    const mockFiles = [
      { id: '1', label: 'README.md', description: 'Project documentation' },
      { id: '2', label: 'package.json', description: 'Package configuration' },
      { id: '3', label: 'src/components/ChatInterface.tsx', description: 'Chat component' },
    ]
    
    const filteredFiles = mockFiles.filter(file =>
      file.label.toLowerCase().includes(query.toLowerCase()) ||
      file.description.toLowerCase().includes(query.toLowerCase())
    )
    
    return NextResponse.json({ 
      files: filteredFiles,
      fallback: true,
      error: 'Backend not available, using fallback data'
    })
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
} 