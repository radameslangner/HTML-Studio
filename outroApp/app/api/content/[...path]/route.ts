import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    // The path parts come from the URL segments
    const docPath = pathSegments.join('/');
    const fullPath = path.join(process.cwd(), 'Conteudo', docPath);

    if (!fs.existsSync(fullPath)) {
      console.error('File not found at:', fullPath);
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Content fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
