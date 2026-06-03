// ── NSE Sector Classification Engine ─────────────────────────────────────
// Comprehensive static mapping: NSE ticker → sector
// Used to auto-classify holdings when sector is missing or "Other"

export const NSE_SECTOR_MAP: Record<string, string> = {
  // ── IT / Technology ──────────────────────────────────────────────────────
  TCS: "IT", INFY: "IT", WIPRO: "IT", HCLTECH: "IT", TECHM: "IT",
  MPHASIS: "IT", LTIMINDTREE: "IT", LTI: "IT", MINDTREE: "IT",
  PERSISTENT: "IT", COFORGE: "IT", KPITTECH: "IT", OFSS: "IT",
  NIIT: "IT", MASTEK: "IT", HEXAWARE: "IT", ZENSAR: "IT",
  SONATA: "IT", NEWGEN: "IT", ROUTE: "IT", CYIENT: "IT",
  BIRLASOFT: "IT", INTELLECT: "IT", TANLA: "IT", CMSINFO: "IT",
  HAPPSTMNDS: "IT", LATENTVIEW: "IT", TATAELXSI: "IT", SASKEN: "IT",
  ECLERX: "IT", QUESS: "IT", TEAMLEASE: "IT", DATAMATICS: "IT",
  LTTS: "IT", TATATECH: "IT", RAMSYSSOL: "IT", SUBEXLTD: "IT",
  NETSOL: "IT", NELCO: "IT", INFOSYS: "IT",
  NAUKRI: "IT", INFOEDGE: "IT", JUSTDIAL: "IT", INDIAMART: "IT",
  ZOMATO: "IT", PAYTM: "IT", POLICYBZR: "IT", DELHIVERY: "IT",
  MAPMYIND: "IT",

  // ── Banking ───────────────────────────────────────────────────────────────
  HDFCBANK: "Banking", ICICIBANK: "Banking", SBIN: "Banking",
  AXISBANK: "Banking", KOTAKBANK: "Banking", INDUSINDBK: "Banking",
  BANDHANBNK: "Banking", FEDERALBNK: "Banking", YESBANK: "Banking",
  IDFCFIRSTB: "Banking", RBLBANK: "Banking", CSBBANK: "Banking",
  DCBBANK: "Banking", KARURVYSYA: "Banking", UJJIVANSFB: "Banking",
  EQUITASBNK: "Banking", AUBANK: "Banking", SURYODAY: "Banking",
  ESAFSFB: "Banking", SOUTHBNK: "Banking", CUB: "Banking",
  JKBANK: "Banking", KARNATAKBNK: "Banking", IOB: "Banking",
  CANBK: "Banking", BANKBARODA: "Banking", BANKINDIA: "Banking",
  INDIANB: "Banking", UNIONBANK: "Banking", CENTRALBK: "Banking",
  MAHABANK: "Banking", UCOBANK: "Banking", PNB: "Banking",
  PSB: "Banking", NAINITAL: "Banking", HDFC: "Banking",
  LAKSHVILAS: "Banking",

  // ── Financial Services ────────────────────────────────────────────────────
  BAJFINANCE: "Financial Services", BAJAJFINSV: "Financial Services",
  CHOLAFIN: "Financial Services", MUTHOOTFIN: "Financial Services",
  MANAPPURAM: "Financial Services", SBILIFE: "Financial Services",
  HDFCLIFE: "Financial Services", ICICIPRU: "Financial Services",
  LICI: "Financial Services", ABCAPITAL: "Financial Services",
  IIFL: "Financial Services", IIFLSEC: "Financial Services",
  MOTILALOFS: "Financial Services", ANGELONE: "Financial Services",
  CDSL: "Financial Services", BSE: "Financial Services",
  CAMS: "Financial Services", KFINTECH: "Financial Services",
  PNBHOUSING: "Financial Services", CANFINHOME: "Financial Services",
  LICHSGFIN: "Financial Services", SHRIRAMFIN: "Financial Services",
  RECLTD: "Financial Services", PFC: "Financial Services",
  IRFC: "Financial Services", HUDCO: "Financial Services",
  RNAM: "Financial Services", SBICARDS: "Financial Services",
  HDFCAMC: "Financial Services", STARHEALTH: "Financial Services",
  ICICIGI: "Financial Services", SBICARD: "Financial Services",
  GICRE: "Financial Services", NIACL: "Financial Services",
  MFSL: "Financial Services", POONAWALLA: "Financial Services",
  CREDITACC: "Financial Services", FUSION: "Financial Services",
  INDOSTAR: "Financial Services", SPANDANA: "Financial Services",
  CHOLAMANDL: "Financial Services", MMFSL: "Financial Services",
  IBULHSGFIN: "Financial Services", TATAINV: "Financial Services",
  EDELWEISS: "Financial Services", FIVESTAR: "Financial Services",
  UGROCAP: "Financial Services", EMKAY: "Financial Services",
  APTUSTRANS: "Financial Services", DOLAT: "Financial Services",
  GEOJITFSL: "Financial Services", SMIFS: "Financial Services",
  UGROFIN: "Financial Services",

  // ── Energy / Oil & Gas ────────────────────────────────────────────────────
  RELIANCE: "Energy", ONGC: "Energy", IOC: "Energy",
  BPCL: "Energy", HPCL: "Energy", GAIL: "Energy",
  OIL: "Energy", MRPL: "Energy", PETRONET: "Energy",
  IGL: "Energy", MGL: "Energy", ATGL: "Energy",
  GSPL: "Energy", GUJGAS: "Energy", AEGISLOG: "Energy",
  CASTROLIND: "Energy", HINDPETRO: "Energy", CHENNPETRO: "Energy",
  ADANIGAS: "Energy", MAHANAGAR: "Energy",

  // ── Power ─────────────────────────────────────────────────────────────────
  NTPC: "Power", POWERGRID: "Power", TATAPOWER: "Power",
  ADANIPOWER: "Power", NTPCGREEN: "Power", ADANIGREEN: "Power",
  RPOWER: "Power", CESC: "Power", JPPOWER: "Power",
  NHPC: "Power", SJVN: "Power", TORNTPOWER: "Power",
  JSWENERGY: "Power", SUZLON: "Power", INOXWIND: "Power",
  GPIL: "Power", ADANITRANS: "Power", SEPC: "Power",
  KPIL: "Power", GREENPANEL: "Power",

  // ── Defense / Aerospace ───────────────────────────────────────────────────
  HAL: "Defense", BEL: "Defense", BHEL: "Defense",
  MIDHANI: "Defense", MTAR: "Defense", BDL: "Defense",
  BEML: "Defense", COCHINSHIP: "Defense", GRSE: "Defense",
  MDL: "Defense", MAZDOCK: "Defense", GARDENREACH: "Defense",
  HARIOM: "Defense", IDEAFORGE: "Defense", SOLARINDS: "Defense",
  APOLLOMICRO: "Defense", DCX: "Defense", ELCOM: "Defense",
  PARAS: "Defense",

  // ── FMCG ──────────────────────────────────────────────────────────────────
  HINDUNILVR: "FMCG", ITC: "FMCG", NESTLEIND: "FMCG",
  BRITANNIA: "FMCG", DABUR: "FMCG", MARICO: "FMCG",
  GODREJCP: "FMCG", EMAMILTD: "FMCG", COLPAL: "FMCG",
  VBL: "FMCG", PGHH: "FMCG", GILLETTE: "FMCG",
  JYOTHYLAB: "FMCG", BAJAJCON: "FMCG", TATACONSUM: "FMCG",
  GCPL: "FMCG", RADICO: "FMCG", VARUNBEV: "FMCG",
  DEVYANI: "FMCG", WESTLIFE: "FMCG", JUBLFOOD: "FMCG",
  BIKAJI: "FMCG", PRATAAP: "FMCG", DODLAWHITE: "FMCG",
  HERITAGE: "FMCG", UNIBEV: "FMCG",

  // ── Auto / Automobiles ────────────────────────────────────────────────────
  MARUTI: "Auto", TATAMOTORS: "Auto", "M&M": "Auto",
  HEROMOTOCO: "Auto", "BAJAJ-AUTO": "Auto", BAJAJAUTO: "Auto",
  EICHERMOT: "Auto", ASHOKLEY: "Auto", TVSMOTORS: "Auto",
  TVSMOTOR: "Auto", FORCE: "Auto", ESCORTS: "Auto",
  BALKRISIND: "Auto", APOLLOTYRE: "Auto", MRF: "Auto",
  CEATLTD: "Auto", SUNDRMFAST: "Auto", MOTHERSON: "Auto",
  BOSCHLTD: "Auto", BHARATFORG: "Auto", CRAFTSMAN: "Auto",
  EXIDEIND: "Auto", AMARARAJA: "Auto", ENDURANCE: "Auto",
  MINDA: "Auto", SUPRAJIT: "Auto", LUMAXIND: "Auto",
  FIEM: "Auto", GABRIEL: "Auto", RANE: "Auto",
  SAMVARDHANM: "Auto", SSWL: "Auto", MAHINDCIE: "Auto",
  SUBROS: "Auto", VARROC: "Auto", JBMA: "Auto",

  // ── Pharma ────────────────────────────────────────────────────────────────
  SUNPHARMA: "Pharma", DRREDDY: "Pharma", CIPLA: "Pharma",
  DIVISLAB: "Pharma", LUPIN: "Pharma", AUROPHARMA: "Pharma",
  TORNTPHARM: "Pharma", ALKEM: "Pharma", IPCA: "Pharma",
  NATCOPHARM: "Pharma", GRANULES: "Pharma", LAURUSLABS: "Pharma",
  BIOCON: "Pharma", PFIZER: "Pharma", SANOFI: "Pharma",
  ABBOTINDIA: "Pharma", GLENMARK: "Pharma", ZYDUSLIFE: "Pharma",
  MANKIND: "Pharma", JBCHEPHARM: "Pharma", SOLARA: "Pharma",
  AJANTPHARM: "Pharma", ERIS: "Pharma", CAPLIPOINT: "Pharma",
  SUVEN: "Pharma", MARKSANS: "Pharma", DIVIS: "Pharma",
  BLISSGVS: "Pharma",

  // ── Healthcare ────────────────────────────────────────────────────────────
  MAXHEALTH: "Healthcare", APOLLOHOSP: "Healthcare",
  FORTISHOSP: "Healthcare", NH: "Healthcare", ASTER: "Healthcare",
  MEDPLUS: "Healthcare", RAINBOW: "Healthcare", HCG: "Healthcare",
  LALPATHLAB: "Healthcare", THYROCARE: "Healthcare",
  VIJAYADIAG: "Healthcare", KRSNAA: "Healthcare",
  METROPOLIS: "Healthcare",

  // ── Metals / Mining ───────────────────────────────────────────────────────
  TATASTEEL: "Metals", JSWSTEEL: "Metals", HINDALCO: "Metals",
  VEDL: "Metals", NMDC: "Metals", COALINDIA: "Metals",
  NATIONALUM: "Metals", HINDCOPPER: "Metals", WELCORP: "Metals",
  RATNAMANI: "Metals", APL: "Metals", SAIL: "Metals",
  JINDALSAW: "Metals", JSPL: "Metals", TINPLATE: "Metals",
  KIOCL: "Metals", STEELHSTRP: "Metals", MOIL: "Metals",
  GRAVITA: "Metals", AARTIMETAL: "Metals", RAJRATAN: "Metals",
  HINCL: "Metals", TATAMETL: "Metals", NSLNISP: "Metals",
  TATASTEELBS: "Metals", FACOR: "Metals",

  // ── Telecom ───────────────────────────────────────────────────────────────
  BHARTIARTL: "Telecom", MTNL: "Telecom", TATACOMM: "Telecom",
  TEJASNET: "Telecom", RAILTEL: "Telecom", STLTECH: "Telecom",
  HFCL: "Telecom", RCOM: "Telecom", GTPL: "Telecom",
  HATHWAY: "Telecom", DEN: "Telecom", SITI: "Telecom",
  AFFLE: "Telecom", NDTV: "Telecom", VINDHYATEL: "Telecom",
  VODAFONEIDEA: "Telecom", VODAIDEA: "Telecom",

  // ── Infrastructure / Construction ─────────────────────────────────────────
  "L&T": "Infra", LT: "Infra", ADANIPORTS: "Infra",
  NCC: "Infra", HCC: "Infra", IRB: "Infra",
  KNR: "Infra", PNCINFRA: "Infra", KNRCON: "Infra",
  IRCON: "Infra", RITES: "Infra", IRCTC: "Infra",
  RVNL: "Infra", NBCC: "Infra", JKCEMENT: "Infra",
  ULTRACEMCO: "Infra", SHREECEM: "Infra", AMBUJACEMENT: "Infra",
  ACC: "Infra", DALMIA: "Infra", RAMCOCEM: "Infra",
  HEIDELBERG: "Infra", INDIACEM: "Infra", ORIENTCEM: "Infra",
  BIRLACP: "Infra", ITD: "Infra", SIEMENS: "Infra",
  ABB: "Infra", CUMMINSIND: "Infra", THERMAX: "Infra",
  HAVELLS: "Infra", POLYCAB: "Infra", FINOLEX: "Infra",
  KEI: "Infra", CROMPTON: "Infra", BAJAJELECON: "Infra",
  VGUARD: "Infra", ADANIENT: "Infra", KALPATPOWER: "Infra",
  ENGINERSIN: "Infra", CONCOR: "Infra", BLUEDART: "Infra",
  GATI: "Infra", REDINGTON: "Infra", WPIL: "Infra",
  GATEWAY: "Infra", VRL: "Infra", ASHOKA: "Infra",
  GMRINFRA: "Infra", GVK: "Infra", TIINDIA: "Infra",
  SCHNEIDER: "Infra", GRINDWELL: "Infra",

  // ── Real Estate ───────────────────────────────────────────────────────────
  DLF: "Real Estate", GODREJPROP: "Real Estate",
  OBEROIREAL: "Real Estate", PRESTIGE: "Real Estate",
  BRIGADE: "Real Estate", SUNTECK: "Real Estate",
  SOBHA: "Real Estate", LODHA: "Real Estate",
  MACROTECH: "Real Estate", KOLTEPATIL: "Real Estate",
  NESCO: "Real Estate", PHOENIX: "Real Estate",
  ANANTRAJ: "Real Estate", OMAXE: "Real Estate",
  HUBTOWN: "Real Estate", IBULREAL: "Real Estate",

  // ── Chemicals ─────────────────────────────────────────────────────────────
  PIDILITIND: "Chemicals", ASIANPAINT: "Chemicals",
  BERGER: "Chemicals", KANSAIPAINT: "Chemicals",
  INDIGOPNTS: "Chemicals", SRF: "Chemicals",
  NAVINFLUOR: "Chemicals", DEEPAKNTR: "Chemicals",
  AARTIIND: "Chemicals", VINATIORGA: "Chemicals",
  CAMLINFS: "Chemicals", GNFC: "Chemicals",
  GSFC: "Chemicals", COROMANDEL: "Chemicals",
  PIIND: "Chemicals", SUMICHEM: "Chemicals",
  NOCIL: "Chemicals", BODAL: "Chemicals",
  EPIGRAL: "Chemicals", LXCHEM: "Chemicals",
  ROSSARI: "Chemicals", INSECTICID: "Chemicals",
  RALLIS: "Chemicals", TATACHEMICALS: "Chemicals",
  GHCL: "Chemicals", DEEPAKFERT: "Chemicals",
  GALAXY: "Chemicals", ANUPAM: "Chemicals",
  SUDARSHAN: "Chemicals", CHEMPLASTS: "Chemicals",
  POLYPLEX: "Chemicals", UFLEX: "Chemicals",
  BAYER: "Chemicals", BASF: "Chemicals",
  GODREJAGRO: "Chemicals", TATACHEM: "Chemicals",

  // ── Consumer / Retail ─────────────────────────────────────────────────────
  DMART: "Consumer", TRENT: "Consumer",
  TITAN: "Consumer", KALYANKJIL: "Consumer",
  SENCO: "Consumer", PVRINOX: "Consumer",
  PVR: "Consumer", INOXLEISUR: "Consumer",
  BATA: "Consumer", RELAXO: "Consumer",
  CAMPUS: "Consumer", PAGEIND: "Consumer",
  MANYAVAR: "Consumer", VEDANT: "Consumer",
  RAYMOND: "Consumer", ABFRL: "Consumer",
  NYKAA: "Consumer", FSNNEC: "Consumer",
  SPENCERS: "Consumer", VMART: "Consumer",
  CANTABIL: "Consumer", TCNS: "Consumer",
  SHOPERSTOP: "Consumer",

  // ── ETF / Index / Passive ─────────────────────────────────────────────────
  GOLDBEES: "ETF", NIFTYBEES: "ETF", BANKBEES: "ETF",
  JUNIORBEES: "ETF", LIQUIDBEES: "ETF", SETFNN50: "ETF",
  SETFBANK: "ETF", CPSEETF: "ETF", SILVERBEES: "ETF",
  MAN50ETF: "ETF", QNIFTY: "ETF", ICICIB22: "ETF",
  MAFANG: "ETF", PSUBNKBEES: "ETF", ITBEES: "ETF",
  INFRABEES: "ETF", PHARMBEES: "ETF", NV20: "ETF",
  HNGSNGBEES: "ETF", GOLDCASE: "ETF", SILVERETF: "ETF",
  NETFGOLDBR: "ETF", DIVOPPBEES: "ETF", PBANKBEES: "ETF",
  MOM100ETF: "ETF", MIDCAP150: "ETF", SMALLCAP250: "ETF",
  MONIFTY500: "ETF", SENSEXETF: "ETF",
};

// ── Keyword-based inference fallback ─────────────────────────────────────────

export function classifyTicker(ticker: string, name?: string): string {
  const t = ticker.toUpperCase().replace(/[-.]/, "");
  const direct = NSE_SECTOR_MAP[t] || NSE_SECTOR_MAP[ticker.toUpperCase()];
  if (direct) return direct;

  const combined = (t + " " + (name || "").toUpperCase());

  if (/BANK/.test(t)) return "Banking";
  if (/NBFC|FINANC|CREDIT|CAPITAL|INVEST|INSUR|LIFE|LENDING|HOUSING|MUTHOOT|BAJAJFIN/.test(combined)) return "Financial Services";
  if (/TECH|INFOSY|INFRA|WIPRO|TATAELX|TATATECH|LTIMIND|HAPPS|LATENT|BIRLASOFT/.test(combined)) return "IT";
  if (/PHARMA|DRUG|BIOL|ZYDUS|BIOC|SUNPH|LUPIN|NATCO|GRANUL/.test(combined)) return "Pharma";
  if (/HEALTH|HOSP|MEDPLUS|APOLLOH|FORTIS|RAINBOW|KRSNAA|VIJAYA/.test(combined)) return "Healthcare";
  if (/POWER|SOLAR|WIND|GREEN|RENEW|NTPC|NHPC|SJVN|SUZLON/.test(combined)) return "Power";
  if (/PETRONET|PETROLEUM|PETRO|ONGC|OIL|GAS|GAIL|BPCL|HPCL|IOC|MRPL/.test(combined)) return "Energy";
  if (/STEEL|METAL|ALUMIN|COPPER|ZINC|IRON|MINING|COAL|NMDC|SAIL|VEDL/.test(combined)) return "Metals";
  if (/AUTO|MOTOR|TYRE|WHEEL|GEAR|BAJAJ|HERO|MARUTI|EICHER/.test(combined)) return "Auto";
  if (/TELE|COMM|BHARTI|AIRTEL|TEJASNET|RAILTEL|STLTECH|HFCL/.test(combined)) return "Telecom";
  if (/CEMENT|INFRA|CONSTRUCT|BUILD|ROAD|PORT|RAIL|AIRPORT|CONCOR/.test(combined)) return "Infra";
  if (/REAL|ESTATE|PROPERTY|HOUSING DEVELOP|DLF|SOBHA|PRESTIGE/.test(combined)) return "Real Estate";
  if (/DEFENSE|DEFENCE|AEROSPACE|BEL|HAL|MDL|BDL|BEML|GRSE|HAL/.test(combined)) return "Defense";
  if (/FMCG|HINDUSTAN UNILEVER|NESTLE|BRITANNIA|DABUR|MARICO|COLPAL/.test(combined)) return "FMCG";
  if (/CHEM|PAINT|PIGMENT|AGROCHEMICAL|SRF|NAVINFLUOR|PIDILITE/.test(combined)) return "Chemicals";
  if (/ETF|BEES|NIFTY|SENSEX|INDEX FUND/.test(combined)) return "ETF";
  if (/TRENT|TITAN|ZOMATO|DMART|BATA|CAMPUS|PVRINOX|NYKAA/.test(combined)) return "Consumer";

  return "Other";
}

// ── Enhanced sector data interface ───────────────────────────────────────────

export interface EnrichedSectorData {
  label: string;
  value: number;
  color: string;
  holdingCount: number;
  investedValue: number;
  currentValue: number;
  pnlPct: number;
  topHolding: string;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "EXTREME";
}

// ── Sector-level risk ────────────────────────────────────────────────────────

const SECTOR_INHERENT_RISK: Record<string, number> = {
  "IT": 0.42, "Banking": 0.48, "Financial Services": 0.50,
  "Energy": 0.60, "Power": 0.45, "Defense": 0.38,
  "FMCG": 0.25, "Auto": 0.52, "Pharma": 0.35,
  "Healthcare": 0.30, "Metals": 0.65, "Telecom": 0.40,
  "Infra": 0.45, "Real Estate": 0.58, "Chemicals": 0.48,
  "Consumer": 0.40, "ETF": 0.20, "Other": 0.45,
};

export function getSectorRiskLevel(
  label: string,
  allocationPct: number,
): EnrichedSectorData["riskLevel"] {
  const inherent = SECTOR_INHERENT_RISK[label] ?? 0.45;
  const concRisk = allocationPct / 100;
  const combined = inherent * 0.55 + concRisk * 0.45;
  if (combined > 0.60) return "EXTREME";
  if (combined > 0.44) return "HIGH";
  if (combined > 0.30) return "MODERATE";
  return "LOW";
}

// ── Per-sector AI narrative templates ────────────────────────────────────────

const SECTOR_INSIGHT: Record<string, (pct: number, top: string) => string> = {
  IT:                (p, t) => `IT at ${p.toFixed(0)}% — ${t} leads exposure. USD/INR tailwind on rupee weakness, US tech spending slowdown is the key risk.`,
  Banking:           (p, t) => `Banking at ${p.toFixed(0)}% via ${t}. RBI rate cut cycle is the primary catalyst — watch credit growth and NPA quarterly trends.`,
  "Financial Services": (p, t) => `Fin Services at ${p.toFixed(0)}% — ${t} anchors. Credit growth story intact, but asset quality and SEBI regulations are watchpoints.`,
  Energy:            (p, t) => `Energy at ${p.toFixed(0)}% with ${t}. Crude oil sensitivity is extreme — a $10/bbl move directly impacts earnings.`,
  Power:             (p, t) => `Power at ${p.toFixed(0)}% via ${t}. Renewable capex and government PLI schemes are the long-term structural drivers.`,
  Defense:           (p, t) => `Defense at ${p.toFixed(0)}% — ${t} dominates. Budget allocation and order book visibility are key catalysts here.`,
  FMCG:              (p, t) => `FMCG at ${p.toFixed(0)}% anchored by ${t}. Defensive buffer — rural demand revival and input cost deflation are near-term tailwinds.`,
  Auto:              (p, t) => `Auto at ${p.toFixed(0)}% — ${t} leads. EV transition and crude-linked fuel costs are the structural headwinds to price in.`,
  Pharma:            (p, t) => `Pharma at ${p.toFixed(0)}% via ${t}. USD-hedged defensive with US FDA approvals as the highest-impact catalyst.`,
  Healthcare:        (p, t) => `Healthcare at ${p.toFixed(0)}% — ${t} anchors. Resilient earnings, hospital capex cycle benefits long-term holders.`,
  Metals:            (p, t) => `Metals at ${p.toFixed(0)}% with ${t} leading. China demand and global commodity cycles dominate — high cyclicality.`,
  Telecom:           (p, t) => `Telecom at ${p.toFixed(0)}% — ${t} commands this exposure. ARPU recovery and 5G rollout are structural growth drivers.`,
  Infra:             (p, t) => `Infrastructure at ${p.toFixed(0)}% via ${t}. Government capex and budget spending are critical — election-cycle sensitive.`,
  "Real Estate":     (p, t) => `Real Estate at ${p.toFixed(0)}% with ${t}. High RBI rate sensitivity — every cut is a direct demand tailwind.`,
  Chemicals:         (p, t) => `Chemicals at ${p.toFixed(0)}% — ${t} leads. China+1 theme is in play, raw material price cycles create short-term volatility.`,
  Consumer:          (p, t) => `Consumer at ${p.toFixed(0)}% anchored by ${t}. Urban discretionary spending drives growth — premium consumption trend intact.`,
  ETF:               (p, t) => `ETF/Passive at ${p.toFixed(0)}% via ${t}. No single-stock risk — broad market correlation, acts as a portfolio anchor.`,
  Other:             (p, t) => `Unclassified exposure at ${p.toFixed(0)}% — ${t} is the largest position. Classify stocks to unlock precise sector intelligence.`,
};

export function getSectorInsight(label: string, pct: number, topHolding: string): string {
  const fn = SECTOR_INSIGHT[label] ?? SECTOR_INSIGHT["Other"];
  return fn(pct, topHolding);
}

// ── Overall sector narrative ──────────────────────────────────────────────────

export function generateSectorNarrative(sectorData: EnrichedSectorData[]): string {
  if (sectorData.length === 0) return "Add holdings to unlock sector intelligence.";
  const top    = sectorData[0];
  const second = sectorData[1];
  const n      = sectorData.length;

  if (top.value > 65) {
    return `${top.label} dominates at ${top.value.toFixed(0)}% — dangerously concentrated. A single sector correction has an outsized portfolio impact. Target: no sector above 40-45%.`;
  }
  if (top.value > 45) {
    return `${top.label} leads at ${top.value.toFixed(0)}%${second ? ` with ${second.label} second at ${second.value.toFixed(0)}%` : ""}. Sector-level concentration is elevated — diversification into 4+ sectors is recommended.`;
  }
  return `${n} sectors represented — led by ${top.label} (${top.value.toFixed(0)}%)${second ? ` and ${second.label} (${second.value.toFixed(0)}%)` : ""}. Sector balance is healthy with adequate diversification across themes.`;
}
