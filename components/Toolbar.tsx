'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    disabled={disabled}
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
  const [showLineHeightDialog, setShowLineHeightDialog] = useState(false);
  const [customLineHeight, setCustomLineHeight] = useState('1.5');

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

  const openLineHeightDialog = () => {
    if (!editor) return;
    const currentNode = editor.state.selection.$from.parent;
    const attrs = currentNode?.attrs || {};
    const height = attrs.lineHeight || '1.5';
    setCustomLineHeight(height.toString());
    setShowLineHeightDialog(true);
  };

  const closeLineHeightDialog = () => {
    setShowLineHeightDialog(false);
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

  const isTableActive = editor?.isActive('table');

  return (
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
        />

        {/* 5 Cores Padrão Pré-definidas */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 animate-fade-in">
          {presetColors.map((color: any, index: number) => {
            const isActive = editor?.getAttributes('textStyle').color === color.value;
            const isSelectedSlot = selectedPresetIndex === index;
            return (
              <button
                key={index}
                disabled={!editor}
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
        <ToolbarButton disabled={!editor} onClick={openLineHeightDialog} title="Altura da Linha">
          <Sliders size={16} />
        </ToolbarButton>
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

        {showLineHeightDialog && (
          <div className="absolute top-full left-0 mt-2 z-50 w-max rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
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
        <ToolbarButton
          onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Tabela (Arraste para inserir)"
          draggable onDragStart={(e: any) => e.dataTransfer.setData('application/x-tiptap-drag-type', 'table')}
        >
          <TableIcon size={16} />
        </ToolbarButton>
        {isTableActive && (
          <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
            <ToolbarButton onClick={() => editor?.chain().focus().addColumnAfter().run()} title="Add Coluna"><Columns size={14} /></ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().addRowAfter().run()} title="Add Linha"><Rows size={14} /></ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().deleteTable().run()} danger title="Excluir"><Trash2 size={14} /></ToolbarButton>
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
          disabled={isSaving}
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
  );
};

export default Toolbar;
