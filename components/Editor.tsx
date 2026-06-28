'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { Table, TableView } from '@tiptap/extension-table';
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
import { Plus, Trash2, Layers, ChevronUp, ChevronDown, Square, Copy, Clipboard } from 'lucide-react';
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
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: string;
  borderRadius?: number;
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
      borderColor: htmlEl.getAttribute('data-border-color') || undefined,
      borderWidth: htmlEl.getAttribute('data-border-width') ? parseInt(htmlEl.getAttribute('data-border-width')!) : undefined,
      borderStyle: htmlEl.getAttribute('data-border-style') || undefined,
      borderRadius: htmlEl.getAttribute('data-border-radius') ? parseInt(htmlEl.getAttribute('data-border-radius')!) : undefined,
    };
  });
};

const serializeBoxesToHtml = (boxes: CanvasBox[], paths: DrawingPath[], metadataStr: string): string => {
  const boxesHtml = boxes.map(box => {
    const hasBorder = box.borderWidth && box.borderWidth > 0 && box.borderStyle && box.borderStyle !== 'none';
    const borderInlineStyle = hasBorder ? `border: ${box.borderWidth}px ${box.borderStyle} ${box.borderColor || '#000000'};` : '';
    const radiusInlineStyle = (box.borderRadius ?? 0) > 0 ? `border-radius: ${box.borderRadius}px;` : '';
    const borderDataAttrs = box.borderColor ? `data-border-color="${box.borderColor}" ` : '';
    const borderWidthAttr = box.borderWidth !== undefined ? `data-border-width="${box.borderWidth}" ` : '';
    const borderStyleAttr = box.borderStyle ? `data-border-style="${box.borderStyle}" ` : '';
    const borderRadiusAttr = box.borderRadius !== undefined ? `data-border-radius="${box.borderRadius}" ` : '';
    return `<div class="canvas-box" data-id="${box.id}" ${borderDataAttrs}${borderWidthAttr}${borderStyleAttr}${borderRadiusAttr}style="position: absolute; left: ${box.x}px; top: ${box.y}px; width: ${typeof box.width === 'number' ? box.width + 'px' : box.width}; height: ${typeof box.height === 'number' ? box.height + 'px' : box.height}; z-index: ${box.zIndex}; ${borderInlineStyle} ${radiusInlineStyle}">${box.content}</div>`;
  }).join('');
  const pathsHtml = paths.map(p => {
    const d = p.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    return `<path d="${d}" stroke="${p.color}" stroke-width="${p.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
  }).join('');
  const svgHtml = paths.length > 0 ? `<svg class="drawing-layer" style="position: absolute; inset: 0; pointer-events: none; width: 100%; height: 100%; z-index: 5;">${pathsHtml}</svg>` : '';
  return `<div class="metadata-header" style="display:none;">${metadataStr}</div>${svgHtml}${boxesHtml}`;
};

// --- Border Panel Sub-Component ---

const BORDER_STYLES = [
  { value: 'none',   label: 'Nenhuma' },
  { value: 'solid',  label: 'Sólida' },
  { value: 'dashed', label: 'Tracejada' },
  { value: 'dotted', label: 'Pontilhada' },
  { value: 'double', label: 'Dupla' },
];

const BorderPanel = ({ box, onUpdate, onClose }: { box: CanvasBox; onUpdate: (props: Partial<CanvasBox>) => void; onClose: () => void }) => {
  const [color, setColor] = useState(box.borderColor || '#3b82f6');
  const [width, setWidth] = useState(box.borderWidth ?? 1);
  const [style, setStyle] = useState(box.borderStyle || 'solid');
  const [radius, setRadius] = useState(box.borderRadius ?? 0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const apply = useCallback((c: string, w: number, s: string, r: number) => {
    onUpdate({ borderColor: c, borderWidth: w, borderStyle: s, borderRadius: r });
  }, [onUpdate]);

  return (
    <div
      ref={panelRef}
      className="absolute top-8 left-0 z-[200] w-52 rounded-xl border border-slate-200 bg-white shadow-2xl p-3 flex flex-col gap-3"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Borda do Bloco</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xs font-bold">✕</button>
      </div>

      {/* Estilo */}
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Estilo</label>
        <div className="flex flex-wrap gap-1">
          {BORDER_STYLES.map(bs => (
            <button
              key={bs.value}
              onClick={() => { setStyle(bs.value); apply(color, width, bs.value, radius); }}
              className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                style === bs.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {bs.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview + Cor */}
      <div className="flex items-center gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Cor</label>
          <input
            type="color"
            value={color}
            onInput={(e: any) => { setColor(e.target.value); apply(e.target.value, width, style, radius); }}
            className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Preview</label>
          <div
            className="h-9 bg-slate-50"
            style={{
              border: style !== 'none' ? `${width}px ${style} ${color}` : '1px dashed #cbd5e1',
              borderRadius: `${radius}px`,
            }}
          />
        </div>
      </div>

      {/* Espessura */}
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Espessura — <span className="text-blue-600 font-black">{width}px</span>
        </label>
        <input
          type="range"
          min={1}
          max={12}
          value={width}
          onChange={(e) => { const v = parseInt(e.target.value); setWidth(v); apply(color, v, style, radius); }}
          className="w-full accent-blue-600"
        />
      </div>

      {/* Arredondamento */}
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Arredondamento — <span className="text-indigo-600 font-black">{radius}px</span>
        </label>
        <input
          type="range"
          min={0}
          max={64}
          value={radius}
          onChange={(e) => { const v = parseInt(e.target.value); setRadius(v); apply(color, width, style, v); }}
          className="w-full accent-indigo-600"
        />
      </div>

      {/* Remover borda */}
      {(box.borderStyle && box.borderStyle !== 'none' || (box.borderRadius ?? 0) > 0) && (
        <button
          onClick={() => { onUpdate({ borderColor: undefined, borderWidth: 0, borderStyle: 'none', borderRadius: 0 }); onClose(); }}
          className="text-[10px] font-bold text-red-500 hover:text-red-700 text-left"
        >
          ✕ Remover borda
        </button>
      )}
    </div>
  );
};

// --- Sub-Components ---

const normalizeHtmlForComparison = (html: string): string => {
  if (!html) return '';
  const cleanedStyles = html.replace(/style="([^"]*?)"/g, (match, styleContent) => {
    const rules = styleContent
      .split(';')
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0)
      .map((r: string) => r.replace(/:\s+/g, ':'));
    return `style="${rules.join(';')}"`;
  });
  return cleanedStyles.replace(/\s+/g, ' ').trim();
};

class CustomTableView extends TableView {
  constructor(node: any, cellMinWidth: number) {
    super(node, cellMinWidth);
    this.applyCustomStyle();
  }

  update(node: any) {
    const result = super.update(node);
    this.applyCustomStyle();
    return result;
  }

  applyCustomStyle() {
    if (this.node.attrs.style) {
      this.table.style.cssText = this.node.attrs.style;
    }
  }
}

const CustomTable = Table.extend({
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) {
            return {}
          }
          return { style: attributes.style }
        },
      },
    }
  },
  addOptions() {
    return {
      ...this.parent?.(),
      View: CustomTableView,
    }
  }
});

const MiniEditor = ({ box, updateBox, onFocus }: { box: CanvasBox, updateBox: any, onFocus: any }) => {
  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TextStyle, Color, FontFamily, TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }), Link, Image, CustomTable.configure({ resizable: true }), TableRow, TableHeader, TableCell,
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
    if (editor) {
      const currentNormalized = normalizeHtmlForComparison(editor.getHTML());
      const incomingNormalized = normalizeHtmlForComparison(box.content);
      
      if (incomingNormalized !== currentNormalized) {
        // Evita atualizar o conteúdo do editor se ele estiver focado ou em processo de composição (IME / acentuação)
        if (editor.isFocused || editor.view.composing) {
          return;
        }
        editor.commands.setContent(box.content);
      }
    }
  }, [box.content, editor]);

  return (
    <div className="w-full h-full bg-transparent max-w-none focus:outline-none cursor-text">
      <EditorContent editor={editor} />
    </div>
  );
}

// --- BoxWithBorder: Rnd wrapper with border panel ---

const BoxWithBorder = ({ box, isPenActive, showGrid, updateBox, bringToFront, deleteBox, onFocus, onCopy }: {
  box: CanvasBox;
  isPenActive: boolean;
  showGrid: boolean;
  updateBox: (id: string, props: Partial<CanvasBox>) => void;
  bringToFront: (id: string) => void;
  deleteBox: (id: string) => void;
  onFocus: any;
  onCopy: (box: CanvasBox) => void;
}) => {
  const [showBorderPanel, setShowBorderPanel] = useState(false);
  const hasBorder = box.borderStyle && box.borderStyle !== 'none' && (box.borderWidth ?? 0) > 0;
  const hasRadius = (box.borderRadius ?? 0) > 0;

  const boxBorderStyle: React.CSSProperties = {
    ...(hasBorder ? { border: `${box.borderWidth}px ${box.borderStyle} ${box.borderColor || '#000000'}` } : {}),
    ...(hasRadius ? { borderRadius: `${box.borderRadius}px` } : {}),
  };

  return (
    <Rnd
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
      {/* Floating action bar */}
      <div className="absolute -top-6 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity no-print" style={{ zIndex: 210 }}>
        <div className="box-drag-handle h-6 px-2 bg-blue-500 text-white cursor-move flex items-center justify-center rounded border border-blue-600 shadow text-[10px] font-bold">
          ARRASTAR
        </div>
        <button onClick={() => bringToFront(box.id)} className="h-6 w-6 bg-slate-700 text-white rounded flex items-center justify-center hover:bg-slate-600" title="Trazer para frente">
          <Layers size={12} />
        </button>
        <button
          onClick={() => onCopy(box)}
          title="Copiar bloco (Ctrl+C)"
          className="h-6 w-6 bg-emerald-500 text-white rounded flex items-center justify-center hover:bg-emerald-600 transition-all"
        >
          <Copy size={11} />
        </button>

        {/* Border button */}
        <div className="relative">
          <button
            onClick={() => setShowBorderPanel(v => !v)}
            title="Editar Borda"
            className={`h-6 w-6 rounded flex items-center justify-center transition-all ${
              hasBorder
                ? 'bg-indigo-500 text-white border border-indigo-600 shadow-md'
                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Square size={11} />
          </button>
          {showBorderPanel && (
            <BorderPanel
              box={box}
              onUpdate={(props) => updateBox(box.id, props)}
              onClose={() => setShowBorderPanel(false)}
            />
          )}
        </div>

        <button onClick={() => deleteBox(box.id)} className="h-6 w-6 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600" title="Deletar bloco">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Box content */}
      <div
        className="w-full h-full border border-dashed border-transparent group-hover:border-blue-300 focus-within:border-blue-500 focus-within:border-solid focus-within:ring-2 focus-within:ring-blue-100 bg-white shadow-sm overflow-hidden print:border-none print:shadow-none print:bg-transparent transition-all duration-200"
        style={boxBorderStyle}
        onClick={() => bringToFront(box.id)}
      >
        <MiniEditor box={box} updateBox={updateBox} onFocus={onFocus} />
      </div>
    </Rnd>
  );
};

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
  showGrid,
  onCopyBox,
  onPasteBox,
  hasClipboard,
}: any) => {
  const [boxes, setBoxes] = useState<CanvasBox[]>([]);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);

  // Flag para evitar que o useEffect sobrescreva mudanças internas
  const internalUpdate = useRef(false);

  // Sincronizar com conteúdo externo (ex: carregar arquivo), mas ignorar
  // quando a mudança veio de dentro do próprio Paper (internalUpdate=true)
  useEffect(() => {
    if (internalUpdate.current) {
      internalUpdate.current = false;
      return;
    }
    setBoxes(parseHtmlToBoxes(content));
    setPaths(parseHtmlToPaths(content));
  }, [content]);

  const handleUpdate = (newBoxes: CanvasBox[], newPaths: DrawingPath[]) => {
    internalUpdate.current = true;
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

        {/* Colar bloco copiado nesta página */}
        {hasClipboard && onPasteBox && (
          <button
            onClick={() => onPasteBox()}
            className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-600 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center animate-pulse"
            title="Colar bloco copiado nesta página (Ctrl+V)"
          >
            <Clipboard size={20} />
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
        {/* Metadata Header — fora do canvas para blocos não sobreporem */}
        <div className="no-print flex items-center justify-between gap-3 border-b-2 border-slate-900 px-[var(--paper-padding-x)] shrink-0 bg-white" style={{ height: 'var(--header-height)' }}>
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

           {boxes.map(box => (
              <BoxWithBorder
                key={box.id}
                box={box}
                isPenActive={isPenActive}
                showGrid={showGrid}
                updateBox={updateBox}
                bringToFront={bringToFront}
                deleteBox={deleteBox}
                onFocus={onFocus}
                onCopy={onCopyBox}
              />
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
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'disabled';
  status: any;
  onStatusChange: (status: any) => void;
  initialContent: string;
  availableDisciplines: string[];
}

const Editor: React.FC<EditorProps> = ({
  pages, currentPage, onPageChange, onAddPage, onRemovePage, onUpdatePage, onMovePage, onSave, onPrint,
  disciplina, assunto, titulo, subtitulo, onMetadataChange, isSaving, saveSuccess, autosaveStatus, status, onStatusChange, initialContent, availableDisciplines
}) => {
  const [isPenActive, setIsPenActive] = useState(false);
  const [penColor, setPenColor] = useState('#3b82f6');
  const [activeEditor, setActiveEditor] = useState<any>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [hasLocalClipboard, setHasLocalClipboard] = useState(false);
  const [pasteTarget, setPasteTarget] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleCopyBox = (box: CanvasBox) => {
    const jsonStr = JSON.stringify(box);
    const htmlContent = `<!-- HTML-STUDIO-BOX: ${jsonStr} -->${box.content}`;

    // Converte HTML em texto simples para a área de transferência do SO
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = box.content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    // Cria um item na área de transferência com HTML e texto simples
    try {
      const data = [
        new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        })
      ];

      navigator.clipboard.write(data).then(() => {
        setHasLocalClipboard(true);
        showToast('Bloco copiado para a área de transferência! Cole com Ctrl+V');
      }).catch(err => {
        console.error('Falha ao usar Clipboard API:', err);
        setHasLocalClipboard(true);
        (window as any).__localBoxClipboard = box;
        showToast('Bloco copiado (interno)! Cole com Ctrl+V');
      });
    } catch (err) {
      console.error('Erro ao instanciar ClipboardItem:', err);
      // Fallback para navegadores sem suporte ou bloqueios
      setHasLocalClipboard(true);
      (window as any).__localBoxClipboard = box;
      showToast('Bloco copiado (interno)! Cole com Ctrl+V');
    }
  };

  const insertBox = useCallback((pageIndex: number, boxToPaste: CanvasBox) => {
    const newBox: CanvasBox = {
      ...boxToPaste,
      id: 'box-' + Date.now() + Math.random(),
      x: boxToPaste.x + 20,
      y: boxToPaste.y + 20,
    };
    const currentHtml = pages[pageIndex] || '';
    const existingBoxes = parseHtmlToBoxes(currentHtml);
    const existingPaths = parseHtmlToPaths(currentHtml);
    const metaStr = [disciplina, assunto, titulo, subtitulo].join('|');
    onUpdatePage(pageIndex, serializeBoxesToHtml([...existingBoxes, newBox], existingPaths, metaStr));
    showToast('Bloco colado com toda a formatação!');
  }, [pages, disciplina, assunto, titulo, subtitulo, onUpdatePage]);

  const handlePasteBox = useCallback(async (pageIndex: number) => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          const html = await blob.text();
          const match = html.match(/<!-- HTML-STUDIO-BOX:\s*(\{.*?\})\s*-->/);
          if (match) {
            const boxData = JSON.parse(match[1]);
            insertBox(pageIndex, boxData);
            return;
          }
        }
      }
    } catch (err) {
      // Fallback para clipboard interno se houver erro ao acessar área de transferência do SO
      const fallbackBox = (window as any).__localBoxClipboard;
      if (fallbackBox) {
        insertBox(pageIndex, fallbackBox);
        return;
      }
    }
    showToast('Área de transferência não contém um bloco válido.');
  }, [insertBox]);

  // Paste with Ctrl+V (paste event) anywhere on the page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Ignora a colagem de bloco se o foco estiver dentro de um campo de texto/editor
      const activeEl = document.activeElement;
      const isEditingText = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.hasAttribute('contenteditable') ||
        activeEl.closest('[contenteditable]')
      );
      if (isEditingText) return;

      const html = e.clipboardData?.getData('text/html');
      if (html && html.includes('<!-- HTML-STUDIO-BOX:')) {
        const match = html.match(/<!-- HTML-STUDIO-BOX:\s*(\{.*?\})\s*-->/);
        if (match) {
          e.preventDefault();
          try {
            const boxData = JSON.parse(match[1]);
            const target = pasteTarget !== null ? pasteTarget : currentPage;
            insertBox(target, boxData);
          } catch (err) {
            console.error('Erro ao parsear bloco do HTML colado:', err);
          }
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPenActive(false);
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [insertBox, pasteTarget, currentPage]);

  const capitalizeFirst = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };



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

  const renderAutosaveIndicator = () => {
    switch (autosaveStatus) {
      case 'saving':
        return (
          <div className="flex items-center gap-1.5 text-blue-400 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            <span>SALVANDO...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center gap-1.5 text-emerald-400 transition-all duration-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>SALVO AUTOMATICAMENTE</span>
          </div>
        );
      case 'idle':
        return (
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>ALTERAÇÕES SALVAS</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 text-rose-500 font-bold animate-bounce">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>ERRO AO SALVAR!</span>
          </div>
        );
      case 'disabled':
      default:
        return (
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            <span>AUTOSAVE INATIVO (SALVE NO DISCO)</span>
          </div>
        );
    }
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
              onCopyBox={handleCopyBox}
              onPasteBox={() => handlePasteBox(idx)}
              onMouseEnter={() => setPasteTarget(idx)}
              hasClipboard={hasLocalClipboard}
            />
          ))}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-[12px] font-bold shadow-2xl border border-slate-700 animate-fade-in no-print">
          <Copy size={14} className="text-emerald-400" />
          {toastMsg}
        </div>
      )}
      
      {/* Footer Info */}
      <div className="h-8 bg-slate-900 text-white flex items-center px-4 justify-between text-[10px] font-mono border-t border-slate-800 z-50">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-slate-500 uppercase">Total de Páginas:</span>
          <span className="text-blue-400 font-bold">{pages.length}</span>
          <span className="text-slate-600 ml-2">({Math.ceil(pages.length / 2)} Folhas A4)</span>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          {renderAutosaveIndicator()}
        </div>

        <div className="flex-1 text-right text-slate-500 truncate">
          <span className="text-white italic">Multi-Page A5 Landscape Mode</span>
        </div>
      </div>
    </div>
  );
};

export default Editor;
