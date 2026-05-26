import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const filePath = path.join(process.cwd(), 'Conteudo', slug, 'index.html');
    const metadataPath = path.join(process.cwd(), 'Conteudo', slug, 'metadata.json');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const html = fs.readFileSync(filePath, 'utf8');
    let title = slug;

    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        title = metadata.title || slug;
      } catch (e) {
        // ignore
      }
    }

    return NextResponse.json({ html, title, slug });
  } catch (error) {
    console.error('Content fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
