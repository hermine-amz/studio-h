'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';
import type { CategoriePrompt, PromptScript } from '@/types/database';
import { Skeleton } from '@/components/ui/Skeleton';

const CATEGORIES: CategoriePrompt[] = [
  'Hook vidéo',
  'Prompt Visuel',
  'Script Voix',
  'Avatar IA',
];

export default function PromptsLibraryPage() {
  const { isLoading, prompts, addPrompt, updatePrompt, deletePrompt } =
    useStudioData();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<
    CategoriePrompt | 'ALL'
  >('ALL');
  const [selectedNiche, setSelectedNiche] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptScript | null>(null);
  const [titre, setTitre] = useState('');
  const [categorie, setCategorie] = useState<CategoriePrompt>('Hook vidéo');
  const [niche, setNiche] = useState('Cosmétique & Skincare');
  const [contenuTexte, setContenuTexte] = useState('');

  const allNiches = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((p) => {
      if (p.niche) set.add(p.niche);
    });
    return Array.from(set);
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchCat =
        selectedCategory === 'ALL' || p.categorie === selectedCategory;
      const matchNiche = selectedNiche === 'ALL' || p.niche === selectedNiche;
      const matchSearch =
        !searchQuery.trim() ||
        p.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.contenu_texte.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.niche.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchNiche && matchSearch;
    });
  }, [prompts, selectedCategory, selectedNiche, searchQuery]);

  const handleCopyPrompt = async (prompt: PromptScript) => {
    try {
      await navigator.clipboard.writeText(prompt.contenu_texte);
      setCopiedId(prompt.id);
      toast({
        title: 'Prompt copié dans le presse-papiers',
        description: `« ${prompt.titre} » est prêt à être collé dans votre outil IA.`,
        type: 'success',
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: 'Impossible de copier',
        description: 'Veuillez sélectionner le texte manuellement.',
        type: 'error',
      });
    }
  };

  const openCreateModal = () => {
    setEditingPrompt(null);
    setTitre('');
    setCategorie('Hook vidéo');
    setNiche('Cosmétique & Skincare');
    setContenuTexte('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: PromptScript) => {
    setEditingPrompt(item);
    setTitre(item.titre);
    setCategorie(item.categorie);
    setNiche(item.niche);
    setContenuTexte(item.contenu_texte);
    setIsModalOpen(true);
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim() || !contenuTexte.trim()) return;

    if (editingPrompt) {
      await updatePrompt(editingPrompt.id, {
        titre: titre.trim(),
        categorie,
        niche: niche.trim() || 'Général',
        contenu_texte: contenuTexte.trim(),
      });
      toast({
        title: 'Prompt mis à jour',
        description: `Les modifications sur « ${titre} » ont été enregistrées.`,
      });
    } else {
      await addPrompt({
        titre: titre.trim(),
        categorie,
        niche: niche.trim() || 'Général',
        contenu_texte: contenuTexte.trim(),
      });
      toast({
        title: 'Nouveau prompt ajouté',
        description: `« ${titre} » a rejoint la bibliothèque Studio H.`,
      });
    }

    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Vue 05 — Capital Intellectuel & Ingénierie Créative
          </span>
          <h1 className="mt-1 text-lg sm:text-xl font-semibold tracking-tight text-zinc-900">
            Bibliothèque de Prompts & Scripts
          </h1>
        </div>

        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span>Nouveau Prompt / Script</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-xl px-3.5 py-2 text-xs font-medium border transition-all shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-[#568203] text-white border-[#568203]/40 shadow-glow'
                  : 'bg-transparent text-zinc-600 border-transparent hover:bg-stone-100/80'
              }`}
            >
              Toutes catégories ({prompts.length})
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-3.5 py-2 text-xs font-medium border transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#568203] text-white border-[#568203]/40 shadow-glow'
                    : 'bg-transparent text-zinc-600 border-transparent hover:bg-stone-100/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search + Niche Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search
                className="h-4 w-4 text-zinc-400 absolute left-3.5 top-3"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un prompt..."
                className="glass-input pl-10 sm:w-64"
              />
            </div>

            <select
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
              className="glass-input sm:w-52"
            >
              <option value="ALL" className="bg-white">
                Toutes les niches
              </option>
              {allNiches.map((n) => (
                <option key={n} value={n} className="bg-white">
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Prompts Grid */}
      {filteredPrompts.length === 0 ? (
        <div className="glass-card p-12 text-center text-sm text-zinc-500">
          Aucun prompt ou script ne correspond à vos filtres.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredPrompts.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className="glass-card p-4 flex flex-col justify-between space-y-4 hover:border-[#568203]/45"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-[#568203] border border-[#568203]/30 px-2.5 py-1 text-xs font-medium text-zinc-900">
                        {item.categorie}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100/80 border border-stone-200 px-2.5 py-1 text-xs text-zinc-700">
                        <Tag className="h-3 w-3" strokeWidth={1.5} />
                        {item.niche}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-stone-100/80 transition-colors"
                        aria-label="Modifier le prompt"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => deletePrompt(item.id)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-stone-100/80 transition-colors"
                        aria-label="Supprimer le prompt"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-zinc-900">
                    {item.titre}
                  </h3>

                  <pre className="rounded-xl bg-stone-50 border border-stone-200/85 p-4 text-xs text-zinc-800 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                    {item.contenu_texte}
                  </pre>
                </div>

                <div className="pt-3 border-t border-stone-200/85 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">
                    Prêt pour génération IA
                  </span>
                  <button
                    onClick={() => handleCopyPrompt(item)}
                    className="btn-primary py-2 px-4 text-xs"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add / Edit Prompt */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/35 backdrop-blur-md p-4">
          <div className="glass-card w-full max-w-xl p-4 sm:p-3.5 border border-[#568203]/30">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-200/85">
              <div className="flex items-center gap-2.5">
                <Sparkles
                  className="h-5 w-5 text-zinc-900"
                  strokeWidth={1.5}
                />
                <h2 className="text-lg font-semibold text-zinc-900">
                  {editingPrompt
                    ? 'Modifier le Prompt / Script'
                    : 'Ajouter un Prompt / Script'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-zinc-500 hover:text-zinc-900"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSavePrompt} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                  Titre du Prompt ou Script *
                </label>
                <input
                  type="text"
                  required
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex: Hook Dissonance Cognitive — Soin Visage"
                  className="glass-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                    Catégorie *
                  </label>
                  <select
                    value={categorie}
                    onChange={(e) =>
                      setCategorie(e.target.value as CategoriePrompt)
                    }
                    className="glass-input"
                  >
                    {CATEGORIES.map((c) => (
                      <option
                        key={c}
                        value={c}
                        className="bg-white text-zinc-900"
                      >
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                    Niche / Secteur
                  </label>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="Ex: Cosmétique & Skincare"
                    className="glass-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                  Contenu du Prompt / Script *
                </label>
                <textarea
                  rows={6}
                  required
                  value={contenuTexte}
                  onChange={(e) => setContenuTexte(e.target.value)}
                  placeholder="Saisissez le prompt exact ou la structure de script..."
                  className="glass-input font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200/85">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingPrompt ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

