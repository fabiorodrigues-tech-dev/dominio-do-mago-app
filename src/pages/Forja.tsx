import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hammer, 
  Wand2, 
  ArrowRight, 
  Sparkles, 
  MoreVertical,
  Edit2,
  Trash2,
  FileText
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Draft } from '@/types';

export const Forja: React.FC = () => {
  const { drafts, addDraft, deleteDraft, convertDraft } = useAppStore();
  
  const [newDraftTitle, setNewDraftTitle] = useState('');
  const [newDraftNotes, setNewDraftNotes] = useState('');
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [showTriage, setShowTriage] = useState(false);
  const [convertedId, setConvertedId] = useState<string | null>(null);
  const [convertedType, setConvertedType] = useState<string>('');

  // Add new draft
  const handleAddDraft = () => {
    if (!newDraftTitle.trim()) return;
    
    addDraft(newDraftTitle.trim(), newDraftNotes.trim());
    setNewDraftTitle('');
    setNewDraftNotes('');
  };

  // Handle triage
  const handleTriage = (type: 'ACTION' | 'HABIT' | 'QUEST' | 'PROJECT') => {
    if (!selectedDraft) return;
    
    const newId = convertDraft(selectedDraft.id, type);
    
    if (newId) {
      setConvertedId(newId);
      setConvertedType(
        type === 'ACTION' ? 'Ritual' : 
        type === 'HABIT' ? 'Ciclo' : 
        type === 'QUEST' ? 'Jornada' : 'Grande Obra'
      );
      setShowTriage(false);
      setSelectedDraft(null);
      
      setTimeout(() => {
        setConvertedId(null);
        setConvertedType('');
      }, 3000);
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="text-5xl mb-2">🔨</div>
        <h2 className="font-mystic text-2xl mb-1">Forja</h2>
        <p className="text-sm text-white/50">
          Triagem inteligente de ideias
        </p>
      </motion.div>

      {/* Quick Create */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 mb-6"
      >
        <h3 className="font-mystic text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-mystic-gold" />
          Criação Rápida
        </h3>
        <div className="space-y-3">
          <Input
            placeholder="Nome da ideia..."
            value={newDraftTitle}
            onChange={(e) => setNewDraftTitle(e.target.value)}
            className="bg-white/5 border-white/10"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddDraft();
            }}
          />
          <Input
            placeholder="Notas adicionais (opcional)..."
            value={newDraftNotes}
            onChange={(e) => setNewDraftNotes(e.target.value)}
            className="bg-white/5 border-white/10 text-sm"
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleAddDraft}
              disabled={!newDraftTitle.trim()}
              className="flex-1 bg-mystic-arcane"
            >
              <Hammer className="w-4 h-4 mr-2" />
              Adicionar à Forja
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-white/50" />
          <span className="text-sm text-white/50">
            {drafts.length} {drafts.length === 1 ? 'item' : 'itens'} na Forja
          </span>
        </div>
      </motion.div>

      {/* Drafts List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <AnimatePresence mode="popLayout">
          {drafts.length > 0 ? (
            <div className="space-y-3">
              {drafts.map((draft, index) => (
                <motion.div
                  key={draft.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card p-4 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{draft.title}</h4>
                      {draft.notes && (
                        <p className="text-sm text-white/50 mt-1 line-clamp-2">
                          {draft.notes}
                        </p>
                      )}
                      <p className="text-[10px] text-white/30 mt-2">
                        Adicionado em {new Date(draft.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedDraft(draft);
                          setShowTriage(true);
                        }}
                        className="text-mystic-gold hover:text-mystic-gold/80 hover:bg-mystic-gold/10"
                      >
                        <Wand2 className="w-4 h-4 mr-1" />
                        Classificar
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4 text-white/40" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-mystic-purple border-white/10">
                          <DropdownMenuItem onClick={() => {}}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteDraft(draft.id)}
                            className="text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Triage Dialog */}
      <Dialog open={showTriage} onOpenChange={setShowTriage}>
        <DialogContent className="bg-mystic-purple border-white/20">
          <DialogHeader>
            <DialogTitle className="font-mystic text-center">
              Classificar Item
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 p-4">
            <p className="text-center text-white/60 text-sm mb-4">
              O que este item representa?
            </p>
            
            <TriageOption
              icon="📜"
              title="Ritual"
              description="Tarefa única a ser executada"
              points="+1.2 pts padrão"
              onClick={() => handleTriage('ACTION')}
            />
            <TriageOption
              icon="🔄"
              title="Ciclo"
              description="Hábito recorrente diário"
              points="+5 pts por dia"
              onClick={() => handleTriage('HABIT')}
            />
            <TriageOption
              icon="🗺️"
              title="Jornada"
              description="Quest com múltiplas etapas"
              points="Agrega pontos + bônus XP"
              onClick={() => handleTriage('QUEST')}
            />
            <TriageOption
              icon="🏗️"
              title="Grande Obra"
              description="Projeto grande e complexo"
              points="Agrega tudo + bônus XP"
              onClick={() => handleTriage('PROJECT')}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Conversion Feedback */}
      <AnimatePresence>
        {convertedId && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-50"
          >
            <div className="bg-gradient-to-r from-mystic-arcane to-purple-600 text-white rounded-2xl p-4 
                          shadow-lg text-center">
              <p className="font-mystic text-lg">✨ Item Convertido! ✨</p>
              <p className="text-sm">Convertido para {convertedType}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

interface TriageOptionProps {
  icon: string;
  title: string;
  description: string;
  points: string;
  onClick: () => void;
}

const TriageOption: React.FC<TriageOptionProps> = ({ icon, title, description, points, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 
               hover:border-mystic-gold/50 hover:bg-mystic-gold/5 
               transition-all text-left"
  >
    <div className="flex items-center gap-3">
      <div className="text-3xl">{icon}</div>
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-white/50">{description}</div>
        <div className="text-xs text-mystic-gold mt-1">{points}</div>
      </div>
      <ArrowRight className="w-5 h-5 text-white/30" />
    </div>
  </motion.button>
);

const EmptyState: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="glass-card p-8 text-center"
  >
    <div className="text-4xl mb-3">🔨</div>
    <h3 className="font-mystic text-lg mb-2">Forja vazia</h3>
    <p className="text-white/50 text-sm">
      Adicione ideias e pensamentos para classificá-los depois.
    </p>
  </motion.div>
);
