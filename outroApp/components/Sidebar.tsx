'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  ChevronRight,
  Folder,
  ChevronDown,
  BookOpen,
  Layers,
  Search,
  FileJson
} from 'lucide-react';

interface SidebarProps {
  items: any[];
  onSelectItem: (item: any) => void;
  onNew: () => void;
  onRefresh: () => void;
  currentSlug?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ items, onSelectItem, onNew, onRefresh, currentSlug }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Build recursive tree structure from paths
  const fileTree = useMemo(() => {
    const root: any = {};

    // Filter items based on search
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

  // Recursive component to render the tree
  const RenderTree = ({ tree, path = '', level = 0 }: { tree: any, path?: string, level?: number }) => {
    const entries = Object.entries(tree).sort(([aName, a]: any, [bName, b]: any) => {
      // Sort folders first, then files
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
                  <RenderTree tree={node.children} path={currentPath} level={level + 1} />
                )}
              </div>
            );
          }

          const { item } = node;
          const isActive = currentSlug === item.slug;

          return (
            <button
              key={item.slug}
              onClick={() => onSelectItem(item)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${isActive
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              {/* Status Indicator */}
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.status === 'reviewed' ? 'bg-green-500' :
                  item.status === 'important' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />

              <div className="flex-1 min-w-0">
                <div className={`truncate font-bold text-[13px] ${isActive ? 'text-white' : 'text-slate-700'
                  }`}>
                  {item.titulo || item.title}
                </div>
                {item.subtitulo && (
                  <div className={`text-[10px] font-bold uppercase truncate mt-0.5 ${isActive ? 'text-blue-300' : 'text-blue-500'
                    }`}>
                    {item.subtitulo}
                  </div>
                )}
              </div>
              <FileText size={14} className={isActive ? 'text-blue-400' : 'text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity'} />
            </button>
          );
        })}
      </div>
    );
  };

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
          <RenderTree tree={fileTree} />
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
