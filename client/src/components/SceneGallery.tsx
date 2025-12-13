import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';

interface Scene {
  id: string;
  name: string;
  thumbnail: string;
  type: 'camera' | 'layout' | 'video' | 'graphic';
}

const INITIAL_SCENES: Scene[] = [
  { id: 'scene-1', name: 'Studio Wide', thumbnail: 'bg-gradient-to-br from-green-600 to-green-800', type: 'camera' },
  { id: 'scene-2', name: 'Camera 1', thumbnail: 'bg-gradient-to-br from-green-500 to-green-700', type: 'camera' },
  { id: 'scene-3', name: 'Presenter', thumbnail: 'bg-gradient-to-br from-blue-600 to-blue-800', type: 'camera' },
  { id: 'scene-4', name: 'Two Shot', thumbnail: 'bg-gradient-to-br from-blue-500 to-blue-700', type: 'layout' },
  { id: 'scene-5', name: 'Graphics', thumbnail: 'bg-gradient-to-br from-orange-600 to-orange-800', type: 'graphic' },
  { id: 'scene-6', name: 'Lower Third', thumbnail: 'bg-gradient-to-br from-purple-600 to-purple-800', type: 'graphic' },
  { id: 'scene-7', name: 'Video Roll', thumbnail: 'bg-gradient-to-br from-red-600 to-red-800', type: 'video' },
  { id: 'scene-8', name: 'Outro', thumbnail: 'bg-gradient-to-br from-gray-600 to-gray-800', type: 'video' },
];

interface SceneGalleryProps {
  onSceneSelect?: (scene: Scene) => void;
}

export default function SceneGallery({ onSceneSelect }: SceneGalleryProps) {
  const [scenes, setScenes] = useState<Scene[]>(INITIAL_SCENES);
  const [activeScene, setActiveScene] = useState<string>('scene-1');
  const [draggedScene, setDraggedScene] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSceneClick = (scene: Scene) => {
    setActiveScene(scene.id);
    if (onSceneSelect) {
      onSceneSelect(scene);
    }
  };

  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    setDraggedScene(sceneId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedScene || draggedScene === targetId) return;

    const draggedIndex = scenes.findIndex(s => s.id === draggedScene);
    const targetIndex = scenes.findIndex(s => s.id === targetId);

    const newScenes = [...scenes];
    const [draggedItem] = newScenes.splice(draggedIndex, 1);
    newScenes.splice(targetIndex, 0, draggedItem);

    setScenes(newScenes);
    setDraggedScene(null);
  };

  const handleDragEnd = () => {
    setDraggedScene(null);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 border-t border-gray-700 rounded-t">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Scene Gallery</h3>
          <span className="text-xs text-gray-500 ml-2">({scenes.length} cenas)</span>
        </div>
        <button className="p-1 hover:bg-gray-700 rounded transition-colors">
          <Settings size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Scroll Container */}
      <div className="flex-1 flex items-center gap-2 px-4 py-3 overflow-hidden">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="flex-shrink-0 p-2 hover:bg-gray-700 rounded transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-400" />
        </button>

        {/* Gallery */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex gap-3 overflow-x-auto scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
        >
          {scenes.map((scene) => (
            <button
              key={scene.id}
              draggable
              onDragStart={(e) => handleDragStart(e, scene.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, scene.id)}
              onDragEnd={handleDragEnd}
              onClick={() => handleSceneClick(scene)}
              className={`scene-card ${activeScene === scene.id ? 'active' : ''} ${
                draggedScene === scene.id ? 'opacity-50' : ''
              } cursor-grab active:cursor-grabbing transition-all`}
            >
              <div className={`w-full h-full ${scene.thumbnail} flex items-end justify-start p-2`}>
                <p className="text-xs font-semibold text-white truncate bg-black bg-opacity-50 px-2 py-1 rounded">
                  {scene.name}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="flex-shrink-0 p-2 hover:bg-gray-700 rounded transition-colors"
        >
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Drag Hint */}
      {draggedScene && (
        <div className="px-4 py-2 bg-orange-900 bg-opacity-50 text-orange-300 text-xs text-center">
          Arraste para reordenar cenas
        </div>
      )}
    </div>
  );
}
