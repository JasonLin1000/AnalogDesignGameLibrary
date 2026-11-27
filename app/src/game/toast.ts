// Transient pop-up notices (achievements, burnt parts). Rendered by ui/Toasts.tsx.
import { create } from 'zustand';
import type { Localized } from '../i18n';

export interface Toast { id: number; icon: string; kind: 'achv' | 'warn' | 'info'; title: Localized | string; body?: Localized | string; xp?: number }

let seq = 0;
export const useToasts = create<{ list: Toast[]; push: (t: Omit<Toast, 'id'>) => void; dismiss: (id: number) => void }>((set, get) => ({
  list: [],
  push: (t) => {
    const id = ++seq;
    set({ list: [...get().list.slice(-3), { ...t, id }] });
    setTimeout(() => get().dismiss(id), t.kind === 'achv' ? 5200 : 4200);
  },
  dismiss: (id) => set({ list: get().list.filter((t) => t.id !== id) }),
}));
