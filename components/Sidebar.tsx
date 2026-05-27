'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  ChevronRight,
  Folder,
  ChevronDown,
  Search,
  Pencil,
  Check,
  X,
} from 'lucide-react';

interface SidebarProps {
  items: any[];
  onSelectItem: (item: any) => void;
  onNew: () => void;
  onRefresh: () => void;
  currentSlug?: string;
  onRename: (item: any, newMeta: { disciplina: string; assunto: string; titulo: string; subtitulo: string }) => Promise<void>;
}

interface RenameState {
  slug: string;
  disciplina: string;
  assunto: string;
  titulo: string;
  subtitulo: string;
}

interface RenderTreeProps {
  tree: any;
  path?: string;
  level?: number;
  expanded: Record<string, boolean>;
  toggle: (key: string) => void;
  currentSlug?: string;
  renaming: RenameState | null;
  setRenaming: React.Dispatch<React.SetStateAction<RenameState | null>>;
  isSavingRename: boolean;
  confirmRename: (item: any) => Promise<void>;
  cancelRename: () => void;
  onSelectItem: (item: any) => void;
  startRename: (e: React.MouseEvent, item: any) => void;
}

const RenderTree: React.FC<RenderTreeProps> = ({
  tree,
  path = '',
  level = 0,
  expanded,
  toggle,
  currentSlug,
  renaming,
  setRenaming,
  isSavingRename,
  confirmRename,
  cancelRename,
  onSelectItem,
  startRename,
}) => {
  const entries = Object.entries(tree).sort(([aName, a]: any, [bName, b]: any) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return aName.localeCompare(bName);
  });

  return (
    <div className={level > 0 ? "ml-3 pl-2 border-l border-slate-100 space-y-0.5" : "space-y-0.5"}>
      {entries.map(([name, node]: [string, any]) => {
        const currentPath = path ? `${path}/${name}` : name;
        const isExpanded = expanded[currentPath];

        if (node.type === 'folder') {
          return (
            <div key={currentPath}>
              <button
                onClick={() => toggle(currentPath)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors group"
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-slate-400" />
                ) : (
                  <ChevronRight size={14} className="text-slate-400" />
                )}
                <Folder size={16} className={isExpanded ? "text-blue-500 fill-blue-50" : "text-slate-400"} />
                <span className="flex-1 text-left font-bold text-xs truncate uppercase tracking-tight">
                  {name}
                </span>
              </button>
              {isExpanded && (
                <RenderTree
                  tree={node.children}
                  path={currentPath}
                  level={level + 1}
                  expanded={expanded}
                  toggle={toggle}
                  currentSlug={currentSlug}
                  renaming={renaming}
                  setRenaming={setRenaming}
                  isSavingRename={isSavingRename}
                  confirmRename={confirmRename}
                  cancelRename={cancelRename}
                  onSelectItem={onSelectItem}
                  startRename={startRename}
                />
              )}
            </div>
          );
        }

        const { item } = node;
        const isActive = currentSlug === item.slug;
        const isRenamingItem = renaming?.slug === item.slug;

        return (
          <div key={item.slug} className="relative">
            {/* Rename inline form */}
            {isRenamingItem ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2 shadow-sm">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Renomear</p>
                {[
                  { label: 'Disciplina', key: 'disciplina' },
                  { label: 'Assunto', key: 'assunto' },
                  { label: 'Título', key: 'titulo' },
                  { label: 'Subtítulo', key: 'subtitulo' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
                    <input
                      className="w-full mt-0.5 px-2 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
                      value={(renaming as any)[key]}
                      onChange={e => setRenaming(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmRename(item);
                        if (e.key === 'Escape') cancelRename();
                      }}
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => confirmRename(item)}
                    disabled={isSavingRename}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
                  >
                    {isSavingRename ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Confirmar
                  </button>
                  <button
                    onClick={cancelRename}
                    className="flex items-center justify-center px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-lg text-[11px] font-bold transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="group/item relative">
                <button
                  onClick={() => onSelectItem(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all pr-8 ${isActive
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  {/* Status Indicator */}
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.status === 'reviewed' ? 'bg-green-500' :
                      item.status === 'important' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />

                  <div className="flex-1 min-w-0">
                    <div className={`truncate font-bold text-[13px] ${isActive ? 'text-white' : 'text-slate-700'}`}>
                      {item.titulo || item.title}
                    </div>
                    {item.subtitulo && (
                      <div className={`text-[10px] font-bold uppercase truncate mt-0.5 ${isActive ? 'text-blue-300' : 'text-blue-500'}`}>
                        {item.subtitulo}
                      </div>
                    )}
                  </div>
                  <FileText size={14} className={isActive ? 'text-blue-400' : 'text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity'} />
                </button>

                {/* Rename button — appears on hover */}
                <button
                  onClick={e => startRename(e, item)}
                  title="Renomear"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all ${
                    isActive
                      ? 'text-blue-300 hover:bg-white/10'
                      : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ items, onSelectItem, onNew, onRefresh, currentSlug, onRename }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [renaming, setRenaming] = useState<RenameState | null>(null);
  const [isSavingRename, setIsSavingRename] = useState(false);

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const startRename = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setRenaming({
      slug: item.slug,
      disciplina: item.disciplina || '',
      assunto: item.assunto || '',
      titulo: item.titulo || item.title || '',
      subtitulo: item.subtitulo || '',
    });
  };

  const cancelRename = () => setRenaming(null);

  const confirmRename = async (item: any) => {
    if (!renaming) return;
    setIsSavingRename(true);
    try {
      await onRename(item, {
        disciplina: renaming.disciplina,
        assunto: renaming.assunto,
        titulo: renaming.titulo,
        subtitulo: renaming.subtitulo,
      });
      setRenaming(null);
    } finally {
      setIsSavingRename(false);
    }
  };

  // Build recursive tree structure from paths
  const fileTree = useMemo(() => {
    const root: any = {};

    const filteredItems = items.filter(item =>
      item.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.path?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredItems.forEach(item => {
      const parts = item.path.split('/');
      let current = root;

      parts.forEach((part: string, index: number) => {
        const isFile = index === parts.length - 1;

        if (isFile) {
          current[part] = { type: 'file', item };
        } else {
          if (!current[part]) {
            current[part] = { type: 'folder', children: {} };
          }
          current = current[part].children;
        }
      });
    });

    return root;
  }, [items, searchTerm]);



  return (
    <div className="no-print w-80 bg-white border-r border-slate-200 flex flex-col h-screen overflow-visible font-inter">
      {/* Header */}
      <div className="p-6 border-b border-slate-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center text-white font-black shadow-lg rotate-3">
              H
            </div>
            <div>
              <h1 className="font-black text-slate-900 tracking-tighter text-lg">HTML Studio</h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">File Manager</p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-100 font-bold text-sm active:scale-95"
          >
            <Plus size={18} />
            Novo Documento
          </button>

          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
        {items.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
              <Folder size={24} className="text-slate-200" />
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhum arquivo encontrado</p>
          </div>
        ) : (
          <RenderTree
            tree={fileTree}
            expanded={expanded}
            toggle={toggle}
            currentSlug={currentSlug}
            renaming={renaming}
            setRenaming={setRenaming}
            isSavingRename={isSavingRename}
            confirmRename={confirmRename}
            cancelRename={cancelRename}
            onSelectItem={onSelectItem}
            startRename={startRename}
          />
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">
          <span>Total de Arquivos</span>
          <span className="text-slate-900 bg-white px-2 py-0.5 rounded-full border border-slate-200">{items.length}</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
