import { create } from 'zustand';
import {
  getCurrentSession,
  logout as logoutService,
  onAuthStateChange,
} from '../services/authService';

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isInitialized: false,
  errorMessage: '',

  initialize: async () => {
    if (get().isInitialized) {
      return;
    }

    set({
      isInitialized: true,
      isLoading: true,
      errorMessage: '',
    });

    try {
      const session = await getCurrentSession();
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
      });
    } catch (error) {
      set({
        session: null,
        user: null,
        isLoading: false,
        errorMessage: error.message,
      });
    }

    onAuthStateChange((_, nextSession) => {
      set({
        session: nextSession,
        user: nextSession?.user ?? null,
        isLoading: false,
      });
    });
  },

  logout: async () => {
    await logoutService();
    set({
      session: null,
      user: null,
    });
  },
}));
