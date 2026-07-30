import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import {
  getCurrentSession,
  logout as logoutService,
  onAuthStateChange,
} from '@/services/authService';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  errorMessage: string;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isInitialized: false,
  errorMessage: '',

  initialize: async () => {
    if (get().isInitialized) return;
    set({ isInitialized: true, isLoading: true, errorMessage: '' });

    try {
      const session = await getCurrentSession();
      set({ session, user: session?.user ?? null, isLoading: false });
    } catch (caught) {
      set({
        session: null,
        user: null,
        isLoading: false,
        errorMessage: caught instanceof Error ? caught.message : 'Không thể kiểm tra đăng nhập.',
      });
    }

    onAuthStateChange((_, session) => {
      set({ session, user: session?.user ?? null, isLoading: false });
    });
  },

  logout: async () => {
    await logoutService();
    set({ session: null, user: null });
  },
}));
