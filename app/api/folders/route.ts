import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const baseDir = path.join(process.cwd(), 'Conteudo');
    
    if (!fs.existsSync(baseDir)) {
      return NextResponse.json({ folders: {} });
    }

    const structure: Record<string, string[]> = {};

    const disciplines = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());

    for (const d of disciplines) {
      const dPath = path.join(baseDir, d.name);
      const subjects = fs.readdirSync(dPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(s => s.name);
      
      structure[d.name] = subjects;
    }

    return NextResponse.json({ folders: structure });
  } catch (error) {
    console.error('Folders API error:', error);
    return NextResponse.json({ folders: {} });
  }
}
