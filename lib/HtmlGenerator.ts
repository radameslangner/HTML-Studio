/**
 * Utilitário para gerar um arquivo HTML independente e otimizado para impressão.
 * Este código gera um HTML com estilos embutidos que preservam o layout do Canvas.
 */
export const generatePrintableHtml = (
  pages: string[],
  metadata: {
    disciplina: string;
    assunto: string;
    titulo: string;
    subtitulo: string;
  }
) => {
  const { disciplina, assunto, titulo, subtitulo } = metadata;

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo} - Export</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');

        :root {
            --paper-width: 210mm;
            --paper-height: 148.5mm;
            --header-height: 20mm;
            --canvas-padding: 6mm;
        }

        html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white;
            font-family: 'Inter', sans-serif;
            width: 100%;
            height: auto;
        }

        .print-container {
            display: block;
            width: 100%;
            height: auto;
            background: white;
        }

        .print-page {
            width: 210mm;
            height: 148.5mm;
            background: white;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            page-break-after: always;
        }

        .print-page:last-child {
            page-break-after: auto;
        }

        .print-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            border-bottom: 2px solid #000;
            padding: 0 var(--canvas-padding);
            height: var(--header-height);
            box-sizing: border-box;
            flex-shrink: 0;
        }

        .header-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
            min-width: 0;
        }
        .header-disciplina,
        .header-assunto,
        .header-titulo,
        .header-subtitulo {
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
        }
        .header-disciplina { font-size: 9px; font-weight: 900; color: #64748b; line-height: 1; }
        .header-assunto { font-size: 11px; font-weight: 700; color: #475569; }
        .header-titulo { font-size: 12px; font-weight: 900; color: #000; line-height: 1.1; }
        .header-subtitulo { font-size: 11px; font-weight: 600; color: #64748b; }
        .header-page { font-size: 11px; font-weight: 900; color: #000; text-transform: uppercase; white-space: nowrap; }

        .print-content {
            position: relative;
            flex: 1;
            overflow: visible;
        }

        .ProseMirror {
            width: 100%;
            height: 100%;
            position: relative;
            padding: 0 var(--canvas-padding);
        }

        .ProseMirror p:empty {
            display: none;
        }

        .canvas-box {
            position: absolute;
            background: transparent;
        }

        .drawing-layer {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 5;
        }

        /* Tiptap Styles */
        h1 { font-size: 28px; font-weight: 900; margin: 0; color: #0f172a; line-height: 1; }
        h2 { font-size: 24px; font-weight: 800; margin: 0; color: #1e293b; line-height: 1; }
        h3 { font-size: 20px; font-weight: 700; margin: 0; color: #334155; line-height: 1.1; }
        p { margin: 0; line-height: 1.25; color: #475569; }
        p:empty { display: none; }
        ol, ul { margin: 0; padding-left: 18px; }
        li { margin: 0; padding: 0; }
        table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        table td, table th { border: 1px solid #e2e8f0; padding: 6px 10px; }

        /* Fração */
        .fraction { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; vertical-align: middle; margin: 0 0.1em; line-height: 1; font-size: 0.85em; }
        .fraction-top { padding: 0 0.15em; position: relative; }
        .fraction-top::after { content: ''; display: block; width: 100%; height: 1px; background: currentColor; margin-top: 0.1em; }
        .fraction-bottom { padding: 0 0.15em; }

        /* Raiz / Radical */
        .math-root { display: inline-flex; align-items: center; vertical-align: middle; margin: 0 0.15em; font-size: 0.95em; }
        .math-root .root-index { font-size: 0.6em; line-height: 1; align-self: flex-start; margin-right: 0.05em; transform: translateY(0.1em); }
        .math-root .root-symbol { font-size: 1.3em; line-height: 1; margin-right: 0; }
        .math-root .root-radicand { display: inline-flex; align-items: center; border-top: 1.5px solid currentColor; padding: 0 0.2em 0 0.1em; line-height: 1.3; min-width: 0.5em; vertical-align: middle; }
        .math-root .root-radicand .fraction { font-size: 0.85em; vertical-align: middle; }


        
        @media print {
            @page { size: A5 landscape; margin: 5mm; }
            body { background: white; width: 210mm; }
            .print-page { box-shadow: none; border: none; width: 210mm; height: 148.5mm; page-break-after: always; }
            .print-page:last-child { page-break-after: auto; }
        }
    </style>
</head>
<body>
    <div class="print-container">
        ${pages.map((html, index) => {
          // Limpeza básica do HTML
          const cleanHtml = html.replace(/<div class="metadata-header">[\s\S]*?<\/div>/, '');
          
          return `
        <div class="print-page">
            <div class="print-header">
                <div class="header-group">
                    <span class="header-disciplina">${disciplina}</span>
                    <span style="color: #cbd5e1">|</span>
                    <span class="header-assunto">${assunto}</span>
                    <span style="color: #cbd5e1">|</span>
                    <span class="header-titulo">${titulo}</span>
                    ${subtitulo ? `<span style="color: #cbd5e1">|</span><span class="header-subtitulo">${subtitulo}</span>` : ''}
                </div>
                <div class="header-page">PÁGINA ${(index + 1).toString().padStart(2, '0')}</div>
            </div>
            <div class="print-content">
                <div class="ProseMirror">
                    ${cleanHtml}
                </div>
            </div>
        </div>`;
        }).join('')}
    </div>
</body>
</html>`;

  return htmlContent;
};

export const downloadHtmlFile = (filename: string, content: string) => {
  const element = document.createElement('a');
  const file = new Blob([content], { type: 'text/html' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
