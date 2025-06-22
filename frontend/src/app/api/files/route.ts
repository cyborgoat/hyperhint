import { NextResponse } from 'next/server'

// Mock file data - in real implementation, this would come from your FastAPI server
const mockFiles = [
  { id: '1', label: 'README.md', description: 'Project documentation', path: './README.md' },
  { id: '2', label: 'package.json', description: 'Package configuration', path: './package.json' },
  { id: '3', label: 'src/components/ChatInterface.tsx', description: 'Chat component', path: './src/components/ChatInterface.tsx' },
  { id: '4', label: 'src/app/page.tsx', description: 'Main page component', path: './src/app/page.tsx' },
  { id: '5', label: 'tailwind.config.js', description: 'Tailwind configuration', path: './tailwind.config.js' },
  { id: '6', label: 'next.config.js', description: 'Next.js configuration', path: './next.config.js' },
  { id: '7', label: 'tsconfig.json', description: 'TypeScript configuration', path: './tsconfig.json' },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.toLowerCase() || ''

  const filteredFiles = mockFiles.filter(file =>
    file.label.toLowerCase().includes(query) ||
    file.description.toLowerCase().includes(query)
  )

  return NextResponse.json({ files: filteredFiles })
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
} 