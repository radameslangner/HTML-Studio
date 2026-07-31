import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function removeEmptyDirs(dir: string, stopDir: string) {
  if (dir === stopDir || !dir.startsWith(stopDir)) return;
  try {
    const entries = fs.readdirSync(dir);
    if (entries.length === 0) {
      fs.rmdirSync(dir);
      removeEmptyDirs(path.dirname(dir), stopDir);
    }
  } catch {
    // ignore
  }
}

export async function POST(req: NextRequest) {
  try {
    const { path: relativePath } = await req.json();

    if (!relativePath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    const conteudoDir = path.join(process.cwd(), 'Conteudo');
    const targetPath = path.resolve(conteudoDir, relativePath);
    const normalizedConteudoDir = path.resolve(conteudoDir);

    if (!targetPath.startsWith(normalizedConteudoDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    fs.unlinkSync(targetPath);
    removeEmptyDirs(path.dirname(targetPath), normalizedConteudoDir);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
