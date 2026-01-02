/**
 * ProjectPanel - Painel para gerenciar projetos salvos
 * Permite salvar, carregar, exportar e importar projetos
 */

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  FolderOpen, 
  Download, 
  Upload, 
  Trash2, 
  Copy, 
  Edit2, 
  Check,
  Plus,
  FileJson,
  Clock,
  Layers
} from 'lucide-react';
import { projectService, Project } from '../services/ProjectService';
import { toast } from 'sonner';

interface ProjectPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectPanel({ isOpen, onClose }: ProjectPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Carregar projetos
    setProjects(projectService.getProjects());

    // Escutar mudanças
    const unsubscribe = projectService.subscribe((updatedProjects) => {
      setProjects(updatedProjects);
    });

    return unsubscribe;
  }, []);

  const handleSaveNew = () => {
    if (!newProjectName.trim()) {
      toast.error('Digite um nome para o projeto');
      return;
    }

    const project = projectService.saveProject(newProjectName.trim(), newProjectDescription.trim());
    toast.success(`Projeto "${project.name}" salvo!`);
    
    setIsCreating(false);
    setNewProjectName('');
    setNewProjectDescription('');
  };

  const handleLoad = (id: string) => {
    const success = projectService.loadProject(id);
    if (success) {
      const project = projectService.getProject(id);
      toast.success(`Projeto "${project?.name}" carregado!`);
      onClose();
    } else {
      toast.error('Erro ao carregar projeto');
    }
  };

  const handleUpdate = (id: string) => {
    const project = projectService.updateProject(id);
    if (project) {
      toast.success(`Projeto "${project.name}" atualizado!`);
    }
  };

  const handleDelete = (id: string) => {
    const project = projectService.getProject(id);
    if (confirm(`Tem certeza que deseja excluir "${project?.name}"?`)) {
      projectService.deleteProject(id);
      toast.success('Projeto excluído');
    }
  };

  const handleDuplicate = (id: string) => {
    const duplicate = projectService.duplicateProject(id);
    if (duplicate) {
      toast.success(`Projeto duplicado: "${duplicate.name}"`);
    }
  };

  const handleDownload = (id: string) => {
    projectService.downloadProject(id);
    toast.success('Projeto exportado!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const project = await projectService.importProjectFromFile(file);
    if (project) {
      toast.success(`Projeto "${project.name}" importado!`);
    } else {
      toast.error('Erro ao importar projeto. Verifique o formato do arquivo.');
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveRename = () => {
    if (editingId && editingName.trim()) {
      projectService.renameProject(editingId, editingName.trim());
      toast.success('Projeto renomeado');
    }
    setEditingId(null);
    setEditingName('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[9998]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 flex flex-col w-full max-w-2xl max-h-[85vh] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Save size={20} className="text-orange-400" />
              <h3 className="text-white font-semibold text-lg">Meus Projetos</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Ações rápidas */}
          <div className="p-4 border-b border-gray-700 flex gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Plus size={18} />
              Salvar Projeto Atual
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".onnplay,.json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Upload size={18} />
              Importar
            </button>
          </div>

          {/* Formulário de novo projeto */}
          {isCreating && (
            <div className="p-4 border-b border-gray-700 bg-gray-800/50">
              <h4 className="text-white font-medium mb-3">Novo Projeto</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nome do projeto"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-orange-500 focus:outline-none"
                  autoFocus
                />
                <textarea
                  placeholder="Descrição (opcional)"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-orange-500 focus:outline-none resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNew}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewProjectName('');
                      setNewProjectDescription('');
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de projetos */}
          <div className="flex-1 overflow-y-auto p-4">
            {projects.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Layers size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-base font-medium">Nenhum projeto salvo</p>
                <p className="text-sm mt-1">Clique em "Salvar Projeto Atual" para criar seu primeiro projeto</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden"
                  >
                    {/* Info do projeto */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {editingId === project.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 px-2 py-1 bg-gray-900 text-white rounded border border-orange-500 focus:outline-none text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename();
                                  if (e.key === 'Escape') {
                                    setEditingId(null);
                                    setEditingName('');
                                  }
                                }}
                              />
                              <button
                                onClick={handleSaveRename}
                                className="p-1 text-green-400 hover:text-green-300"
                              >
                                <Check size={16} />
                              </button>
                            </div>
                          ) : (
                            <h4 className="text-white font-medium truncate">{project.name}</h4>
                          )}
                          
                          {project.description && (
                            <p className="text-gray-400 text-sm mt-1 line-clamp-2">{project.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDate(project.updatedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Layers size={12} />
                              {project.data.scenes?.length || 0} cenas
                            </span>
                            <span className="flex items-center gap-1">
                              <FileJson size={12} />
                              v{project.version}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-700 flex items-center gap-2">
                      <button
                        onClick={() => handleLoad(project.id)}
                        className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <FolderOpen size={14} />
                        Carregar
                      </button>
                      
                      <button
                        onClick={() => handleUpdate(project.id)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                        title="Atualizar com estado atual"
                      >
                        <Save size={14} />
                      </button>
                      
                      <button
                        onClick={() => handleStartRename(project.id, project.name)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm flex items-center justify-center transition-colors"
                        title="Renomear"
                      >
                        <Edit2 size={14} />
                      </button>
                      
                      <button
                        onClick={() => handleDuplicate(project.id)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm flex items-center justify-center transition-colors"
                        title="Duplicar"
                      >
                        <Copy size={14} />
                      </button>
                      
                      <button
                        onClick={() => handleDownload(project.id)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm flex items-center justify-center transition-colors"
                        title="Exportar"
                      >
                        <Download size={14} />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600 rounded-lg text-red-400 hover:text-white text-sm flex items-center justify-center transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-800/50">
            <p className="text-sm text-gray-400 text-center">
              💡 Projetos salvam cenas, banners, overlays e configurações
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProjectPanel;
