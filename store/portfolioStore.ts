import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface PortfolioHolding {
  id:       string;
  ticker:   string;
  name:     string;
  exchange: string;
  sector:   string;
  quantity: number;
  avgPrice: number;
  notes?:   string;
  addedAt:  string;
}

interface PortfolioState {
  holdings:  PortfolioHolding[];
  synced:    boolean;
  add:       (h: Omit<PortfolioHolding, "id" | "addedAt">) => Promise<void>;
  update:    (id: string, updates: { quantity?: number; avgPrice?: number; notes?: string }) => Promise<void>;
  remove:    (id: string) => Promise<void>;
  sync:      () => Promise<void>;
  clear:     () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      holdings: [],
      synced:   false,

      add: async (holding) => {
        const upper   = holding.ticker.toUpperCase();
        const existing = get().holdings.find(h => h.ticker === upper);

        if (existing) {
          // Average down / up — merge into existing position
          const newQty = existing.quantity + holding.quantity;
          const newAvg = ((existing.avgPrice * existing.quantity) + (holding.avgPrice * holding.quantity)) / newQty;
          await get().update(existing.id, { quantity: newQty, avgPrice: newAvg });
          return;
        }

        const entry: PortfolioHolding = {
          id:      crypto.randomUUID(),
          ...holding,
          ticker:  upper,
          addedAt: new Date().toISOString(),
        };
        set(s => ({ holdings: [entry, ...s.holdings] }));

        try {
          const res = await fetch("/api/user/portfolio", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(entry),
          });
          if (res.ok) {
            const { id } = await res.json();
            set(s => ({
              holdings: s.holdings.map(h => h.ticker === upper ? { ...h, id } : h),
            }));
          }
        } catch {
          // localStorage persists — will sync on next load
        }
      },

      update: async (id, updates) => {
        set(s => ({
          holdings: s.holdings.map(h => h.id === id ? { ...h, ...updates } : h),
        }));
        try {
          await fetch(`/api/user/portfolio/${id}`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(updates),
          });
        } catch {
          // Local state already updated
        }
      },

      remove: async (id) => {
        set(s => ({ holdings: s.holdings.filter(h => h.id !== id) }));
        try {
          await fetch(`/api/user/portfolio/${id}`, { method: "DELETE" });
        } catch {
          // Local state already updated
        }
      },

      sync: async () => {
        try {
          const res = await fetch("/api/user/portfolio");
          if (!res.ok) return;
          const data = await res.json();
          if (Array.isArray(data.holdings) && data.holdings.length > 0) {
            set({ holdings: data.holdings, synced: true });
          } else {
            set({ synced: true });
          }
        } catch {
          set({ synced: true });
        }
      },

      clear: () => set({ holdings: [] }),
    }),
    {
      name:    "rhtih_portfolio",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log(`[Portfolio] Rehydrated — ${state?.holdings.length ?? 0} holdings`);
      },
    }
  )
);
