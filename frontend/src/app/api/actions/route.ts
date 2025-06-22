import { NextResponse } from 'next/server'

// Mock actions data
const mockActions = [
  { id: 'chat', label: 'chat', description: 'Start a conversation with the AI' },
  { id: 'generate-workflow', label: 'generate-workflow', description: 'Create a new workflow based on your requirements' },
  { id: 'execute-workflow', label: 'execute-workflow', description: 'Run an existing workflow from your collection' },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.toLowerCase() || ''

  const filteredActions = mockActions.filter(action =>
    action.label.toLowerCase().includes(query) ||
    action.description.toLowerCase().includes(query)
  )

  return NextResponse.json({ actions: filteredActions })
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
} 