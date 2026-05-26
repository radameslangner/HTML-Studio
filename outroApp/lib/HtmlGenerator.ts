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
            --header-height: 30mm;
            --canvas-padding: 10mm;
        }

        html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white;
            font-family: 'Inter', sans-serif;
            width: 100%;
            height: 100%;
        }

        .print-container {
            display: block;
            width: 100%;
            height: 100%;
            background: white;
        }

        .print-page {
            width: 100%;
            height: 148.5mm;
            background: white;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            page-break-after: avoid;
        }

        .print-page:nth-child(even) {
            page-break-after: always;
        }

        .print-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #000;
            padding: 0 var(--canvas-padding);
            height: var(--header-height);
            box-sizing: border-box;
            flex-shrink: 0;
        }

        .header-group { display: flex; flex-direction: column; }
        .header-disciplina { font-size: 9px; font-weight: 900; color: #64748b; line-height: 1; text-transform: uppercase; }
        .header-main { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .header-assunto { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
        .header-titulo { font-size: 20px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1; }
        .header-subtitulo { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .header-page { font-size: 11px; font-weight: 900; color: #000; text-transform: uppercase; }

        .print-content {
            position: relative;
            flex: 1;
            overflow: hidden;
        }

        .ProseMirror {
            width: 100%;
            height: 100%;
            position: relative;
            padding: 0 var(--canvas-padding);
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
        h1 { font-size: 2.25rem; font-weight: 900; margin: 0; color: #0f172a; line-height: 1.1; }
        h2 { font-size: 1.875rem; font-weight: 800; margin: 0; color: #1e293b; line-height: 1.2; }
        h3 { font-size: 1.5rem; font-weight: 700; margin: 0; color: #334155; }
        p { margin: 0; line-height: 1.5; color: #475569; }
        table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
        table td, table th { border: 1px solid #e2e8f0; padding: 6px 10px; }
        
        @media print {
            @page { size: A4 portrait; margin: 0; }
            body { background: white; width: 210mm; }
            .print-page { box-shadow: none; border: none; width: 210mm; height: 148.5mm; }
        }
    </style>
</head>
<body>
    <div class="print-container">
        ${pages.map((html, index) => {
          // Limpeza básica do HTML
          const cleanHtml = html.replace(/<div class="metadata-header".*?<\/div>/s, '');
          
          return `
        <div class="print-page">
            <div class="print-header">
                <div class="header-group">
                    <span class="header-disciplina">${disciplina}</span>
                    <div class="header-main">
                        <span class="header-assunto">${assunto}</span>
                        <span style="color: #cbd5e1">|</span>
                        <span class="header-titulo">${titulo}</span>
                        ${subtitulo ? `<span style="color: #cbd5e1">|</span> <span class="header-subtitulo">${subtitulo}</span>` : ''}
                    </div>
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
