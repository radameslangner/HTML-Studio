'use client';

import React from 'react';

interface PrintLayoutProps {
  pages: string[];
  disciplina: string;
  assunto: string;
  titulo: string;
  subtitulo: string;
}

/**
 * Limpa o HTML para impressão, removendo apenas elementos de interface do editor
 * e normalizando espaços em branco que podem ter acumulado indevidamente.
 */
function prepareHtmlForPrint(html: string): string {
  if (typeof window === 'undefined') return html;

  // 1. Limpeza de espaços em branco excessivos e quebras de linha entre tags
  // Isso evita que o navegador crie páginas extras por causa de nós de texto vazios.
  let cleaned = html
    .replace(/>\s+</g, '><') // Remove espaços entre tags
    .trim();

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleaned, 'text/html');

  // Remover elementos que não devem ser impressos
  const toRemove = doc.querySelectorAll('.no-print, .box-drag-handle, .react-resizable-handle, .metadata-header');
  toRemove.forEach(el => el.remove());

  // Limpar espaços extras dentro dos boxes também (opcional, mas recomendado)
  const boxes = doc.querySelectorAll('.canvas-box');
  boxes.forEach(box => {
    // Se o box tiver apenas texto e espaços, limpa o excesso
    if (box.innerHTML.includes('\n')) {
       // Preservar apenas o que é necessário para o Tiptap (p, h1, etc)
    }
  });
  
  return doc.body.innerHTML;
}

const PrintLayout: React.FC<PrintLayoutProps> = ({
  pages,
  disciplina,
  assunto,
  titulo,
  subtitulo,
}) => {
  const sheetPages: string[][] = [];
  for (let i = 0; i < pages.length; i += 2) {
    sheetPages.push(pages.slice(i, i + 2));
  }

  return (
    <div className="hidden print:block w-full bg-white print-container">
      {sheetPages.map((pagesInSheet, sheetIndex) => (
        <div key={sheetIndex} className="print-sheet">
          {pagesInSheet.map((html, pageIndex) => {
            const pageNumber = sheetIndex * 2 + pageIndex + 1;
            return (
              <div
                key={pageNumber}
                className="print-page relative bg-white mx-auto overflow-visible"
              >
                {/* Header de Metadados */}
                <div 
                  className="print-header flex items-center justify-between gap-3 border-b-2 border-slate-900 px-[var(--paper-padding-x)]"
                  style={{ height: 'var(--header-height)' }}
                >
                  <div className="flex items-center flex-wrap gap-2 min-w-0">
                    <span className="text-[9px] font-black text-slate-500 uppercase leading-none tracking-tighter truncate">{disciplina}</span>
                    <span className="text-slate-400 text-[10px]">|</span>
                    <span className="font-bold text-slate-700 uppercase text-[11px] truncate">{assunto}</span>
                    <span className="text-slate-400 text-[10px]">|</span>
                    <span className="font-black text-black uppercase text-[12px] truncate">{titulo}</span>
                    {subtitulo && (
                      <>
                        <span className="text-slate-400 text-[10px]">|</span>
                        <span className="font-semibold text-slate-500 uppercase text-[11px] truncate">{subtitulo}</span>
                      </>
                    )}
                  </div>

                  <div className="text-[11px] font-black text-slate-900 uppercase whitespace-nowrap">
                    PÁGINA {pageNumber.toString().padStart(2, '0')}
                  </div>
                </div>

                <div 
                  className="print-content relative w-full overflow-visible"
                  style={{ height: 'calc(100% - var(--header-height))' }}
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html: prepareHtmlForPrint(html),
                    }}
                    className="ProseMirror relative w-full h-full"
                    style={{ 
                      padding: '0 var(--paper-padding-x)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default PrintLayout;
