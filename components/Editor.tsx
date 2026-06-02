'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Strike } from '@tiptap/extension-strike';
import { CodeBlock } from '@tiptap/extension-code-block';
import { FontSize } from '../lib/FontSizeExtension';
import { LineHeight } from '../lib/LineHeightExtension';
import { Fraction } from '../lib/FractionNode';
import { Root } from '../lib/RootNode';
import { MarkdownPaste } from '../lib/MarkdownPasteExtension';
import { Rnd } from 'react-rnd';
import { Plus, Trash2, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import Toolbar from './Toolbar';
import { generatePrintableHtml, downloadHtmlFile } from '../lib/HtmlGenerator';

// --- Interfaces ---

interface DrawingPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface CanvasBox {
  id: string;
  x: number;
  y: number;
  width: number | string;
  height: number | string;
  zIndex: number;
  content: string;
}

// --- Utils ---

const parseHtmlToPaths = (html: string): DrawingPath[] => {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const svg = doc.querySelector('.drawing-layer');
  if (!svg) return [];
  const pathEls = svg.querySelectorAll('path');
  return Array.from(pathEls).map(el => {
    const d = el.getAttribute('d') || '';
    const color = el.getAttribute('stroke') || '#000000';
    const width = parseInt(el.getAttribute('stroke-width') || '2');
    const parts = d.split(/[ML]/).filter(p => p.trim() !== '');
    const points = parts.map(p => {
      const [x, y] = p.trim().split(/\s+/).map(Number);
      return { x, y };
    }).filter(p => !isNaN(p.x) && !isNaN(p.y));
    return { points, color, width };
  });
};

const parseHtmlToBoxes = (html: string): CanvasBox[] => {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const boxEls = doc.querySelectorAll('.canvas-box');
  if (boxEls.length === 0) {
     // Verifica se há conteúdo real além do metadata-header (que sempre existe no HTML serializado)
     const bodyClone = doc.body.cloneNode(true) as HTMLElement;
     bodyClone.querySelectorAll('.metadata-header').forEach(el => el.remove());
     if (bodyClone.innerHTML.trim() !== '') {
        return [{ id: 'box-' + Date.now(), x: 40, y: 40, width: 400, height: 'auto', zIndex: 1, content: doc.body.innerHTML }];
     }
     return [];
  }
  return Array.from(boxEls).map(el => {
    const htmlEl = el as HTMLElement;
    return {
      id: htmlEl.getAttribute('data-id') || 'box-' + Date.now() + Math.random(),
      x: parseInt(htmlEl.style.left) || 0,
      y: parseInt(htmlEl.style.top) || 0,
      width: htmlEl.style.width === 'auto' ? 'auto' : parseInt(htmlEl.style.width) || 300,
      height: htmlEl.style.height === 'auto' ? 'auto' : parseInt(htmlEl.style.height) || 'auto',
      zIndex: parseInt(htmlEl.style.zIndex) || 1,
      content: htmlEl.innerHTML,
    };
  });
};

const serializeBoxesToHtml = (boxes: CanvasBox[], paths: DrawingPath[], metadataStr: string): string => {
  const boxesHtml = boxes.map(box => `<div class="canvas-box" data-id="${box.id}" style="position: absolute; left: ${box.x}px; top: ${box.y}px; width: ${typeof box.width === 'number' ? box.width + 'px' : box.width}; height: ${typeof box.height === 'number' ? box.height + 'px' : box.height}; z-index: ${box.zIndex};">${box.content}</div>`).join('');
  const pathsHtml = paths.map(p => {
    const d = p.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    return `<path d="${d}" stroke="${p.color}" stroke-width="${p.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
  }).join('');
  const svgHtml = paths.length > 0 ? `<svg class="drawing-layer" style="position: absolute; inset: 0; pointer-events: none; width: 100%; height: 100%; z-index: 5;">${pathsHtml}</svg>` : '';
  return `<div class="metadata-header" style="display:none;">${metadataStr}</div>${svgHtml}${boxesHtml}`;
};

// --- Sub-Components ---

const MiniEditor = ({ box, updateBox, onFocus }: { box: CanvasBox, updateBox: any, onFocus: any }) => {
  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TextStyle, Color, FontFamily, TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }), Link, Image, Table, TableRow, TableHeader, TableCell,
      TaskList, TaskItem, Subscript, Superscript, Strike, CodeBlock, FontSize, LineHeight, Fraction, Root, MarkdownPaste
    ],
    content: box.content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      updateBox(box.id, { content: editor.getHTML() });
    },
    onFocus: ({ editor }) => {
      onFocus(editor);
    }
  });

  // Sincronizar conteúdo se mudar externamente (ex: carregar arquivo)
  useEffect(() => {
    if (editor && box.content !== editor.getHTML()) {
      editor.commands.setContent(box.content);
    }
  }, [box.content, editor]);

  return (
    <div className="w-full h-full bg-transparent max-w-none focus:outline-none cursor-text">
      <EditorContent editor={editor} />
    </div>
  );
}

const Paper = ({ 
  index, 
  content, 
  onUpdate, 
  onFocus, 
  onDeselect,
  isPenActive, 
  penColor,
  disciplina, 
  assunto, 
  titulo, 
  subtitulo,
  onRemove,
  onMove,
  isFirst,
  isLast,
  showGrid
}: any) => {
  const [boxes, setBoxes] = useState<CanvasBox[]>([]);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);

  // Inicializar dados do HTML
  useEffect(() => {
    setBoxes(parseHtmlToBoxes(content));
    setPaths(parseHtmlToPaths(content));
  }, [content]);

  const handleUpdate = (newBoxes: CanvasBox[], newPaths: DrawingPath[]) => {
    setBoxes(newBoxes);
    setPaths(newPaths);
    const metaStr = [disciplina, assunto, titulo, subtitulo].join('|');
    onUpdate(index, serializeBoxesToHtml(newBoxes, newPaths, metaStr));
  };

  const updateBox = (id: string, newProps: Partial<CanvasBox>) => {
    const next = boxes.map(b => b.id === id ? { ...b, ...newProps } : b);
    handleUpdate(next, paths);
  };

  const deleteBox = (id: string) => {
    handleUpdate(boxes.filter(b => b.id !== id), paths);
  };

  const bringToFront = (id: string) => {
    const maxZ = Math.max(0, ...boxes.map(b => b.zIndex));
    updateBox(id, { zIndex: maxZ + 1 });
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dragType = e.dataTransfer.getData('application/x-tiptap-drag-type');
    if (!dragType) return;

    const paperRect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - paperRect.left;
    const y = e.clientY - paperRect.top;

    let initContent = '<p>Novo conteúdo</p>';
    if (dragType === 'h1') initContent = '<h1>Título 1</h1>';
    else if (dragType === 'h2') initContent = '<h2>Título 2</h2>';
    else if (dragType === 'h3') initContent = '<h3>Título 3</h3>';
    else if (dragType === 'table') initContent = '<table><tbody><tr><td><p></p></td><td><p></p></td></tr><tr><td><p></p></td><td><p></p></td></tr></tbody></table>';
    else if (dragType === 'bulletList') initContent = '<h3>Título da Lista</h3><ul><li><p>Primeiro item</p></li><li><p>Segundo item</p></li><li><p>Terceiro item</p></li></ul>';
    else if (dragType === 'orderedList') initContent = '<h3>Passos</h3><ol><li><p>Primeiro passo</p></li><li><p>Segundo passo</p></li></ol>';
    else if (dragType === 'taskList') initContent = '<h3>Checklist</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Nova tarefa</p></li><li data-type="taskItem" data-checked="false"><p>Outra tarefa</p></li></ul>';
    else if (dragType === 'blockquote') initContent = '<blockquote><p></p></blockquote>';
    else if (dragType === 'codeBlock') initContent = '<pre><code></code></pre>';
    else if (dragType === 'image') {
      initContent = '<p>Use o botão de imagem para selecionar um arquivo local.</p>';
    }
    // horizontalRule foi removido para simplificar a inserção de blocos.

    const newBox: CanvasBox = {
      id: 'box-' + Date.now() + Math.random(),
      x, y,
      width: 300,
      height: 'auto',
      zIndex: Math.max(0, ...boxes.map(b => b.zIndex)) + 1,
      content: initContent
    };

    handleUpdate([...boxes, newBox], paths);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPenActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPath({ points: [{ x, y }], color: penColor, width: 3 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPenActive || !currentPath) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPath({ ...currentPath, points: [...currentPath.points, { x, y }] });
  };

  const handleMouseUp = () => {
    if (!isPenActive || !currentPath) return;
    handleUpdate(boxes, [...paths, currentPath]);
    setCurrentPath(null);
  };

  return (
    <div className="relative group/page">
      {/* Botões de Ações na Lateral Esquerda */}
      <div className="absolute -left-12 top-0 opacity-0 group-hover/page:opacity-100 transition-opacity no-print flex flex-col gap-2 z-[60]">
        {/* Mover para Cima */}
        {!isFirst && (
          <button 
            onClick={() => onMove?.('up')}
            className="p-2 rounded-xl bg-white text-slate-500 hover:text-blue-600 border border-slate-200 shadow-sm hover:shadow-md transition-all hover:bg-slate-50 active:scale-95 cursor-pointer flex items-center justify-center"
            title="Mover Página para Cima"
          >
            <ChevronUp size={20} />
          </button>
        )}
        
        {/* Mover para Baixo */}
        {!isLast && (
          <button 
            onClick={() => onMove?.('down')}
            className="p-2 rounded-xl bg-white text-slate-500 hover:text-blue-600 border border-slate-200 shadow-sm hover:shadow-md transition-all hover:bg-slate-50 active:scale-95 cursor-pointer flex items-center justify-center"
            title="Mover Página para Baixo"
          >
            <ChevronDown size={20} />
          </button>
        )}

        {/* Remover Página (Apenas se não for a única) */}
        {(!isFirst || !isLast) && (
          <button 
            onClick={onRemove}
            className="p-2 rounded-xl bg-white text-slate-400 hover:text-red-600 border border-slate-200 shadow-sm hover:shadow-md transition-all hover:bg-slate-50 active:scale-95 cursor-pointer flex items-center justify-center"
            title="Remover Página"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      <div 
        className="paper shrink-0 relative"
        onDrop={handleCanvasDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div 
          className={`paper-inner w-full relative bg-white ${isPenActive ? 'cursor-crosshair' : ''} ${showGrid ? 'show-grid' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => {
            if (!isPenActive && (e.target as HTMLElement).classList.contains('paper-inner')) {
              onDeselect?.();
            }
          }}
        >
          {/* Camada de Desenho (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]">
            {paths.map((p, i) => (
              <path
                key={i}
                d={p.points.map((pt, j) => `${j === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')}
                stroke={p.color}
                strokeWidth={p.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath && (
              <path
                d={currentPath.points.map((pt, j) => `${j === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')}
                stroke={currentPath.color}
                strokeWidth={currentPath.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
           
           {/* Margem de Segurança / Sangria (Oculta na impressão) */}
           <div className="absolute inset-0 border-2 border-red-300/10 border-dashed pointer-events-none z-0 print:border-none">
              <span className="absolute -top-4 left-2 text-red-300/30 text-[10px] font-bold uppercase tracking-widest select-none no-print">
                  PÁGINA A5 PAISAGEM (210 x 148.5)
              </span>
           </div>

           {/* Metadata Header */}
           <div className="absolute top-0 left-0 right-0 flex items-center justify-between gap-3 border-b-2 border-slate-900 px-[var(--paper-padding-x)] z-10 no-print" style={{ height: 'var(--header-height)' }}>
             <div className="flex items-center flex-wrap gap-2 min-w-0">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none truncate">{disciplina || 'DISCIPLINA'}</span>
               <span className="text-slate-300 text-[10px]">|</span>
               <span className="font-bold text-slate-500 uppercase text-[11px] truncate">{assunto || 'ASSUNTO'}</span>
               <span className="text-slate-300 text-[10px]">|</span>
               <span className="font-black text-slate-800 uppercase text-[12px] truncate">{titulo || 'TÍTULO'}</span>
               {subtitulo && (
                 <>
                   <span className="text-slate-300 text-[10px]">|</span>
                   <span className="font-medium text-slate-400 uppercase text-[11px] truncate">{subtitulo}</span>
                 </>
               )}
             </div>
             <div className="text-[11px] font-black text-slate-900 uppercase whitespace-nowrap">
               PÁGINA {(index + 1).toString().padStart(2, '0')}
             </div>
           </div>

           {boxes.map(box => (
              <Rnd
                key={box.id}
                position={{ x: box.x, y: box.y }}
                size={{ width: box.width, height: box.height }}
                dragGrid={showGrid ? [8, 8] : undefined}
                resizeGrid={showGrid ? [8, 8] : undefined}
                onDragStop={(e, d) => updateBox(box.id, { x: d.x, y: d.y })}
                onResizeStop={(e, direction, ref, delta, position) => {
                  updateBox(box.id, {
                    width: ref.style.width,
                    height: ref.style.height,
                    ...position,
                  });
                }}
                bounds="parent"
                dragHandleClassName="box-drag-handle"
                style={{ zIndex: box.zIndex }}
                className={`group absolute ${isPenActive ? 'pointer-events-none' : ''}`}
              >
                <div className="absolute -top-6 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity no-print">
                   <div className="box-drag-handle h-6 px-2 bg-blue-500 text-white cursor-move flex items-center justify-center rounded border border-blue-600 shadow text-[10px] font-bold">
                      ARRASTAR
                   </div>
                   <button onClick={() => bringToFront(box.id)} className="h-6 w-6 bg-slate-700 text-white rounded flex items-center justify-center hover:bg-slate-600" title="Trazer para frente">
                      <Layers size={12} />
                   </button>
                   <button onClick={() => deleteBox(box.id)} className="h-6 w-6 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600" title="Deletar bloco">
                      <Trash2 size={12} />
                   </button>
                </div>
                <div className="w-full h-full border border-dashed border-transparent group-hover:border-blue-300 focus-within:border-blue-500 focus-within:border-solid focus-within:ring-2 focus-within:ring-blue-100 bg-white shadow-sm overflow-hidden print:border-none print:shadow-none print:bg-transparent transition-all duration-200" onClick={() => bringToFront(box.id)}>
                   <MiniEditor box={box} updateBox={updateBox} onFocus={onFocus} />
                </div>
              </Rnd>
           ))}
        </div>
      </div>
      
      {/* Indicador de "Vira" se for página par (simulando fim da folha A4) */}
      {(index + 1) % 2 === 0 && !isLast && (
        <div className="h-px w-full border-t-4 border-slate-300/30 border-dotted my-4 relative no-print">
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-[#f1f5f9] px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Fim da Folha A4
          </span>
        </div>
      )}
    </div>
  );
};

// --- Main Editor Component ---

interface EditorProps {
  pages: string[];
  currentPage: number;
  onPageChange: (index: number) => void;
  onAddPage: () => void;
  onRemovePage: (index: number) => void;
  onUpdatePage: (index: number, html: string) => void;
  onMovePage: (index: number, direction: 'up' | 'down') => void;
  onSave: () => void;
  onPrint: () => void;
  disciplina: string;
  assunto: string;
  titulo: string;
  subtitulo: string;
  onMetadataChange: (metadata: any) => void;
  isSaving: boolean;
  saveSuccess: boolean;
  status: any;
  onStatusChange: (status: any) => void;
  initialContent: string;
  availableDisciplines: string[];
}

const Editor: React.FC<EditorProps> = ({
  pages, currentPage, onPageChange, onAddPage, onRemovePage, onUpdatePage, onMovePage, onSave, onPrint,
  disciplina, assunto, titulo, subtitulo, onMetadataChange, isSaving, saveSuccess, status, onStatusChange, initialContent, availableDisciplines
}) => {
  const [isPenActive, setIsPenActive] = useState(false);
  const [penColor, setPenColor] = useState('#3b82f6');
  const [activeEditor, setActiveEditor] = useState<any>(null);
  const [showGrid, setShowGrid] = useState(true);

  const capitalizeFirst = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPenActive(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleWorkspaceClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('editor-workspace') || target.classList.contains('pages-container')) {
      if (activeEditor) {
        activeEditor.commands.blur();
        setActiveEditor(null);
      }
    }
  };

  const handleExportHtml = () => {
    const html = generatePrintableHtml(pages, { disciplina, assunto, titulo, subtitulo });
    downloadHtmlFile(`${titulo}.html`, html);
  };

  const handleInsertImage = (src: string) => {
    const currentContent = pages[currentPage] || '';
    const newBox = `<div class="canvas-box" data-id="box-${Date.now()}" style="position: absolute; left: 40px; top: 40px; width: 300px; height: auto; z-index: 1;"><img src="${src}" alt="Imagem" style="max-width:100%; height:auto; display:block;" /></div>`;
    onUpdatePage(currentPage, `${currentContent}${newBox}`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header Group (Fixed at top) */}
      <div className="relative flex flex-col shrink-0 z-[100] no-print bg-white">
        <Toolbar 
          editor={activeEditor} 
          onSave={onSave} 
          onPrint={onPrint}
          onExportHtml={handleExportHtml}
          onInsertImage={handleInsertImage}
          isSaving={isSaving} 
          saveSuccess={saveSuccess} 
          onClear={() => {}} 
          isPenActive={isPenActive}
          onTogglePen={() => setIsPenActive(!isPenActive)}
          penColor={penColor}
          onPenColorChange={setPenColor}
          onClearDrawings={() => {}} 
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
        />

        {/* Editor Metadata Bar */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
           <div className="flex flex-col gap-1 max-w-2xl">
             <input 
                value={disciplina} 
                onChange={e => onMetadataChange({ disciplina: capitalizeFirst(e.target.value) })} 
                className="text-[10px] font-black text-blue-500 bg-transparent outline-none uppercase tracking-widest" 
                placeholder="DISCIPLINA" 
             />
             <div className="flex items-center gap-3">
                <input 
                  value={assunto} 
                  onChange={e => onMetadataChange({ assunto: capitalizeFirst(e.target.value) })} 
                  className="font-bold text-slate-400 bg-transparent outline-none uppercase text-xs w-32" 
                  placeholder="ASSUNTO" 
                />
                <span className="text-slate-200">|</span>
                <input 
                  value={titulo} 
                  onChange={e => onMetadataChange({ titulo: capitalizeFirst(e.target.value) })} 
                  className="font-black text-slate-800 text-2xl bg-transparent outline-none uppercase tracking-tight flex-1" 
                  placeholder="TÍTULO DO DOCUMENTO" 
                />
                <span className="text-slate-200">|</span>
                <input 
                  value={subtitulo} 
                  onChange={e => onMetadataChange({ subtitulo: capitalizeFirst(e.target.value) })} 
                  className="font-medium text-slate-400 bg-transparent outline-none uppercase text-xs w-48" 
                  placeholder="SUBTÍTULO" 
                />
             </div>
           </div>
           
           <button 
             onClick={onAddPage}
             className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
           >
             <Plus size={18} />
             ADICIONAR PÁGINA
           </button>
        </div>
      </div>

      <div className="editor-workspace custom-scrollbar" onClick={handleWorkspaceClick}>
        <div className="pages-container">
          {pages.map((content, idx) => (
            <Paper
              key={idx}
              index={idx}
              content={content}
              onUpdate={onUpdatePage}
              onFocus={setActiveEditor}
              onDeselect={() => {
                if (activeEditor) {
                  activeEditor.commands.blur();
                  setActiveEditor(null);
                }
              }}
              isPenActive={isPenActive}
              penColor={penColor}
              disciplina={disciplina}
              assunto={assunto}
              titulo={titulo}
              subtitulo={subtitulo}
              onRemove={() => onRemovePage(idx)}
              onMove={(direction: 'up' | 'down') => onMovePage(idx, direction)}
              isFirst={idx === 0}
              isLast={idx === pages.length - 1}
              showGrid={showGrid}
            />
          ))}
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="h-8 bg-slate-900 text-white flex items-center px-4 gap-6 text-[10px] font-mono border-t border-slate-800 z-50">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 uppercase">Total de Páginas:</span>
          <span className="text-blue-400 font-bold">{pages.length}</span>
          <span className="text-slate-600 ml-2">({Math.ceil(pages.length / 2)} Folhas A4)</span>
        </div>
        <div className="flex-1 text-right text-slate-500 truncate">
          <span className="text-white italic">Multi-Page A5 Landscape Mode</span>
        </div>
      </div>
    </div>
  );
};

export default Editor;
