export interface Tier2Option {
  id: string;
  label: string;
  sub: string;
}

export interface Tier2Question {
  id: string;
  label: string;
  sub: string;
  type: "single" | "multi";
  options: Tier2Option[];
}

// ── Baseline — always shown ──────────────────────────────────────────────────

const Q_PRODUCT_CATEGORY: Tier2Question = {
  id: "product_category",
  label: "Which best describes this product's category?",
  sub: "This helps the research agent target the right data sources and review sites.",
  type: "single",
  options: [
    { id: "b2b_saas", label: "B2B SaaS", sub: "Sold to businesses on subscription — G2, Gartner, enterprise reviews" },
    { id: "b2c", label: "B2C / Consumer app", sub: "Direct to individuals — App Store, Reddit, social sentiment" },
    { id: "dev_tool", label: "Developer tool / API product", sub: "GitHub stats, Hacker News, developer community" },
    { id: "marketplace", label: "Marketplace / two-sided platform", sub: "Supply and demand sides analyzed separately" },
    { id: "ai_native", label: "AI / ML-native product", sub: "Model signals, data flywheel, AI architecture" },
    { id: "infra", label: "Infrastructure / platform (IaaS/PaaS)", sub: "Uptime, API quality, enterprise adoption signals" },
  ],
};

const Q_PRODUCT_MATURITY: Tier2Question = {
  id: "product_maturity",
  label: "What stage of maturity is this product at?",
  sub: "Maturity shapes which signals the crawler prioritizes — early-stage vs established products need different lenses.",
  type: "single",
  options: [
    { id: "early", label: "Early stage / startup", sub: "< 3 years or < Series B — founder interviews, launch posts" },
    { id: "growth", label: "Growth stage (Series B–D)", sub: "Scaling fast — hiring velocity, geographic expansion" },
    { id: "mature", label: "Mature / established (5+ years)", sub: "Financial filings, retention metrics, churn signals" },
    { id: "declining", label: "Declining or in transition", sub: "User complaints, competitor switch mentions" },
    { id: "unknown", label: "Not sure — let the AI figure it out", sub: "Agent infers from funding data and product signals" },
  ],
};

const Q_AUDIENCE: Tier2Question = {
  id: "audience",
  label: "Who will consume this teardown?",
  sub: "The audience shapes tone, depth, and what the agent leads with.",
  type: "single",
  options: [
    { id: "personal", label: "Just me — personal use", sub: "Raw, analytical, no fluff" },
    { id: "team", label: "My immediate team (3–10 people)", sub: "Shared context, common terminology" },
    { id: "leadership", label: "Cross-functional leadership / execs", sub: "Lead with so-what; cut depth for clarity" },
    { id: "investors", label: "Investors or board members", sub: "Heavy on financials, market size, competitive moat" },
    { id: "clients", label: "Clients or external stakeholders", sub: "Professional tone, avoid jargon, include visuals" },
  ],
};

// ── UX Dimension (D7) ────────────────────────────────────────────────────────

const Q_UX_DIMENSIONS: Tier2Question = {
  id: "ux_dimensions",
  label: "Which UX dimensions matter most for this teardown?",
  sub: "Select all that apply — the agent will focus research effort on these specific UX areas.",
  type: "multi",
  options: [
    { id: "onboarding", label: "Onboarding & time-to-value", sub: "How fast do new users reach the 'aha moment'?" },
    { id: "core_journey", label: "Core user journey", sub: "The most-used workflow from entry to value" },
    { id: "friction", label: "Friction & drop-off points", sub: "Where do users get stuck, confused, or quit?" },
    { id: "mobile_desktop", label: "Mobile vs desktop experience", sub: "Is mobile experience at parity with desktop?" },
    { id: "design_system", label: "Design system consistency", sub: "Typography, spacing, color, component consistency" },
    { id: "delight", label: "Delight moments & micro-interactions", sub: "Animations, empty states, error messages" },
  ],
};

const Q_UX_FLOW_FOCUS: Tier2Question = {
  id: "ux_flow_focus",
  label: "What specific product flow do you want the agent to focus on?",
  sub: "Pick the flows most relevant to your research — the agent will surface detailed analysis on each.",
  type: "multi",
  options: [
    { id: "ftue", label: "Signup & first-time user experience (FTUE)", sub: "The first 5 minutes — critical for conversion" },
    { id: "core_loop", label: "Core feature loop — the action users repeat most", sub: "The keystone workflow driving retention" },
    { id: "paywall", label: "Upgrade & paywall mechanics", sub: "How the product converts free to paid" },
    { id: "empty_state", label: "Empty state design", sub: "What new users see before they have data" },
    { id: "search", label: "Search & discovery patterns", sub: "How users find content, features, or people" },
    { id: "notifications", label: "Notification & re-engagement strategy", sub: "Push, email, in-app — frequency and quality" },
  ],
};

const Q_UX_EXPERIENCE: Tier2Question = {
  id: "ux_experience",
  label: "How familiar are you with this product personally?",
  sub: "Your experience level helps the agent weight external data vs your direct context.",
  type: "single",
  options: [
    { id: "never", label: "Never used it", sub: "Full analysis from external sources only" },
    { id: "briefly", label: "Used it briefly — surface impressions", sub: "Agent weights your context + external research" },
    { id: "regular", label: "Regular user — deep personal experience", sub: "Agent incorporates your experience as primary signal" },
    { id: "churned", label: "Former user — I know why I left", sub: "Agent highlights churn drivers prominently" },
  ],
};

// ── Tech Dimension (D8) ──────────────────────────────────────────────────────

const Q_TECH_DEPTH: Tier2Question = {
  id: "tech_depth",
  label: "How technical should the teardown get?",
  sub: "This sets how deep the agent goes into stack, infrastructure, and architecture signals.",
  type: "single",
  options: [
    { id: "non_technical", label: "Non-technical — focus on features & business", sub: "Agent skips stack discussion entirely" },
    { id: "light", label: "Light — mention stack but no deep dive", sub: "Agent notes key tech choices in passing" },
    { id: "standard", label: "Standard — cover stack, integrations & APIs", sub: "Architecture section at medium depth" },
    { id: "deep", label: "Deep — infrastructure, scalability, data strategy", sub: "Database patterns, AI model signals, infra choices" },
  ],
};

const Q_TECH_DIMENSIONS: Tier2Question = {
  id: "tech_dimensions",
  label: "Which technical areas should the agent investigate?",
  sub: "Select all relevant — the agent will surface signals for each checked area.",
  type: "multi",
  options: [
    { id: "stack", label: "Tech stack signals (frontend, backend, infra)", sub: "Job postings, GitHub, BuiltWith signals" },
    { id: "api", label: "API quality & developer experience", sub: "Docs quality, API design, developer community" },
    { id: "integrations", label: "Integration ecosystem & partner APIs", sub: "Zapier, native integrations, webhook support" },
    { id: "data_privacy", label: "Data strategy & privacy practices", sub: "What data is collected, GDPR/CCPA posture" },
    { id: "ai_ml", label: "AI/ML product layer (if applicable)", sub: "Model architecture, training data, flywheel signals" },
    { id: "security", label: "Security posture", sub: "SOC2, ISO certs, breach history, enterprise security" },
  ],
};

export const Q_AI_ROLE: Tier2Question = {
  id: "ai_role",
  label: "How does AI feature in this product?",
  sub: "Classifying the AI role changes how the agent researches the product's technical layer.",
  type: "single",
  options: [
    { id: "ai_core", label: "AI is the core product", sub: "Like Cursor, ChatGPT, Perplexity — AI is the value prop" },
    { id: "ai_feature", label: "AI is a feature layer on a traditional product", sub: "Compares AI features to the non-AI baseline" },
    { id: "ai_backend", label: "AI is used in backend but not user-facing", sub: "Efficiency and automation signals in ops" },
    { id: "no_ai", label: "No meaningful AI component", sub: "Agent skips AI architecture section" },
    { id: "ai_unknown", label: "Not sure — let the agent classify", sub: "Agent determines AI role from product signals" },
  ],
};

// ── Business Model / Revenue (biz) ───────────────────────────────────────────

const Q_BIZ_MODEL_ASPECTS: Tier2Question = {
  id: "biz_model_aspects",
  label: "Which aspects of the business model should be analyzed?",
  sub: "The agent will go deep on each selected area — be specific to get sharper outputs.",
  type: "multi",
  options: [
    { id: "pricing", label: "Pricing model & tier structure", sub: "Freemium, per-seat, usage-based, enterprise custom" },
    { id: "revenue_streams", label: "Revenue streams & diversification", sub: "Primary revenue + secondary (services, marketplace, data)" },
    { id: "unit_econ", label: "Unit economics signals", sub: "CAC payback, LTV:CAC ratio, gross margin estimates" },
    { id: "freemium", label: "Freemium-to-paid conversion mechanics", sub: "What triggers the upgrade? What is the paywall strategy?" },
    { id: "enterprise_plg", label: "Enterprise vs SMB vs PLG motion", sub: "Sales-led vs product-led growth signals" },
    { id: "public_data", label: "Public financial data (if available)", sub: "10-K/10-Q filings, Crunchbase, public revenue disclosures" },
  ],
};

const Q_FINANCIAL_METRIC: Tier2Question = {
  id: "financial_metric",
  label: "Which financial metric matters most to your research?",
  sub: "The agent will prioritize surfacing signals and estimates for this metric.",
  type: "single",
  options: [
    { id: "arr_mrr", label: "ARR / MRR growth rate", sub: "Revenue growth signals and estimates" },
    { id: "nrr", label: "Net Revenue Retention (NRR / NDR)", sub: "Expansion revenue signals, upsell patterns" },
    { id: "cac", label: "Customer Acquisition Cost (CAC) payback", sub: "Inferred from go-to-market motion and pricing" },
    { id: "gross_margin", label: "Gross margin profile", sub: "R&D vs COGS signals, SaaS margin benchmarks" },
    { id: "valuation", label: "Valuation & multiples", sub: "Last known valuation vs revenue estimates" },
    { id: "skip_financial", label: "Skip financials — not relevant", sub: "Agent deprioritizes financial analysis" },
  ],
};

// ── GTM / Growth (gtm) ───────────────────────────────────────────────────────

const Q_GTM_AREAS: Tier2Question = {
  id: "gtm_areas",
  label: "Which GTM and growth areas should the agent cover?",
  sub: "Select all growth angles you want investigated — the agent will surface signals for each.",
  type: "multi",
  options: [
    { id: "acquisition", label: "Primary acquisition channels", sub: "Paid, organic, referral, viral — ad spend & SEO signals" },
    { id: "plg_mechanics", label: "Product-led growth (PLG) mechanics", sub: "Free tier strategy, in-product virality, sharing loops" },
    { id: "slg_signals", label: "Sales-led growth (SLG) signals", sub: "Enterprise sales motion, SDR/AE hiring, outbound" },
    { id: "content_seo", label: "Content & SEO strategy", sub: "Blog volume, domain authority, keyword ownership" },
    { id: "community_growth", label: "Community-led growth", sub: "Slack/Discord, ambassador programs, user-generated content" },
    { id: "geo_expansion", label: "Geographic expansion signals", sub: "Which markets launched when, localization depth" },
  ],
};

const Q_GROWTH_MOTION: Tier2Question = {
  id: "growth_motion",
  label: "What type of growth motion does this product primarily use?",
  sub: "Your best guess — or let the agent classify from signals.",
  type: "single",
  options: [
    { id: "plg", label: "Product-led growth — product sells itself", sub: "Figma, Notion, Slack style — free tier → viral → upgrade" },
    { id: "slg", label: "Sales-led growth — human-driven sales cycle", sub: "Enterprise AEs, SDRs, demo-driven" },
    { id: "community_led", label: "Community-led growth", sub: "Users evangelize, ambassador programs, UGC" },
    { id: "marketing_led", label: "Marketing-led growth", sub: "Ads and content dominate — SEO, paid social" },
    { id: "partnership_led", label: "Partnership-led growth", sub: "Distribution via partners, integration marketplace" },
    { id: "gtm_unknown", label: "Not sure — let the agent classify", sub: "Agent determines from hiring, spending, and product signals" },
  ],
};

// ── Community (comm) ─────────────────────────────────────────────────────────

const Q_USER_SEGMENT: Tier2Question = {
  id: "user_segment",
  label: "Which user segment should the teardown focus on?",
  sub: "Defines whose perspective the agent adopts when evaluating UX, value, and friction.",
  type: "single",
  options: [
    { id: "end_user", label: "The primary end user (uses it daily)", sub: "UX flows, feature utility, friction points" },
    { id: "buyer", label: "The economic buyer (pays / approves purchase)", sub: "ROI signals, pricing, business case" },
    { id: "admin", label: "The admin / IT buyer", sub: "Onboarding, security, integrations" },
    { id: "all_segments", label: "All segments equally", sub: "Agent covers each segment separately" },
  ],
};

const Q_COMMUNITY_HEALTH: Tier2Question = {
  id: "community_health",
  label: "What do you want to learn about the user community & ecosystem?",
  sub: "Select areas to investigate — the agent will surface community signals from forums, social, and reviews.",
  type: "multi",
  options: [
    { id: "satisfaction", label: "User satisfaction & NPS signals", sub: "Review sentiment, support ticket themes" },
    { id: "retention", label: "Retention patterns & habit formation", sub: "What keeps users coming back?" },
    { id: "power_vs_casual", label: "Power user vs casual user differences", sub: "Feature depth vs breadth usage" },
    { id: "social_presence", label: "Social media following & engagement", sub: "Twitter/X, LinkedIn, YouTube metrics" },
    { id: "dev_ecosystem", label: "Developer ecosystem & marketplace", sub: "Third-party integrations, plugin ecosystem size" },
    { id: "ugc", label: "User-generated content & templates", sub: "Community-built content as a growth and retention driver" },
  ],
};

// ── Financials (fin) ─────────────────────────────────────────────────────────

const Q_METRICS_TO_SURFACE: Tier2Question = {
  id: "metrics_to_surface",
  label: "Which quantitative metrics should the agent prioritize finding?",
  sub: "Select all signals you want surfaced — the agent will dedicate crawl effort to each.",
  type: "multi",
  options: [
    { id: "dau_mau", label: "DAU / MAU & engagement rates", sub: "Active user volume and stickiness ratio" },
    { id: "revenue_arr", label: "Revenue / ARR / MRR estimates", sub: "Direct or estimated from pricing × customer count" },
    { id: "user_growth", label: "User growth rate (QoQ or YoY)", sub: "Signals about acceleration or deceleration" },
    { id: "app_store", label: "App store rating & review count", sub: "Rating trend over time + volume" },
    { id: "churn", label: "Churn / retention rate signals", sub: "Reddit complaints, 'why I left' posts, support patterns" },
    { id: "headcount", label: "Headcount & hiring velocity", sub: "LinkedIn employee count trend, open roles" },
    { id: "organic_traffic", label: "Organic search traffic estimates", sub: "SimilarWeb / Ahrefs DR, keyword rankings" },
  ],
};

export const Q_DATA_PRESENTATION: Tier2Question = {
  id: "data_presentation",
  label: "How should quantitative data be presented in the output?",
  sub: "Sets the format the Document Agent uses when incorporating numbers into the research doc.",
  type: "single",
  options: [
    { id: "inline", label: "Inline in text with source citations", sub: "Numbers woven into the narrative with footnotes" },
    { id: "section_table", label: "Summary table at end of each section", sub: "Each section ends with a metrics box" },
    { id: "dashboard", label: "Dedicated metrics dashboard section", sub: "One section collects all numeric findings" },
    { id: "pptx_only", label: "Charts in the PowerPoint only", sub: "Data in PDF as text; charts go into PPTX" },
  ],
};

// ── Competitive (goal: competitive) ─────────────────────────────────────────

const Q_COMPETITOR_SCOPE: Tier2Question = {
  id: "competitor_scope",
  label: "How should competitors be included in this teardown?",
  sub: "The agent will structure its competitive research based on your preference here.",
  type: "single",
  options: [
    { id: "auto_top3", label: "Auto-identify top 3 competitors and compare", sub: "Agent determines rivals from market signals" },
    { id: "light_matrix", label: "Light comparison — a brief feature matrix only", sub: "Side-by-side table without deep analysis" },
    { id: "adjacent", label: "Adjacent / indirect competitors only", sub: "Looks outside the direct category for inspiration" },
    { id: "no_comp", label: "No competitors — focus only on this product", sub: "Agent skips competitive analysis entirely" },
  ],
};

const Q_COMPETITIVE_DIMENSIONS: Tier2Question = {
  id: "competitive_dimensions",
  label: "What should the competitive comparison cover?",
  sub: "Select all dimensions you want compared across rivals.",
  type: "multi",
  options: [
    { id: "feature_parity", label: "Feature parity matrix", sub: "What each product has or lacks — side-by-side" },
    { id: "pricing_comp", label: "Pricing comparison — tier-by-tier", sub: "Price per seat/usage compared across rivals" },
    { id: "sentiment_delta", label: "User sentiment delta", sub: "Who has happier users? Review score comparison" },
    { id: "gtm_diff", label: "GTM strategy differences", sub: "PLG vs SLG vs community — how each goes to market" },
    { id: "funding_comp", label: "Funding & financial strength", sub: "Who is better capitalized? Who has runway?" },
    { id: "switching_cost", label: "Switching costs & lock-in analysis", sub: "How hard is it to leave each product?" },
  ],
};

// ── Strategic Layer (all goals) ──────────────────────────────────────────────

const Q_STRATEGIC_FRAMEWORKS: Tier2Question = {
  id: "strategic_frameworks",
  label: "Which strategic frameworks should the agent apply?",
  sub: "Select all frameworks to include — the Document Agent will structure findings through each lens.",
  type: "multi",
  options: [
    { id: "swot", label: "SWOT analysis", sub: "Strengths, Weaknesses, Opportunities, Threats" },
    { id: "five_forces", label: "Porter's Five Forces", sub: "Industry-level competitive pressure analysis" },
    { id: "jtbd", label: "Jobs-to-be-Done (JTBD)", sub: "What core job does this product do for users?" },
    { id: "pmf", label: "Product-Market Fit signals", sub: "Retention, NPS, usage frequency as PMF proxies" },
    { id: "growth_loop", label: "Growth loop mapping", sub: "Input → output → reinvestment compounding engine" },
    { id: "north_star", label: "North Star Metric hypothesis", sub: "What single metric does the team optimize?" },
  ],
};

const Q_KEY_STRATEGIC_QUESTION: Tier2Question = {
  id: "key_strategic_question",
  label: "What is the single most important strategic question you want answered?",
  sub: "The Document Agent will orient the executive summary and strategic section around this question.",
  type: "single",
  options: [
    { id: "why_succeeded", label: "Why has this product succeeded where others failed?", sub: "Root-cause success analysis" },
    { id: "biggest_risk", label: "What is this product's biggest strategic risk?", sub: "Threat mapping and vulnerability assessment" },
    { id: "build_next", label: "What should this product build next to stay ahead?", sub: "Roadmap prediction and opportunity mapping" },
    { id: "compete_with", label: "Is this a good product to build against / compete with?", sub: "Competitive moat and attack surface analysis" },
    { id: "invest", label: "Is this a good investment opportunity?", sub: "Business fundamentals and growth trajectory" },
    { id: "learn_from", label: "What can I learn / steal from this product?", sub: "Best-practice extraction and adaptation" },
  ],
};

const Q_RECOMMENDATIONS: Tier2Question = {
  id: "recommendations",
  label: "Should the teardown include actionable recommendations?",
  sub: "Sets the editorial voice of the Document Agent — analysis-only vs prescriptive suggestions.",
  type: "single",
  options: [
    { id: "specific_recs", label: "Yes — specific, prioritized improvement suggestions", sub: "Agent adds 'What I would do differently' section" },
    { id: "pm_voice", label: "Yes — frame as 'if I were the PM'", sub: "Agent writes in first-person PM voice" },
    { id: "analysis_only", label: "Analysis only — no prescriptive recommendations", sub: "Agent stays observational, no editorializing" },
    { id: "both", label: "Both: analysis + a separate recommendations section", sub: "Agent splits into two distinct sections" },
  ],
};

// ── Question Selection Logic ──────────────────────────────────────────────────

interface Tier1Answers {
  dimensions: string[];
  goal: string;
  depth: string;
}

export function selectTier2Questions(tier1: Tier1Answers): Tier2Question[] {
  const { dimensions, goal } = tier1;
  const selected: Tier2Question[] = [];
  const seen = new Set<string>();

  function add(q: Tier2Question) {
    if (!seen.has(q.id)) {
      seen.add(q.id);
      selected.push(q);
    }
  }

  // ── Baseline (always first 3) ──────────────────────────────────────────────
  add(Q_PRODUCT_CATEGORY);
  add(Q_PRODUCT_MATURITY);
  add(Q_AUDIENCE);

  // ── Dimension-specific questions (up to 2 per selected dimension) ──────────
  const dimensionMap: Record<string, Tier2Question[]> = {
    ux:   [Q_UX_DIMENSIONS, Q_UX_FLOW_FOCUS],
    tech: [Q_TECH_DEPTH, Q_TECH_DIMENSIONS],
    biz:  [Q_BIZ_MODEL_ASPECTS, Q_FINANCIAL_METRIC],
    gtm:  [Q_GTM_AREAS, Q_GROWTH_MOTION],
    comm: [Q_USER_SEGMENT, Q_COMMUNITY_HEALTH],
    fin:  [Q_METRICS_TO_SURFACE, Q_FINANCIAL_METRIC],
  };

  // Priority order: add first question from each dimension, then second pass
  for (const dim of dimensions) {
    const pool = dimensionMap[dim] ?? [];
    if (pool[0]) add(pool[0]);
  }
  for (const dim of dimensions) {
    const pool = dimensionMap[dim] ?? [];
    if (pool[1]) add(pool[1]);
  }

  // ── Goal-specific questions ────────────────────────────────────────────────
  const goalMap: Record<string, Tier2Question[]> = {
    competitive: [Q_COMPETITOR_SCOPE, Q_COMPETITIVE_DIMENSIONS, Q_KEY_STRATEGIC_QUESTION],
    investor:    [Q_METRICS_TO_SURFACE, Q_KEY_STRATEGIC_QUESTION, Q_STRATEGIC_FRAMEWORKS],
    learning:    [Q_STRATEGIC_FRAMEWORKS, Q_UX_EXPERIENCE, Q_RECOMMENDATIONS],
    curiosity:   [Q_KEY_STRATEGIC_QUESTION, Q_UX_EXPERIENCE, Q_RECOMMENDATIONS],
  };

  for (const q of goalMap[goal] ?? []) {
    add(q);
  }

  // ── Always end with recommendations if not already included ───────────────
  add(Q_RECOMMENDATIONS);

  // Return exactly 10 questions
  return selected.slice(0, 10);
}
