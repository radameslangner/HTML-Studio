import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const baseDir = path.join(process.cwd(), 'Conteudo');
    
    if (!fs.existsSync(baseDir)) {
      return NextResponse.json({ contents: [] });
    }

    const results: any[] = [];

    // Recursive crawler for .json files
    const crawl = (currentPath: string) => {
      if (!fs.existsSync(currentPath)) return;
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          crawl(fullPath);
        } else if (entry.name.endsWith('.json')) {
          try {
            const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            results.push({
              slug: data.slug,
              titulo: data.titulo || data.title,
              subtitulo: data.subtitulo,

              disciplina: data.disciplina,
              assunto: data.assunto,
              status: data.status,
              pageCount: data.pages?.length || 0,
              // Path relative to Conteudo
              path: path.relative(baseDir, fullPath).replace(/\\/g, '/')
            });
          } catch (e) {
            console.error('Error reading json at', fullPath);
          }
        }
      }
    };

    crawl(baseDir);

    return NextResponse.json({ contents: results });
  } catch (error) {
    console.error('List error:', error);
    return NextResponse.json({ error: 'Failed to list contents' }, { status: 500 });
  }
}
