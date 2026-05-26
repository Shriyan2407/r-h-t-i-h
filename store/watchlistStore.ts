import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const STORAGE_KEY = "rhtih_watchlist";

export interface WatchlistItem {
  ticker:    string;
  name:      string;
  exchange:  string;
  sector:    string;
  addedAt:   string;
}

interface WatchlistState {
  items:     WatchlistItem[];
  add:       (item: Omit<WatchlistItem, "addedAt">) => void;
  remove:    (ticker: string) => void;
  toggle:    (item: Omit<WatchlistItem, "addedAt">) => void;
  isWatched: (ticker: string) => boolean;
  clear:     () => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (item) => {
        const already = get().items.some(
          (i) => i.ticker === item.ticker.toUpperCase()
        );
        if (already) {
          console.log(`[Watchlist] Already watching ${item.ticker} — skipping`);
          return;
        }
        const entry: WatchlistItem = {
          ...item,
          ticker:  item.ticker.toUpperCase(),
          addedAt: new Date().toISOString(),
        };
        set((s) => ({ items: [entry, ...s.items] }));
        console.log(`[Watchlist] Added ${entry.ticker}. Total: ${get().items.length}`);
      },

      remove: (ticker) => {
        const upper = ticker.toUpperCase();
        set((s) => ({ items: s.items.filter((i) => i.ticker !== upper) }));
        console.log(`[Watchlist] Removed ${upper}. Total: ${get().items.length}`);
      },

      toggle: (item) => {
        if (get().isWatched(item.ticker)) {
          get().remove(item.ticker);
        } else {
          get().add(item);
        }
      },

      isWatched: (ticker) =>
        get().items.some((i) => i.ticker === ticker.toUpperCase()),

      clear: () => {
        set({ items: [] });
        console.log("[Watchlist] Cleared");
      },
    }),
    {
      name:    STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log(
          `[Watchlist] Rehydrated from localStorage — ${state?.items.length ?? 0} items`
        );
      },
    }
  )
);
