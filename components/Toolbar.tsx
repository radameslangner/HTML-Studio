'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript as SubIcon,
  Superscript as SupIcon,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Save,
  Printer,
  Undo,
  Redo,
  Terminal,
  Columns,
  Rows,
  Trash2,
  CheckCircle2,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Pencil,
  Eraser,
  MousePointer2,
  FileCode,
  Grid,
  Sliders
} from 'lucide-react';

interface ToolbarProps {
  editor: Editor | null;
  onSave: () => void;
  onPrint: () => void;
  onClear: () => void;
  onExportHtml?: () => void;
  onInsertImage?: (src: string) => void;
  isSaving?: boolean;
  saveSuccess?: boolean;
  isPenActive: boolean;
  onTogglePen: () => void;
  penColor: string;
  onPenColorChange: (color: string) => void;
  onClearDrawings: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
}

const ToolbarButton = ({ onClick, isActive, title, children, disabled = false, danger = false, draggable = false, onDragStart }: any) => (
  <button
    onClick={onClick}
    disabled={!!disabled}
    draggable={draggable}
    onDragStart={onDragStart}
    className={`p-2 rounded-lg transition-all duration-200 ${isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      } ${disabled ? 'opacity-20 cursor-not-allowed' : ''} ${danger ? 'hover:bg-red-50 hover:text-red-600' : ''}`}
    title={title}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-6 bg-slate-200 mx-1" />;

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 30, 36, 48, 64];

const LINE_HEIGHTS = [0.5, 1.0, 1.25, 1.5, 1.75, 2.0];

// Cores padrão iniciais (valores estabelecidos em Hex/RGB)
const DEFAULT_COLORS = [
  { name: 'Preto Profundo', value: '#1e293b', rgb: 'rgb(30, 41, 59)' },
  { name: 'Vermelho Coral', value: '#ef4444', rgb: 'rgb(239, 68, 68)' },
  { name: 'Azul Real', value: '#3b82f6', rgb: 'rgb(59, 130, 246)' },
  { name: 'Verde Esmeralda', value: '#10b981', rgb: 'rgb(16, 185, 129)' },
  { name: 'Roxo Elétrico', value: '#8b5cf6', rgb: 'rgb(139, 92, 246)' },
];

const SPECIAL_CHARS = [
  'º', 'ª', '±', '×', '÷', '≠', '≈', '≤', '≥', '°', 'π', 'α', 'β', 'γ', 'Δ', 'θ', 'λ', 'μ', '→', '⇒', '∞', '✓', '✗', '★'
];

const Toolbar: React.FC<ToolbarProps> = ({
  editor, onSave, onPrint, onClear, onExportHtml, onInsertImage, isSaving, saveSuccess,
  isPenActive, onTogglePen, penColor, onPenColorChange, onClearDrawings, showGrid, onToggleGrid
}) => {
  // Estado para armazenar as 5 cores, carregando do localStorage se existirem
  const [presetColors, setPresetColors] = useState(DEFAULT_COLORS);
  const [isMounted, setIsMounted] = useState(false);

  // Índice da bolinha atualmente selecionada para edição
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(0);

  const [showFractionDialog, setShowFractionDialog] = useState(false);
  const [fractionNumerator, setFractionNumerator] = useState('');
  const [fractionDenominator, setFractionDenominator] = useState('');
  const [showRootDialog, setShowRootDialog] = useState(false);
  const [rootIndex, setRootIndex] = useState('');
  const [rootRadicand, setRootRadicand] = useState('');
  const [showSpecialCharsDialog, setShowSpecialCharsDialog] = useState(false);
  const [showLineHeightDialog, setShowLineHeightDialog] = useState(false);
  const [customLineHeight, setCustomLineHeight] = useState('1.5');
  const [lineHeightPos, setLineHeightPos] = useState<{ top: number; left: number } | null>(null);
  const lineHeightButtonRef = useRef<HTMLDivElement>(null);

  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableMenuPos, setTableMenuPos] = useState<{ top: number; left: number } | null>(null);
  const tableMenuButtonRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidthState] = useState(100);
  const [tableAlign, setTableAlignState] = useState<'left' | 'center' | 'right'>('left');

  const setTableWidth = (pct: number) => {
    if (!editor) return;
    const { state, view } = editor;
    const { from } = state.selection;
    // Walk up from cursor to find the table node
    let depth = state.doc.resolve(from).depth;
    while (depth > 0) {
      const node = state.doc.resolve(from).node(depth);
      if (node.type.name === 'table') {
        const pos = state.doc.resolve(from).before(depth);
        const existingStyle: string = node.attrs?.style || '';
        // Replace or add width in inline style
        const withoutWidth = existingStyle.replace(/width\s*:[^;]+;?/g, '').trim();
        const newStyle = `width:${pct}%;${withoutWidth ? ' ' + withoutWidth : ''}`;
        const tr = state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, style: newStyle });
        view.dispatch(tr);
        setTableWidthState(pct);
        return;
      }
      depth--;
    }
  };

  const setTableAlign = (align: 'left' | 'center' | 'right') => {
    if (!editor) return;
    const { state, view } = editor;
    const { from } = state.selection;
    let depth = state.doc.resolve(from).depth;
    while (depth > 0) {
      const node = state.doc.resolve(from).node(depth);
      if (node.type.name === 'table') {
        const pos = state.doc.resolve(from).before(depth);
        const existingStyle: string = node.attrs?.style || '';
        // Clean margin-left and margin-right
        let cleanedStyle = existingStyle
          .replace(/margin-left\s*:[^;]+;?/g, '')
          .replace(/margin-right\s*:[^;]+;?/g, '')
          .trim();
        
        let alignStyle = '';
        if (align === 'center') {
          alignStyle = 'margin-left:auto;margin-right:auto;';
        } else if (align === 'right') {
          alignStyle = 'margin-left:auto;margin-right:0;';
        } else {
          alignStyle = 'margin-left:0;margin-right:auto;';
        }
        
        const newStyle = `${alignStyle}${cleanedStyle ? ' ' + cleanedStyle : ''}`;
        const tr = state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, style: newStyle });
        view.dispatch(tr);
        setTableAlignState(align);
        return;
      }
      depth--;
    }
  };

  const openTableMenu = () => {
    if (tableMenuButtonRef.current) {
      const rect = tableMenuButtonRef.current.getBoundingClientRect();
      setTableMenuPos({ top: rect.bottom + 8, left: rect.left });
    }
    // Read current table width and alignment from the node
    if (editor) {
      const { state } = editor;
      const { from } = state.selection;
      let depth = state.doc.resolve(from).depth;
      while (depth > 0) {
        const node = state.doc.resolve(from).node(depth);
        if (node.type.name === 'table') {
          const style: string = node.attrs?.style || '';
          const match = style.match(/width\s*:\s*([\d.]+)%/);
          setTableWidthState(match ? Math.round(parseFloat(match[1])) : 100);

          // Determine current alignment
          const hasLeftAuto = /margin-left\s*:\s*auto/i.test(style);
          const hasRightAuto = /margin-right\s*:\s*auto/i.test(style);
          const hasRightZero = /margin-right\s*:\s*0/i.test(style);

          if (hasLeftAuto && hasRightAuto) {
            setTableAlignState('center');
          } else if (hasLeftAuto && hasRightZero) {
            setTableAlignState('right');
          } else {
            setTableAlignState('left');
          }
          break;
        }
        depth--;
      }
    }
    setShowTableMenu(true);
  };

  const closeTableMenu = () => {
    setShowTableMenu(false);
    setTableMenuPos(null);
  };

  const tableAction = (fn: () => void) => {
    try { fn(); } catch (e) { console.warn('table action:', e); }
    closeTableMenu();
  };

  // Picker de inserção de tabela
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tablePickerPos, setTablePickerPos] = useState<{ top: number; left: number } | null>(null);
  const tableInsertButtonRef = useRef<HTMLDivElement>(null);
  const [hoveredRows, setHoveredRows] = useState(1);
  const [hoveredCols, setHoveredCols] = useState(1);
  const TABLE_PICKER_MAX = 8;

  const openTablePicker = () => {
    if (tableInsertButtonRef.current) {
      const rect = tableInsertButtonRef.current.getBoundingClientRect();
      setTablePickerPos({ top: rect.bottom + 8, left: rect.left });
    }
    setHoveredRows(1);
    setHoveredCols(1);
    setShowTablePicker(true);
  };

  const closeTablePicker = () => {
    setShowTablePicker(false);
    setTablePickerPos(null);
  };

  const insertTableWithSize = (rows: number, cols: number) => {
    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    closeTablePicker();
  };

  // Carregar cores do localStorage após a montagem do componente no cliente
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('html-studio-preset-colors');
    if (saved) {
      try {
        setPresetColors(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Salvar alterações de cores no localStorage para persistência
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('html-studio-preset-colors', JSON.stringify(presetColors));
    }
  }, [presetColors, isMounted]);

  // Função para mudar a cor do slot ativo quando o picker de cor personalizada for usado
  const handleCustomColorChange = (newHex: string) => {
    editor?.chain().focus().setColor(newHex).run();

    // Converter Hex em string RGB para exibir no tooltip
    const r = parseInt(newHex.slice(1, 3), 16) || 0;
    const g = parseInt(newHex.slice(3, 5), 16) || 0;
    const b = parseInt(newHex.slice(5, 7), 16) || 0;
    const rgbStr = `rgb(${r}, ${g}, ${b})`;

    setPresetColors((prev: any) => {
      const updated = [...prev];
      if (selectedPresetIndex !== null && selectedPresetIndex >= 0 && selectedPresetIndex < 5) {
        updated[selectedPresetIndex] = {
          name: `Personalizada ${selectedPresetIndex + 1}`,
          value: newHex,
          rgb: rgbStr,
        };
      }
      return updated;
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const openFractionDialog = () => {
    if (!editor) return;
    const selection = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
    setFractionNumerator(selectedText || '');
    setFractionDenominator('');
    setShowRootDialog(false);
    setShowSpecialCharsDialog(false);
    setShowFractionDialog(true);
  };

  const closeFractionDialog = () => {
    setShowFractionDialog(false);
    setFractionNumerator('');
    setFractionDenominator('');
  };

  const insertFraction = () => {
    if (!editor) return;

    const numeratorText = fractionNumerator.trim();
    const denominatorText = fractionDenominator.trim();
    if (!numeratorText || !denominatorText) return;

    const fractionHtml = `<span class="fraction"><span class="fraction-top">${numeratorText}</span><span class="fraction-bottom">${denominatorText}</span></span>`;

    editor.chain().focus().insertContent(fractionHtml).run();
    closeFractionDialog();
  };

  const openRootDialog = () => {
    if (!editor) return;
    setRootIndex('');
    setRootRadicand('');
    setShowFractionDialog(false);
    setShowSpecialCharsDialog(false);
    setShowRootDialog(true);
  };

  const closeRootDialog = () => {
    setShowRootDialog(false);
    setRootIndex('');
    setRootRadicand('');
  };

  const insertRoot = () => {
    if (!editor) return;

    const indexText = rootIndex.trim() || '2';
    const radicandText = rootRadicand.trim();
    if (!radicandText) return;

    (editor.chain().focus() as any).insertRoot({ index: indexText, radicand: radicandText }).run();
    closeRootDialog();
  };

  const insertSpecialChar = (char: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(char).run();
    setShowSpecialCharsDialog(false);
  };

  const openLineHeightDialog = () => {
    if (!editor) return;
    const currentNode = editor.state.selection.$from.parent;
    const attrs = currentNode?.attrs || {};
    const height = attrs.lineHeight || '1.5';
    setCustomLineHeight(height.toString());
    if (lineHeightButtonRef.current) {
      const rect = lineHeightButtonRef.current.getBoundingClientRect();
      setLineHeightPos({ top: rect.bottom + 8, left: rect.left });
    }
    setShowLineHeightDialog(true);
  };

  const closeLineHeightDialog = () => {
    setShowLineHeightDialog(false);
    setLineHeightPos(null);
    setCustomLineHeight('1.5');
  };

  const applyLineHeight = (height: string) => {
    if (!editor) return;
    (editor.chain().focus() as any).setLineHeight(height.toString()).run();
    closeLineHeightDialog();
  };

  const applyCustomLineHeight = () => {
    const height = customLineHeight.trim();
    if (!height || isNaN(parseFloat(height))) return;
    applyLineHeight(height);
  };


  const addImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const src = await readFileAsDataUrl(file);
      const chain = editor?.chain().focus();

      if (editor && editor.can().setImage({ src })) {
        chain?.setImage({ src }).run();
        return;
      }

      if (editor && editor.can().insertContent({ type: 'image', attrs: { src } })) {
        chain?.insertContent({ type: 'image', attrs: { src } }).run();
        return;
      }

      if (onInsertImage) {
        onInsertImage(src);
        return;
      }

      if (editor) {
        chain?.insertContent(`<img src="${src}" alt="Imagem" />`).run();
      }
    } catch (error) {
      console.error('Erro ao carregar imagem:', error);
    } finally {
      event.target.value = '';
    }
  };

  const setLink = () => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('URL do Link:', previousUrl || '');
    if (url === null) return;
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const getCurrentFontSize = () => {
    const size = editor?.getAttributes('textStyle').fontSize;
    if (size) return parseInt(size.replace('px', '')) || 16;
    return 16; // default size
  };

  const increaseFontSize = () => {
    const currentSize = getCurrentFontSize();
    const nextSize = FONT_SIZES.find(s => s > currentSize) || FONT_SIZES[FONT_SIZES.length - 1];
    (editor?.chain().focus() as any).setFontSize(`${nextSize}px`).run();
  };

  const decreaseFontSize = () => {
    const currentSize = getCurrentFontSize();
    const prevSize = [...FONT_SIZES].reverse().find(s => s < currentSize) || FONT_SIZES[0];
    (editor?.chain().focus() as any).setFontSize(`${prevSize}px`).run();
  };

  // isActive('table') is true even when cursor is at the table root, which causes
  // "No cell with offset 1 found" when addColumnAfter/addRowAfter run outside a cell.
  // We require the cursor to be inside a tableCell or tableHeader instead.
  const isTableActive = editor?.isActive('tableCell') || editor?.isActive('tableHeader');

  return (
    <>
    <div className="no-print bg-white/90 backdrop-blur-md border-b border-slate-200 p-2 flex flex-wrap items-center gap-1 sticky top-0 z-[100] shadow-sm px-4">
      {/* 1. Histórico */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().undo().run()} title="Desfazer">
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().redo().run()} title="Refazer">
          <Redo size={16} />
        </ToolbarButton>
      </div>

      <Divider />

      {/* 2. Cabeçalhos / Tags HTML */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor?.chain().focus().setParagraph().run()}
          isActive={editor?.isActive('paragraph')}
          title="Texto Normal (Arraste para inserir)"
          draggable onDragStart={(e: any) => e.dataTransfer.setData('application/x-tiptap-drag-type', 'paragraph')}
        >
          <Pilcrow size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor?.isActive('heading', { level: 1 })}
          title="Título H1 (Arraste para inserir)"
          draggable onDragStart={(e: any) => e.dataTransfer.setData('application/x-tiptap-drag-type', 'h1')}
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor?.isActive('heading', { level: 2 })}
          title="Subtítulo H2 (Arraste para inserir)"
          draggable onDragStart={(e: any) => e.dataTransfer.setData('application/x-tiptap-drag-type', 'h2')}
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor?.isActive('heading', { level: 3 })}
          title="Tópico H3 (Arraste para inserir)"
          draggable onDragStart={(e: any) => e.dataTransfer.setData('application/x-tiptap-drag-type', 'h3')}
        >
          <Heading3 size={16} />
        </ToolbarButton>
      </div>
      {/* 3. Cores e Tamanhos */}
      <div className="flex items-center gap-1.5 px-1">
        {/* Seletor de Cor Customizada */}
        <input
          type="color"
          disabled={!editor}
          onInput={(event: any) => handleCustomColorChange(event.target.value)}
          value={editor?.getAttributes('textStyle').color || '#000000'}
          className={`w-8 h-8 p-1 rounded-lg border border-slate-200 cursor-pointer bg-white transition-all hover:scale-105 active:scale-95 ${!editor ? 'opacity-20 cursor-not-allowed' : ''}`}
          title="Personalizar cor do slot selecionado"
          suppressHydrationWarning
        />

        {/* 5 Cores Padrão Pré-definidas */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 animate-fade-in">
          {presetColors.map((color: any, index: number) => {
            const isActive = editor?.getAttributes('textStyle').color === color.value;
            const isSelectedSlot = selectedPresetIndex === index;
            return (
              <button
                key={index}
                disabled={!!(!editor)}
                onClick={() => {
                  setSelectedPresetIndex(index);
                  editor?.chain().focus().setColor(color.value).run();
                }}
                className={`w-5 h-5 rounded-full border border-slate-300/40 cursor-pointer transition-all hover:scale-115 hover:shadow-sm active:scale-90 flex items-center justify-center relative ${
                  isActive ? 'ring-2 ring-blue-500 ring-offset-1 border-transparent scale-110 z-10' : ''
                } ${isSelectedSlot && !isActive ? 'ring-2 ring-slate-400 ring-offset-1 scale-105 z-10' : ''} ${!editor ? 'opacity-20 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: color.value }}
                title={`${color.name} (${color.rgb}) - Clique para selecionar este slot`}
              />
            );
          })}
        </div>

        <ToolbarButton disabled={!editor} onClick={decreaseFontSize} title="Diminuir Tamanho (A-)">
          <span className="font-bold text-[14px]">A-</span>
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={increaseFontSize} title="Aumentar Tamanho (A+)">
          <span className="font-bold text-[18px]">A+</span>
        </ToolbarButton>
        <div ref={lineHeightButtonRef}>
          <ToolbarButton disabled={!editor} onClick={openLineHeightDialog} title="Altura da Linha">
            <Sliders size={16} />
          </ToolbarButton>
        </div>
      </div>

      <Divider />

      {/* 4. Formatação Básica */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()} isActive={editor?.isActive('bold')} title="Negrito">
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()} isActive={editor?.isActive('italic')} title="Itálico">
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()} isActive={editor?.isActive('underline')} title="Sublinhado">
          <Underline size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().toggleStrike().run()} isActive={editor?.isActive('strike')} title="Riscado">
          <Strikethrough size={16} />
        </ToolbarButton>
      </div>

      <Divider />

      {/* 5. Sub/Superscript/Fração */}
      <div className="flex items-center gap-0.5 relative">
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().toggleSubscript().run()} isActive={editor?.isActive('subscript')} title="Subscrito">
          <SubIcon size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().toggleSuperscript().run()} isActive={editor?.isActive('superscript')} title="Sobrescrito">
          <SupIcon size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={openFractionDialog} title="Inserir Fração">
          <span className="font-semibold text-[13px]">a/b</span>
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={openRootDialog} title="Inserir Raiz">
          <span className="font-semibold text-[13px]">√</span>
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={() => {
          setShowFractionDialog(false);
          setShowRootDialog(false);
          setShowSpecialCharsDialog(v => !v);
        }} isActive={showSpecialCharsDialog} title="Inserir Caractere Especial">
          <span className="font-semibold text-[13.5px] font-mono">Ω</span>
        </ToolbarButton>

        {showSpecialCharsDialog && (
          <div className="absolute top-full left-0 mt-2 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Caracteres Especiais</span>
                <button 
                  onClick={() => setShowSpecialCharsDialog(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Fechar
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {SPECIAL_CHARS.map(char => (
                  <button
                    key={char}
                    onClick={() => insertSpecialChar(char)}
                    className="h-8 w-8 rounded-lg border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 text-sm font-semibold flex items-center justify-center transition-all active:scale-90"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showFractionDialog && (
          <div className="absolute top-full left-0 mt-2 z-50 w-max rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-500">Numerador</label>
              <input
                value={fractionNumerator}
                onChange={e => setFractionNumerator(e.target.value)}
                className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
                placeholder="Numerador"
              />
              <label className="text-xs font-medium text-slate-500">Denominador</label>
              <input
                value={fractionDenominator}
                onChange={e => setFractionDenominator(e.target.value)}
                className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
                placeholder="Denominador"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={insertFraction}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Inserir
                </button>
                <button
                  onClick={closeFractionDialog}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showRootDialog && (
          <div className="absolute top-full left-0 mt-2 z-50 w-max rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-500">Índice da Raiz</label>
              <input
                value={rootIndex}
                onChange={e => setRootIndex(e.target.value)}
                className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
                placeholder="2"
              />
              <label className="text-xs font-medium text-slate-500">Radicando</label>
              <input
                value={rootRadicand}
                onChange={e => setRootRadicand(e.target.value)}
                className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
                placeholder="Radicando"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={insertRoot}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Inserir
                </button>
                <button
                  onClick={closeRootDialog}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}


      </div>

      <Divider />

      {/* 6. Alinhamento */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign('left').run()} isActive={editor?.isActive({ textAlign: 'left' })} title="Esquerda">
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign('center').run()} isActive={editor?.isActive({ textAlign: 'center' })} title="Centro">
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign('right').run()} isActive={editor?.isActive({ textAlign: 'right' })} title="Direita">
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign('justify').run()} isActive={editor?.isActive({ textAlign: 'justify' })} title="Justificado">
          <AlignJustify size={16} />
        </ToolbarButton>
      </div>

      <Divider />

      {/* 7. Listas e Blocos */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive('bulletList')}
          title="Lista Simples (Arraste para inserir)"
          draggable onDragStart={(e: any) => e.dataTransfer.setData('application/x-tiptap-drag-type', 'bulletList')}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive('orderedList')}
          title="Lista Numerada (Arraste para inserir)"
          draggable onDragStart={(e: any) => e.dataTransfer.setData('application/x-tiptap-drag-type', 'orderedList')}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          isActive={editor?.isActive('taskList')}
          title="Checklist (Arraste para inserir)"
          draggable onDragStart={(e: any) => e.dataTransfer.setData('application/x-tiptap-drag-type', 'taskList')}
        >
          <CheckSquare size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          isActive={editor?.isActive('blockquote')}
          title="Citação (Arraste para inserir)"
          draggable onDragStart={(e: any) => e.dataTransfer.setData('application/x-tiptap-drag-type', 'blockquote')}
        >
          <Quote size={16} />
        </ToolbarButton>
      </div>

      <Divider />

      {/* 8. Elementos Avançados */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton disabled={!editor} onClick={setLink} isActive={editor?.isActive('link')} title="Link">
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={addImage}
          title="Inserir imagem do arquivo"
        >
          <ImageIcon size={16} />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
        />
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().toggleHighlight().run()} isActive={editor?.isActive('highlight')} title="Destaque">
          <Highlighter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          isActive={editor?.isActive('codeBlock')}
          title="Código (Arraste para inserir)"
          draggable onDragStart={(e: any) => e.dataTransfer.setData('application/x-tiptap-drag-type', 'codeBlock')}
        >
          <Terminal size={16} />
        </ToolbarButton>
      </div>

      <Divider />

      {/* 9. Tabelas */}
      <div className="flex items-center gap-0.5">
        <div ref={tableInsertButtonRef}>
          <ToolbarButton
            onClick={openTablePicker}
            isActive={showTablePicker}
            title="Inserir Tabela — escolha as dimensões"
            draggable onDragStart={(e: any) => e.dataTransfer.setData('application/x-tiptap-drag-type', 'table')}
          >
            <TableIcon size={16} />
          </ToolbarButton>
        </div>
        {isTableActive && (
          <div ref={tableMenuButtonRef}>
            <ToolbarButton
              onClick={openTableMenu}
              isActive={showTableMenu}
              title="Editar Tabela"
            >
              <span className="flex items-center gap-1">
                <Columns size={14} />
                <span className="text-[10px] font-bold leading-none">▾</span>
              </span>
            </ToolbarButton>
          </div>
        )}
      </div>

      <Divider />

      {/* 10. Desenho Livre */}
      <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
        <ToolbarButton
          onClick={() => isPenActive && onTogglePen()}
          isActive={!isPenActive}
          title="Modo Seleção (Esc)"
        >
          <MousePointer2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => !isPenActive && onTogglePen()}
          isActive={isPenActive}
          title="Caneta de Mão Livre (Desenhe na página)"
        >
          <Pencil size={16} />
        </ToolbarButton>
        <input
          type="color"
          onInput={(event: any) => onPenColorChange(event.target.value)}
          value={penColor}
          className={`w-8 h-8 p-1 rounded-lg border border-slate-200 cursor-pointer bg-white ${!isPenActive ? 'opacity-40 grayscale pointer-events-none' : ''}`}
          title="Cor da Caneta"
          suppressHydrationWarning
        />
        <ToolbarButton onClick={onClearDrawings} danger title="Apagar todos os desenhos">
          <Eraser size={16} />
        </ToolbarButton>
      </div>

      <Divider />

      {/* 11. Auxiliares de Design */}
      <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
        <ToolbarButton
          onClick={onToggleGrid}
          isActive={showGrid}
          title="Grade Pontilhada (Alternar guias)"
        >
          <Grid size={16} />
        </ToolbarButton>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onClear}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-[11px] font-bold uppercase transition-all"
        >
          <Trash2 size={14} />
          Limpar
        </button>
        <button
          onClick={onExportHtml}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 text-indigo-600 text-[11px] font-bold uppercase transition-all"
          title="Exportar como arquivo HTML independente"
        >
          <FileCode size={14} />
          Exportar HTML
        </button>
        <button
          onClick={onPrint}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold uppercase transition-all"
        >
          <Printer size={14} />
          Imprimir
        </button>
        <button
          onClick={onSave}
          disabled={!!isSaving}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all active:scale-95 text-[11px] font-bold uppercase shadow-lg ${saveSuccess
              ? 'bg-green-600 text-white shadow-green-100'
              : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'
            }`}
        >
          {saveSuccess ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saveSuccess ? 'Salvo!' : isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>

      {/* Portal: Altura da Linha - renderizado no body para escapar de overflow:hidden */}
      {showLineHeightDialog && lineHeightPos && typeof document !== 'undefined' && ReactDOM.createPortal(
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeLineHeightDialog}
          />
          <div
            style={{ top: lineHeightPos.top, left: lineHeightPos.left }}
            className="fixed z-[9999] w-max rounded-xl border border-slate-200 bg-white p-3 shadow-2xl"
          >
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-slate-500 uppercase">Altura da Linha</label>

              {/* Valores Pré-definidos */}
              <div className="flex flex-col gap-2">
                {LINE_HEIGHTS.map(height => (
                  <button
                    key={height}
                    onClick={() => applyLineHeight(height.toString())}
                    className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-sm font-medium text-slate-700 transition-colors"
                  >
                    {height.toFixed(2)}x
                  </button>
                ))}
              </div>

              {/* Divisor */}
              <div className="h-px bg-slate-200" />

              {/* Campo Customizado */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Valor Customizado</label>
                <input
                  value={customLineHeight}
                  onChange={e => setCustomLineHeight(e.target.value)}
                  className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
                  placeholder="ex: 2.5"
                  type="number"
                  step="0.05"
                  min="0.5"
                />
              </div>

              {/* Botões */}
              <div className="flex items-center gap-1">
                <button
                  onClick={applyCustomLineHeight}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Aplicar
                </button>
                <button
                  onClick={closeLineHeightDialog}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Portal: Menu de Tabela */}
      {showTableMenu && tableMenuPos && typeof document !== 'undefined' && ReactDOM.createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={closeTableMenu} />
          <div
            style={{ top: tableMenuPos.top, left: tableMenuPos.left }}
            className="fixed z-[9999] w-52 rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Editar Tabela</span>
              <button onClick={closeTableMenu} className="text-slate-400 hover:text-slate-600 text-xs leading-none">✕</button>
            </div>

            {/* Seção: Colunas */}
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Columns size={10} /> Colunas
              </p>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => tableAction(() => editor?.chain().focus().addColumnBefore().run())}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                >
                  <span className="text-base leading-none">⬅</span> Inserir coluna antes
                </button>
                <button
                  onClick={() => tableAction(() => editor?.chain().focus().addColumnAfter().run())}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                >
                  <span className="text-base leading-none">➡</span> Inserir coluna depois
                </button>
                <button
                  onClick={() => tableAction(() => editor?.chain().focus().deleteColumn().run())}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                >
                  <span className="text-base leading-none">✕</span> Remover coluna
                </button>
              </div>
            </div>

            {/* Seção: Linhas */}
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Rows size={10} /> Linhas
              </p>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => tableAction(() => editor?.chain().focus().addRowBefore().run())}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                >
                  <span className="text-base leading-none">⬆</span> Inserir linha acima
                </button>
                <button
                  onClick={() => tableAction(() => editor?.chain().focus().addRowAfter().run())}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                >
                  <span className="text-base leading-none">⬇</span> Inserir linha abaixo
                </button>
                <button
                  onClick={() => tableAction(() => editor?.chain().focus().deleteRow().run())}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                >
                  <span className="text-base leading-none">✕</span> Remover linha
                </button>
              </div>
            </div>

            {/* Seção: Alinhamento */}
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <AlignLeft size={10} /> Alinhamento
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setTableAlign('left')}
                  className={`flex-1 py-1.5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                    tableAlign === 'left'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                  title="Alinhar à Esquerda"
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  onClick={() => setTableAlign('center')}
                  className={`flex-1 py-1.5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                    tableAlign === 'center'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                  title="Alinhar ao Centro"
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  onClick={() => setTableAlign('right')}
                  className={`flex-1 py-1.5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                    tableAlign === 'right'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                  title="Alinhar à Direita"
                >
                  <AlignRight size={14} />
                </button>
              </div>
            </div>

            {/* Seção: Tamanho */}
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <span className="text-[10px]">&#x2194;</span> Largura da Tabela
              </p>
              {/* Atalhos rápidos */}
              <div className="flex gap-1 mb-2">
                {[25, 50, 75, 100].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setTableWidth(pct)}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition-all ${
                      tableWidth === pct
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              {/* Slider */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={20} max={100} step={5}
                  value={tableWidth}
                  onChange={e => setTableWidth(Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
                <span className="text-sm font-bold text-blue-600 w-10 text-right tabular-nums">{tableWidth}%</span>
              </div>
            </div>

            {/* Seção: Tabela */}
            <div className="px-3 py-2">
              <button
                onClick={() => tableAction(() => editor?.chain().focus().deleteTable().run())}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 size={13} /> Excluir tabela inteira
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Portal: Picker de tamanho de tabela */}
      {showTablePicker && tablePickerPos && typeof document !== 'undefined' && ReactDOM.createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={closeTablePicker} />
          <div
            style={{ top: tablePickerPos.top, left: tablePickerPos.left }}
            className="fixed z-[9999] rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Inserir Tabela</span>
              <button onClick={closeTablePicker} className="text-slate-400 hover:text-slate-600 text-xs leading-none">✕</button>
            </div>

            {/* Label de dimensão */}
            <div className="px-3 pt-2.5 pb-1 text-center">
              <span className="text-sm font-bold text-blue-600 tabular-nums">
                {hoveredRows} × {hoveredCols}
              </span>
              <span className="text-[11px] text-slate-400 ml-1.5">· com cabeçalho</span>
            </div>

            {/* Grade visual */}
            <div className="px-3 pb-3 pt-1">
              <div
                className="grid gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${TABLE_PICKER_MAX}, 1fr)` }}
              >
                {Array.from({ length: TABLE_PICKER_MAX }, (_, rowIdx) =>
                  Array.from({ length: TABLE_PICKER_MAX }, (_, colIdx) => {
                    const r = rowIdx + 1;
                    const c = colIdx + 1;
                    const isActive = r <= hoveredRows && c <= hoveredCols;
                    return (
                      <div
                        key={`${r}-${c}`}
                        onMouseEnter={() => { setHoveredRows(r); setHoveredCols(c); }}
                        onClick={() => insertTableWithSize(hoveredRows, hoveredCols)}
                        className={`w-5 h-5 rounded-sm border cursor-pointer transition-all duration-75 ${
                          isActive
                            ? 'bg-blue-500 border-blue-400 scale-95'
                            : 'bg-slate-100 border-slate-200 hover:bg-blue-100 hover:border-blue-300'
                        }`}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Entradas manuais */}
            <div className="px-3 pb-3 border-t border-slate-100 pt-2 flex items-center gap-2">
              <div className="flex flex-col items-center gap-0.5">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Linhas</label>
                <input
                  type="number"
                  min={1} max={30}
                  value={hoveredRows}
                  onChange={e => setHoveredRows(Math.max(1, Math.min(30, Number(e.target.value))))}
                  className="w-14 text-center rounded-lg border border-slate-200 px-1 py-1 text-sm outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <span className="text-slate-300 text-lg mt-4">×</span>
              <div className="flex flex-col items-center gap-0.5">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Colunas</label>
                <input
                  type="number"
                  min={1} max={20}
                  value={hoveredCols}
                  onChange={e => setHoveredCols(Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="w-14 text-center rounded-lg border border-slate-200 px-1 py-1 text-sm outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <button
                onClick={() => insertTableWithSize(hoveredRows, hoveredCols)}
                className="mt-4 flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Inserir
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default Toolbar;
