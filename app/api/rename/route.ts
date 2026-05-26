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
    .replace(/[^a-zA-Z0-9]+(.)/g, (_match, chr) => chr.toUpperCase());
}

/** Remove empty directories up to (but not including) stopDir */
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
    const {
      oldPath,          // relative path stored in item.path (e.g. "informatica/git-github/conceitos/informaticaGitGithubConceitosBasicos.json")
      disciplina,
      assunto,
      titulo,
      subtitulo,
    } = await req.json();

    if (!oldPath || !disciplina || !assunto || !titulo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const conteudoDir = path.join(process.cwd(), 'Conteudo');
    const oldAbsPath = path.join(conteudoDir, oldPath);

    if (!fs.existsSync(oldAbsPath)) {
      return NextResponse.json({ error: 'Source file not found' }, { status: 404 });
    }

    // Read current data
    const raw = fs.readFileSync(oldAbsPath, 'utf8');
    const data = JSON.parse(raw);

    // Build new paths
    const dSlug = slugify(disciplina);
    const aSlug = slugify(assunto);
    const tSlug = slugify(titulo);
    const newSlug = toCamelCase(disciplina, assunto, titulo, subtitulo || 'documento');

    const newDir = path.join(conteudoDir, dSlug, aSlug, tSlug);
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }

    const newAbsPath = path.join(newDir, `${newSlug}.json`);

    // Write updated file
    const updatedData = {
      ...data,
      disciplina,
      assunto,
      titulo,
      subtitulo: subtitulo ?? data.subtitulo ?? '',
      slug: newSlug,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(newAbsPath, JSON.stringify(updatedData, null, 2), 'utf8');

    // Remove old file (only if paths differ)
    if (oldAbsPath !== newAbsPath) {
      fs.unlinkSync(oldAbsPath);
      removeEmptyDirs(path.dirname(oldAbsPath), conteudoDir);
    }

    const newRelPath = path.relative(conteudoDir, newAbsPath);

    return NextResponse.json({
      success: true,
      slug: newSlug,
      path: newRelPath,
    });
  } catch (error) {
    console.error('Rename error:', error);
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 });
  }
}
