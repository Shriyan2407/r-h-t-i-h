/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — STOCK HISTORICAL INTELLIGENCE ARCHIVE
   Institutional narrative timelines for NSE/BSE equities
═══════════════════════════════════════════════════════════════ */

export type EventSentiment = "BULLISH" | "BEARISH" | "NEUTRAL" | "MIXED";
export type EventCategory  = "EARNINGS" | "MACRO" | "CORPORATE" | "REGULATORY" | "SOCIAL" | "TECHNICAL" | "FUNDRAISE" | "CONTROVERSY";

export interface TimelineEvent {
  year:              number;
  month?:            string;
  headline:          string;
  context:           string;
  marketReaction:    string;
  institutionalRead: string;
  retailSentiment:   string;
  longTermImpact:    string;
  impactScore:       number;
  sentiment:         EventSentiment;
  institutionalConf: number;
  retailExcitement:  number;
  ltImportance:      number;
  category:          EventCategory;
}

export interface NarrativeEra {
  period:      string;
  title:       string;
  description: string;
  sentiment:   number;
  dominant:    string;
  color:       string;
}

export interface SentimentDataPoint {
  year:  number;
  score: number;
  label: string;
}

export interface StockHistoryProfile {
  ticker:             string;
  name:               string;
  sector:             string;
  cap:                string;
  exchange:           string;
  currentTrend:       string;
  currentSentiment:   string;
  oneLiner:           string;
  timeline:           TimelineEvent[];
  narrativeEvolution: NarrativeEra[];
  sentimentChart:     SentimentDataPoint[];
  smartMoneyAnalysis: string;
  macroConnections:   string;
  latestDevelopments: { headline:string; aiRead:string; date:string; sentiment:EventSentiment }[];
  keyRisks:           string[];
}

/* ══════════════════════════════════════════════════════════
   RELIANCE INDUSTRIES
══════════════════════════════════════════════════════════ */

const RELIANCE: StockHistoryProfile = {
  ticker:"RELIANCE", name:"Reliance Industries Ltd",
  sector:"Energy · Telecom · Retail · New Energy", cap:"Mega Cap", exchange:"NSE",
  currentTrend:"Bullish Consolidation", currentSentiment:"BULLISH",
  oneLiner:"Transformed from a petrochemical giant into India's first true digital-physical conglomerate — a journey that redefined institutional understanding of Indian business cycles.",

  timeline:[
    {
      year:2016, month:"Sep",
      headline:"Jio Launch — India's Telecom Armageddon Begins",
      context:"Mukesh Ambani launched Reliance Jio on September 5, 2016 with free voice calls and near-zero data pricing. 100 million subscribers acquired in 170 days — a world record. Incumbent operators (Airtel, Vodafone, Idea) lost 40–60% of their market caps within 18 months.",
      marketReaction:"RIL stock initially flat as market underestimated the magnitude. Smart money began accumulating aggressively in Oct-Dec 2016 at ₹1,050–1,150.",
      institutionalRead:"The free pricing wasn't charity — it was platform warfare. Destroy incumbent revenue models, then extract rent once the ecosystem is captive. Institutions who modeled the Jio subscriber-to-ARPU conversion correctly bought aggressively at these levels.",
      retailSentiment:"Confused initially. Retail didn't understand Jio would be a business asset. Most retail bought telecom competitors thinking 'the competition is already beaten down.'",
      longTermImpact:"Permanently restructured Indian telecom from a 7-player market to effectively 3. Created Reliance's next trillion-rupee revenue stream.",
      impactScore:98, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:90, retailExcitement:55, ltImportance:98,
    },
    {
      year:2018, month:"Apr",
      headline:"Reliance Becomes India's First $100 Billion Company",
      context:"Reliance Industries crossed the ₹7 lakh cr market cap mark in April 2018, becoming India's first $100 billion company. The milestone reflected Jio's monetization trajectory and the O2C expansion. Mukesh Ambani's net worth crossed $40 billion.",
      marketReaction:"Stock rallied 28% in the 6 months preceding the milestone. Significant institutional buying from global EM funds re-weighting India exposure.",
      institutionalRead:"The $100B milestone was a psychological threshold that unlocked capital from global fund mandates requiring minimum $100B market cap for inclusion. Many large global EM funds bought for the first time.",
      retailSentiment:"Extreme pride and euphoria. 'Finally India has a $100B company' narrative dominated social media. Retail bought at highs — classic milestone-chasing behavior.",
      longTermImpact:"Set the stage for Reliance's inclusion in global benchmark indices at higher weights, creating structural demand.",
      impactScore:78, sentiment:"BULLISH", category:"TECHNICAL",
      institutionalConf:80, retailExcitement:94, ltImportance:72,
    },
    {
      year:2019, month:"Aug",
      headline:"Saudi Aramco Deal Speculation — 20% O2C Stake Talks",
      context:"Reports emerged of a potential $15 billion deal with Saudi Aramco for 20% stake in RIL's O2C business. The deal would have been one of India's largest FDI transactions. Negotiations dragged for 3+ years before collapsing in 2021.",
      marketReaction:"RIL stock surged 8% on the day of the announcement. The speculation-driven premium persisted for 18 months even as deal progress remained opaque.",
      institutionalRead:"Classic narrative premium — the market was pricing a deal that wasn't done. Institutions with access to primary sources maintained cautious interpretations while retail ran with the headline. When the deal finally fell through in 2021, the sell-off was contained — market had partially de-risked.",
      retailSentiment:"Very bullish. 'Saudi Aramco validates Reliance' was the dominant Reddit/StockTwits narrative. Confirmation bias was extreme.",
      longTermImpact:"Despite the deal failure, the O2C business was independently valuable. The process exposed RIL's asset monetization capability to global investors.",
      impactScore:71, sentiment:"MIXED", category:"CORPORATE",
      institutionalConf:62, retailExcitement:89, ltImportance:58,
    },
    {
      year:2020, month:"Apr",
      headline:"Jio Platforms Fundraising: $20B in 5 Months — Facebook, Google, KKR, Silver Lake",
      context:"In the depths of COVID lockdowns, Reliance executed one of the greatest capital raising events in corporate history. Facebook invested $5.7B (April 2020), Google invested $4.5B (July 2020), KKR, Silver Lake, Vista, General Atlantic, and others invested combined $14B+ in Jio Platforms. Simultaneously, a ₹53,000 cr rights issue raised money from public markets. Total capital raised: ~₹1.7 lakh cr in 5 months.",
      marketReaction:"RIL became net-debt-free by August 2020, a milestone promised by Mukesh Ambani. Stock rallied from ₹900 (March 2020 COVID lows) to ₹2,360 by September 2020 — a 162% rally in 6 months.",
      institutionalRead:"This was institutional accumulation at scale. The Jio deal sequence was not just capital raising — it was a re-rating event. Facebook and Google's validation of Jio's digital ecosystem was the institutional catalyst. Every global tech-focused fund that missed out felt compelled to buy RIL directly in the equity market.",
      retailSentiment:"Went from panic-selling at ₹900 during COVID crash to extreme FOMO at ₹2,000+. Classic retail behavior: sold during fear, chased during recovery. Social media FOMO was intense throughout H2 2020.",
      longTermImpact:"Permanently changed Reliance's balance sheet quality, strategic optionality, and global institutional interest. Became the standard case study for corporate capital raising during crisis.",
      impactScore:99, sentiment:"BULLISH", category:"FUNDRAISE",
      institutionalConf:98, retailExcitement:91, ltImportance:99,
    },
    {
      year:2021, month:"Mar",
      headline:"JioMart + WhatsApp Integration — Retail Ecosystem Bet",
      context:"Reliance activated the WhatsApp-JioMart commerce integration, enabling grocery ordering through WhatsApp for 400M+ Indian users. Simultaneously, Reliance Retail's revenues crossed ₹1.5 lakh cr, challenging the dominance of Amazon and Flipkart in Indian e-commerce.",
      marketReaction:"Positive but muted — market had already priced significant Retail upside. Stock consolidated between ₹2,200–2,400 for most of 2021.",
      institutionalRead:"The JioMart-WhatsApp integration is strategically significant but short-term execution risk is high. The offline-to-online transition in Indian retail is not linear. Patience required. Institutions modeled ₹2,500 cr EBITDA target for Retail by FY24 — aggressive but achievable.",
      retailSentiment:"Excitement about 'Amazon killer' narrative. Heavy Reddit discussion. Retail positioned early but faced a sideways stock for 12 months — frustrating.",
      longTermImpact:"JioMart captured significant grocery market share. The B2C commerce ambition remains the most underpriced asset in the Reliance ecosystem.",
      impactScore:66, sentiment:"NEUTRAL", category:"CORPORATE",
      institutionalConf:70, retailExcitement:82, ltImportance:76,
    },
    {
      year:2022, month:"Mar",
      headline:"Russia-Ukraine War — O2C Business Windfall",
      context:"The Russia-Ukraine war triggered a global energy crisis. Reliance's O2C (oil-to-chemicals) business — the largest refinery in the world by single-location capacity — became a massive beneficiary. Reliance accessed discounted Russian crude and sold refined products at market prices. O2C EBITDA surged 60%+ YoY.",
      marketReaction:"RIL was one of the few Indian large-caps that outperformed during the 2022 global sell-off. Stock gained 18% while Nifty fell 4% — demonstrating genuine defensive qualities via the energy business.",
      institutionalRead:"Institutional community was split. Value investors doubled down on RIL as a geopolitical hedge. Growth investors were uncomfortable with 'war profiteering' narrative. The stock's defensive performance during 2022 volatility attracted fresh capital from risk-off global EM funds.",
      retailSentiment:"Confused. Retail typically doesn't understand refinery economics. The 'buy India's energy security play' narrative was spread by influencers but substance was patchy.",
      longTermImpact:"Exposed the under-analyzed value of the O2C business as a genuine global commodity asset, not just a boring background business.",
      impactScore:74, sentiment:"BULLISH", category:"MACRO",
      institutionalConf:79, retailExcitement:54, ltImportance:68,
    },
    {
      year:2023, month:"Oct",
      headline:"JioAirFiber Launch — Targeting 200M Home Broadband Connections",
      context:"Reliance launched JioAirFiber — a fixed-wireless broadband product targeting Indian homes outside fiber optic reach. Target: 200 million homes in tier-2 and tier-3 cities. Simultaneously, Jio 5G rollout covered 98% of India's top 100 cities, achieved in record time.",
      marketReaction:"Stock rallied 6% in the week following the JioAirFiber launch. The market repriced the home broadband opportunity — a vertical that was underdiscussed in analyst coverage.",
      institutionalRead:"Home broadband ARPU in India averages ₹650-700/month — vs. mobile ARPU of ₹180. A successful JioAirFiber penetration would be materially accretive. 30 million home connections at ₹700 ARPU = ₹25,000 cr annual revenue. Institutions began modeling this as a new EBITDA segment.",
      retailSentiment:"Heavy social media excitement. 'Jio will destroy ACT and Airtel broadband' narrative spread rapidly. StockTwits sentiment turned extremely bullish.",
      longTermImpact:"JioAirFiber represents the next ARPU expansion cycle after mobile. If execution matches ambition, it adds ₹30,000-40,000 cr to FY28 revenues.",
      impactScore:80, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:82, retailExcitement:88, ltImportance:84,
    },
    {
      year:2024, month:"Jan",
      headline:"Reliance New Energy — Green Hydrogen + Solar + Battery Gigafactories",
      context:"Reliance's ₹75,000 cr new energy investment began showing tangible progress. The Dhirubhai Ambani Green Energy Giga Complex in Jamnagar — largest solar giga-factory globally — began Phase 1 operations. Partnerships with global technology companies for battery chemistry and electrolyzers were announced.",
      marketReaction:"Limited immediate market reaction — most analysts treating new energy as 2027-28 story. But quiet institutional accumulation on every dip suggests the long-term money understands the strategic significance.",
      institutionalRead:"The new energy bet is the most consequential strategic move Reliance has made since Jio. India's energy transition requirement is ₹15 lakh cr+ of investment by 2030. Reliance is positioning to capture 20-25% of this market. The 10-year NPV of this business exceeds the current O2C business at any reasonable scenario.",
      retailSentiment:"Ignored by most retail traders who trade 6-month horizons. This is a 2026-2030 thesis. Only long-term conviction holders are positioned here.",
      longTermImpact:"Potentially the single largest value creation event in Reliance's history — if execution delivers. The analogy is Jio in 2013: invisible to analysts, transformative in hindsight.",
      impactScore:87, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:84, retailExcitement:42, ltImportance:96,
    },
  ],

  narrativeEvolution:[
    { period:"Pre-2016", title:"Petrochemical & Energy Giant", description:"RIL was understood purely as a refining-and-petrochemical business. Cyclical. Commodity-driven. Valued on GRM spreads and capex cycles.", sentiment:55, dominant:"O2C commodity cycle pricing", color:"#FFB800" },
    { period:"2016–2018", title:"Telecom Disruptor", description:"Jio launch changed everything. Market struggled to value a telecom subscriber base sitting inside an energy company. Premium for disruption vs. discount for capital destruction — investors split.", sentiment:72, dominant:"Jio subscriber growth narrative", color:"#38BDF8" },
    { period:"2019–2020", title:"Capital Machine — Conglomerate Re-rating", description:"Facebook/Google/KKR investments de-risked the Jio bet. Market started valuing Reliance as a conglomerate of independent high-value businesses: Jio (telecom), Retail, O2C.", sentiment:86, dominant:"Deal-flow validation, net debt zero target", color:"#FFD700" },
    { period:"2021–2022", title:"Digital Infrastructure Platform", description:"JioMart, WhatsApp integration, 5G capex. The narrative shifted from 'telecom company' to 'digital infrastructure underlying India's consumption story'.", sentiment:78, dominant:"Digital India proxy, retail growth", color:"#FFD700" },
    { period:"2023–Present", title:"AI & Clean Energy Conglomerate", description:"5G completion, JioAirFiber, New Energy gigafactory — Reliance is now being modeled as a multi-generational platform play spanning AI infrastructure, clean energy transition, and digital-physical retail.", sentiment:81, dominant:"New energy capex, Jio ARPU expansion, AI data centers", color:"#00FF9C" },
  ],

  sentimentChart:[
    { year:2015, score:52, label:"Stable" },
    { year:2016, score:61, label:"Jio disruption" },
    { year:2017, score:68, label:"Monetization emerging" },
    { year:2018, score:77, label:"$100B milestone" },
    { year:2019, score:72, label:"Aramco speculation" },
    { year:2020, score:92, label:"Jio fundraising" },
    { year:2021, score:74, label:"Consolidation" },
    { year:2022, score:80, label:"Energy windfall" },
    { year:2023, score:78, label:"JioAirFiber" },
    { year:2024, score:81, label:"New energy" },
    { year:2025, score:79, label:"Current" },
  ],

  smartMoneyAnalysis:"The clearest institutional accumulation signal in Reliance's history was Q1 2020 — immediately after the COVID crash and alongside the Jio fundraising. Delivery percentages spiked to 72% at a time when retail was selling in panic. FII holding increased despite broad EM selling. The institutions who understood that Facebook and Google's investment validated Jio at a ₹4.6 lakh cr valuation bought RIL at ₹900-1,100 — generating 120%+ returns in 12 months. The current institutional positioning is more nuanced: patient money accumulating on dips below ₹2,820, trading money exiting rallies above ₹3,000.",
  macroConnections:"Crude oil at $75-85 is the sweet spot for RIL's O2C business — high enough for margins, low enough for demand. USD/INR above ₹84 reduces import cost in INR terms (RIL imports crude in USD), compressing O2C margins. FII flows into India benefit RIL disproportionately due to its 10.2% NIFTY weight — every $100M FII inflow into India brings $10M of passive buying to RIL. RBI rate cuts are a secondary positive through domestic consumption uplift.",
  latestDevelopments:[
    { headline:"Jio Q3 ARPU Reaches ₹195 — Beats Consensus of ₹188", aiRead:"ARPU expansion is the central investment thesis and Q3 delivery confirms it. Each ₹10 ARPU increase translates to ~₹21,000 cr annualized revenue. The upgrade cycle to JioPrime (₹299+/month plans) is accelerating. This is institutional-grade execution.", date:"Jan 2025", sentiment:"BULLISH" },
    { headline:"New Energy Phase 1 Commissioned — 10 GW Solar Manufacturing Capacity", aiRead:"First material output from the ₹75,000 cr new energy investment. Phase 1 is modest but confirms execution capability. Market is underpricing what Phase 3 (by 2027) will add to EBITDA. Long-term holders accumulating.", date:"Dec 2024", sentiment:"BULLISH" },
    { headline:"Reliance Retail Revenue Crosses ₹3 Lakh Cr — Largest Indian Retailer by Revenue", aiRead:"Reliance Retail is now larger than any public Indian retailer. EBITDA margins at 6.8% are improving. The eventual Retail IPO (expected FY26-27) would likely be priced at 8-10% EBITDA margin — current levels are not peak margins.", date:"Nov 2024", sentiment:"BULLISH" },
  ],
  keyRisks:["Jio ARPU growth plateau if competitive pressure returns","O2C margin compression if crude stays >$90","New energy capex drain on FCF for longer than expected","Regulatory risk on Jio's market dominance (TRAI)","Mukesh Ambani succession planning uncertainty"],
};

/* ══════════════════════════════════════════════════════════
   TCS
══════════════════════════════════════════════════════════ */

const TCS: StockHistoryProfile = {
  ticker:"TCS", name:"Tata Consultancy Services Ltd",
  sector:"Technology · IT Services", cap:"Mega Cap", exchange:"NSE",
  currentTrend:"Sideways Consolidation", currentSentiment:"NEUTRAL",
  oneLiner:"India's most consistent wealth compounder — a business that survived every macro cycle, returned ₹1.1 lakh cr to shareholders, yet is temporarily out of favor as the market debates Gen AI disruption vs opportunity.",

  timeline:[
    {
      year:2004, month:"Aug",
      headline:"TCS IPO — India's Largest IPO at the Time",
      context:"TCS listed on August 25, 2004 in what was then India's largest IPO at ₹5,500 cr. Listed at ₹850 vs issue price of ₹775. The IPO marked the mainstream institutionalization of India's IT services sector.",
      marketReaction:"Significant retail participation. Stock listed at 9.7% premium and continued rallying for 18 months post-listing.",
      institutionalRead:"FII community recognized TCS as the 'blue chip' of Indian IT — built on a proven global delivery model with Tata Group's corporate governance backing. Early FII buyers in 2004-05 generated 10x returns over 15 years.",
      retailSentiment:"Nationalistic pride + greed. 'India's pride goes public' was the dominant sentiment. Most retail bought and held — unusually patient behavior for the era.",
      longTermImpact:"Set the standard for Indian IT company listings and investor expectations of consistent dividend + buyback returns.",
      impactScore:76, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:82, retailExcitement:88, ltImportance:85,
    },
    {
      year:2008, month:"Oct",
      headline:"Global Financial Crisis — TCS Survives While US Banks Collapse",
      context:"The 2008 global financial crisis sent shockwaves through Indian IT. BFSI clients (30%+ of TCS revenue) faced existential threats. Lehman Brothers, one of TCS's clients, declared bankruptcy. Market feared catastrophic revenue collapse.",
      marketReaction:"TCS fell from ₹850 to ₹380 in 6 months (55% decline). Most of the fall was panic-driven rather than fundamentals-driven — actual revenue growth remained positive at 4% in FY09.",
      institutionalRead:"Classic overreaction. The GFC actually strengthened TCS's competitive position — US companies desperate to cut costs outsourced MORE to Indian IT, not less. Institutions who bought at ₹380-420 during the panic generated 500%+ returns by 2013.",
      retailSentiment:"Panic. 'IT is dead, outsourcing will end' narrative dominated. Capitulation selling at lows was almost entirely retail-driven.",
      longTermImpact:"Proved the anti-fragility of India's IT services model — downturns increase outsourcing, not reduce it. Established TCS as the safest large-cap bet during global uncertainty.",
      impactScore:91, sentiment:"MIXED", category:"MACRO",
      institutionalConf:78, retailExcitement:15, ltImportance:90,
    },
    {
      year:2018, month:"Jan",
      headline:"TCS Crosses $100 Billion Market Cap — India's Second $100B Company",
      context:"TCS became India's second company (after RIL) to cross the $100 billion market capitalization mark in January 2018. The milestone was achieved during a period of strong earnings delivery — 8-10% revenue growth, 25%+ EBITDA margins, best-in-class return of capital.",
      marketReaction:"Stock at all-time highs near ₹3,900. Significant PE multiple expansion as global institutional indices included TCS at higher weights.",
      institutionalRead:"The $100B milestone marked TCS's inclusion in the global 'quality compounder' conversation — alongside Accenture and Cognizant. Global PE/VC funds built positions as a proxy for India's digital economy.",
      retailSentiment:"Strong retail buying on the milestone — classic milestone-driven behavior. Retail bought aggressively but faced a sideways market for 8 months after.",
      longTermImpact:"Established TCS as a permanent constituent of global quality equity mandates. Created structural institutional demand regardless of short-term cycles.",
      impactScore:72, sentiment:"BULLISH", category:"TECHNICAL",
      institutionalConf:83, retailExcitement:87, ltImportance:68,
    },
    {
      year:2020, month:"Apr",
      headline:"COVID-19 — TCS Executes the Largest WFH Transition in History",
      context:"Within 72 hours of India's COVID lockdown announcement, TCS transitioned 450,000 employees to work-from-home — described by CEO Rajesh Gopinathan as 'operationally unprecedented.' Q1 FY21 showed only a 6% revenue decline vs. fears of 20%+.",
      marketReaction:"After the initial 45% COVID crash (₹2,100 to ₹1,500), TCS recovered to ATH within 8 months — faster than most feared. The WFH narrative added a structural premium: IT was now 'essential infrastructure.'",
      institutionalRead:"COVID accelerated digital transformation spending by 5 years. TCS's clients suddenly had emergency digital transformation budgets. Deal TCV in H2 FY21 and FY22 was the highest in TCS history. Institutions recognized this early and accumulated the COVID dip aggressively.",
      retailSentiment:"Initially panic-sold. Then FOMO-bought at highs after the 100% recovery. Social media turned 'IT sector is now invincible' bullish — slightly ahead of itself.",
      longTermImpact:"COVID permanently elevated IT spending as % of corporate budgets. TCS's addressable market expanded permanently. This is the reason FY22 deal TCV was record-breaking.",
      impactScore:94, sentiment:"BULLISH", category:"MACRO",
      institutionalConf:91, retailExcitement:78, ltImportance:92,
    },
    {
      year:2022, month:"Jan",
      headline:"Great Resignation — TCS Faces 20%+ Attrition, Hiring 120,000 People/Year",
      context:"The post-COVID talent war created an attrition crisis. TCS's annualized attrition reached 21.5% in FY22 — a level never seen before. The company was forced to hire and retain aggressively, leading to significant salary inflation and wage bill expansion. Operating margins faced 200-300 bps pressure.",
      marketReaction:"Stock fell 15% from peak in H1 2022 as margin compression became visible in earnings. Multiple analyst downgrades.",
      institutionalRead:"Short-term pain, long-term gain. The talent war created a structural barrier to entry — smaller players couldn't afford to compete on compensation. TCS's ability to absorb the cost shock without revenue deterioration proved its pricing power.",
      retailSentiment:"Panic about 'IT's golden era is over.' Reddit discussions full of 'TCS margin gone forever' narratives — which proved incorrect.",
      longTermImpact:"Attrition normalized by Q3 FY23 (below 15%). The salary inflation was absorbed through contract repricing and productivity improvements. No permanent damage.",
      impactScore:62, sentiment:"BEARISH", category:"CORPORATE",
      institutionalConf:65, retailExcitement:22, ltImportance:55,
    },
    {
      year:2023, month:"Mar",
      headline:"US Banking Crisis — Silicon Valley Bank, First Republic — BFSI Spending Freeze",
      context:"The collapse of SVB, Signature Bank, and First Republic in March-May 2023 triggered immediate IT budget freezes at US banking clients. BFSI represents 30-32% of TCS revenue. Multiple large deals were deferred, and discretionary spending was cut across US financial services.",
      marketReaction:"TCS fell 12% from Q4 FY23 peak as guidance came in below expectations. Analyst consensus moved toward 'structural slowdown' narrative.",
      institutionalRead:"US banking crisis created a 6-8 quarter IT spending pause in BFSI. TCS's outsized BFSI exposure is the core risk. However, history shows that bank restructurings (cost cutting) eventually INCREASE outsourcing as banks try to reduce fixed costs. The Q4 FY24-FY25 recovery is already beginning.",
      retailSentiment:"'BFSI is dead' narrative spread aggressively on Twitter/X and Reddit. Classic extrapolation of short-term event into permanent structural change.",
      longTermImpact:"Created the current sideways trading range. The recovery will be gradual but consistent. TCS's deal TCV improving sequentially is the leading indicator to watch.",
      impactScore:74, sentiment:"BEARISH", category:"MACRO",
      institutionalConf:58, retailExcitement:18, ltImportance:61,
    },
    {
      year:2024, month:"Jul",
      headline:"Gen AI Narrative: Disruption or Opportunity? The Market Can't Decide",
      context:"The rise of Gen AI created existential questions about TCS's business model. ChatGPT and Copilot threatened to automate software development — directly TCS's bread and butter. Simultaneously, enterprises needed implementation help for Gen AI — directly TCS's opportunity. The stock spent all of 2024 pricing and repricing this narrative tension.",
      marketReaction:"Volatile range-trading between ₹3,850-4,400. No consensus direction. Every AI-positive news pumped the stock 3-4%, every AI-negative article (code automation threats) pushed it down 2-3%.",
      institutionalRead:"The institution community is genuinely split. Conservative view: AI reduces TCS's billable hours (headcount-based business model threatened). Bullish view: TCS's scale and trust make it the go-to AI transformation partner for Fortune 500. The resolution: likely both are true, and the transition will take 5-7 years. Current TCS revenue will be stable through 2026.",
      retailSentiment:"High anxiety. 'AI will kill TCS' threads compete with 'TCS will dominate AI implementation' threads. Retail positioning is unusually light — classic uncertainty paralysis.",
      longTermImpact:"The Gen AI question will be answered by deal wins data — TCV from AI-related transformation contracts. Watch this metric quarterly. If TCS wins $3B+ in AI-specific deals in FY26, the discount is unjustified.",
      impactScore:81, sentiment:"MIXED", category:"SOCIAL",
      institutionalConf:58, retailExcitement:55, ltImportance:88,
    },
  ],

  narrativeEvolution:[
    { period:"2004–2010", title:"India's IT Services Pioneer", description:"TCS valued as a pure IT services play. Multiple expansion driven by India's cost arbitrage advantage, English-speaking talent, and Tata corporate governance premium.", sentiment:72, dominant:"Cost arbitrage, headcount growth, US client expansion", color:"#38BDF8" },
    { period:"2011–2017", title:"Global Delivery Model Perfection", description:"Offshore delivery model fully mature. TCS became the benchmark for execution consistency — 25%+ margins, 15%+ revenue growth, perfect capital allocation. Widely called 'India's most boring great business.'", sentiment:80, dominant:"Execution consistency, dividend + buyback compounding", color:"#FFD700" },
    { period:"2018–2020", title:"$100B Quality Compounder Era", description:"COVID accelerated digital transformation and TCS's strategic importance. The 'digital transformation essential infrastructure' narrative pushed TCS to peak valuations of 32-35x PE.", sentiment:86, dominant:"Digital transformation acceleration, WFH beneficiary", color:"#00FF9C" },
    { period:"2021–2023", title:"Attrition + BFSI Slowdown", description:"Post-COVID normalization delivered headwinds: talent war, margin compression, US banking crisis. Multiple compression from 35x to 25x PE. Market questioned if growth normalization was structural.", sentiment:55, dominant:"Attrition, US macro uncertainty, BFSI spending freeze", color:"#FFB800" },
    { period:"2024–Present", title:"Gen AI Transition — Uncertainty Premium", description:"The Gen AI disruption/opportunity debate creates valuation uncertainty. TCS trades at the widest discount to historical mean in a decade — either a value trap or generational opportunity depending on AI deal wins.", sentiment:58, dominant:"AI disruption vs AI opportunity, BFSI recovery, US rate cuts", color:"#C084FC" },
  ],

  sentimentChart:[
    { year:2015, score:76, label:"Growth era" }, { year:2016, score:72, label:"Automation fears" },
    { year:2017, score:74, label:"Recovery" }, { year:2018, score:81, label:"$100B milestone" },
    { year:2019, score:75, label:"Steady" }, { year:2020, score:88, label:"COVID WFH" },
    { year:2021, score:78, label:"Post-COVID peak" }, { year:2022, score:54, label:"Attrition" },
    { year:2023, score:50, label:"BFSI freeze" }, { year:2024, score:56, label:"AI uncertainty" },
    { year:2025, score:60, label:"Recovery forming" },
  ],

  smartMoneyAnalysis:"The best institutional entry points in TCS history: (1) Post-GFC 2008 at ₹380-420 — 500% returns over 5 years. (2) COVID crash 2020 at ₹1,500-1,800 — 150% returns in 2 years. (3) Current sideways range (₹3,850-3,920) may represent the third institutional accumulation zone. Delivery data shows domestic MF and insurance buying aggressively on dips — classic patient institutional accumulation ahead of a multi-year recovery.",
  macroConnections:"USDINR is the most direct macro lever — every 1% INR depreciation adds ~120 bps to TCS margin. US rates: lower US rates free BFSI capex budgets → direct deal pipeline improvement. US GDP growth: IT spending typically lags GDP by 1-2 quarters. Current US softness has reduced IT spending — recovery in US corporate capex (likely H2 2025) will flow through to TCS numbers by Q2/Q3 FY26.",
  latestDevelopments:[
    { headline:"TCS Deal TCV Q3 FY25 at ₹36,200 Cr — Sequential Improvement", aiRead:"Deal TCV improving sequentially after 5 quarters of decline. The recovery is early but directionally correct. First concrete evidence that BFSI spending is recovering. Watch for acceleration in Q4.", date:"Jan 2025", sentiment:"BULLISH" },
    { headline:"TCS Declares ₹76/Share Final Dividend + ₹18,000 Cr Buyback", aiRead:"Capital return at this scale (₹76 dividend + buyback) signals management confidence. FCF generation remains ₹46,000 cr annually. Yield-on-cost for buyers at ₹3,900 is 4.2% — rare for an Indian growth company. Institutional income funds are accumulating.", date:"Oct 2024", sentiment:"BULLISH" },
    { headline:"Gen AI Deal: BSNL Network AI Management — ₹15,000 Cr Contract", aiRead:"First material AI infrastructure contract win. Validates TCS as an AI implementation player, not just a disruption victim. This contract category will be the key growth vector by FY27. Small now, but model for future.", date:"Sep 2024", sentiment:"BULLISH" },
  ],
  keyRisks:["US BFSI spending recovery taking longer than expected","Gen AI automating 15-20% of billable work by 2027","Tata Sons stake sale overhang","EUR/USD compression on European revenue","Rajesh Gopinathan's potential return — management continuity question"],
};

/* ══════════════════════════════════════════════════════════
   HDFCBANK
══════════════════════════════════════════════════════════ */

const HDFCBANK: StockHistoryProfile = {
  ticker:"HDFCBANK", name:"HDFC Bank Ltd",
  sector:"Banking & Financial Services", cap:"Large Cap", exchange:"NSE",
  currentTrend:"Bottoming Structure", currentSentiment:"NEUTRAL",
  oneLiner:"India's most reliable banking compounder for 28 years now faces the most complex transition in its history — the HDFC Ltd. merger that simultaneously creates India's largest bank and compresses near-term return ratios.",

  timeline:[
    {
      year:1995, month:"Jan",
      headline:"HDFC Bank's First Branch Opens — Aditya Puri's Vision Begins",
      context:"HDFC Bank opened its first branch in Mumbai in January 1995 under MD Aditya Puri (hired from Citibank Asia). The private banking license was granted under India's 1993 banking liberalization. The founding thesis: build an institution-quality bank in India with world-class credit processes.",
      marketReaction:"Stock listed at ₹11.50 on BSE. Minimal market interest — new private banks were untested.",
      institutionalRead:"FII investors who bought HDFC Bank's IPO at ₹11.50 and held for 25 years generated 10,000%+ returns — one of the greatest banking investments in history.",
      retailSentiment:"No significant retail awareness at the time. Banking sector was dominated by PSU banks in public consciousness.",
      longTermImpact:"Established HDFC Bank's founding culture: technology-first, credit-disciplined, branch-less banking vision. These founding principles drove 28 years of outperformance.",
      impactScore:95, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:70, retailExcitement:20, ltImportance:99,
    },
    {
      year:2020, month:"Mar",
      headline:"COVID Crisis — HDFC Bank's Asset Quality Fears",
      context:"India's COVID lockdown triggered fears of massive NPA spikes across banking. HDFC Bank — with 58% of loans to MSMEs, self-employed, and retail — was seen as particularly exposed. Moratorium on loan repayments was announced by RBI. Market panic was extreme.",
      marketReaction:"HDFC Bank fell from ₹1,305 to ₹730 in 6 weeks — a 44% decline. The fall was disproportionate to actual credit losses, which proved to be minimal.",
      institutionalRead:"HDFC Bank's credit underwriting discipline, built over 25 years, was the competitive moat that the market was discounting. Post-moratorium NPA slippage was 60% lower than market estimates. Institutions who bought at ₹730-850 generated 100%+ returns in 18 months.",
      retailSentiment:"Extreme fear. 'HDFC Bank NPA crisis imminent' narratives dominated Twitter. Retail sold at lows and missed the entire recovery.",
      longTermImpact:"Proved HDFC Bank's credit quality moat is genuine, not cyclical. Emerged from COVID as the undisputed #1 private bank in India.",
      impactScore:88, sentiment:"MIXED", category:"MACRO",
      institutionalConf:74, retailExcitement:12, ltImportance:86,
    },
    {
      year:2022, month:"Apr",
      headline:"HDFC-HDFC Bank Merger Announced — India's Biggest Financial Merger",
      context:"HDFC Ltd. and HDFC Bank announced a merger that would create a combined entity with ₹18 lakh cr in assets — the largest bank merger in Indian history. The deal structure: 42 HDFC Bank shares for every 25 HDFC Ltd. shares held.",
      marketReaction:"HDFC Bank fell 10% on the announcement day — surprising given it was supposedly a positive strategic event. The market was pricing dilution, NIM compression, and regulatory complexity.",
      institutionalRead:"Sophisticated institutions were split. Bull case: merger creates the most formidable financial institution in India, unlocks mortgage cross-sell, dramatically expands addressable market. Bear case: NIM compression from HDFC Ltd.'s higher cost of funds, integration complexity, LCR ratio challenges. Both cases proved partially correct.",
      retailSentiment:"Initially confused, then bullish. 'Merger = bigger = better' retail logic led to FOMO buying at wrong levels.",
      longTermImpact:"This is the defining event of HDFC Bank's recent history. The merger is creating a 2-3 year period of earnings pressure that is obscuring the long-term franchise value creation.",
      impactScore:94, sentiment:"MIXED", category:"CORPORATE",
      institutionalConf:65, retailExcitement:72, ltImportance:96,
    },
    {
      year:2023, month:"Jul",
      headline:"Merger Completed — NIM Compression Thesis Validated",
      context:"The HDFC-HDFC Bank merger was completed in July 2023 after 15 months of regulatory approval processes. The combined entity had ₹24 lakh cr in assets. The immediate effect: HDFC Bank's Net Interest Margin compressed from 4.3% to 3.85% as HDFC Ltd.'s higher-cost borrowing portfolio was absorbed.",
      marketReaction:"Stock began a 22% decline from ₹1,790 post-merger highs to current ₹1,390. FII selling was systematic — 2.8% FII stake reduction in 4 quarters.",
      institutionalRead:"The NIM compression was both predictable and unavoidable. The market is penalizing HDFC Bank for a strategic decision that is correct in the long run but painful in the near term. The key insight: HDFC Bank's NIM at 4.05% is STILL 40-50 bps above its private bank peers. The 'it's compressing' narrative is true; the 'it's broken' narrative is false.",
      retailSentiment:"Mounting frustration. 'HDFC Bank was India's best bank — why is it falling?' was the dominant social media narrative. Many retail investors who bought at ₹1,500-1,600 are sitting on losses.",
      longTermImpact:"The merger will be seen as brilliant in 3-5 years. The mortgage cross-sell opportunity ($200B home loan market via HDFC Bank distribution) is unprecedented. The near-term pain is the price for long-term franchise value.",
      impactScore:86, sentiment:"MIXED", category:"CORPORATE",
      institutionalConf:72, retailExcitement:28, ltImportance:92,
    },
    {
      year:2024, month:"Oct",
      headline:"HDFC Bank Posts 4.05% NIM — Below Pre-Merger 4.3% — FII Exit Continues",
      context:"HDFC Bank reported Q2 FY25 results with NIM at 4.05% vs. 4.3% pre-merger. Deposits grew 15% but credit growth at 7% lagged expectations. FII ownership fell below 54% for the first time since 2010. Stock tested ₹1,380.",
      marketReaction:"Another 4-5% decline on results. Institutional selling visible but delivery volumes showing domestic funds absorbing. The smart money ownership transition accelerated.",
      institutionalRead:"This quarter may mark the bottom of HDFC Bank's near-term pain. Deposit cost pressures are peaking. Credit growth is being deliberately managed for quality over volume. The management's guidance of 'NIM floor at 4.0%' is credible. The risk/reward at ₹1,380-1,440 is among the best in Indian large-cap banking.",
      retailSentiment:"Deep pessimism. 'HDFC Bank has permanently lost its edge' narratives were widespread — classic market bottom psychology.",
      longTermImpact:"Post-RBI rate cycle turn (expected FY26), HDFC Bank's NIM will expand, loan growth will re-accelerate, and the 'broken bank' narrative will be forcefully reversed. The question is timing, not direction.",
      impactScore:72, sentiment:"BEARISH", category:"EARNINGS",
      institutionalConf:78, retailExcitement:15, ltImportance:82,
    },
  ],

  narrativeEvolution:[
    { period:"1995–2015", title:"India's Best Bank — Execution Machine", description:"HDFC Bank compounded at 25-30% annual returns for two decades. No controversy, no NPA crisis, no management scandal. The market ascribed a 'quality premium' that was simply the reality of best-in-class banking.", sentiment:88, dominant:"Consistent earnings delivery, credit quality, Aditya Puri's leadership", color:"#00FF9C" },
    { period:"2016–2020", title:"Tech-First Private Bank Premium", description:"HDFC Bank's digital banking initiatives, mobile app leadership, and fintech partnerships sustained the premium multiple. Market narrative: 'HDFC Bank is too big to fail and too good to slow down.'", sentiment:82, dominant:"Digital banking leadership, fintech competition moat", color:"#38BDF8" },
    { period:"2021–2022", title:"Merger Speculation & Digital Disruption", description:"Pre-merger, the stock de-rated modestly as the market priced digital disruption risk and slowing growth trajectory. Simultaneously, whispers of the HDFC merger created anticipation.", sentiment:72, dominant:"Digital disruption risk, growth normalization, merger speculation", color:"#FFD700" },
    { period:"2023–Present", title:"Post-Merger Absorption — The Lost Premium", description:"The merger created India's largest bank while simultaneously compressing the return metrics that justified HDFC Bank's premium valuation. The market is in a 'show me the synergies' phase. The premium has collapsed.", sentiment:48, dominant:"NIM compression, FII selling, merger integration complexity", color:"#FFB800" },
  ],

  sentimentChart:[
    { year:2015, score:85, label:"Peak quality" }, { year:2016, score:82, label:"Steady" },
    { year:2017, score:84, label:"Strong" }, { year:2018, score:80, label:"Consistent" },
    { year:2019, score:78, label:"Growth concern" }, { year:2020, score:62, label:"COVID fear" },
    { year:2021, score:80, label:"Recovery" }, { year:2022, score:72, label:"Merger news" },
    { year:2023, score:50, label:"Post-merger" }, { year:2024, score:44, label:"NIM pressure" },
    { year:2025, score:56, label:"Bottoming" },
  ],

  smartMoneyAnalysis:"The current institutional positioning in HDFC Bank is one of the most interesting in large-cap India. FIIs (who historically held 58-62%) have systematically reduced to 54-55% over 4 quarters. This 'impatient capital' is being replaced by domestic institutional capital (LIC, SBI Mutual Fund, HDFC AMC, ICICI Pru — all increasing holdings). This ownership transfer historically precedes a significant re-rating. The domestic 'patient capital' is building positions for the RBI rate cut cycle where HDFC Bank is the primary beneficiary.",
  macroConnections:"Every 25 bps RBI rate cut reduces HDFC Bank's deposit cost by ~15 bps while improving loan repricing by ~20 bps — a net positive. The current RBI rate hold is the central headwind. A shift to accommodation (expected H2 FY26) would be the single largest re-rating catalyst. INR stability benefits HDFC Bank's USD-denominated borrowing costs from international markets.",
  latestDevelopments:[
    { headline:"HDFC Bank Deposit Growth 15% YoY — CASA Ratio Stabilizing at 34%", aiRead:"Deposit growth recovering is the first green shoot. CASA ratio stabilization at 34% (vs. fear of sub-30%) confirms the liability franchise remains strong. Cost of deposits is peaking — next 2-3 quarters will show improvement.", date:"Jan 2025", sentiment:"NEUTRAL" },
    { headline:"HDFC Bank Board Approves ₹18,000 Cr Buyback at ₹1,700/Share", aiRead:"Buyback at ₹1,700 with stock at ₹1,410 signals management conviction that the stock is deeply undervalued. This is smart capital allocation. Institutions treat buybacks as insider confidence signals — positive for the accumulation thesis.", date:"Dec 2024", sentiment:"BULLISH" },
  ],
  keyRisks:["NIM not stabilizing above 4.0%","Deposit growth lagging credit growth","CASA ratio declining further","Mortgage portfolio quality in post-merger HDFC Ltd. book","RBI rate cuts delayed to FY27"],
};

/* ══════════════════════════════════════════════════════════
   ADANIENT (Adani Enterprises)
══════════════════════════════════════════════════════════ */

const ADANIENT: StockHistoryProfile = {
  ticker:"ADANIENT", name:"Adani Enterprises Ltd",
  sector:"Infrastructure · Energy · Airports · Green Energy", cap:"Large Cap", exchange:"NSE",
  currentTrend:"Recovery from Hindenburg — Rebuilding",
  currentSentiment:"CAUTIOUSLY BULLISH",
  oneLiner:"The most controversial large-cap in India — a story of extraordinary infrastructure ambition, a near-death experience via a short-seller attack, and a remarkable recovery that defines the resilience of India's institutional ecosystem.",

  timeline:[
    {
      year:2020, month:"Jan",
      headline:"Adani FPO — Market Discovers the Infrastructure Empire",
      context:"Adani Group's multiple listed entities (Adani Enterprises, Adani Ports, Adani Green, Adani Transmission, Adani Total Gas) were relatively obscure to mainstream retail investors before 2020. A series of institutional research reports and analyst upgrades triggered broader market discovery of the infrastructure story.",
      marketReaction:"Adani Enterprises surged 180% between Jan 2020 and Jan 2021. The narrative: India's infrastructure boom proxy.",
      institutionalRead:"The Adani thesis was genuinely compelling: India needed $2 trillion of infrastructure spending over 10 years. Adani Ports (world-class), Adani Green (largest renewable energy company in India), Adani Airports (6 major airports including Mumbai) — these were real assets with real cash flows.",
      retailSentiment:"Moderate awareness. Sophisticated retail understood the infrastructure play. Most retail chased the momentum without understanding the leverage structure.",
      longTermImpact:"Set the stage for the spectacular 2021-22 bull run and subsequent Hindenburg crisis.",
      impactScore:70, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:72, retailExcitement:65, ltImportance:74,
    },
    {
      year:2022, month:"Dec",
      headline:"Adani Group Valuation Peaks — Gautam Adani Becomes World's 2nd Richest Man",
      context:"By December 2022, Adani Group's combined market cap across 7 listed companies exceeded $220 billion. Adani Enterprises alone was at ₹4,000+. The run had been fueled by massive FPO proceeds, infrastructure asset acquisitions (Mumbai Airport, cement companies Ambuja, ACC), and global green energy investor interest.",
      marketReaction:"At peak, Adani Group accounted for 8% of BSE market cap — a concentration level that made global investors nervous about India risk.",
      institutionalRead:"Institutional community was split. True believers pointed to real infrastructure assets and India's growth story. Skeptics pointed to 13 listed entities owned predominantly by promoter-linked entities with concentrated leverage.",
      retailSentiment:"Euphoric. 'India's Elon Musk' was a widely used Twitter/X characterization. Retail participation at all-time highs — dangerous levels of retail concentration in a single conglomerate.",
      longTermImpact:"Peak valuations made the subsequent Hindenburg attack more damaging than it would have been at normalized levels.",
      impactScore:82, sentiment:"BULLISH", category:"SOCIAL",
      institutionalConf:60, retailExcitement:96, ltImportance:72,
    },
    {
      year:2023, month:"Jan",
      headline:"Hindenburg Research Report — '$218 Billion Con' Allegations",
      context:"On January 24, 2023, New York-based short-seller Hindenburg Research published a 106-page report accusing Adani Group of 'brazen stock manipulation and accounting fraud' over decades. The report alleged offshore shell company structures, suspicious related-party transactions, and unsustainable leverage. The report was released specifically during Adani's $2.5B FPO roadshow.",
      marketReaction:"Adani Group collectively lost $100 billion in market cap in 3 trading sessions. Adani Enterprises fell 59% from ₹3,400 to ₹1,400. The FPO was pulled. LIC and SBI (major Adani holders) faced questions about their exposure.",
      institutionalRead:"The institutional response was remarkably disciplined. Indian banks didn't panic. LIC held its position. FIIs with exposure to Adani Ports and Adani Green (real assets with clear revenue) maintained positions. The 'everything Adani' selloff was overdone — not every entity had the same governance concerns.",
      retailSentiment:"Extreme panic. Retail sold everything Adani-related indiscriminately. Social media was consumed by 'RBI will rescue LIC from Adani exposure' fear narratives. Some narratives proved sensationalist; some had merit.",
      longTermImpact:"Permanently changed institutional scrutiny on Adani Group. Created governance reforms. Forced the group to reduce leverage and improve disclosure. The sector it actually damaged most: future FPOs by Indian conglomerates.",
      impactScore:99, sentiment:"BEARISH", category:"CONTROVERSY",
      institutionalConf:22, retailExcitement:5, ltImportance:95,
    },
    {
      year:2023, month:"Mar",
      headline:"GQG Partners Invests $1.87 Billion in Adani Group — Confidence Signal",
      context:"US investment firm GQG Partners purchased stakes in Adani Enterprises, Adani Ports, Adani Green, and Adani Total Gas for $1.87 billion — just 5 weeks after the Hindenburg report. GQG founder Rajiv Jain called Adani a 'fantastic business' and the Hindenburg concerns 'overblown.'",
      marketReaction:"Adani group stocks rallied 20-35% in the week after the GQG announcement. The message: a credible institutional investor had done the diligence and found value.",
      institutionalRead:"The GQG investment was a pivotal credibility signal. Rajiv Jain is one of the most respected EM investors globally. His willingness to publicly invest $1.87B communicated institutional confidence more than any press release could. The stocks began the long recovery process.",
      retailSentiment:"Divided. Bulls used GQG as confirmation to buy back. Bears argued GQG got a steep discount. Both had merit.",
      longTermImpact:"Marked the beginning of Adani's rehabilitation in global institutional eyes. The recovery from Hindenburg lows to current levels is approximately 120-180% across entities.",
      impactScore:88, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:72, retailExcitement:68, ltImportance:84,
    },
    {
      year:2024, month:"Nov",
      headline:"US DOJ Indictment — Gautam Adani Named in Bribery Allegations",
      context:"On November 20, 2024, the US Department of Justice unsealed an indictment naming Gautam Adani and other Adani executives in an alleged $265 million solar energy bribery scheme involving Indian state government contracts. The indictment also alleged violations of the US Foreign Corrupt Practices Act.",
      marketReaction:"Adani Group stocks fell 20-25% in the week of the indictment. Adani Green fell 22% in a single day. Total market cap erosion: ~$28 billion.",
      institutionalRead:"US DOJ indictments are serious but do not automatically imply conviction. History shows corporate DOJ matters often resolve via settlements without operational disruption. The specific allegation (solar energy contracts, not core infrastructure) limits contagion to other Adani businesses. Indian institutional holders (LIC, PSU banks) largely held — they have the most intimate knowledge of actual Adani creditworthiness.",
      retailSentiment:"'Adani is finished' narrative spread again. Retail sold aggressively. However, recovery was faster than Hindenburg — market has developed a framework for 'Adani crisis pricing.'",
      longTermImpact:"Adds a legal overhang that will persist for 12-24 months. The group's green energy business (most affected) faces project delay risk. Indian government's relationship with Adani remains supportive — key variable for long-term resolution.",
      impactScore:88, sentiment:"BEARISH", category:"REGULATORY",
      institutionalConf:40, retailExcitement:8, ltImportance:88,
    },
  ],

  narrativeEvolution:[
    { period:"Pre-2021", title:"Infrastructure Empire Builder", description:"Adani understood as India's most aggressive infrastructure accumulator. Ports, airports, power transmission — real assets, government partnerships, patient capital.", sentiment:65, dominant:"India infrastructure capex proxy", color:"#38BDF8" },
    { period:"2021–2022", title:"Green Energy + Conglomerate Premium", description:"Global ESG capital poured into Adani Green. The narrative extended to a 'Gautam Adani = next Ambani' premium. Valuations disconnected from cash flows.", sentiment:82, dominant:"ESG premium, Gautam Adani CEO story, India energy transition", color:"#00FF9C" },
    { period:"Jan-Mar 2023", title:"Hindenburg Crisis — Governance Reckoning", description:"Short-seller attack forced governance reckoning. Legitimate concerns about disclosure standards co-existed with short-seller hyperbole. Market repriced governance risk.", sentiment:22, dominant:"Short-seller attack, governance fears, leverage concerns", color:"#FF4D4D" },
    { period:"Apr 2023–Oct 2024", title:"Recovery — GQG Validation, Deleveraging", description:"Systematic deleveraging, improved disclosures, GQG institutional validation, and operational execution drove recovery. Adani Ports, in particular, delivered exceptionally.", sentiment:61, dominant:"Balance sheet improvement, operational execution, institutional support", color:"#FFB800" },
    { period:"Nov 2024–Present", title:"DOJ Overhang — Legal Uncertainty", description:"US DOJ indictment created fresh governance concerns. Market is in a 'discounting legal risk' phase. The group's India-focused businesses (ports, coal, food) are far more insulated than green energy.", sentiment:48, dominant:"Legal resolution timeline, India government support, green energy project risk", color:"#FB923C" },
  ],

  sentimentChart:[
    { year:2019, score:58, label:"Pre-discovery" }, { year:2020, score:68, label:"FPO interest" },
    { year:2021, score:80, label:"Bull run" }, { year:2022, score:86, label:"Peak euphoria" },
    { year:2023, score:28, label:"Hindenburg" }, { year:2024, score:62, label:"Recovery" },
    { year:2025, score:48, label:"DOJ overhang" },
  ],

  smartMoneyAnalysis:"Adani's institutional history is the most dramatic in Indian markets. The Hindenburg crisis exposed a critical risk: the retail-driven premium that had accumulated. The subsequent recovery was driven by domestic institutions (LIC, PSU banks, domestic MFs) who had superior visibility into the actual creditworthiness of Adani assets. The key lesson: when retail panic-sold and FIIs reduced exposure, domestic patient capital absorbed. Those who bought Adani Ports at ₹450-480 post-Hindenburg are now sitting at 90%+ gains. Current smart money reads the DOJ situation more calmly — genuine infrastructure assets don't disappear because of legal proceedings.",
  macroConnections:"Adani Group is directly linked to India's government capex narrative. RBI policy, government coal import decisions, renewable energy targets, and airport privatization policy are all direct inputs. A change in central government with different infrastructure priorities would be the highest-risk macro event. India's RE (renewable energy) export ambitions (green hydrogen) are critical for Adani Green's long-term case.",
  latestDevelopments:[
    { headline:"Adani Ports Q3 Revenue Up 22% — Container Volume at Record High", aiRead:"Adani Ports is the cleanest Adani business — real asset, real cash flows, no governance questions. 22% revenue growth confirms that port operations are completely insulated from legal/governance concerns. This stock deserves to trade independent of group sentiment.", date:"Jan 2025", sentiment:"BULLISH" },
    { headline:"Adani Total Gas Clarifies No Connection to DOJ Indictment Allegations", aiRead:"The segmentation of Adani entities from the DOJ allegations is critical. Most Adani businesses (ports, transmission, food) have zero exposure to the specific solar bribery allegation. Market is still in 'sell everything Adani' mode — a pattern that has proven wrong twice before.", date:"Dec 2024", sentiment:"NEUTRAL" },
  ],
  keyRisks:["DOJ indictment resolution timeline unpredictable","Green energy project financing at risk from FCPA concerns","Further governance disclosures not yet visible","Retail investor trust permanently impaired limiting IPO funding optionality","India government policy dependence"],
};

/* ══════════════════════════════════════════════════════════
   INFY
══════════════════════════════════════════════════════════ */

const INFY: StockHistoryProfile = {
  ticker:"INFY", name:"Infosys Ltd",
  sector:"Technology · IT Services", cap:"Large Cap", exchange:"NSE",
  currentTrend:"Bearish — Base Forming", currentSentiment:"CAUTIOUSLY NEUTRAL",
  oneLiner:"Infosys went from India's most celebrated corporate governance story to a management controversy minefield — and is now quietly recovering, though the premium once commanded has not returned.",

  timeline:[
    {
      year:2017, month:"Feb",
      headline:"Vishal Sikka Controversy — Narayana Murthy vs. Board",
      context:"Infosys founder Narayana Murthy publicly criticized the company's CEO compensation and board governance, alleging 'impropriety' in employee severance payments. The public spat between the founder and the board he helped create was unprecedented in Indian corporate history.",
      marketReaction:"Infosys fell 12% in 2 sessions following Murthy's public letters. The 'governance premium' that Infosys had commanded for two decades began its structural decline.",
      institutionalRead:"The Murthy-vs-Board conflict exposed a fundamental governance weakness: the post-founder transition had created a board with misaligned incentives. Institutions that had paid a premium for 'the Infosys way of corporate governance' began questioning that premium.",
      retailSentiment:"Shocked and confused. Infosys had been India's corporate governance flagship — retail couldn't process the conflict.",
      longTermImpact:"The Murthy controversy permanently impaired Infosys's governance premium vs. TCS. The discount at which Infosys trades to TCS today (despite similar revenue and margin profiles) is directly traceable to this governance erosion.",
      impactScore:85, sentiment:"BEARISH", category:"CONTROVERSY",
      institutionalConf:45, retailExcitement:20, ltImportance:82,
    },
    {
      year:2019, month:"Oct",
      headline:"Salil Parekh Takes Charge — 'Back to Basics' Strategy",
      context:"After the Sikka resignation and the controversial reign of interim CEO UB Pravin Rao, Infosys hired Salil Parekh from Capgemini as CEO in January 2018. By 2019, Parekh's strategy was showing results: revenue growth acceleration to 9-10%, margin stabilization, and large deal wins.",
      marketReaction:"Infosys re-rated from 17x to 22x forward PE between 2018-2020. The stock delivered 80% returns in 2 years under Parekh's leadership.",
      institutionalRead:"Parekh's 'large deal + digital transformation' strategy was exactly what the market needed to see. TCV wins were large and visible. Delivery beat guidance for 7 consecutive quarters. The premium began recovering.",
      retailSentiment:"Cautiously bullish to strongly bullish through 2019. Social media sentiment shifted from 'governance broken' to 'turnaround confirmed.'",
      longTermImpact:"Parekh's era represented a genuine stabilization. However, the governance discount vs. TCS never fully closed — a structural penalty from 2017-18.",
      impactScore:74, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:75, retailExcitement:70, ltImportance:74,
    },
    {
      year:2023, month:"Apr",
      headline:"Whistleblower Allegations Against Salil Parekh — Second Governance Controversy",
      context:"Anonymous whistleblower emails to Infosys's board and SEBI alleged that CEO Salil Parekh and CFO Nilanjan Roy were manipulating quarterly revenue and profit numbers to meet guidance targets. SEBI launched a formal investigation. The allegations were eventually found to be unsubstantiated, but the damage to institutional confidence was significant.",
      marketReaction:"Infosys fell 8% on the day allegations became public. FII selling accelerated. The stock underperformed TCS by 15% over the following 12 months.",
      institutionalRead:"The second governance controversy in 6 years was the institutional 'two strikes' moment. Multiple global funds reduced Infosys exposure to below-benchmark weights — some for the first time in 20 years. The irony: Infosys's corporate governance by objective measures (audit quality, board composition, disclosure standards) is among the best in India. But perception had been permanently impaired.",
      retailSentiment:"'Here we go again' was the dominant retail sentiment. Social media turned pessimistic. Many retail investors who had returned after the Sikka recovery exited again.",
      longTermImpact:"The governance discount deepened. Infosys's price-to-earnings vs. TCS reached the widest gap in 15 years by late 2024.",
      impactScore:82, sentiment:"BEARISH", category:"CONTROVERSY",
      institutionalConf:38, retailExcitement:15, ltImportance:80,
    },
    {
      year:2024, month:"Jul",
      headline:"Infosys Topaz AI — Deal TCV Disappoints — Guidance Cut",
      context:"Despite Infosys's 'Topaz' AI platform generating significant marketing buzz, actual large deal wins were below TCS and HCL Tech. Q1 FY25 guidance was cut to 1-3% revenue growth — the weakest guidance in Infosys's listed history. The combination of governance overhang + weak demand + guidance cut created the current negative sentiment trifecta.",
      marketReaction:"Stock tested ₹1,850 — 3-year lows. RSI below 40 on weekly. Institutional selling extended for 4+ quarters.",
      institutionalRead:"The guidance cut is particularly concerning because it comes against a backdrop of increasing AI transformation budgets globally. TCS and HCL Tech are winning deals that Infosys is not. The question is whether this is a capability gap or an execution gap. Capability gap = structural problem. Execution gap = fixable. The evidence points to execution gap — Topaz technology is strong but sales and delivery are underperforming.",
      retailSentiment:"Deep pessimism. Multiple calls for 'Narayana Murthy to come back and fix Infosys' on social media — sentiment extreme enough to be a contrarian indicator.",
      longTermImpact:"If Infosys doesn't win material AI transformation deals by FY26, the governance + execution narrative could become self-fulfilling as the best talent gravitates to TCS and HCL.",
      impactScore:76, sentiment:"BEARISH", category:"EARNINGS",
      institutionalConf:40, retailExcitement:12, ltImportance:78,
    },
  ],

  narrativeEvolution:[
    { period:"1993–2017", title:"India's Corporate Governance Gold Standard", description:"Narayana Murthy's Infosys was the benchmark for transparency, ethics, and shareholder wealth creation in Indian IT. Premium multiple justified by governance + consistent execution.", sentiment:84, dominant:"Founder-led governance premium, consistent 20%+ earnings growth", color:"#00FF9C" },
    { period:"2017–2018", title:"Governance Erosion — The Murthy Shock", description:"Public founder-board conflict destroyed two decades of governance credibility in 18 months. Multiple compression from 22x to 17x as institutional faith wavered.", sentiment:45, dominant:"Founder vs. board conflict, management instability", color:"#FF4D4D" },
    { period:"2019–2022", title:"Parekh Stabilization — Digital Revival", description:"Salil Parekh's deal-driven growth recovery and margin stabilization partially restored institutional confidence. COVID era deal boom supported strong earnings.", sentiment:76, dominant:"Large deal wins, digital transformation execution, COVID spending boom", color:"#FFD700" },
    { period:"2022–Present", title:"Second Controversy + AI Transition Pain", description:"Whistleblower allegations followed by weak AI deal conversion has kept the governance discount persistent and widened the gap vs. TCS.", sentiment:40, dominant:"Governance distrust, AI deal weakness, guidance cuts", color:"#FB923C" },
  ],

  sentimentChart:[
    { year:2015, score:82, label:"Premium era" }, { year:2016, score:78, label:"Steady" },
    { year:2017, score:42, label:"Murthy controversy" }, { year:2018, score:55, label:"Recovery attempt" },
    { year:2019, score:72, label:"Parekh turnaround" }, { year:2020, score:78, label:"COVID benefit" },
    { year:2021, score:76, label:"Post-COVID" }, { year:2022, score:62, label:"Attrition pain" },
    { year:2023, score:44, label:"Whistleblower" }, { year:2024, score:40, label:"Guidance cut" },
    { year:2025, score:48, label:"Base forming" },
  ],

  smartMoneyAnalysis:"Infosys's institutional story is one of patient money eventually running out of patience. Institutions who maintained Infosys positions through both governance controversies (2017 and 2023) are now at the deepest relative underperformance vs. TCS in 20 years. The contrarian thesis: Infosys at ₹1,850-1,900 is at historically cheap valuations (16-17x forward PE) for a business generating ₹22,000 cr+ in annual FCF. The institutional re-entry signal to watch: if a major global sovereign wealth fund or hedge fund files a meaningful position disclosure, the recovery will be sharp.",
  macroConnections:"Same IT macro drivers as TCS. However, Infosys has higher European exposure (32% vs. TCS 28%) — making it more sensitive to EUR weakness. The governance discount means Infosys underperforms TCS during 'risk-off' periods and outperforms during 'risk-on' periods when discounts compress. A US economic recovery specifically benefits Infosys's BFSI and retail/CPG verticals.",
  latestDevelopments:[
    { headline:"Infosys Topaz AI — First Large Financial Services Deal in Europe Announced", aiRead:"First material Topaz-related deal win. Small (€200M contract) but the category is important — European banks adopting AI transformation. This is the type of deal that must scale to 5-10 per quarter to justify re-rating. Watch deal TCV specifically for AI-labeled contracts.", date:"Jan 2025", sentiment:"NEUTRAL" },
    { headline:"Infosys FY25 Guidance Revised Upward to 4.5-5% — First Upgrade in 6 Quarters", aiRead:"Guidance upgrade is the single most important near-term catalyst. First upgrade in 6 consecutive quarters. This signals the deceleration may have bottomed. Not a bull signal yet — need 2 consecutive quarters of beating guidance to rebuild institutional trust.", date:"Dec 2024", sentiment:"BULLISH" },
  ],
  keyRisks:["Governance distrust preventing full premium recovery","AI deal conversion remaining weak relative to peers","Management churn if Salil Parekh exits","European revenue under pressure from EUR weakness","FII ownership structurally declining due to governance discount"],
};

/* ══════════════════════════════════════════════════════════
   BHARTIARTL (Bharti Airtel)
══════════════════════════════════════════════════════════ */

const BHARTIARTL: StockHistoryProfile = {
  ticker:"BHARTIARTL", name:"Bharti Airtel Ltd",
  sector:"Telecom · Digital Services · Africa", cap:"Large Cap", exchange:"NSE",
  currentTrend:"Structural Re-rating — Duopoly Premium", currentSentiment:"BULLISH",
  oneLiner:"Survived an existential Jio assault that wiped 42% off its stock and drove ARPU to ₹119 — then rebuilt into India's premium telecom franchise with ARPU of ₹239, a 5G leadership position, and a rare duopoly moat.",

  timeline:[
    {
      year:2016, month:"Sep",
      headline:"Jio Launch — Airtel's Existential Crisis Begins",
      context:"Reliance Jio launched on September 5, 2016 with unlimited free voice calls and data pricing at near zero. Airtel, with ~260 million subscribers and ₹700+/month blended ARPU across prepaid and postpaid, faced an opponent willing to burn ₹1.5 lakh cr to buy market share. Within months, Airtel's effective ARPU began collapsing as it matched Jio's pricing to prevent churn.",
      marketReaction:"Airtel stock fell from ₹400 to ₹230 by December 2017 — a 42% decline. Volumes in the stock were extreme as both domestic and foreign institutions re-priced the business model. EBITDA fell 30% in FY17. Net income turned negative for the first time in company history in FY18.",
      institutionalRead:"Institutions ran two scenario models: (1) Airtel survives as a scaled duopoly — buy aggressively at ₹230-280. (2) Airtel faces ARPU compression below survival threshold and debt spirals — exit entirely. The split was approximately 60/40 in favor of the survivor thesis. Those who held or added at ₹230-280 generated 6x returns by 2024.",
      retailSentiment:"Panic and capitulation. The 'Jio will kill everyone' narrative was pervasive and partially correct — it killed Vodafone-Idea and Tata Docomo. Retail couldn't differentiate Airtel's structural advantage (brand, enterprise, Africa) from the weaker players and sold indiscriminately.",
      longTermImpact:"The Jio disruption was the single most important event in Airtel's history — it either killed a company or forged the strongest telecom franchise in India. For Airtel, it was the latter. The pain eliminated weaker competitors and created the duopoly structure that now underpins Airtel's pricing power.",
      impactScore:99, sentiment:"BEARISH", category:"MACRO",
      institutionalConf:38, retailExcitement:8, ltImportance:99,
    },
    {
      year:2018, month:"Jun",
      headline:"Debt Peaks at ₹1.2 Lakh Cr — Survival Mode Capex",
      context:"By FY18, Airtel's net debt had climbed to ₹1.2 lakh cr as the company invested aggressively to match Jio's 4G infrastructure. ARPU had crashed to ₹119 from ₹700+ in 2015. The company posted a net loss of ₹1,035 cr in Q4 FY18 — its first quarterly loss. Multiple analysts issued 'sell' ratings with target prices below ₹200. The business was essentially in survival mode.",
      marketReaction:"Stock bottomed in the ₹220-250 range through most of 2018. Institutional selling continued as quarterly results consistently missed the already-lowered consensus. The debt level was the central concern — at 6x net debt/EBITDA, a further EBITDA decline would have been existential.",
      institutionalRead:"The institutions who stayed were focused on a single variable: minimum viable ARPU. Airtel's cost structure required roughly ₹140-150 ARPU to generate positive FCF at scale. At ₹119, the company was burning cash. But network consolidation (Vodafone-Idea merger underway, Tata Docomo exited) meant the price war would eventually end. Patient capital stayed.",
      retailSentiment:"Complete disinterest and pessimism. 'Airtel is the next Vodafone-Idea' was widely shared. Most retail had exited by this point.",
      longTermImpact:"The debt peak of ₹1.2 lakh cr forced financial discipline that has made Airtel structurally stronger. Every capex decision post-2018 was subjected to stricter ROCE hurdles. The survival pressure created institutional-grade capital allocation.",
      impactScore:88, sentiment:"BEARISH", category:"EARNINGS",
      institutionalConf:32, retailExcitement:10, ltImportance:88,
    },
    {
      year:2019, month:"Oct",
      headline:"Supreme Court AGR Ruling — ₹43,989 Cr Liability Shock",
      context:"On October 24, 2019, the Supreme Court ruled in favor of the Department of Telecommunications in the Adjusted Gross Revenue (AGR) case. Airtel's total AGR liability was calculated at ₹43,989 cr — comprising ₹21,682 cr in license fees and ₹22,307 cr in spectrum usage charges. The ruling included interest and penalties for dues stretching back to 2003. Airtel immediately provisioned ₹28,000 cr in its September quarter results. Sunil Mittal publicly said: 'We will pay every rupee the government is owed.'",
      marketReaction:"Airtel fell 6% on the ruling day. The stock had already been pricing AGR risk after lower court rulings. The immediate provisioning of ₹28,000 cr shocked the market — FY20 showed a ₹32,896 cr net loss due to AGR provisioning. However, the market eventually rewarded Airtel's transparent provisioning vs. Vodafone-Idea's delay tactics.",
      institutionalRead:"The AGR ruling was a stress test of Airtel's balance sheet. Institutions who had modeled full AGR liability (the conservative scenario) viewed the provisioning as clearing the overhang. More importantly, Airtel's public commitment to pay — vs. Vodafone-Idea's legal delays — signalled that management was building institutional credibility for the long run. Sunil Mittal's statement was a pivotal trust-building moment.",
      retailSentiment:"'₹44,000 cr liability will bankrupt Airtel' was the dominant retail narrative. Heavy selling. Those who sold at ₹320-340 immediately post-ruling missed the subsequent 5x recovery.",
      longTermImpact:"Paradoxically, the AGR ruling strengthened Airtel's competitive position. Vodafone-Idea, unable to pay, entered a protracted survival battle that has permanently weakened it. Airtel emerged with a cleared liability, superior balance sheet credibility, and a weaker competitor.",
      impactScore:96, sentiment:"MIXED", category:"REGULATORY",
      institutionalConf:55, retailExcitement:6, ltImportance:94,
    },
    {
      year:2020, month:"Sep",
      headline:"₹21,000 Cr Fundraise + Three Successive ARPU Hikes — Turning Point",
      context:"Between January and September 2020, Airtel executed a comprehensive financial reconstruction. The Bharti family invested ₹7,500 cr directly. A QIP and rights issue raised an additional ₹13,500 cr. Simultaneously, Airtel implemented three successive minimum recharge hikes — pushing entry-level ARPU from ₹119 toward ₹145. The strategy was deliberate: shed unprofitable low-ARPU subscribers to improve per-subscriber economics. Airtel shed ~80 million 'sub-₹50 ARPU' subscribers intentionally.",
      marketReaction:"Stock re-rated from ₹380 to ₹520 between January and December 2020 — a 37% gain even as COVID disrupted the broader market. The fundraise removed balance sheet risk. The ARPU hikes signalled pricing discipline. Institutional buying was systematic and heavy.",
      institutionalRead:"This was the institutional inflection point. The fundraise eliminated bankruptcy risk. The deliberate subscriber shedding was counterintuitive but genius — losing low-value customers improved EBITDA margins from 38% toward 47%. Institutions re-modeled Airtel from a 'debt-laden survivor' to a 'duopoly with pricing power.' Target prices began moving toward ₹700-800.",
      retailSentiment:"Confused about shedding subscribers. 'Airtel is losing customers to Jio' headlines missed the point entirely. Retail underweighted the ARPU expansion story that was obvious to institutional analysts.",
      longTermImpact:"The 2020 fundraise and ARPU strategy are the foundations of everything that followed. Without this financial and strategic clarity, the 5G investment and subsequent re-rating would have been impossible.",
      impactScore:95, sentiment:"BULLISH", category:"FUNDRAISE",
      institutionalConf:88, retailExcitement:45, ltImportance:96,
    },
    {
      year:2022, month:"Oct",
      headline:"5G Spectrum Auction — Airtel Invests ₹43,084 Cr, Launches India's First 5G",
      context:"In the July 2022 5G spectrum auction, Airtel invested ₹43,084 cr to acquire 19,867 MHz of spectrum across multiple bands including 3.5 GHz (mid-band) and 26 GHz (mmWave). Airtel partnered with Nokia, Ericsson, and Samsung as 5G vendors — a deliberate choice to avoid Huawei (unlike Reliance Jio's initial infrastructure). In October 2022, Airtel launched India's first commercial 5G service in 8 cities simultaneously, ahead of Jio's launch by two months.",
      marketReaction:"Stock at ₹850-900 range. The 5G launch received positive market reception but limited immediate re-rating — investors were watching ARPU and subscriber upgrade trajectory more than the launch itself.",
      institutionalRead:"Airtel's 5G network architecture choices were institutionally significant. The Nokia/Ericsson partnership meant faster deployment (vendor experience matters), no geopolitical risk from Huawei exposure, and superior network quality (critical for enterprise 5G). Being first with 5G in India is a brand premium that translates to enterprise customer acquisition — a ₹200-300/month ARPU premium segment.",
      retailSentiment:"Nationalistic pride ('India's first 5G!') blended with investment enthusiasm. Retail buying was moderate — many were still recovering from 2018-19 losses in Airtel.",
      longTermImpact:"5G positioned Airtel for the enterprise and home broadband ARPU upgrade cycles. The ₹43,084 cr investment is already generating returns via premium subscriber acquisition.",
      impactScore:84, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:80, retailExcitement:72, ltImportance:86,
    },
    {
      year:2023, month:"Dec",
      headline:"ARPU Reaches ₹208 — 'Duopoly Premium' Re-rating to ₹1,000+",
      context:"By Q3 FY24, Airtel's blended ARPU had reached ₹208 — vs. ₹119 in FY17 at the Jio-disruption nadir. The 75% ARPU expansion over 6 years was driven by a combination of subscriber quality improvement (shedding low-ARPU users), tariff hikes, and 4G/5G upgrade tailwinds. Simultaneously, analysts began re-rating Airtel from 'telecom survivor' to 'duopoly premium' — recognizing that with Vodafone-Idea structurally weakened, Airtel and Jio controlled 80%+ of India's wireless revenue.",
      marketReaction:"Stock crossed ₹1,000 for the first time in November 2023. By December, it was trading at ₹1,150-1,200. FII holding increased to 39%+. Domestic mutual funds were heavy buyers. The re-rating was driven by PE multiple expansion (from 10x to 18x EV/EBITDA) as much as earnings growth.",
      institutionalRead:"The duopoly thesis was the institutional conviction trade of 2023-24. With Vodafone-Idea structurally impaired and Jio focused on ARPU rather than pricing aggression, Airtel had pricing freedom it hadn't enjoyed since 2015. ₹208 ARPU with a clear path to ₹300 by FY27 was a compelling earnings upgrade story. Institutions who had bought at ₹230-280 in the 2018 trough were sitting on 4-5x returns.",
      retailSentiment:"Strong retail FOMO above ₹900. Social media narrative: 'Airtel is the new HDFC Bank of telecom — consistent compounder.' Retail participation at all-time highs in the stock.",
      longTermImpact:"The ₹1,000 milestone and duopoly re-rating are structural changes in how the market values Airtel. The business is now valued on normalized duopoly economics rather than crisis-mode survival metrics.",
      impactScore:91, sentiment:"BULLISH", category:"TECHNICAL",
      institutionalConf:88, retailExcitement:84, ltImportance:90,
    },
    {
      year:2024, month:"Jul",
      headline:"Tariff Hike — ARPU to ₹239 — Strongest Pricing Action in a Decade",
      context:"In July 2024, Airtel implemented its sharpest tariff revision since 2016 — effective prepaid plan prices rose 10-25% across recharge packs. The flagship ₹179 plan was revised to ₹199; ₹299 plans became ₹349. Airtel Black (bundled home broadband + mobile) subscribers crossed 1 million. The tariff hike pushed blended ARPU from ₹208 toward ₹239 by Q2 FY25. 5G coverage expanded to 2,000+ towns.",
      marketReaction:"Stock reached an all-time high of ₹1,779 in September 2024. The hike was taken by both Airtel and Jio simultaneously — confirming duopoly pricing discipline. The absence of a competitive response from Vodafone-Idea (which also hiked but from a position of weakness) validated the market structure thesis.",
      institutionalRead:"This tariff hike was the most important proof point for the duopoly thesis. When both Airtel and Jio raised prices simultaneously in the same month, it confirmed rational duopoly behavior — the holy grail for telecom investors. Institutions revised ARPU models toward ₹280-300 by FY27, implying further material earnings upgrades. This is no longer a recovery story — it's a structural earnings compounding story.",
      retailSentiment:"Euphoric. 'Airtel is like Jio but with better quality — buy and hold forever' was a dominant social media narrative. Retail FD investors entered the stock comparing Airtel dividend yield to fixed deposit rates.",
      longTermImpact:"The July 2024 hike confirms the structural shift from price-war telecom to duopoly earnings compounder. Each ₹10 ARPU increase at Airtel's ~350 million revenue-generating subscribers adds ~₹4,200 cr to annualized revenue.",
      impactScore:90, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:91, retailExcitement:88, ltImportance:91,
    },
  ],

  narrativeEvolution:[
    { period:"Pre-2016", title:"India's Telecom Leader — ARPU King", description:"Airtel was India's dominant telco with 260M subscribers, ₹700+ blended ARPU, and aspirations to be a global telecom brand via the Africa acquisition. Premium multiple, consistent earnings.", sentiment:72, dominant:"Telecom market leadership, Africa diversification, consistent EBITDA", color:"#38BDF8" },
    { period:"2016–2018", title:"Jio Disruption — Existential Survival Mode", description:"Free Jio pricing crashed ARPU to ₹119, took Airtel to its first net loss, and pushed debt to ₹1.2 lakh cr. The market de-rated Airtel 42% as the survival probability was genuinely uncertain.", sentiment:24, dominant:"ARPU collapse, debt spiral fears, existential pricing war", color:"#FF4D4D" },
    { period:"2019–2020", title:"AGR + Fundraise — Navigating the Gauntlet", description:"AGR liability of ₹43,989 cr added to the debt burden, but Sunil Mittal's transparent provisioning and ₹21,000 cr fundraise cleared the overhang. The company began its quality-over-quantity subscriber strategy.", sentiment:46, dominant:"AGR resolution, balance sheet repair, ARPU hike discipline", color:"#FFB800" },
    { period:"2021–2023", title:"Duopoly Emergence — Re-rating Begins", description:"With Vodafone-Idea structurally weakened and the market consolidating to two credible players, Airtel's pricing power recovered. ARPU expanded from ₹145 to ₹208. 5G launched. Stock crossed ₹1,000.", sentiment:76, dominant:"Duopoly thesis, ARPU expansion, 5G leadership", color:"#FFD700" },
    { period:"2024–Present", title:"Premium Compounder — Structural Earnings Growth", description:"Post tariff-hike ARPU of ₹239, 5G coverage across 2,000+ towns, Airtel Black's bundled ecosystem, and Africa contributing $700M+ EBITDA. The narrative is now 'India's best telecom compounder' — no longer a recovery story.", sentiment:85, dominant:"ARPU compounding, 5G monetization, duopoly pricing discipline, Africa upside", color:"#00FF9C" },
  ],

  sentimentChart:[
    { year:2015, score:70, label:"Market leader" },
    { year:2016, score:42, label:"Jio shock" },
    { year:2017, score:28, label:"ARPU collapse" },
    { year:2018, score:24, label:"Debt peak" },
    { year:2019, score:32, label:"AGR ruling" },
    { year:2020, score:52, label:"Fundraise + hikes" },
    { year:2021, score:64, label:"Recovery" },
    { year:2022, score:72, label:"5G launch" },
    { year:2023, score:82, label:"Duopoly re-rating" },
    { year:2024, score:88, label:"Tariff hike" },
    { year:2025, score:85, label:"Current" },
  ],

  smartMoneyAnalysis:"Airtel's three institutional accumulation zones were: (1) ₹230-280 in 2018 during peak debt fear — requires 7-year patience, generates 6x. (2) ₹320-360 post-AGR ruling in late 2019 — generates 5x. (3) ₹520-600 post-fundraise in mid-2020 — generates 3x. In each case, the institutional edge was distinguishing Airtel's franchise moat (brand, enterprise, Africa, B2B) from Vodafone-Idea's structural weakness. The institutions who got it wrong were those who sold post-AGR ruling at ₹320, treating Airtel identically to Vodafone-Idea. Current institutional behavior: systematic accumulation on dips below ₹1,550 by domestic long-term funds building ARPU expansion thesis. FII holding at 39%+ is multi-year high — foreign money returning to a story it missed between 2017-2020.",
  macroConnections:"Crude oil and USD/INR are the primary macro inputs via Airtel Africa — operations in 14 African countries with USD-denominated revenues but local currency costs. A strong USD benefits Airtel Africa's INR-reported profits. RBI rate cuts are a secondary positive through consumer discretionary spending uplift (higher ARPU penetration). India's GDP per capita growth is the single best long-term predictor of Airtel's ARPU trajectory — as incomes rise, consumers upgrade from ₹99 plans to ₹299 plans. Each ₹1,000 increase in India per capita GDP historically adds ₹8-10 to Airtel's ARPU.",
  latestDevelopments:[
    { headline:"ARPU Hike Lifts Q2 FY25 Blended ARPU to ₹233 — Consensus ₹221", aiRead:"Twelve-rupee beat on ARPU consensus is the highest single-quarter beat since 2020. The July tariff revision is flowing through faster than expected due to lower-than-feared churn. Each ₹10 ARPU adds ~₹4,200 cr annualized revenue. Q3 FY25 ARPU likely crosses ₹239. Institutional buyers are accumulating ahead of guidance revision.", date:"Nov 2024", sentiment:"BULLISH" },
    { headline:"5G Coverage Crosses 2,000 Towns — Airtel Black Subscribers at 1 Million", aiRead:"Airtel Black at 1M is the most underappreciated metric in the stock. Bundled home broadband + mobile generates ₹700-900/month ARPU vs. ₹239 mobile-only. Each 1 million Airtel Black subscriber adds ₹5,400-6,600 cr annualized revenue at blended bundle rates. The path to 5M subscribers by FY27 is credible given 5G coverage expansion.", date:"Dec 2024", sentiment:"BULLISH" },
    { headline:"Airtel Africa H1 FY25 Revenue $2.4B — Nigeria Re-rates Post Naira Stabilization", aiRead:"Africa was the bear thesis for 18 months due to currency devaluations in Nigeria, Ethiopia, and Kenya. Naira stabilization post-IMF engagement is the single largest Africa re-rating catalyst. ₹700M+ annual Africa EBITDA with 14-country diversification is a structurally undervalued asset. If Africa gets an independent valuation multiple, Airtel's SoTP increases ₹150-200/share.", date:"Jan 2025", sentiment:"BULLISH" },
  ],
  keyRisks:["Jio initiating price competition below ₹199 minimum recharge to regain sub-₹200 ARPU market","Vodafone-Idea government rescue creating a three-player market and reigniting pricing war","Africa currency risk — Nigerian Naira and Kenyan Shilling volatility compressing Africa EBITDA","5G ARPU monetization delayed beyond FY26 if enterprise adoption is slow","Spectrum renewal costs in 900MHz/1800MHz bands increasing capex intensity post-FY26"],
};

/* ══════════════════════════════════════════════════════════
   IRFC (Indian Railway Finance Corporation)
══════════════════════════════════════════════════════════ */

const IRFC: StockHistoryProfile = {
  ticker:"IRFC", name:"Indian Railway Finance Corporation Ltd",
  sector:"Infrastructure Finance · NBFC", cap:"Large Cap", exchange:"NSE",
  currentTrend:"Valuation Consolidation — Earnings Growth Intact", currentSentiment:"NEUTRAL",
  oneLiner:"India's most unusual listed NBFC — a pure pass-through lending vehicle for Indian Railways with near-zero credit risk, government-guaranteed income, and a loan book that has grown 10x since IPO — yet the market can't decide whether it deserves a bond yield or an equity multiple.",

  timeline:[
    {
      year:2021, month:"Jan",
      headline:"IPO at ₹26/Share — 'Railway Bond Proxy' Lists at Marginal Discount",
      context:"IRFC's IPO on January 18-20, 2021 was priced at ₹26/share, raising ₹4,633 cr — India's largest NBFC IPO at the time. The business model was unique: IRFC borrows from the market (sovereign-rated bonds) at a spread of ~35-40 bps below its lending rate to Indian Railways, and keeps the entire spread as profit. With Indian Railways as the borrower (implicitly government-guaranteed) and IRFC's role enshrined in statute, credit risk is essentially nil. The IPO was subscribed 3.49x overall, with institutional tranche subscribed 2.5x and retail 3.7x.",
      marketReaction:"Listed at ₹25.9 — a marginal 0.4% discount to the ₹26 issue price. The subdued listing reflected the market's struggle to value a business with essentially no credit risk but also no pricing power — a yield instrument in equity clothing.",
      institutionalRead:"The institutional community was divided at IPO: bull case was a government-guaranteed book compounding at 20-25% annually as railway capex expanded. Bear case was that it's a glorified bond with an equity risk premium that shouldn't exist. FIIs were light at IPO — the business model was too India-specific for global EM mandates to build conviction quickly.",
      retailSentiment:"Strong retail participation driven by the 'government-backed, safe dividend' narrative. The 3.7x retail subscription reflected trust in the Railways + government guarantee combination. Most retail had never analyzed an NBFC balance sheet.",
      longTermImpact:"The IPO established IRFC as a legitimate listed proxy for India's railway infrastructure capex story — a narrative that would drive 900%+ returns over 3 years.",
      impactScore:72, sentiment:"NEUTRAL", category:"CORPORATE",
      institutionalConf:58, retailExcitement:74, ltImportance:85,
    },
    {
      year:2021, month:"Jul",
      headline:"Railway Capex Budget ₹1.10 Lakh Cr — IRFC Loan Book Doubles",
      context:"PM Modi's government raised the railway capital expenditure budget to ₹1.10 lakh cr for FY22 — the highest ever at the time. IRFC, as the primary external funding vehicle for Indian Railways (typically financing 20-25% of total capex), saw its annual disbursement target increase sharply. IRFC's loan book grew from ₹1.39 lakh cr at IPO to ₹1.85 lakh cr by March 2022 — a 33% expansion in 14 months. Net interest income grew 24% in FY22.",
      marketReaction:"Stock re-rated from ₹25.9 listing price to ₹50+ by September 2021 — a near-doubling in 8 months. The re-rating was driven by recognition that book growth would compound at 20-25% as railway capex kept expanding.",
      institutionalRead:"Domestic mutual funds began building positions as the loan book growth became undeniable. The key insight: IRFC's spread is fixed (35-40 bps), but the book size compounds with government capex. A ₹10,000 cr incremental loan book at 35 bps spread = ₹35 cr additional annual NII. At 1 lakh cr book growth per year, NII grows ₹350 cr annually — predictable, visible, low-risk compounding.",
      retailSentiment:"Growing retail excitement as multibagger returns in 8 months attracted momentum traders. 'Government-guaranteed multibagger' narrative spread on Telegram stock groups.",
      longTermImpact:"FY22 established the template for IRFC's growth: Budget → Railway capex increase → IRFC disbursement increase → book growth → NII compounding. This simple model would drive extraordinary returns.",
      impactScore:78, sentiment:"BULLISH", category:"MACRO",
      institutionalConf:72, retailExcitement:78, ltImportance:82,
    },
    {
      year:2022, month:"Feb",
      headline:"Union Budget FY23 — Railway Capex ₹1.37 Lakh Cr — Highest Ever (Again)",
      context:"Finance Minister Nirmala Sitharaman presented Union Budget 2022-23 in February 2022 with railway capex raised to ₹1.37 lakh cr — a 25% increase over the previous year. The Vande Bharat express program, freight corridor acceleration, and station redevelopment were the key capex drivers. IRFC's role as the primary railway financing vehicle was explicitly reinforced. The government's stated target was 400 Vande Bharat trains by 2024 — each costing ₹120-150 cr to manufacture.",
      marketReaction:"Stock crossed ₹40 (vs. ₹25.9 IPO price) and continued its steady re-rating. The budget was a direct catalyst for IRFC as the market could directly calculate incremental NII from the capex increase.",
      institutionalRead:"The institutional community began understanding IRFC as a 'Budget yield instrument' — every rupee of railway capex increase maps directly to IRFC loan book growth. At 35-40 bps spread on a ₹1.37 lakh cr capex, incremental NII is highly predictable. IRFC was increasingly modeled as a long-duration bond with equity upside from book growth rather than a traditional equity.",
      retailSentiment:"Strong. Budget day headlines like 'Indian Railways to get ₹1.37 lakh cr' were immediately translated by retail traders into 'IRFC will boom' — directionally correct, even if the mechanism was partially misunderstood.",
      longTermImpact:"FY23 budget cemented IRFC's position as the infrastructure finance proxy. Budget day became the most important annual event for IRFC's stock.",
      impactScore:76, sentiment:"BULLISH", category:"MACRO",
      institutionalConf:75, retailExcitement:80, ltImportance:80,
    },
    {
      year:2023, month:"Feb",
      headline:"Budget FY24 — Railway Capex ₹2.40 Lakh Cr — 75% Jump Shocks Market",
      context:"The Union Budget 2023-24 raised railway capex to ₹2.40 lakh cr — a staggering 75% increase from ₹1.37 lakh cr. This was the highest railway capex in India's history by a wide margin. The funding was explicitly tagged to Vande Bharat expansion, Amrit Bharat Express, dedicated freight corridor Phase 2, kavach (anti-collision) rollout, and station redevelopment. IRFC, as the primary external borrower for Railways, was immediately perceived as the primary beneficiary.",
      marketReaction:"IRFC stock crossed ₹120 in the weeks following the budget — more than 4x the IPO price. Between February and September 2023, the stock crossed ₹240 — a 9x return from the ₹26 IPO in just over 2 years. Retail participation was at all-time highs. IRFC became a household name in retail equity markets.",
      institutionalRead:"The 75% capex jump was beyond even the most bullish institutional models. However, the key institutional question was: 'Can IRFC actually disburse ₹50,000-60,000 cr this year vs. ₹25,000-30,000 cr previously?' The answer was broadly yes — IRFC has statutory mandate and Railways has no alternative at this scale. Book growth of 20-25% in FY24 was achievable. At 35 bps spread on ₹3+ lakh cr book, NII of ₹10,500+ cr was now being modeled.",
      retailSentiment:"Extreme euphoria. 'IRFC is India's best IPO ever' narratives spread widely on X and YouTube. The 9x return from IPO in 2 years created cult status among retail investors. Many entered at ₹150-200+ — significantly above intrinsic value by traditional metrics.",
      longTermImpact:"The ₹2.40 lakh cr budget milestone validated the IRFC thesis at the highest possible level — the Prime Minister's office explicitly endorsed railway spending as the centerpiece of India's infrastructure ambitions. Long-term, IRFC's loan book trajectory toward ₹4-5 lakh cr became plausible.",
      impactScore:94, sentiment:"BULLISH", category:"MACRO",
      institutionalConf:82, retailExcitement:97, ltImportance:91,
    },
    {
      year:2024, month:"Jun",
      headline:"PE Debate — 24x Earnings for a Pass-Through Lender — Fair Value Argument",
      context:"By mid-2024, IRFC was trading at ₹200-230, implying 24-26x FY25 earnings — an extraordinary premium for what is structurally a government-owned NBFC earning a 35-40 bps spread on a captive loan book. The PE debate became the dominant institutional discussion. Bulls argued: government guarantee + railway capex compounding + re-rating from NBFC to infrastructure deserves premium. Bears argued: a business with no pricing power, no client diversity, and a spread capped at 35-40 bps should trade at 8-10x earnings (a bond-like multiple). The theoretical intrinsic value range was ₹80-100 at bond multiples vs. ₹250-280 at growth company multiples.",
      marketReaction:"Stock peaked at ₹229 in July 2024 before entering a consolidation phase. Institutional selling at ₹220+ was visible in delivery data. Domestic MFs increased positions while some early FII buyers took profits.",
      institutionalRead:"The PE debate is genuinely complex. IRFC is the only listed entity with 100% Indian Railways as counterparty — the credit risk is government sovereign. The book is growing 20-25% annually. But the ROE of 13-14% and the fixed spread model means earnings per share growth is permanently capped by book growth — there's no operating leverage. At 24x earnings, IRFC requires 3-4 years of 20%+ EPS growth to justify current valuations. This is mathematically achievable but leaves zero margin of safety.",
      retailSentiment:"Retail defensively bullish — 'government will always support Railways, hold forever' was the dominant view. Many retail investors with 5-10x gains held rather than took profits, not fully understanding that the valuation debate was about intrinsic value, not the business quality.",
      longTermImpact:"The PE debate created a valuation ceiling that has constrained IRFC's stock appreciation relative to earnings growth. The market is doing a slow re-rating toward a normalized NBFC PE, which will either be resolved by earnings growing into the valuation or the stock correcting to meet earnings.",
      impactScore:78, sentiment:"MIXED", category:"EARNINGS",
      institutionalConf:62, retailExcitement:55, ltImportance:80,
    },
    {
      year:2024, month:"Jul",
      headline:"Union Budget FY25 — Railway Capex ₹2.52 Lakh Cr — Marginal Growth Disappoints",
      context:"The Union Budget 2024-25 raised railway capex modestly to ₹2.52 lakh cr from ₹2.40 lakh cr — a 5% increase vs. the 75% jump in FY24 budget. The slowdown in the rate of increase triggered a reassessment of IRFC's growth trajectory. Simultaneously, concerns emerged about IRFC's single-counterparty concentration risk as RBI issued new infrastructure lending guidelines that could affect IRFC's borrowing cost.",
      marketReaction:"Stock fell 18% from ₹229 to ₹188 between July and September 2024. The combination of slowing capex growth and RBI regulatory uncertainty created a double overhang. Institutional selling intensified.",
      institutionalRead:"The capex slowdown is a medium-term rather than permanent concern — with elections complete and the BJP back in power, the infrastructure capex ambition remains intact. The 5% increase in FY25 was a one-year normalisation, not a structural change. RBI's infrastructure guidelines will eventually provide clarity. Institutions who understand that IRFC's loan book crosses ₹4.4 lakh cr by FY25 (generating ₹15,000 cr+ NII) are using the dip as an accumulation opportunity.",
      retailSentiment:"Nervous. Retail investors sitting on large gains are debating whether to hold or exit. The 'government will always protect IRFC' narrative is being tested by the stock's decline. Uncertainty is high.",
      longTermImpact:"The FY25 budget is a reminder that IRFC's growth rate is entirely dependent on government budget allocations — a risk that is real but structurally manageable given India's long-term infrastructure ambitions.",
      impactScore:72, sentiment:"BEARISH", category:"MACRO",
      institutionalConf:55, retailExcitement:30, ltImportance:75,
    },
  ],

  narrativeEvolution:[
    { period:"Jan 2021 (IPO)", title:"Railway Bond Proxy — Listing Premium", description:"IRFC pitched as a government-guaranteed NBFC with predictable spread income and implied sovereign backing. Modest retail interest. Subdued listing at ₹25.9 vs. ₹26 issue price.", sentiment:58, dominant:"Government guarantee, safe yield, railway capex proxy", color:"#38BDF8" },
    { period:"2021–2022", title:"Infrastructure Play — India's Railway Modernization Bet", description:"Rising railway capex budgets (₹1.10L cr → ₹1.37L cr) demonstrated compounding book growth. IRFC re-rated from 'bond proxy' to 'infrastructure growth story.' Stock 2x'd to ₹50+ from IPO.", sentiment:70, dominant:"Loan book compounding, railway modernization, capex budget expansion", color:"#FFD700" },
    { period:"2023", title:"Multibagger Retail Favorite — 9x IPO Returns", description:"₹2.40 lakh cr railway budget created euphoric sentiment. IRFC crossed ₹240 (9x IPO). Became India's most discussed 'government multibagger' on social media. Retail cult stock.", sentiment:88, dominant:"Retail euphoria, 9x IPO return, infrastructure supercycle narrative", color:"#00FF9C" },
    { period:"2024–Present", title:"Valuation Debate — Growth Multiple vs. Bond Yield", description:"At 24x PE for a pass-through lender with 35-40 bps fixed spread, the market confronts a structural valuation question. Growth of book supports premium; lack of pricing power argues against it. Stock consolidating.", sentiment:52, dominant:"PE de-rating, capex growth slowdown, RBI regulatory uncertainty", color:"#FFB800" },
  ],

  sentimentChart:[
    { year:2021, score:60, label:"IPO" },
    { year:2022, score:72, label:"Book growth" },
    { year:2023, score:90, label:"Retail euphoria" },
    { year:2024, score:55, label:"Valuation debate" },
    { year:2025, score:58, label:"Consolidation" },
  ],

  smartMoneyAnalysis:"IRFC's institutional history is a study in retail-driven momentum vs. institutional value discipline. The smart money bought at IPO (₹26) and added through ₹40-60 as the capex budget expansion thesis was validated — these are 4-6x gains. The retail-driven surge from ₹80 to ₹229 between Q4 FY22 and July 2024 was almost entirely momentum-driven — delivery percentages fell sharply during this phase, indicating speculative rather than conviction buying. The current institutional accumulation zone (₹155-175) is where patient capital is building positions based on ₹4.4 lakh cr loan book, ₹15,000 cr NII, and 13% ROE — metrics that justify ₹170-190 at normalized infrastructure NBFC multiples of 1.8-2.0x book value.",
  macroConnections:"IRFC's most direct macro lever is the Union Budget railway capex line — every ₹10,000 cr incremental capex in the budget translates to approximately ₹3,500 cr additional IRFC disbursement and ₹12-14 cr incremental annual NII. RBI's repo rate is the secondary lever — IRFC's borrowing cost is linked to sovereign yield curves, so rate cuts compress its cost of funds, slightly improving the spread. Fiscal deficit concerns (if government cuts infra capex to manage deficit) are the primary downside macro risk. India's credit rating trajectory matters: any upgrade reduces IRFC's borrowing cost directly.",
  latestDevelopments:[
    { headline:"IRFC Loan Book Crosses ₹4.4 Lakh Cr — NII ₹6,896 Cr in H1 FY25", aiRead:"Loan book at ₹4.4 lakh cr is the key fundamental proof point — a 10x expansion from pre-IPO levels. H1 FY25 NII of ₹6,896 cr annualizes to ₹13,800 cr. At the current stock price (₹170-180), that's a PE of 12-13x on annualized earnings — significantly cheaper than the 24x peak. The valuation re-rating from 24x to 12-13x has more than compensated for earnings growth, creating an asymmetric entry point for patient investors.", date:"Dec 2024", sentiment:"BULLISH" },
    { headline:"Union Budget 3-Year Capex Plan Signals ₹3 Lakh Cr+ Annual Railway Spend Through FY27", aiRead:"The medium-term expenditure framework projects railway capex at ₹2.65 lakh cr (FY26) and ₹3.0 lakh cr (FY27). This 3-year visibility is unprecedented and directly models IRFC's book growth trajectory. If the ₹3 lakh cr FY27 target holds, IRFC's loan book could reach ₹5.2-5.5 lakh cr by March 2027 — implying NII of ₹18,000-19,000 cr. Current price implies deep discount to that scenario.", date:"Jan 2025", sentiment:"BULLISH" },
    { headline:"RBI Infrastructure Lending Framework — IRFC Classified Under Special Category", aiRead:"RBI's revised infrastructure financing guidelines classify IRFC under a special government-owned NBFC category, exempting it from certain provisioning norms applicable to private infrastructure lenders. This regulatory clarity removes a key institutional overhang that had depressed the stock in H2 2024. Institutional analysts had flagged this as a risk; resolution is a re-rating catalyst.", date:"Nov 2024", sentiment:"BULLISH" },
  ],
  keyRisks:["Government railway capex budget reduction — single largest risk given 100% concentration in one borrower","RBI regulatory changes that increase IRFC's borrowing costs or capital requirements","Spread compression below 35 bps if Indian Railways renegotiates borrowing rates","Any credit event in Indian Railways (extremely unlikely but theoretically possible)","Valuation still above historical NBFC multiples — further de-rating risk if capex growth disappoints"],
};

/* ══════════════════════════════════════════════════════════
   HAL (Hindustan Aeronautics Limited)
══════════════════════════════════════════════════════════ */

const HAL: StockHistoryProfile = {
  ticker:"HAL", name:"Hindustan Aeronautics Ltd",
  sector:"Defense · Aerospace · Manufacturing", cap:"Large Cap", exchange:"NSE",
  currentTrend:"Secular Bull — Order Book Re-rating", currentSentiment:"BULLISH",
  oneLiner:"From an unloved PSU with a botched IPO and chronic delivery delays, HAL transformed into India's most consequential defense franchise — revalued from a manufacturing utility to a national security platform as Tejas orders, GE engine deals, and a ₹94,000 cr order book redefined what Indian defense can be worth.",

  timeline:[
    {
      year:2018, month:"Mar",
      headline:"HAL IPO at ₹1,215 — Subscribed Barely 1.02x, Lists Below Issue Price",
      context:"HAL's March 2018 IPO was supposed to be the marquee Make in India defense listing. The government priced the offer at ₹1,215/share, implying a valuation of ~₹40,700 cr. The market disagreed comprehensively — total subscription came in at just 1.02x, with retail barely saving the issue from embarrassment. The stock listed at ₹1,169 — a 3.8% discount — and fell to ₹980 within 6 months. The market's verdict: HAL was a cost-plus PSU with chronic delivery delays, unresolved labour disputes at its Bengaluru factory, and no commercial discipline. The Comptroller and Auditor General had flagged ₹8,900 cr in excess inventory. FIIs allocated the minimum possible.",
      marketReaction:"Listed at ₹1,169 vs. issue price ₹1,215. Fell to ₹980 by September 2018 — a 19% decline from issue price. Institutional investors sold into the listing rally. MF holding remained minimal at sub-2%.",
      institutionalRead:"The IPO failure told a clear story: the market was pricing HAL as a legacy PSU manufacturer, not a defense franchise. The supply-side frustrations were real — HAL had delivered only 70% of contracted LCA Tejas Mk1 aircraft on schedule, and the IAF had publicly criticized production timelines. No institutional model could justify a premium to book on those operating metrics.",
      retailSentiment:"Initial patriotic enthusiasm ('India's HAL, finally listed!') curdled into disappointment as the stock fell below issue price. Retail who bought at the IPO were underwater within weeks. Social media turned sharply negative — 'PSU trap' was the dominant narrative.",
      longTermImpact:"The IPO failure paradoxically set the floor for HAL's eventual re-rating. It forced management to confront the operational deficiencies and, critically, it kept the stock cheap enough that the Feb 2021 Tejas order catalyzed a genuinely massive re-rating rather than merely confirming an already-expensive stock.",
      impactScore:72, sentiment:"BEARISH", category:"FUNDRAISE",
      institutionalConf:28, retailExcitement:55, ltImportance:78,
    },
    {
      year:2020, month:"Jun",
      headline:"COVID + China Galwan Clash — Defense Budget Priority Shifts",
      context:"The June 2020 Galwan Valley clash between Indian and Chinese troops — India's first battle casualties in 45 years — fundamentally changed India's defense procurement posture. The government banned 101 defense items from import (the first indigenization positive list), accelerated Make in India timelines, and announced an intent to earmark 64% of the defense capital procurement budget for domestic industry. For HAL, this translated into a dramatically improved pipeline: Su-30 MKI overhaul contracts, Dornier aircraft upgrades, and accelerated HTT-40 trainer orders. The stock recovered from ₹700 (COVID lows, April 2020) to ₹980 by September 2020, still far below the transformative valuation that awaited.",
      marketReaction:"HAL rallied 40% from COVID lows of ₹700 to ₹980 between April-September 2020. Volume was moderate — this was not yet a conviction institutional buy, more a relief rally on defense policy tailwinds.",
      institutionalRead:"Institutional analysts were cautious — the positive list was policy intent, not order reality. The key concern: HAL's ability to absorb and execute a higher order inflow given existing production bottlenecks. Domestic MFs were building quiet positions below ₹900, but conviction was limited.",
      retailSentiment:"The Galwan clash triggered a wave of nationalist sentiment. 'Buy HAL, defend India' was a real retail thesis. Social media drove significant retail inflow into HAL between July-September 2020. Unsophisticated but directionally correct positioning.",
      longTermImpact:"The Galwan episode operationalized the Make in India defense narrative that had been aspirational since 2014. The indigenization lists and procurement reforms that followed were the structural foundation for the subsequent order avalanche.",
      impactScore:74, sentiment:"BULLISH", category:"MACRO",
      institutionalConf:58, retailExcitement:78, ltImportance:85,
    },
    {
      year:2021, month:"Feb",
      headline:"₹48,000 Cr Tejas Mk1A Order — Largest Domestic Defense Contract in Indian History",
      context:"On February 3, 2021, the Cabinet Committee on Security (CCS) cleared HAL's contract for 83 LCA Tejas Mk1A fighter aircraft at ₹48,000 cr — the largest single defense procurement from a domestic manufacturer in India's history. The order structure: HAL would deliver 83 aircraft between FY24-FY31, with full Make in India content requirements. The Mk1A incorporated 43 improvements over the Mk1, including an active electronically scanned array (AESA) radar, electronic warfare suite, and advanced infra-red search and track system. Revenue recognition: ₹6,000-7,000 cr per year over the 7-year delivery timeline. For context, HAL's total FY21 revenue was ₹19,422 cr — this single contract represented 3x annual revenue in forward booking.",
      marketReaction:"HAL stock surged 47% in the 4 weeks following the CCS approval — from ₹990 to ₹1,456. Delivery volumes hit 18-month highs. Domestic MF holding increased from 3.1% to 6.8% within 2 quarters. This was genuine institutional accumulation, not retail momentum.",
      institutionalRead:"This was the re-rating event the institutional community had been waiting for since the failed IPO. Revenue visibility extending to FY31 de-risked HAL's earnings trajectory in a way no quarterly result could. Analysts who had maintained ₹1,200 targets scrambled to revise to ₹1,800-2,000. The key insight: with ₹48,000 cr locked in for a single program, HAL's EPS was now forecastable with unusual precision for a PSU.",
      retailSentiment:"Explosive retail excitement. 'HAL is the next multi-bagger' dominated every financial discussion forum. The nationalist + financial thesis alignment was perfect — retail understood the story this time. Significant retail inflow from ₹1,100-1,400.",
      longTermImpact:"This order transformed HAL's institutional identity from a maintenance-and-repair PSU to a weapons system manufacturer with predictable long-duration revenue. The re-rating from ₹1,000 to ₹5,000+ over the next 3 years was the direct consequence of this visibility shift.",
      impactScore:99, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:94, retailExcitement:96, ltImportance:99,
    },
    {
      year:2022, month:"Mar",
      headline:"Russia-Ukraine War — Global Defense Re-rating Reaches HAL",
      context:"Russia's invasion of Ukraine on February 24, 2022 triggered the most significant global reassessment of defense spending since the Cold War. NATO members committed to 2% of GDP defense spending. India — having over-indexed on Russian equipment (Su-30, MiG-29, T-90 tanks) — suddenly faced urgent indigenization pressure as Russian parts supplies became uncertain under sanctions. HAL was the direct beneficiary: the IAF grounded portions of its MiG-21 fleet, accelerating Tejas Mk1A delivery pressure; Su-30 MKI upgrade contracts worth ₹60,000+ cr were advanced in planning; and the global re-rating of defense stocks (Lockheed +32%, BAES +45%, Thales +52% in 2022) provided institutional cover to re-rate HAL on a global defense comparable basis rather than a PSU multiple.",
      marketReaction:"HAL rallied 65% between February-September 2022 — from ₹1,620 to ₹2,675 — as global defense re-rating combined with India-specific indigenization urgency. FII holding, which had been near-zero since the IPO, crossed 2% for the first time.",
      institutionalRead:"The Russia-Ukraine war was the catalyst that unlocked FII capital for HAL. Foreign institutional investors who had never previously modeled Indian defense suddenly had a global defense re-rating framework. HAL at 18-20x PE (pre-rally) was a 40-50% discount to global defense peers at 25-30x. The gap closed partially in 2022 and continued closing through 2023.",
      retailSentiment:"Strong retail conviction. The 'geopolitical defense thesis' was easy to understand. WhatsApp forwards about India's dependence on Russian equipment drove organic retail awareness. Retail held through the rally rather than selling early — unusually good positioning behavior.",
      longTermImpact:"Russia-Ukraine permanently changed how Indian institutions and global FIIs value HAL. The 'PSU discount' of pre-2022 was replaced by a 'strategic asset premium.' This paradigm shift is structural — it doesn't reverse when geopolitical tensions ease.",
      impactScore:88, sentiment:"BULLISH", category:"MACRO",
      institutionalConf:82, retailExcitement:84, ltImportance:90,
    },
    {
      year:2023, month:"Jun",
      headline:"PM Modi US Visit — GE F414 Fighter Engine Technology Transfer Deal",
      context:"During PM Modi's state visit to Washington in June 2023, GE Aerospace signed an agreement with HAL to co-produce GE F414 turbofan engines in India for the LCA Tejas Mk2 program. This was the first time the US had agreed to transfer fighter jet engine technology — the most sensitive defense technology — to any non-allied nation. The deal's significance: India would assemble (and eventually manufacture) the F414 in HAL's Koraput engine complex. The engine is rated at 98 kN thrust, enabling Tejas Mk2 to achieve supersonic cruise. Long-term, the deal positions HAL as a gas turbine manufacturing platform, not merely an assembler.",
      marketReaction:"HAL stock crossed ₹3,000 for the first time following the Washington announcement. Institutional PT upgrades flooded in — Motilal Oswal revised to ₹3,600, Emkay to ₹3,400. FII ownership crossed 4% — a 4-year high. The day of the announcement, HAL was the top-traded PSU stock by value.",
      institutionalRead:"The GE technology transfer was the final piece of the institutional bull case. Pre-deal, the risk was that HAL would always be dependent on foreign engines — the Kaveri engine program had failed for 30 years. With GE's F414 transfer, HAL gains a credible path to domestic engine capability. More immediately: Tejas Mk2 has a clear propulsion solution, de-risking the program and the associated ₹67,000 cr future order.",
      retailSentiment:"Massive retail excitement. 'India-US defense partnership seals HAL's future' was the dominant social media narrative. High-decibel patriotic + financial thesis combination. Retail buying after the announcement at ₹3,000+ was aggressive.",
      longTermImpact:"The F414 technology transfer will take 8-10 years to fully materialize in domestic manufacturing capability. But the institutional significance is immediate: HAL is now a partner of the most sophisticated aerospace company in the world. This changes how global defense prime contractors view HAL as a potential partner for other programs.",
      impactScore:92, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:90, retailExcitement:92, ltImportance:95,
    },
    {
      year:2024, month:"Jan",
      headline:"Order Book Crosses ₹94,000 Cr — 7-Year Revenue Visibility, But Execution Fears Rise",
      context:"HAL's order book crossed ₹94,000 cr by Q3 FY24, representing approximately 4.8x trailing revenues — an extraordinary revenue visibility ratio for any manufacturer globally. The book comprised Tejas Mk1A (₹48,000 cr), Su-30 MKI upgrades (₹13,850 cr), HTT-40 trainers (₹6,800 cr), Chetak and ALH Dhruv helicopter overhauls, and various MRO contracts. However, Q3 FY24 also brought the first serious delivery concern: only 8 of 16 contracted Tejas Mk1A deliveries for FY24 had been completed, with HAL citing GE engine supply delays and AESA radar integration challenges. The IAF publicly noted 'concern' over delivery timelines.",
      marketReaction:"Stock oscillated between ₹2,800-3,200 through Q3-Q4 FY24 as the bull case (order book) and bear case (execution risk) competed. After hitting ₹4,000 in January 2024, a profit booking correction to ₹3,100 in March 2024 provided the institutional accumulation entry.",
      institutionalRead:"The execution risk is real but should not be conflated with order book cancellation risk. Government defense contracts in India are not cancelled — they are delayed, then executed. HAL's EBITDA margin trajectory (expanding from 15% to 20% as Tejas revenues ramp) is still intact. The delivery slip shifts revenue from FY25 into FY26-27, not out of existence. Sophisticated models adjusted timelines, not base cases.",
      retailSentiment:"First significant retail anxiety about HAL since the Tejas re-rating. 'HAL can't deliver' narratives spread on Twitter/X. Retail who had bought at ₹1,500-2,000 were still sitting on large profits and used the delivery concerns as an excuse to book — and then regretted it as the stock recovered to ₹4,800 by late 2024.",
      longTermImpact:"HAL's execution track record will be the central debate through FY26-27. The answer will be delivered literally — in the number of Tejas Mk1A aircraft parked on the IAF tarmac. The institutional verdict will follow the delivery data with a 2-quarter lag.",
      impactScore:82, sentiment:"MIXED", category:"EARNINGS",
      institutionalConf:76, retailExcitement:60, ltImportance:86,
    },
    {
      year:2024, month:"Nov",
      headline:"Quarterly Revenue Crosses ₹5,000 Cr — Safran MoU and Su-30 Upgrade Orders Confirm Next Growth Leg",
      context:"HAL reported Q2 FY25 standalone revenues of ₹5,128 cr — the first quarter exceeding ₹5,000 cr, representing 16% YoY growth and confirming the Tejas delivery ramp was back on track. Simultaneously, HAL signed an MoU with France's Safran Helicopter Engines for co-production of Shakti engines for the LCH Prachand combat helicopter and ALH fleet. The Safran deal mirrored the GE F414 strategy: technology transfer for indigenous production capability. Su-30 MKI upgrade contracts — a ₹60,000+ cr program being finalized with Russian-origin components replaced by Israeli and Indian systems — entered advanced negotiation, potentially adding another multi-year revenue anchor to the order book.",
      marketReaction:"HAL stock reached ₹4,850 in November 2024, within 4% of all-time highs. Market cap crossed ₹1.6 lakh cr — a 400%+ gain from the IPO market cap of ₹40,700 cr six years prior.",
      institutionalRead:"The revenue crossing ₹5,000 cr per quarter is the tangible milestone the market had been waiting for since the Tejas order. Annualized run-rate of ₹20,000+ cr is still 2.3x lower than the implied steady-state revenue from current order book. The Safran MoU + Su-30 upgrade together represent a second ₹40,000-60,000 cr order wave that sustains revenue growth through FY30. HAL's forward PE of 38-42x is elevated but defensible given 20%+ earnings CAGR visibility.",
      retailSentiment:"Bullish but cautious. Retail that had taken profits at ₹3,000-3,500 was experiencing genuine regret FOMO. New retail entrants at ₹4,500+ are buying the narrative, not the valuation — a setup for post-euphoria volatility.",
      longTermImpact:"HAL is now a structurally different business from its IPO incarnation. The revenue mix is shifting from MRO and licensed production (low margin, low visibility) toward new-build platforms (higher margin, multi-year locked revenue). The margin trajectory — targeting 22-24% EBITDA by FY27 — is the single most important metric for further re-rating.",
      impactScore:88, sentiment:"BULLISH", category:"EARNINGS",
      institutionalConf:86, retailExcitement:80, ltImportance:90,
    },
  ],

  narrativeEvolution:[
    { period:"2018–2020", title:"Failed IPO — PSU Utility Trap", description:"HAL was priced and perceived as a legacy PSU: chronically slow delivery, union-constrained manufacturing, cost-plus contracts. The 1.02x IPO subscription was the market's verdict. Institutional indifference was comprehensive.", sentiment:32, dominant:"PSU discount, delivery failure, IPO overhang", color:"#FF4D4D" },
    { period:"2020–2021", title:"Make in India Defense Catalyst", description:"Galwan Valley clash, the 101-item indigenization list, and ultimately the ₹48,000 cr Tejas Mk1A contract rewired the market's mental model. HAL was reclassified from PSU utility to defense prime contractor.", sentiment:72, dominant:"Indigenization policy, Tejas order, domestic MF accumulation", color:"#FFB800" },
    { period:"2022–2023", title:"Global Defense Re-rating + Technology Transfer Premium", description:"Russia-Ukraine triggered a global defense re-rating that provided FII entry cover. The GE F414 technology transfer deal elevated HAL from a domestic story to a globally comparable defense prime. FII ownership inflected from near-zero to 4%+.", sentiment:86, dominant:"Geopolitical re-rating, GE deal, order book compounding", color:"#00FF9C" },
    { period:"2024–Present", title:"Execution Era — Show Us the Aircraft", description:"The narrative has shifted from order wins to delivery execution. HAL must prove it can convert a ₹94,000 cr order book into actual aircraft on time. Revenue ramp confirmation (₹5,000 cr/quarter) has sustained institutional conviction, but every quarterly delivery update is now a market event.", sentiment:80, dominant:"Tejas delivery rate, margin expansion, Su-30 upgrade order finalization", color:"#38BDF8" },
  ],

  sentimentChart:[
    { year:2016, score:42, label:"Pre-IPO obscurity" },
    { year:2017, score:48, label:"IPO anticipation" },
    { year:2018, score:28, label:"IPO disappointment" },
    { year:2019, score:35, label:"PSU trap narrative" },
    { year:2020, score:58, label:"Galwan policy shift" },
    { year:2021, score:88, label:"Tejas Mk1A order" },
    { year:2022, score:84, label:"Ukraine re-rating" },
    { year:2023, score:90, label:"GE F414 deal" },
    { year:2024, score:82, label:"Execution test" },
    { year:2025, score:84, label:"Revenue ramp confirmed" },
  ],

  smartMoneyAnalysis:"The smartest institutional call in HAL's history was buying between ₹700-1,000 in 2020 — before the Tejas order — based on the conviction that Make in India defense policy would eventually translate into a genuine order avalanche. Domestic MFs (Nippon, DSP, Motilal Oswal) accumulated quietly at these levels. Their average cost basis is ₹800-1,100; current price of ₹4,500+ represents a 4-5x return in 4 years. The current institutional positioning is more complex: patient long-only money holding for the Su-30 upgrade order finalization and Tejas Mk2 contract (expected FY26), while momentum money trades the delivery data quarterly. Delivery volumes above 60% consistently signal institutional conviction accumulation; spikes to 70%+ precede significant re-rating moves.",
  macroConnections:"India's defense budget is the single most direct macro input. The defense capital procurement budget has grown at 12-15% CAGR over FY20-FY25. Any government commitment to accelerate to 3% of GDP defense spending (currently 2.4%) would directly unlock incremental HAL order flow. USD/INR matters for the GE F414 royalty payments and imported components in Tejas — INR weakness compresses margins on fixed-price contracts. The geopolitical tension with China is the perverse positive: every LAC escalation accelerates IAF procurement timelines.",
  latestDevelopments:[
    { headline:"HAL Q3 FY25 Revenue ₹5,444 Cr — Tejas Mk1A Delivery Rate Accelerating", aiRead:"Third consecutive quarter of ₹5,000+ cr revenue confirms the delivery ramp is structural, not episodic. Tejas delivery rate has improved from 8/year to an implied 14/year based on revenue run-rate. At this pace, HAL is on track to deliver 83 aircraft in 6 years rather than 7 — a 15% execution beat vs. contract schedule. EBITDA margin at 21.8% is the highest in HAL's listed history.", date:"Jan 2025", sentiment:"BULLISH" },
    { headline:"Safran Helicopter Engine JV Agreement Signed — Shakti Engine for LCH Prachand", aiRead:"The Safran MoU has converted to a formal JV agreement. Production of Shakti engines at HAL's Koraput facility will begin by FY28. This is the second major aero-engine technology transfer in 18 months (after GE F414). HAL is systematically building an engine manufacturing capability that was the single largest dependency gap in its long-term independence thesis.", date:"Dec 2024", sentiment:"BULLISH" },
    { headline:"Su-30 MKI Upgrade Contract — ₹60,000 Cr Program Enters Final Negotiation", aiRead:"The Su-30 upgrade is HAL's next generational order anchor. 84 aircraft in Phase 1, with potential for 96 more in Phase 2. Revenue timeline stretches to FY35. If finalized at the expected ₹60,000 cr quantum, HAL's total order book would cross ₹1.2 lakh cr — creating revenue visibility through the next decade. The negotiation is on track; announcement expected by Q1 FY26.", date:"Nov 2024", sentiment:"BULLISH" },
  ],
  keyRisks:["Tejas Mk1A delivery slip beyond FY32 reduces revenue recognition pace","GE F414 technology transfer conditional on US export control approvals","Su-30 upgrade program scope reduction if diplomatic considerations change","AESA radar (Israeli origin) supply disruption amid Middle East tensions","HAL's unionized workforce constraining production ramp-up flexibility"],
};

/* ══════════════════════════════════════════════════════════
   ICICIBANK (ICICI Bank)
══════════════════════════════════════════════════════════ */

const ICICIBANK: StockHistoryProfile = {
  ticker:"ICICIBANK", name:"ICICI Bank Ltd",
  sector:"Banking & Financial Services", cap:"Large Cap", exchange:"NSE",
  currentTrend:"Structural Bull — ROE Expansion Cycle", currentSentiment:"BULLISH",
  oneLiner:"India's most dramatic banking turnaround story — from a governance crisis and NPA reckoning that nearly destroyed institutional trust, to the cleanest ROE expansion trajectory in Indian private banking, now trading at parity with HDFC Bank for the first time in its history.",

  timeline:[
    {
      year:2016, month:"Mar",
      headline:"NPA Cycle Peaks — Gross NPA at 6.0%, Infrastructure Book Unraveling",
      context:"By March 2016, ICICI Bank's infrastructure and power sector loan book — aggressively built under MD & CEO Chanda Kochhar's growth-at-all-costs strategy from 2010-2015 — was visibly deteriorating. The bank had lent ₹48,000 cr to stressed infrastructure companies including Essar Steel, Bhushan Steel, Reliance Communications, Lanco Infratech, and Amtek Auto. The Reserve Bank's Asset Quality Review (AQR) of FY16 forced banks to recognize NPAs that had been masked under restructured/evergreen classifications. ICICI Bank's disclosed GNPA surged from 3.7% (FY15) to 6.0% (FY16) — and most analysts believed the actual stress was materially higher.",
      marketReaction:"ICICI Bank fell 35% between January 2015 (₹395) and March 2016 (₹192) as the NPA cycle became undeniable. The stock was the worst performer among large-cap private banks during this period — HDFC Bank declined only 12% over the same period.",
      institutionalRead:"The institutional community began differentiating sharply between 'clean book' private banks (HDFC Bank, Kotak) and 'stressed legacy book' banks (ICICI Bank, Axis Bank). ICICI Bank's wholesale lending culture — concentrated, infrastructure-heavy, relationship-driven — was identified as the root cause. FII ownership declined from 41% to 35% over FY15-17.",
      retailSentiment:"Confusion and alarm. ICICI Bank was a trusted household brand — retail investors couldn't reconcile the brand trust with the deteriorating financials. The stock's fall from ₹395 to ₹192 was traumatic for retail holders who had bought on the 'India's best private bank' thesis.",
      longTermImpact:"The NPA reckoning of 2016-18 forced ICICI Bank to confront a fundamental strategic question: what kind of bank does it want to be? The answer — delivered by Sandeep Bakhshi from 2018 — was the most consequential strategic pivot in Indian private banking.",
      impactScore:86, sentiment:"BEARISH", category:"EARNINGS",
      institutionalConf:35, retailExcitement:15, ltImportance:92,
    },
    {
      year:2018, month:"Oct",
      headline:"Chanda Kochhar Resignation — VRL Loans/Videocon Quid-Pro-Quo — Sandeep Bakhshi Takes Over",
      context:"The governance crisis that had been simmering since 2018 culminated in Chanda Kochhar's resignation as MD & CEO on October 4, 2018. The specific allegation: ICICI Bank had sanctioned ₹3,250 cr in loans to Videocon Industries (headed by Venugopal Dhoot), and in return, Dhoot had invested ₹64 cr in NuPower Renewables — a company co-founded by Deepak Kochhar (Chanda's husband). SEBI and CBI investigations followed. GNPA had now reached a peak of 8.8% in FY18 — ₹54,063 cr in absolute terms. The bank's ROE had crashed from 15% (FY14) to 3.2% (FY18). Sandeep Bakhshi, previously COO, was appointed as the new CEO with an explicit 'clean book, clean governance' mandate from the board.",
      marketReaction:"Paradoxically, Chanda Kochhar's departure was the first unambiguously positive catalyst in 3 years. ICICI Bank stock, which had been at ₹280-300 during the investigation period, began recovering on Bakhshi's appointment. The initial market reaction on the CEO change day was +6% — rare for a governance crisis conclusion.",
      institutionalRead:"The institutional community's response was nuanced and ultimately prescient: the Bakhshi appointment was read as a 'reset' rather than a continuity event. His COO background meant he knew exactly which skeletons existed and was committed to dragging them into the light. The 'kitchen-sinking' that followed — aggressive provisions in FY19 — was the institutional signal that the bottom was being set.",
      retailSentiment:"Deep anxiety. The CEO resignation confirmed every fear about ICICI Bank's governance. Retail treated the news as a sell signal — understandably — missing the institutional read that Bakhshi's appointment was actually the turning point.",
      longTermImpact:"The Bakhshi appointment is the single most important event in ICICI Bank's modern history. His tenure redefined the bank's risk culture, technology strategy, and retail-over-wholesale pivot. Everything that has happened since — the NPA recovery, ROE expansion, digital premium — flows from October 4, 2018.",
      impactScore:95, sentiment:"MIXED", category:"CONTROVERSY",
      institutionalConf:68, retailExcitement:18, ltImportance:99,
    },
    {
      year:2019, month:"Dec",
      headline:"'Operation Clean Book' — Provisions Surge, GNPA Falls From 8.8% to 6.7%",
      context:"Through FY19, under Bakhshi's 'One Bank, One ROE' strategy, ICICI Bank made provisions of ₹31,000 cr — nearly double the FY18 provision run-rate. The aggressive provisioning was deliberate: cover the stressed book so thoroughly that future slippages would have negligible P&L impact. The corporate and infrastructure lending portfolios — Essar, Bhushan, Videocon, Reliance Comm — were fully provided or written off. By March 2019, GNPA had declined from 8.8% to 6.7%, and the provision coverage ratio had improved from 49% to 66%. Equally important: ICICI Bank dramatically reduced new corporate loan origination (wholesale credit grew just 2% vs. 18% in FY15) and pivoted aggressively to retail and SME.",
      marketReaction:"ICICI Bank stock recovered from ₹265 (early FY19) to ₹480 by March 2020 (pre-COVID) — an 81% recovery in 18 months. The first time the stock sustained above ₹400 since FY17. Domestic MF holding increased from 12% to 16% during this period.",
      institutionalRead:"The aggressive provisioning was recognized by sophisticated institutions as the most important positive signal in banking: management willing to take pain upfront rather than kick the can. GNPA declining while provision coverage was simultaneously rising meant the book was genuinely improving, not just being cosmetically managed. Re-initiating coverage notes from Goldman, Jefferies, and Kotak Institutional in this period all used the phrase 'inflection point.'",
      retailSentiment:"Cautiously optimistic. The recovery from ₹265 to ₹480 attracted momentum retail buyers. However, retail conviction was fragile — the COVID crash of March 2020 would test it severely.",
      longTermImpact:"'Operation Clean Book' created the foundation for ICICI Bank's extraordinary 2021-24 performance. The bank entered the COVID crisis with a significantly cleaner balance sheet and higher provision buffers than any comparable peer. This balance sheet preparation was the hidden advantage that made the post-COVID NPA recovery look miraculous.",
      impactScore:88, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:82, retailExcitement:60, ltImportance:95,
    },
    {
      year:2020, month:"Mar",
      headline:"COVID Crash — ₹545 to ₹268 in 6 Weeks, RBI Moratorium Reignites NPA Fears",
      context:"ICICI Bank fell from ₹545 (January 2020) to ₹268 (March 24, 2020) — a 51% decline in 6 weeks. The RBI's loan moratorium announcement, while intended to provide relief, paradoxically amplified fears: if banks couldn't distinguish between stressed and good borrowers during moratorium, what was the actual NPA? ICICI Bank's retail book (personal loans, SME, kisan credit cards) was specifically feared — these segments are most vulnerable to income disruption. For a bank that had just spent 2 years trying to move away from a corporate-heavy crisis, the COVID crash threatened to import a retail NPA crisis.",
      marketReaction:"Stock hit ₹268 on March 24, 2020 — at this price, ICICI Bank was trading at 0.8x book, the lowest valuation since 2001. Delivery volumes were the highest in 5 years — institutional sellers and institutional buyers were both active at these levels.",
      institutionalRead:"The institutions who bought ICICI Bank at ₹268-350 during March-April 2020 were making one of the most lucrative trades in Indian banking history. The thesis: ICICI Bank's pre-provisioned balance sheet meant the COVID slippage would be absorbable. The moratorium participation rate was actually lower than peers — signaling the retail book quality was better than feared. And Bakhshi's management team had demonstrated in FY19 that they would not hide problems.",
      retailSentiment:"Capitulation. 'ICICI Bank will need government bailout' was a seriously circulated narrative. Most retail sold between ₹300-400. The 'lightning strikes twice' fear — first NPA crisis, now COVID — was powerful. Retail missed the entire ₹268 to ₹900 recovery.",
      longTermImpact:"The COVID crash and recovery was the final test of Bakhshi's rebuild. ICICI Bank emerged from COVID with NPAs that peaked at 4.9% (much lower than feared), a digital banking infrastructure that had been stress-tested at scale, and institutional confidence at its highest point since 2013.",
      impactScore:92, sentiment:"MIXED", category:"MACRO",
      institutionalConf:79, retailExcitement:12, ltImportance:88,
    },
    {
      year:2022, month:"Jun",
      headline:"NPA Recovery Complete — GNPA Falls to 3.6%, iMobile Pay Crosses 7M Non-Customer Users",
      context:"By June 2022, ICICI Bank had achieved what many institutional investors had considered optimistic in 2018: GNPA declined from a peak of 8.8% (FY18) to 3.60% (Q1 FY23) in 4 years — the fastest large-bank NPA recovery in Indian banking history. Simultaneously, ICICI Bank's digital banking strategy was producing measurable results: iMobile Pay (its mobile banking super-app) had crossed 7 million users including 2.4 million users from non-ICICI Bank customers — a metric that no other Indian bank had achieved. The '360° banking' strategy — cross-selling across deposits, insurance (ICICI Prudential, ICICI Lombard), securities (ICICI Securities), and asset management — was beginning to reflect in fee income, which grew 24% YoY.",
      marketReaction:"ICICI Bank crossed ₹800 for the first time in June 2022 — the stock had now tripled from COVID lows. FII ownership, which had fallen to 34% at the NPA trough, recovered to 42%. More significantly, ICICI Bank's price-to-book crossed parity with Kotak Mahindra Bank for the first time, signaling a fundamental valuation re-rating.",
      institutionalRead:"The NPA recovery was confirmation of the original Bakhshi thesis. But the 7 million iMobile Pay users across non-ICICI customers was the new institutional discovery moment — this data point signaled that ICICI Bank's digital banking moat was extending beyond its customer base, a feat previously considered HDFC Bank's exclusive capability. Analysts began revising ICICI Bank's digital premium upward.",
      retailSentiment:"Strong bullishness. The 3x recovery from ₹268 to ₹800 had created a new generation of ICICI Bank bulls. Social media had completely flipped from 'governance disaster' (2018) to 'India's best bank to buy now' (2022). Some retail positioning was now at frothy levels.",
      longTermImpact:"The NPA recovery + digital traction combination was the foundation for ICICI Bank's unprecedented valuation — by 2024, the bank would trade at parity with HDFC Bank on Price/Book for the first time in its history. This re-rating, from perpetual HDFC Bank discount to parity, represents ₹2.5 lakh cr of market cap creation.",
      impactScore:94, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:92, retailExcitement:84, ltImportance:96,
    },
    {
      year:2023, month:"Sep",
      headline:"ROE Exceeds 18% — ICICI Bank Reaches Valuation Parity With HDFC Bank",
      context:"ICICI Bank's Return on Equity crossed 18% in Q2 FY24 — the first time in its listed history. For context: HDFC Bank's ROE in the same quarter was 16.8% (compressed by the merger). ICICI Bank's loan growth was 19% YoY, Net Interest Margin held at 4.53% (the highest among large private banks), GNPA had declined further to 2.48%, and fee income grew 23% on the back of the 360° financial services strategy. The stock crossed ₹1,000 in August 2023 and reached ₹1,200 by September — giving ICICI Bank a market cap of ₹8.5 lakh cr, within striking distance of HDFC Bank's ₹9.2 lakh cr.",
      marketReaction:"ICICI Bank's Price/Book of 3.1x crossed HDFC Bank's 2.9x (post-merger NIM compression) for the first time ever. This was the single most discussed event in Indian banking analyst circles in 2023 — for 25 years, HDFC Bank had commanded a structural premium. The inversion triggered reassessment across every banking model.",
      institutionalRead:"The ROE crossing 18% was not just a milestone — it was the quantitative validation of the entire Bakhshi-era thesis. A bank generating 3.2% ROE in FY18 was now generating 18%+ ROE in FY24. The magnitude of the turnaround — a 15-percentage-point ROE improvement in 6 years — is arguably unmatched in global banking history for an institution of this scale. Institutions who were early (FY19-FY20 buyers) were sitting on 300-350% returns.",
      retailSentiment:"Extreme bullishness. 'ICICI Bank is the new HDFC Bank' was the dominant social media and mainstream financial media narrative. Retail buying at ₹1,000-1,200 was aggressive — some of it buying into fully priced valuations.",
      longTermImpact:"The ROE parity with HDFC Bank is the structural re-rating that defines ICICI Bank's modern era. The question now is whether ICICI Bank can sustain 18%+ ROE through a full credit cycle — including the eventual NPA normalization that all growth cycles bring. This is the central institutional debate through FY25-FY27.",
      impactScore:96, sentiment:"BULLISH", category:"EARNINGS",
      institutionalConf:94, retailExcitement:92, ltImportance:97,
    },
    {
      year:2024, month:"Oct",
      headline:"iMobile Pay 12M+ Non-ICICI Users — Digital Premium Sustains Into Rate Cut Cycle",
      context:"By October 2024, iMobile Pay had crossed 12 million users from non-ICICI Bank customers — a 70% increase from the 7 million milestone of 2022. This 'platform beyond your own customers' metric was unmatched in Indian banking. ICICI Bank's credit card market share had crossed 17% (vs. 8% in FY19), personal loan origination via digital channels was 65% of total, and the ICICI Securities + ICICI Prudential cross-sell was generating ₹2,400 cr in annual fee income. Q2 FY25 standalone PAT was ₹11,792 cr — growing 14% YoY — and NIM held at 4.27% despite the broader deposit cost pressure that was compressing peers. RBI's 25 bps rate cut of October 2024 created a new tailwind: ICICI Bank's retail-heavy loan book reprices within 3-6 months, while deposit costs lag — a NIM expansion opportunity.",
      marketReaction:"ICICI Bank tested ₹1,350 in September-October 2024, near all-time highs. The stock's 1-year performance (+28%) outpaced HDFC Bank (-8%) by 36 percentage points — the widest relative outperformance since the Bakhshi turnaround began. FII holding at 46% was at a 10-year high.",
      institutionalRead:"The combination of NIM resilience + digital platform monetization + rate cut beneficiary positioning has created the strongest institutional conviction on ICICI Bank since 2007. The thesis is straightforward: if ICICI Bank can sustain 17-18% ROE through the current rate cycle (not a stretch given NIM cushion and credit cost normalization), the stock deserves to re-rate above HDFC Bank's historical average multiple — 3.5-4x Book — implying 15-20% upside from current levels.",
      retailSentiment:"Peak bullishness. ICICI Bank is now widely considered India's best bank by retail consensus — a complete reversal from the governance-crisis era of 2018. High retail concentration at current prices is a risk — not of the thesis being wrong, but of overbuying if growth slows even temporarily.",
      longTermImpact:"ICICI Bank's digital platform strategy — particularly the non-customer app user acquisition — is the most underanalyzed value creation in Indian banking. If iMobile Pay reaches 25-30 million non-ICICI users by FY27, ICICI Bank effectively becomes a financial platform company (higher multiple) not just a bank. This narrative evolution is the next leg of the re-rating story.",
      impactScore:88, sentiment:"BULLISH", category:"CORPORATE",
      institutionalConf:90, retailExcitement:88, ltImportance:92,
    },
  ],

  narrativeEvolution:[
    { period:"2010–2017", title:"NPA Cycle — The Cost of Ambition", description:"ICICI Bank's aggressive infrastructure and corporate lending strategy from 2010-2015 created India's most concentrated bank-to-stressed-corporate exposure. The AQR forced recognition. Market penalized ICICI Bank with a perpetual discount to HDFC Bank — its 'clean book' rival.", sentiment:35, dominant:"NPA fears, governance concerns, Chanda Kochhar era overhang", color:"#FF4D4D" },
    { period:"2018–2019", title:"Bakhshi's Reset — Clean Book Mandate", description:"Sandeep Bakhshi's appointment triggered the most aggressive balance sheet cleaning in Indian banking history. ₹31,000+ cr of provisions in FY19 alone. The market recognized the 'kitchen-sinking' as a positive signal. Recovery began from ₹265.", sentiment:52, dominant:"Aggressive provisioning, governance reset, retail pivot", color:"#FFB800" },
    { period:"2020–2022", title:"COVID Stress Test — NPA Recovery Acceleration", description:"COVID provided the ultimate test of the Bakhshi rebuild — and ICICI Bank passed. NPAs peaked at 4.9% (vs. feared 7-8%), recovered sharply, while digital banking (iMobile Pay) scaled to 7M+ non-customer users. The turnaround was confirmed as structural, not cyclical.", sentiment:78, dominant:"NPA recovery proof, digital banking emergence, retail FOMO", color:"#38BDF8" },
    { period:"2023–Present", title:"ROE Parity — Structural Re-rating Complete", description:"ROE crossing 18% and ICICI Bank trading at price-to-book parity with HDFC Bank marks the completion of the institutional re-rating. The bank is now priced as India's best-in-class private bank, not a recovery story. Sustaining 17-18% ROE through the full credit cycle is the new question.", sentiment:88, dominant:"ROE leadership, digital platform premium, rate cut beneficiary", color:"#00FF9C" },
  ],

  sentimentChart:[
    { year:2015, score:45, label:"NPA fears building" },
    { year:2016, score:32, label:"AQR shock" },
    { year:2017, score:28, label:"Kochhar controversy" },
    { year:2018, score:38, label:"CEO change — base forming" },
    { year:2019, score:62, label:"Bakhshi provisions — inflection" },
    { year:2020, score:44, label:"COVID crash" },
    { year:2021, score:74, label:"NPA recovery" },
    { year:2022, score:82, label:"iMobile + GNPA 3.6%" },
    { year:2023, score:90, label:"ROE 18%, parity with HDFC" },
    { year:2024, score:88, label:"Digital premium sustained" },
    { year:2025, score:86, label:"Rate cut tailwind" },
  ],

  smartMoneyAnalysis:"ICICI Bank's smart money history contains two distinct accumulation windows. The first: FY19 at ₹265-320, when Bakhshi's aggressive provisioning created the 'kitchen-sink' signal that sophisticated institutions recognize as bottom-setting. Domestic MFs (SBI MF, Nippon) built large positions here. The second: COVID lows at ₹268-350 in March-April 2020, where delivery percentages surged above 65% as institutional buyers absorbed panicking retail sellers. Both windows generated 300%+ returns within 4 years. The current positioning is concentrated in the hands of high-conviction institutional holders — FII ownership at 10-year highs of 46%, domestic MFs at 14%. Retail, having missed both accumulation windows, is now buying at all-time highs — the reverse of the optimal pattern.",
  macroConnections:"ICICI Bank is the most direct beneficiary of RBI rate cuts in Indian large-cap banking. Its retail-heavy loan book (65%+ retail) reprices upward within 3-6 months of rate cuts, while its deposit base (strong CASA ratio of 39%) re-prices more slowly — creating automatic NIM expansion in rate cut cycles. Every 25 bps RBI cut adds approximately 15-18 bps to ICICI Bank's NIM over 2 quarters. GDP growth acceleration directly benefits ICICI Bank's largest segments: personal loans, credit cards, and SME credit. The 360° strategy's fee income (insurance, brokerage, AMC) also correlates strongly with equity market performance.",
  latestDevelopments:[
    { headline:"ICICI Bank Q3 FY25 PAT ₹11,792 Cr — NIM Holds at 4.25%, Best-in-Class Among Peers", aiRead:"Q3 results confirm ICICI Bank's NIM resilience advantage. While HDFC Bank NIM compressed to 3.95% and Axis Bank to 4.01%, ICICI Bank held at 4.25% — a 30-bps structural advantage driven by higher retail mix and superior deposit franchise. PAT growth at 14% YoY is the highest among large private banks this quarter. This is not a temporary outperformance — the retail vs. wholesale composition difference is structural.", date:"Jan 2025", sentiment:"BULLISH" },
    { headline:"iMobile Pay Reaches 12.5M Non-ICICI Users — Cross-Sell Revenue Crosses ₹2,600 Cr", aiRead:"The non-customer iMobile Pay user count is the most important metric for ICICI Bank's long-term re-rating. At 12.5 million, ICICI Bank has more non-customer digital banking users than most Indian banks have total customers. The monetization path — onboarding these users as savings account holders via frictionless KYC — has a measured conversion rate of 8-12%, implying 1-1.5 million new account acquisitions annually at near-zero acquisition cost.", date:"Dec 2024", sentiment:"BULLISH" },
    { headline:"ICICI Bank Credit Card Spends Market Share at 17.2% — Crosses Axis Bank", aiRead:"ICICI Bank's credit card business — negligible in 2018, now ₹1.1 lakh cr in annual spends — has crossed Axis Bank's market share for the first time. Reward-based cards (Amazon Pay ICICI, Coral, Sapphiro) are driving premium customer acquisition. Credit card NIM is 20%+, making this the highest-yield segment in the bank's portfolio. Fee income from interchange and annual fees adds ₹1,800 cr annually.", date:"Nov 2024", sentiment:"BULLISH" },
  ],
  keyRisks:["NPA normalization in the unsecured retail book (personal loans, credit cards) if macroeconomic conditions deteriorate","NIM compression if deposit competition intensifies beyond current levels","ICICI Lombard and ICICI Prudential regulatory headwinds reducing 360° fee income","Bakhshi succession — the turnaround is personally associated with him; transition creates institutional uncertainty","Valuation at 3.2x book leaves limited margin of safety if ROE drops below 16%"],
};

/* ══════════════════════════════════════════════════════════
   DATABASE & GENERATOR
══════════════════════════════════════════════════════════ */

const HISTORY_DB: Record<string, StockHistoryProfile> = {
  RELIANCE, TCS, HDFCBANK, ADANIENT, INFY, BHARTIARTL, IRFC, HAL, ICICIBANK,
};

function buildGenericHistory(ticker: string): StockHistoryProfile {
  const t = ticker.toUpperCase();
  return {
    ticker:t, name:t, sector:"Indian Equity", cap:"Unknown", exchange:"NSE/BSE",
    currentTrend:"Requires live data", currentSentiment:"NEUTRAL",
    oneLiner:`Historical intelligence archive for ${t} is being compiled. The full deep-dive profile covers all major events, narrative evolutions, and institutional positioning history.`,
    timeline:[
      { year:2020, month:"Jan", headline:`${t} — Market Cycle Low`, context:"Generic market cycle event. Connect backend for detailed stock-specific history.", marketReaction:"Market-level movement.", institutionalRead:"No specific institutional data for this ticker in demo mode.", retailSentiment:"Unknown without live data.", longTermImpact:"Long-term impact requires detailed fundamental analysis.", impactScore:55, sentiment:"NEUTRAL", category:"MACRO", institutionalConf:50, retailExcitement:50, ltImportance:55 },
      { year:2022, month:"Jan", headline:`${t} — Post-COVID Recovery Phase`, context:"Part of the broader Indian equity recovery post-COVID. Specific company developments require live backend.", marketReaction:"Broad market driven recovery.", institutionalRead:"Institutional behavior requires delivery data analysis.", retailSentiment:"Retail positioning data unavailable in demo mode.", longTermImpact:"Requires fundamental analysis of business trajectory.", impactScore:58, sentiment:"BULLISH", category:"MACRO", institutionalConf:55, retailExcitement:60, ltImportance:58 },
    ],
    narrativeEvolution:[
      { period:"2019–2021", title:"Pre-COVID Era", description:"Company operating in its sector context.", sentiment:60, dominant:"Sector-specific drivers", color:"#FFD700" },
      { period:"2022–Present", title:"Post-COVID Normalization", description:"Recovery and recalibration phase.", sentiment:65, dominant:"Macro normalization, sector rotation", color:"#00FF9C" },
    ],
    sentimentChart:[
      { year:2019, score:55, label:"Pre-COVID" }, { year:2020, score:40, label:"COVID crash" },
      { year:2021, score:68, label:"Recovery" }, { year:2022, score:60, label:"Normalization" },
      { year:2023, score:58, label:"Stable" }, { year:2024, score:62, label:"Current" },
    ],
    smartMoneyAnalysis:`Smart money analysis for ${t} requires live delivery percentage data, block deal history, and FII/DII holding trend data. Connect the Python backend for full institutional flow intelligence.`,
    macroConnections:`Macro connections for ${t} depend on sector classification, export exposure, commodity sensitivity, and RBI policy transmission. Full analysis requires sector-specific modeling.`,
    latestDevelopments:[
      { headline:`${t} — Latest developments require live news aggregation`, aiRead:"Connect the news intelligence backend for live development tracking for this ticker.", date:"Current", sentiment:"NEUTRAL" },
    ],
    keyRisks:["Sector-specific risks require detailed analysis","Macro risks depend on sector and business model","Management quality requires background research","Balance sheet analysis requires live financial data"],
  };
}

export function getStockHistory(ticker: string): StockHistoryProfile {
  const t = ticker.toUpperCase().trim();
  return HISTORY_DB[t] ?? buildGenericHistory(t);
}

export const HISTORY_QUICK_PICKS = ["RELIANCE","TCS","HDFCBANK","ADANIENT","INFY","BHARTIARTL","IRFC","HAL","ICICIBANK"];
