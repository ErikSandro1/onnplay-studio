import { toast } from 'sonner';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  avatar?: string;
}

export interface Preset {
  id: string;
  name: string;
  layout: string;
  cameras: Record<string, number>;
  audio: { muted: boolean; volume: number };
}

export interface HistoryEntry {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  viewers: number;
  platform: string;
}

// Mock Data Storage
const STORAGE_KEYS = {
  USER: 'onnplay_user',
  PRESETS: 'onnplay_presets',
  HISTORY: 'onnplay_history',
  SETTINGS: 'onnplay_settings',
};

// API Service
export const api = {
  // User Management
  user: {
    login: async (email: string): Promise<User> => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network
      const user: User = {
        id: '1',
        name: 'Admin User',
        email,
        role: 'admin',
        avatar: 'https://github.com/shadcn.png',
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      return user;
    },
    getCurrent: (): User | null => {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      return stored ? JSON.parse(stored) : null;
    },
    logout: () => {
      localStorage.removeItem(STORAGE_KEYS.USER);
    },
  },

  // Presets Management
  presets: {
    list: async (): Promise<Preset[]> => {
      const stored = localStorage.getItem(STORAGE_KEYS.PRESETS);
      return stored ? JSON.parse(stored) : [];
    },
    save: async (preset: Omit<Preset, 'id'>): Promise<Preset> => {
      const presets = await api.presets.list();
      const newPreset = { ...preset, id: Date.now().toString() };
      presets.push(newPreset);
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
      toast.success('Preset salvo com sucesso!');
      return newPreset;
    },
    delete: async (id: string): Promise<void> => {
      const presets = await api.presets.list();
      const filtered = presets.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(filtered));
      toast.success('Preset removido!');
    },
  },

  // History Management
  history: {
    list: async (): Promise<HistoryEntry[]> => {
      const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return stored ? JSON.parse(stored) : [];
    },
    add: async (entry: Omit<HistoryEntry, 'id'>): Promise<HistoryEntry> => {
      const history = await api.history.list();
      const newEntry = { ...entry, id: Date.now().toString() };
      history.unshift(newEntry); // Add to top
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      return newEntry;
    },
  },
};
