'use client';

import React, { useState, useEffect } from 'react';
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

  const handleRemovePage = () => {
    if (pages.length <= 1) return;
    if (confirm('Excluir esta página permanentemente?')) {
      const newPages = pages.filter((_, i) => i !== currentPage);
      setPages(newPages);
      if (currentPage >= newPages.length) {
        setCurrentPage(Math.max(0, newPages.length - 1));
      }
    }
  };

  const changeStatus = (newStatus: any) => {
    setStatus(newStatus);
    // Auto-save if slug exists
    if (slug) handleSave();
  };

  return (
    <main className="flex min-h-screen bg-[#f8fafc] font-inter print:block print:min-h-0 print:bg-white">
      <Sidebar
        items={savedItems}
        onSelectItem={handleLoad}
        onNew={handleNew}
        onRefresh={fetchList}
        currentSlug={slug}
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
