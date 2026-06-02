import { create } from "zustand";

export interface WatchlistItem {
  id?:       string;
  ticker:    string;
  name:      string;
  exchange:  string;
  sector?:   string;
  addedAt:   string;
}

interface WatchlistState {
  items:      WatchlistItem[];
  loaded:     boolean;
  loadFromDB: () => Promise<void>;
  add:        (item: Omit<WatchlistItem, "addedAt" | "id">) => Promise<void>;
  remove:     (ticker: string) => Promise<void>;
  toggle:     (item: Omit<WatchlistItem, "addedAt" | "id">) => void;
  isWatched:  (ticker: string) => boolean;
  clear:      () => void;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items:  [],
  loaded: false,

  loadFromDB: async () => {
    try {
      const res = await fetch("/api/user/watchlist");
      if (!res.ok) return;
      const data = await res.json();
      set({ items: Array.isArray(data) ? data : [], loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  add: async (item) => {
    const upper = item.ticker.toUpperCase();
    if (get().isWatched(upper)) return;

    // Optimistic add
    const entry: WatchlistItem = { ...item, ticker: upper, addedAt: new Date().toISOString() };
    set(s => ({ items: [entry, ...s.items] }));

    try {
      const res = await fetch("/api/user/watchlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ticker: upper, name: item.name, exchange: item.exchange, sector: item.sector ?? "" }),
      });
      if (res.ok) {
        const saved = await res.json();
        // Stamp the DB id onto the item
        set(s => ({ items: s.items.map(i => i.ticker === upper ? { ...i, id: saved.id } : i) }));
      }
    } catch {
      // Rollback on network failure
      set(s => ({ items: s.items.filter(i => i.ticker !== upper) }));
    }
  },

  remove: async (ticker) => {
    const upper    = ticker.toUpperCase();
    const previous = get().items;

    // Optimistic remove
    set(s => ({ items: s.items.filter(i => i.ticker !== upper) }));

    try {
      await fetch(`/api/user/watchlist?ticker=${encodeURIComponent(upper)}`, { method: "DELETE" });
    } catch {
      // Rollback
      set({ items: previous });
    }
  },

  toggle: (item) => {
    if (get().isWatched(item.ticker)) {
      get().remove(item.ticker);
    } else {
      get().add(item);
    }
  },

  isWatched: (ticker) => get().items.some(i => i.ticker === ticker.toUpperCase()),

  clear: () => set({ items: [], loaded: false }),
}));
