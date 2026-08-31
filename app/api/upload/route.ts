import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Converte uma string para camelCase removendo acentos e caracteres especiais.
 * Ex: "Conversão Base" → "conversaoBase"
 */
function toCamelCase(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .replace(/[^a-zA-Z0-9\s-]/g, '')  // remove caracteres especiais
    .trim()
    .split(/[\s-]+/)
    .map((word, i) =>
      i === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const disciplina = (formData.get('disciplina') as string) || '';
    const assunto = (formData.get('assunto') as string) || '';
    const titulo = (formData.get('titulo') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extensão original do arquivo
    const originalExt = path.extname(file.name) || '.png';

    // Prefixo camelCase: disciplina + assunto + titulo
    const parts = [disciplina, assunto, titulo].filter(Boolean);
    const prefix = parts.length > 0
      ? parts.map((p, i) => {
          const cc = toCamelCase(p);
          // Primeiro segmento: minúsculo, demais: primeira letra maiúscula
          return i === 0 ? cc : cc.charAt(0).toUpperCase() + cc.slice(1);
        }).join('')
      : 'imagem';

    // Código único curto (6 caracteres hex)
    const uniqueCode = crypto.randomBytes(3).toString('hex');

    const filename = `${prefix}-${uniqueCode}${originalExt}`;

    // Salva em public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    return NextResponse.json({ success: true, url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Só permite deletar arquivos dentro de /uploads/
    if (!url.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }

    const filename = path.basename(url);
    const filepath = path.join(process.cwd(), 'public', 'uploads', filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
