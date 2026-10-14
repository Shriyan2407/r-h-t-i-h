import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { noFOUCScript } from "@/lib/bootstrap/noFouc";

function run(initial: Record<string, string>) {
  const store = new Map(Object.entries(initial));
  const attrs: Record<string, string> = {};
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const document = { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } };
  runInNewContext(noFOUCScript, { localStorage, document });
  return { store: Object.fromEntries(store), attrs };
}

describe("storage key migration (rename to EquityLens)", () => {
  it("moves legacy portfolio, recent searches and theme to the new keys", () => {
    const { store, attrs } = run({ rhtih_portfolio: '{"state":{"holdings":[1]}}', rhtih_recent_tickers: '["TCS"]', "mkb-theme": "light" });
    expect(store).toEqual({ equitylens_portfolio: '{"state":{"holdings":[1]}}', equitylens_recent_tickers: '["TCS"]', "equitylens-theme": "light" });
    expect(attrs["data-theme"]).toBe("light");
  });

  it("never overwrites data already saved under the new key", () => {
    const { store } = run({ rhtih_portfolio: "old", equitylens_portfolio: "new" });
    expect(store).toEqual({ equitylens_portfolio: "new" });
  });

  it("prefers the newer legacy theme key and is a no-op when nothing is stored", () => {
    expect(run({ "mkb-theme": "dark", "rhtih-theme": "light" }).store).toEqual({ "equitylens-theme": "dark" });
    expect(run({})).toEqual({ store: {}, attrs: {} });
  });

  it("ignores invalid theme values", () => {
    expect(run({ "equitylens-theme": "<script>" }).attrs).toEqual({});
  });
});
