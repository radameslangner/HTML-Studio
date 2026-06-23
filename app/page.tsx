'use client';

import React, { useState, useEffect, useRef } from 'react';
import Editor from '../components/Editor';
import Sidebar from '../components/Sidebar';
import PrintLayout from '../components/PrintLayout';

const INITIAL_CONTENT = ``;

export default function Home() {
  const [pages, setPages] = useState<string[]>([INITIAL_CONTENT]);
  const [currentPage, setCurrentPage] = useState(0);
  const [titulo, setTitulo] = useState('Titulo');
  const [disciplina, setDisciplina] = useState('Disciplina');
  const [assunto, setAssunto] = useState('Assunto');
  const [subtitulo, setSubtitulo] = useState('Subtítulo');
  const [status, setStatus] = useState<'study' | 'reviewed' | 'important'>('study');
  const [slug, setSlug] = useState<string | undefined>(undefined);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [availableDisciplines, setAvailableDisciplines] = useState<string[]>([]);
  
  // Autosave status state and reference to track last saved state content
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'disabled'>('disabled');
  const lastSavedStateRef = useRef<string>('');

  // Full Reactive Path - Derived from the 4 states
  const fullPath = `Conteudo / ${disciplina} / ${assunto} / ${titulo} / ${subtitulo}.json`;

  // Fetch list and folder structure on mount
  useEffect(() => {
    fetchList();
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders');
      const data = await res.json();
      const disciplines = Object.keys(data.folders);
      setAvailableDisciplines(disciplines);

      // Removemos o bloco que forçava a primeira disciplina e o primeiro assunto
      // para evitar que o sistema preencha automaticamente com "Informática"

    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchList = async () => {
    try {
      const res = await fetch('/api/list');
      const data = await res.json();
      if (data.contents) {
        setSavedItems(data.contents);
      }
    } catch (error) {
      console.error('Error fetching list:', error);
    }
  };

  const handleSave = async () => {
    const userDisciplina = disciplina || prompt('Disciplina:', 'Disciplina');
    if (!userDisciplina) return;

    const userAssunto = assunto || prompt('Assunto:', 'Assunto');
    if (!userAssunto) return;

    const userTitle = prompt('Título do documento:', titulo);
    if (!userTitle) return;

    setDisciplina(userDisciplina);
    setAssunto(userAssunto);
    setTitulo(userTitle);

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disciplina: userDisciplina,
          assunto: userAssunto,
          titulo: userTitle,
          subtitulo,
          pages,
          status
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setSlug(data.slug);
        
        // Synchronize reference with saved state to prevent immediate auto-saving
        lastSavedStateRef.current = JSON.stringify({
          pages,
          status,
          titulo: userTitle,
          disciplina: userDisciplina,
          assunto: userAssunto,
          subtitulo
        });
        setAutosaveStatus('idle');

        fetchList();
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Save error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (item: any) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/content/${item.path}`);
      const data = await res.json();
      if (data.pages) {
        setPages(data.pages);
        setCurrentPage(0);
        setTitulo(data.titulo || data.title);
        setDisciplina(data.disciplina);
        setAssunto(data.assunto);
        setSubtitulo(data.subtitulo || '');
        setSlug(data.slug);
        setStatus(data.status || 'study');

        // Initialize lastSavedStateRef with loaded content to prevent immediate autosave
        lastSavedStateRef.current = JSON.stringify({
          pages: data.pages,
          status: data.status || 'study',
          titulo: data.titulo || data.title,
          disciplina: data.disciplina,
          assunto: data.assunto,
          subtitulo: data.subtitulo || ''
        });
        setAutosaveStatus('idle');
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNew = async () => {
    if (!confirm('Deseja criar um novo documento físico no disco?')) {
      return;
    }

    const userDisciplina = prompt('Disciplina do novo documento:', disciplina || '');
    if (!userDisciplina) return;

    const userAssunto = prompt('Assunto do novo documento:', assunto || '');
    if (!userAssunto) return;

    const userTitle = prompt('Título do novo documento:', 'Novo Documento');
    if (!userTitle) return;

    const userSubtitulo = prompt('Subtítulo do novo documento (opcional):', '') || '';

    setIsLoading(true);
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disciplina: userDisciplina,
          assunto: userAssunto,
          titulo: userTitle,
          subtitulo: userSubtitulo,
          pages: [INITIAL_CONTENT],
          status: 'study'
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPages([INITIAL_CONTENT]);
        setCurrentPage(0);
        setTitulo(userTitle);
        setDisciplina(userDisciplina);
        setAssunto(userAssunto);
        setSubtitulo(userSubtitulo);
        setSlug(data.slug);
        setStatus('study');
        
        // Initialize lastSavedStateRef with the new document data to start autosaving from this state
        lastSavedStateRef.current = JSON.stringify({
          pages: [INITIAL_CONTENT],
          status: 'study',
          titulo: userTitle,
          disciplina: userDisciplina,
          assunto: userAssunto,
          subtitulo: userSubtitulo
        });
        setAutosaveStatus('idle');
        
        // Atualiza a barra lateral e as pastas na interface
        await fetchList();
        await fetchFolders();
      } else {
        alert('Erro ao criar arquivo: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error creating new document:', error);
      alert('Erro de conexão ao criar o novo arquivo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPage = () => {
    const newPages = [...pages, INITIAL_CONTENT];
    setPages(newPages);
    setCurrentPage(newPages.length - 1);
  };

  const handleUpdatePage = (index: number, html: string) => {
    const newPages = [...pages];
    newPages[index] = html;
    setPages(newPages);
  };

  const handleRemovePage = (index?: number) => {
    if (pages.length <= 1) return;
    if (confirm('Excluir esta página permanentemente?')) {
      const targetIndex = index !== undefined ? index : currentPage;
      const newPages = pages.filter((_, i) => i !== targetIndex);
      setPages(newPages);
      if (currentPage >= newPages.length) {
        setCurrentPage(Math.max(0, newPages.length - 1));
      } else if (targetIndex < currentPage) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === pages.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newPages = [...pages];
    
    // Swap pages
    const temp = newPages[index];
    newPages[index] = newPages[targetIndex];
    newPages[targetIndex] = temp;
    
    setPages(newPages);

    // Follow the page focus
    if (currentPage === index) {
      setCurrentPage(targetIndex);
    } else if (currentPage === targetIndex) {
      setCurrentPage(index);
    }
  };

  const handleRename = async (
    item: any,
    newMeta: { disciplina: string; assunto: string; titulo: string; subtitulo: string }
  ) => {
    const res = await fetch('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldPath: item.path,
        ...newMeta,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      alert('Erro ao renomear: ' + (data.error || 'Erro desconhecido'));
      return;
    }

    // If the renamed file is currently open, update all state
    if (item.slug === slug) {
      setSlug(data.slug);
      setDisciplina(newMeta.disciplina);
      setAssunto(newMeta.assunto);
      setTitulo(newMeta.titulo);
      setSubtitulo(newMeta.subtitulo);

      // Synchronize reference with renamed metadata
      lastSavedStateRef.current = JSON.stringify({
        pages,
        status,
        titulo: newMeta.titulo,
        disciplina: newMeta.disciplina,
        assunto: newMeta.assunto,
        subtitulo: newMeta.subtitulo
      });
      setAutosaveStatus('idle');
    }

    await fetchList();
    await fetchFolders();
  };

  const changeStatus = (newStatus: any) => {
    setStatus(newStatus);
  };

  // Autosave effect with debounce
  useEffect(() => {
    if (!slug) {
      setAutosaveStatus('disabled');
      return;
    }

    const currentDataStr = JSON.stringify({
      pages,
      status,
      titulo,
      disciplina,
      assunto,
      subtitulo
    });

    if (currentDataStr === lastSavedStateRef.current) {
      return;
    }

    const timer = setTimeout(async () => {
      setAutosaveStatus('saving');
      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: currentDataStr
        });

        const data = await res.json();
        if (data.success) {
          setAutosaveStatus('saved');
          setSlug(data.slug);
          
          lastSavedStateRef.current = currentDataStr;

          fetchList();
          setTimeout(() => {
            setAutosaveStatus(prev => prev === 'saved' ? 'idle' : prev);
          }, 3000);
        } else {
          setAutosaveStatus('error');
        }
      } catch (error) {
        console.error('Autosave error:', error);
        setAutosaveStatus('error');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [pages, status, titulo, disciplina, assunto, subtitulo, slug]);

  return (
    <main className="flex min-h-screen bg-[#f8fafc] font-inter print:block print:min-h-0 print:bg-white">
      <Sidebar
        items={savedItems}
        onSelectItem={handleLoad}
        onNew={handleNew}
        onRefresh={fetchList}
        currentSlug={slug}
        onRename={handleRename}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden print:h-auto print:overflow-visible print:block">
        {isLoading && (
          <div className="fixed inset-0 bg-white/40 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Editor (Tela) */}
        <div className="flex-1 flex flex-col min-w-0 print:hidden overflow-hidden">
          <Editor
            pages={pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onAddPage={handleAddPage}
            onRemovePage={handleRemovePage}
            onUpdatePage={handleUpdatePage}
            onMovePage={handleMovePage}
            onSave={handleSave}
            onPrint={() => setTimeout(() => window.print(), 1000)}
            disciplina={disciplina}
            assunto={assunto}
            titulo={titulo}
            subtitulo={subtitulo}
            onMetadataChange={(m) => {
              if (m.disciplina !== undefined) setDisciplina(m.disciplina);
              if (m.assunto !== undefined) setAssunto(m.assunto);
              if (m.titulo !== undefined) setTitulo(m.titulo);
              if (m.subtitulo !== undefined) setSubtitulo(m.subtitulo);
            }}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
            autosaveStatus={autosaveStatus}
            status={status}
            onStatusChange={changeStatus}
            initialContent={INITIAL_CONTENT}
            availableDisciplines={availableDisciplines}
          />
        </div>

        {/* Layout de Impressão Refatorado */}
        <PrintLayout
          pages={pages}
          disciplina={disciplina}
          assunto={assunto}
          titulo={titulo}
          subtitulo={subtitulo}
        />

      </div>
    </main>
  );
}
