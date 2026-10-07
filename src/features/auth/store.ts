import { create } from 'zustand';

/** The email a code was sent to, kept in memory (not in the route URL) between the two screens. */
interface PendingEmailState {
  email: string;
  sentAt: number | null;
  setSent: (email: string) => void;
}

export const usePendingEmail = create<PendingEmailState>()((set) => ({
  email: '',
  sentAt: null,
  setSent: (email) => set({ email, sentAt: Date.now() }),
}));
