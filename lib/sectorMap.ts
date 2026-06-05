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
  // Normalize: uppercase, strip spaces/dots/hyphens for map lookup
  const raw   = ticker.toUpperCase().trim();
  const clean = raw.replace(/[\s./-]+/g, "");          // "M&M" → "M&M", "L&T" → "L&T"
  const noAmp = clean.replace(/&/g, "AND");            // "M&M" → "MANDM"

  // 1. Try cleaned ticker in map (most common path)
  let direct = NSE_SECTOR_MAP[raw] ?? NSE_SECTOR_MAP[clean] ?? NSE_SECTOR_MAP[noAmp];

  // 2. Also try stripping exchange suffix (.NS / .BO) before lookup
  if (!direct) {
    const stripped = raw.replace(/\.(NS|BO|NSE|BSE)$/i, "");
    direct = NSE_SECTOR_MAP[stripped] ?? NSE_SECTOR_MAP[stripped.replace(/[\s./-]+/g, "")];
  }

  if (direct) return direct;

  // 3. Keyword fallback — uses both ticker AND company name
  const combined = (clean + " " + (name ?? "").toUpperCase());

  if (/BANK|BANDHAN|KOTAKBK/.test(combined))                                      return "Banking";
  if (/BAJAJFIN|MUTHOOT|MANAPPURAM|SHRIRAM|LICHSG|PNBHOUSING|IBULHSG|IRFC|HUDCO|RECLTD|PFCLTD|CDSL|KFINTECH|CAMS|SBICARDS|HDFCAMC|STARHEALTH|ICICIGI|GICRE|NIACL|ANGELONE|MOTILALOFS/.test(combined)) return "Financial Services";
  if (/FINANCE|FINSERV|LENDING|INSURANCE|INVEST|CAPITAL|CREDIT|HOUSING FINANCE/.test(combined)) return "Financial Services";
  if (/TECHM|INFY|INFOSYS|WIPRO|HCLTECH|LTIMIND|TATAELX|TATATECH|PERSISTENT|COFORGE|KPITTECH|CYIENT|BIRLASOFT|HAPPSTMNDS|LATENTVIEW|TANLA|CMSINFO|ECLERX|TEAMLEASE|QUESS|DATAMATICS|LTTS/.test(combined)) return "IT";
  if (/SOFTW|TECHNOL|DIGITAL|INFORMAT|SYSTEM|SOLUT|CONSULT|OUTSOURC/.test(combined)) return "IT";
  if (/SUNPHARMA|DRREDDY|CIPLA|DIVISLAB|LUPIN|AUROPHARMA|TORNTPHARM|ALKEM|IPCA|NATCOPHARM|GRANULES|LAURUSLABS|BIOCON|GLENMARK|ZYDUSLIFE|MANKIND|AJANTPHARM/.test(combined)) return "Pharma";
  if (/PHARMA|DRUGST|BIOLOG|MEDIC(?!AL)/.test(combined))                          return "Pharma";
  if (/APOLLOHOSP|FORTIS|MAXHLT|RAINBCH|HCG|LALPATHLAB|THYROCARE|METROPOLIS|KRSNAA|VIJAYADIAG|MEDPLUS|ASTER|NH/.test(combined)) return "Healthcare";
  if (/HOSPITAL|DIAGNOST|HEALTH(?:CARE)?|CLINIC|MEDIC(?:AL)?/.test(combined))     return "Healthcare";
  if (/NTPCGREEN|ADANIGREEN|SUZLON|INOXWIND|SJVN|NHPC|JSWENERGY|RPOWER|JPPOWER|TORNTPOW|CESC|TATAPOWER|ADANIPOWER|POWERGRID|NTPC/.test(combined)) return "Power";
  if (/SOLAR|WIND ENERGY|RENEWABLE|HYDROPOWER|THERMAL POWER/.test(combined))       return "Power";
  if (/ONGC|BPCL|HPCL|GAIL|PETRONET|MRPL|HINDPETRO|CHENNPETRO|ATGL|GUJGAS|GSPL|IGL|MGL|AEGISLOG|CASTROLIND/.test(combined)) return "Energy";
  if (/PETROLEUM|PETROCHEM|OIL GAS|NATURAL GAS|REFINER/.test(combined))            return "Energy";
  if (/HAL|BEL|BEML|BDL|MDL|COCHINSHIP|GRSE|MIDHANI|MTAR|IDEAFORGE|SOLARINDS|APOLLOMICRO|DCX/.test(combined)) return "Defense";
  if (/DEFENCE|DEFENSE|AEROSPACE|ORDNANCE|ARMAMENT|SHIPBUILD/.test(combined))      return "Defense";
  if (/HINDUNILVR|NESTLEIND|BRITANNIA|DABUR|MARICO|GODREJCP|EMAMILTD|COLPAL|VARUNBEV|JUBLFOOD|BIKAJI|TATACONSUM|JYOTHYLAB|BAJAJCON|RADICO/.test(combined)) return "FMCG";
  if (/FMCG|CONSUMER GOODS|HOUSEHOLD|BEVERAGE|TOBACCO|CONFECTION/.test(combined))  return "FMCG";
  if (/TATAMOTORS|MARUTI|HEROMOTOCO|BAJAJ.AUTO|EICHERMOT|ASHOKLEY|TVSMOTORS|TVSMOTOR|ESCORTS|BALKRISIND|APOLLOTYRE|CEATLTD|SUNDRMFAST|MOTHERSON|BOSCHLTD|BHARATFORG|EXIDEIND|AMARARAJA/.test(combined)) return "Auto";
  if (/AUTOMOBIL|AUTOCOMP|TYRE MANUF|ANCILLAR/.test(combined))                     return "Auto";
  if (/TATASTEEL|JSWSTEEL|HINDALCO|VEDL|NMDC|COALINDIA|NATIONALUM|HINDCOPPER|SAIL|JINDALSAW|JSPL|WELCORP|RATNAMANI|KIOCL|MOIL|GRAVITA/.test(combined)) return "Metals";
  if (/STEEL|METAL|ALUMINIUM|ZINC|COPPER|IRON ORE|MINING|SMELTER|ALLOY/.test(combined)) return "Metals";
  if (/BHARTIARTL|VODAIDEA|VODAFONEIDEA|MTNL|RAILTEL|TATACOMM|TEJASNET|STLTECH|HFCL|GTPL|HATHWAY/.test(combined)) return "Telecom";
  if (/TELECOM|WIRELESS|SPECTRUM|BROADBAND|CABLE NETWORK/.test(combined))          return "Telecom";
  if (/ADANIENT|ADANIPORTS|IRCON|RITES|IRCTC|RVNL|NBCC|NCC|HCC|IRB|PNCINFRA|KNRCON|HAVELLS|POLYCAB|FINOLEX|KEI|SIEMENS|ABB|THERMAX|CUMMINSIND/.test(combined)) return "Infra";
  if (/CEMENT|CONSTRUCT|INFRA(?:STRUCT)?|RAILWAY|AIRPORT|SEAPORT|HIGHWAY|ROAD BUILD|ELECTRICAL EQUIP/.test(combined)) return "Infra";
  if (/DLF|GODREJPROP|OBEROIREAL|PRESTIGE|BRIGADE|SUNTECK|SOBHA|LODHA|MACROTECH|KOLTEPATIL|PHOENIX/.test(combined)) return "Real Estate";
  if (/REAL ESTATE|PROPERTY DEV|REALTY|HOUSING DEV/.test(combined))                return "Real Estate";
  if (/PIDILITIND|ASIANPAINT|BERGER|KANSAIPAINT|INDIGOPNTS|SRF|NAVINFLUOR|DEEPAKNTR|AARTIIND|VINATIORGA|COROMANDEL|PIIND|SUMICHEM|NOCIL|EPIGRAL|DEEPAKFERT/.test(combined)) return "Chemicals";
  if (/SPECIALTY CHEM|AGROCHEM|FERTILISER|PAINT MANUF|PIGMENT|POLYMER|FLUOROCHEM/.test(combined)) return "Chemicals";
  if (/DMART|TRENT|TITAN|KALYANKJIL|SENCO|PVRINOX|BATA|RELAXO|CAMPUS|PAGEIND|MANYAVAR|RAYMOND|ABFRL|NYKAA|ZOMATO/.test(combined)) return "Consumer";
  if (/GOLDBEES|NIFTYBEES|BANKBEES|JUNIORBEES|LIQUIDBEES|SILVERBEES|CPSEETF|ITBEES|INFRABEES|PHARMBEES/.test(combined)) return "ETF";
  if (/\bETF\b|INDEX FUND|EXCHANGE.TRADED/.test(combined))                         return "ETF";

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
