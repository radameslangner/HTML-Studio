import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function slugify(text: string) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

function toCamelCase(...words: string[]) {
  const str = words.filter(Boolean).join(' ');
  const normalized = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalized
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase());
}

export async function POST(req: NextRequest) {
  try {
    const { disciplina, assunto, titulo, subtitulo, pages, status } = await req.json();
    
    if (!disciplina || !assunto || !titulo || !pages) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dSlug = slugify(disciplina);
    const aSlug = slugify(assunto);
    const tSlug = slugify(titulo);

    // O nome do arquivo será em camelCase juntando tudo, como o usuário pediu
    const sSlug = toCamelCase(disciplina, assunto, titulo, subtitulo || 'documento');

    // Path: Conteudo / Disciplina / Assunto / Título
    const baseDir = path.join(process.cwd(), 'Conteudo', dSlug, aSlug, tSlug);

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // Filename: biologiaGeneticaDnaResumo.json
    const filePath = path.join(baseDir, `${sSlug}.json`);
    
    const data = {
      disciplina,
      assunto,
      titulo,
      subtitulo,

      slug: sSlug,
      pages,
      status,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    return NextResponse.json({ success: true, slug: sSlug, disciplina: dSlug, assunto: aSlug, title: tSlug });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: 'Failed to save content' }, { status: 500 });
  }
}
