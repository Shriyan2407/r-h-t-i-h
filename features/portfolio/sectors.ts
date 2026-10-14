/** Sector colours and the sector list used by the portfolio UI. */

export const SECTOR_COLORS: Record<string, string> = {
  "IT":                "#00AAFF",
  "Technology":        "#00AAFF",
  "Banking":           "#FFD700",
  "Financial Services":"#F59E0B",
  "Finance":           "#F59E0B",
  "Energy":            "#FF6B35",
  "Oil & Gas":         "#FF6B35",
  "Defense":           "#00FF9C",
  "Aerospace":         "#00FF9C",
  "FMCG":              "#34D399",
  "Consumer":          "#34D399",
  "Auto":              "#FB923C",
  "Automobiles":       "#FB923C",
  "Pharma":            "#A78BFA",
  "Healthcare":        "#A78BFA",
  "Metals":            "#94A3B8",
  "Mining":            "#94A3B8",
  "Telecom":           "#60A5FA",
  "Infra":             "#F472B6",
  "Infrastructure":    "#F472B6",
  "Real Estate":       "#C084FC",
  "Chemicals":         "#4ADE80",
  "Other":             "#6B7280",
};

export const SECTORS_LIST = [
  "IT","Banking","Financial Services","Energy","Defense","FMCG",
  "Auto","Pharma","Metals","Telecom","Infra","Real Estate","Chemicals","Other",
];

export function sectorColor(s: string): string {
  return SECTOR_COLORS[s] ?? SECTOR_COLORS["Other"];
}
