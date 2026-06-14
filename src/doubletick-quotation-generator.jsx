import { useState, useRef, useEffect, useMemo } from "react";

const DOUBLETICK_LOGO = "/dt logo.jpg";
const SHIVAM_SIG = "/Shivam Sign.jpg";

// ─── ENTERPRISE FEATURE GATING ────────────────────────────────────────────────
// ─── ENTERPRISE FEATURE GATING ────────────────────────────────────────────────
// Each feature has its own unlock condition based on monthly equivalent AND
// raw billing amount (for quarterly-specific thresholds).
//
// Feature unlock rules:
//   CAPI Support         → monthly equiv ₹10k–12k  (free add-on in that range)
//   Frictionless msg     → monthly equiv ₹10k–12k  OR  quarterly raw ≥ ₹30k
//   SLA Breached alerts  → monthly equiv ₹10k–12k  OR  quarterly raw ₹20k–30k
//   Enterprise Analytics → monthly equiv ₹15k–20k  OR  yearly raw with min ₹5k/mo equiv

const ENTERPRISE_BASE_FEATURES = [
  "Team inbox (scalable agents)",
  "Roles & permissions",
  "Number masking",
  "Automated ordering bot",
  "3rd party integrations",
  "Developer API",
  "Agent & Organization Analytics",
  "Reports",
  "Send bulk broadcasts",
  "Bulk import",
  "CTWA Integration",
  "Define customer segments",
  "Share products and catalogs",
  "Detailed broadcast analytics",
  "Excel export and import",
  "Google Sheets integration",
  "50 custom attributes",
  "Unlimited tags",
  "5 WhatsApp Groups included",
  "WhatsApp group with key company persons",
  "Complex journeys",
];

function getEnterpriseMonthlyEquivalent(customPrice, billing) {
  const raw = parseInt(String(customPrice).replace(/[^0-9]/g, ""), 10) || 0;
  if (billing === "monthly") return raw;
  if (billing === "quarterly") return Math.round(raw / 3);
  if (billing === "halfYearly") return Math.round(raw / 6);
  if (billing === "yearly") return Math.round(raw / 12);
  return raw;
}

// Returns {capi, frictionless, sla, analytics} — boolean for each feature
// Logic (no upper bounds — a higher plan always retains lower-tier features):
//   CAPI Support        → monthly equiv ≥ ₹10k
//   Frictionless        → monthly equiv ≥ ₹10k  OR  quarterly raw ≥ ₹30k
//   SLA Breached Alerts → monthly equiv ≥ ₹10k  OR  quarterly raw ≥ ₹20k
//   Enterprise Analytics→ monthly equiv ≥ ₹15k  OR  yearly raw ≥ ₹5k/mo equiv
function getEnterpriseEligibility(customPrice, billing) {
  const raw = parseInt(String(customPrice).replace(/[^0-9]/g, ""), 10) || 0;
  const monthly = getEnterpriseMonthlyEquivalent(customPrice, billing);
  const isQuarterly = billing === "quarterly";
  const isYearly = billing === "yearly";

  // CAPI Support: monthly equiv ≥ ₹10k
  const capi = monthly >= 10000;

  // Frictionless messaging: monthly equiv ≥ ₹10k  OR  quarterly raw ≥ ₹30k
  const frictionless = monthly >= 10000 || (isQuarterly && raw >= 30000);

  // SLA Breached alerts: monthly equiv ≥ ₹10k  OR  quarterly raw ≥ ₹20k
  const sla = monthly >= 10000 || (isQuarterly && raw >= 20000);

  // Enterprise Analytics: monthly equiv ≥ ₹15k  OR  yearly raw ≥ ₹5k/mo equiv
  const analytics = monthly >= 15000 || (isYearly && monthly >= 5000);

  return { capi, frictionless, sla, analytics };
}

function getEnterpriseFeatures(customPrice, billing) {
  const { capi, frictionless, sla, analytics } = getEnterpriseEligibility(customPrice, billing);
  const features = [...ENTERPRISE_BASE_FEATURES];
  if (capi) features.push("CAPI Support");
  if (frictionless) features.push("Frictionless messaging");
  if (sla) features.push("SLA Breached alerts");
  if (analytics) features.push("Enterprise Analytics");
  return features;
}

// ─── PLANS ────────────────────────────────────────────────────────────────────
const PLANS = {
  standard: {
    name: "Starter",
    subtitle: "Bulk Messaging + Google Sheets",
    monthly: 6840, quarterly: 15480, halfYearly: 30960, yearly: 36000,
    monthlyNote: "Requires management approval",
    features: ["Team inbox (5 agents free)", "Send bulk broadcasts", "Bulk import", "Define customer segments", "Share products and catalogues", "Detailed broadcast analytics", "Excel export and import", "Google Sheets integration", "Access on mobile and web", "Unlimited tags", "10 custom attributes"],
  },
  pro: {
    name: "Pro",
    subtitle: "Bulk Messaging + Chatbots + Integrations",
    monthly: 9960, quarterly: 21600, halfYearly: 43200, yearly: 50400,
    monthlyNote: "Requires management approval",
    features: ["Everything in Starter plan", "Team inbox (10 agents free)", "Roles & permissions", "Number masking", "Automated ordering bot", "3rd party integrations", "Developer API", "Agent & Organisation Analytics", "Reports", "30 custom attributes", "5 WhatsApp Groups included"],
  },
  enterprise: {
    name: "Enterprise",
    subtitle: "Full Suite — Custom Pricing",
    monthly: null, quarterly: null, halfYearly: null, yearly: null,
    features: [],
  },
};

// Plan-specific add-on catalog
// Each item: { id, label, desc, plans: ["pro","enterprise","standard"], monthly, quarterly, halfYearly, yearly, perUnit, unitLabel, unavailableIn: [] }
const ADDON_CATALOG = [
  // ── PLATFORM FEATURES ──────────────────────────────────────────────────────
  {
    id: "capi_support",
    group: "Platform Features",
    label: "CAPI Support",
    desc: "Assistance in setting up Meta Conversion API for tracking and attribution.",
    plans: ["pro"],
    monthly: 1800, quarterly: 5400, halfYearly: null, yearly: 21600,
    perUnit: false,
  },
  {
    id: "frictionless",
    group: "Platform Features",
    label: "Frictionless Messaging",
    desc: "Send messages beyond WhatsApp's 24-hour window using approved templates.",
    plans: ["pro"],
    monthly: 3600, quarterly: 10800, halfYearly: null, yearly: 36000,
    perUnit: false,
  },
  {
    id: "sla",
    group: "Platform Features",
    label: "SLA",
    desc: "Track response and resolution time to ensure timely support.",
    plans: ["pro"],
    monthly: 1800, quarterly: 5400, halfYearly: null, yearly: 21600,
    perUnit: false,
  },
  {
    id: "whatsapp_flows",
    group: "Platform Features",
    label: "WhatsApp Flows",
    desc: "Create native WhatsApp forms to capture structured customer data.",
    plans: ["pro"],
    monthly: 600, quarterly: 1800, halfYearly: null, yearly: 8496,
    perUnit: false,
  },
  {
    id: "instagram_dm",
    group: "Platform Features",
    label: "Instagram DM Integration",
    desc: "Manage Instagram DMs alongside WhatsApp in a unified inbox. Supports media sharing and real-time replies.",
    plans: ["pro", "enterprise", "standard"],
    monthly: 2400, quarterly: 7200, halfYearly: 14400, yearly: 28800,
    perUnit: false,
    isInstagram: true,
  },
  {
    id: "wa_calling",
    group: "Platform Features",
    label: "WhatsApp Calling",
    desc: "Incoming WhatsApp calls with automatic recording, call logs, and multi-call handling — all within WhatsApp. Calling cost: doubletick.io/conversation-cost",
    plans: ["pro", "enterprise"],
    monthly: 3600, quarterly: 10800, halfYearly: 21600, yearly: 43200,
    perUnit: false,
  },
  // ── USERS & NUMBERS ────────────────────────────────────────────────────────
  {
    id: "additional_channels",
    group: "Users & Numbers",
    label: "Additional Channels",
    desc: "Add more WhatsApp numbers (WABAs) for multiple teams or use cases.",
    plans: ["pro", "enterprise", "standard"],
    // Pro: monthly 3000, quarterly 8400, yearly NOT available
    // Enterprise: monthly 3000, quarterly 8400, halfYearly 16800, yearly 28800
    monthly: 3000, quarterly: 8400, halfYearly: 16800, yearly: 28800,
    unavailableIn: { pro: ["yearly"], standard: ["yearly"] },
    perUnit: true, unitLabel: "WABA",
  },
  {
    id: "additional_seats",
    group: "Users & Numbers",
    label: "Additional User Seats",
    desc: "Add more agents with access to inbox and automation.",
    plans: ["pro", "enterprise", "standard"],
    // Pro pricing (different from enterprise)
    proMonthly: 720, proQuarterly: 2160, proHalfYearly: null, proYearly: 8640,
    // Enterprise pricing
    monthly: 960, quarterly: 3840, halfYearly: 7680, yearly: 11520,
    perUnit: true, unitLabel: "agent",
  },
  {
    id: "calling_license",
    group: "Users & Numbers",
    label: "Calling License",
    desc: "Enable WhatsApp calling for agents. Usage charged separately.",
    plans: ["pro", "enterprise", "standard"],
    monthly: 600, quarterly: 1800, halfYearly: 3600, yearly: 7200,
    perUnit: true, unitLabel: "license",
  },
  {
    id: "whatsapp_groups",
    group: "Users & Numbers",
    label: "WhatsApp Groups",
    desc: "Create and manage customer groups for engagement and updates.",
    plans: ["pro", "enterprise", "standard"],
    monthly: 60, quarterly: 180, halfYearly: 360, yearly: 720,
    perUnit: true, unitLabel: "group",
  },
  // ── INTEGRATIONS ───────────────────────────────────────────────────────────
  {
    id: "zoho_crm",
    group: "Integrations",
    label: "Zoho CRM Integration",
    desc: "Sync leads, contacts, and deals between DoubleTick and Zoho CRM.",
    plans: ["pro", "enterprise", "standard"],
    monthly: null, quarterly: 5000, halfYearly: null, yearly: 20000,
    iframeYearly: 25000,
    perUnit: false,
  },
  {
    id: "hubspot",
    group: "Integrations",
    label: "HubSpot Integration",
    desc: "Connect HubSpot contacts and deal pipelines with WhatsApp conversations.",
    plans: ["pro", "enterprise", "standard"],
    monthly: null, quarterly: 5000, halfYearly: null, yearly: 18000,
    perUnit: false,
  },
  {
    id: "indiamart",
    group: "Integrations",
    label: "IndiaMart Integration",
    desc: "Automatically capture and respond to IndiaMart leads via WhatsApp.",
    plans: ["pro", "enterprise", "standard"],
    monthly: null, quarterly: 5000, halfYearly: null, yearly: 18000,
    perUnit: false,
  },
  {
    id: "leadsquared",
    group: "Integrations",
    label: "LeadSquared Integration",
    desc: "Sync leads from LeadSquared and trigger WhatsApp workflows automatically.",
    plans: ["pro", "enterprise", "standard"],
    monthly: null, quarterly: 5000, halfYearly: null, yearly: 18000,
    iframeYearly: 25000,
    perUnit: false,
  },
  {
    id: "bitrix",
    group: "Integrations",
    label: "Bitrix Integration",
    desc: "Connect Bitrix24 CRM tasks and contacts with DoubleTick conversations.",
    plans: ["pro", "enterprise", "standard"],
    monthly: null, quarterly: 5000, halfYearly: null, yearly: 18000,
    perUnit: false,
  },
  {
    id: "salesforce",
    group: "Integrations",
    label: "Salesforce Integration",
    desc: "Bi-directional sync between Salesforce CRM and WhatsApp conversations.",
    plans: ["pro", "enterprise", "standard"],
    monthly: null, quarterly: 12500, halfYearly: null, yearly: 50000,
    iframeYearly: 90000,
    perUnit: false,
  },
  {
    id: "shopify",
    group: "Integrations",
    label: "Shopify Integration",
    desc: "Connect your Shopify store to send order updates and support via WhatsApp.",
    plans: ["pro", "enterprise", "standard"],
    monthly: 1000, quarterly: 3000, halfYearly: 6000, yearly: 12000,
    perUnit: false,
  },
  {
    id: "woocommerce",
    group: "Integrations",
    label: "WooCommerce Integration",
    desc: "Sync WooCommerce orders and trigger automated WhatsApp notifications.",
    plans: ["pro", "enterprise", "standard"],
    monthly: null, quarterly: null, halfYearly: null, yearly: 18000,
    perUnit: false,
  },
  // ── PLATFORM EXTRAS ────────────────────────────────────────────────────────
  {
    id: "ai_chatbots",
    group: "Platform Extras",
    label: "AI Chat Bots (ChatGPT-Based)",
    desc: "Deploy AI-powered chatbots for automated customer conversations. Requires ChatGPT Plus subscription.",
    plans: ["pro", "enterprise", "standard"],
    monthly: 15000, quarterly: 45000, halfYearly: null, yearly: 180000,
    perUnit: false,
  },
  {
    id: "key_account",
    group: "Platform Extras",
    label: "Key Account Manager",
    desc: "Dedicated KAM for strategic guidance, relationship management, and business reviews.",
    plans: ["pro", "enterprise", "standard"],
    monthly: 10000, quarterly: 30000, halfYearly: null, yearly: 120000,
    perUnit: false,
  },
  {
    id: "managerial",
    group: "Platform Extras",
    label: "Managerial Services",
    desc: "Complete account management — our team handles day-to-day operations on your behalf.",
    plans: ["pro", "enterprise", "standard"],
    monthly: 35000, quarterly: 105000, halfYearly: null, yearly: 420000,
    perUnit: false,
  },
  {
    id: "ai_filtered",
    group: "Platform Extras",
    label: "AI Filtered Awaiting Reply",
    desc: "AI prioritises chats needing agent attention, reducing inbox noise significantly.",
    plans: ["pro", "enterprise", "standard"],
    monthly: 5000, quarterly: 15000, halfYearly: null, yearly: 60000,
    perUnit: false,
  },
  {
    id: "collaborators",
    group: "Platform Extras",
    label: "Collaborators",
    desc: "Add external collaborators with limited access to specific conversations or projects.",
    plans: ["pro", "enterprise", "standard"],
    monthly: 7000, quarterly: 21000, halfYearly: null, yearly: 84000,
    perUnit: false,
  },
  // ── ONE-TIME & USAGE ────────────────────────────────────────────────────────
  {
    id: "bot_building",
    group: "One-Time & Usage",
    label: "Bot Building (up to 15 components)",
    desc: "Custom chatbot design and build — up to 15 conversation components.",
    plans: ["pro", "enterprise", "standard"],
    monthly: null, quarterly: null, halfYearly: null, yearly: null,
    custom: "₹20,000 one-time",
    perUnit: false,
  },
  {
    id: "bluetick",
    group: "One-Time & Usage",
    label: "BlueTick Verified Badge",
    desc: "Official Meta WhatsApp green tick verification for your business number.",
    plans: ["pro", "enterprise", "standard"],
    monthly: null, quarterly: null, halfYearly: null, yearly: null,
    custom: "₹40,000 one-time",
    perUnit: false,
  },
  {
    id: "magic_text",
    group: "One-Time & Usage",
    label: "Magic Text Wand (AI Reply / Text Assist)",
    desc: "AI suggests replies and improves agent messages in real time.",
    plans: ["pro", "enterprise", "standard"],
    monthly: null, quarterly: null, halfYearly: null, yearly: null,
    custom: "₹1 / daily active chat",
    perUnit: false,
  },
  {
    id: "ai_summary",
    group: "One-Time & Usage",
    label: "AI Summary",
    desc: "Automatically summarises long chat threads so agents catch up instantly.",
    plans: ["pro", "enterprise", "standard"],
    monthly: null, quarterly: null, halfYearly: null, yearly: null,
    custom: "₹2 / daily summary",
    perUnit: false,
  },
  // ── CALLING INFRASTRUCTURE ─────────────────────────────────────────────────
  {
    id: "pstn",
    group: "Calling Infrastructure",
    label: "PSTN Click-to-Call",
    desc: "Full outbound calling suite with recordings, transcripts, AI summaries, and agent analytics. Powered by DoubleTick + Tata Tele SIP channels. Tata Tele charges (₹700/channel/month) paid directly to TTBS.",
    plans: ["pro", "enterprise"],
    monthly: null, quarterly: null, halfYearly: null, yearly: null,
    custom: "Per-channel pricing",
    perChannel: true,
    dtFeePerChannelPerMonth: 150,
    aiCallingFeePerMin: 5,
    callingRatePerMin: 0.40,
    ttbsFeePerChannelPerMonth: 700,
    perUnit: false,
  },
];

// Derive flat addon list for a given plan + billing
function getAddonsForPlan(plan, billing) {
  return ADDON_CATALOG.filter(a => a.plans.includes(plan)).filter(a => {
    const unavail = a.unavailableIn?.[plan];
    return !unavail || !unavail.includes(billing);
  });
}

function getAddonUnitPrice(a, plan, billing) {
  if (a.custom) return null;
  // Seats have plan-specific pricing for pro
  if (a.id === "additional_seats" && plan === "pro") {
    if (billing === "monthly") return a.proMonthly ?? null;
    if (billing === "quarterly") return a.proQuarterly ?? null;
    if (billing === "halfYearly") return a.proHalfYearly ?? null;
    if (billing === "yearly") return a.proYearly ?? null;
    return null;
  }
  if (billing === "monthly") return a.monthly ?? null;
  if (billing === "quarterly") return a.quarterly ?? null;
  if (billing === "halfYearly") return a.halfYearly ?? null;
  if (billing === "yearly") return a.yearly ?? null;
  return null;
}

const BILLING_LABELS = {
  monthly: "per month",
  quarterly: "per 3 months",
  halfYearly: "per 6 months",
  yearly: "per year",
};

const BILLING_SHORT = {
  monthly: "mo",
  quarterly: "qtr",
  halfYearly: "6mo",
  yearly: "yr",
};


const fmtINR = n => new Intl.NumberFormat("en-IN").format(n);

const T = {
  bg: "#0b1015", surface: "#111820", surfaceHigh: "#16202b",
  border: "#1c2836", borderMed: "#243242",
  green: "#17a066", greenDk: "#0d7a4e", greenLt: "#21c47a",
  text: "#e4eaf0", textSub: "#6d8497", textMuted: "#3d5264",
  white: "#fff",
  pGreen: "#0b5235", pGreenMid: "#0e7048", pAccent: "#1aad74",
};

const baseInput = {
  width: "100%", padding: "11px 15px", background: "#0d1520",
  border: `1.5px solid #1c2836`, borderRadius: 8, color: "#e4eaf0",
  fontSize: 14, outline: "none", fontFamily: "inherit",
  boxSizing: "border-box", lineHeight: 1.5,
};

// ─── GROQ AI SCOPE GENERATOR ──────────────────────────────────────────────────
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// ─── COMPANY AUTO-FILL ────────────────────────────────────────────────────────
async function autoFillCompanyWithGroq(companyName) {
  const prompt = `You are a B2B sales research assistant. Given a company name, provide structured context for a WhatsApp CRM sales quotation.

Company: ${companyName}

Respond ONLY with valid JSON — no markdown, no backticks, no explanation:
{
  "industry": "e.g. E-commerce / Jewellery / Logistics / Real Estate / EdTech",
  "companySize": "e.g. 50-200 employees",
  "primaryUseCase": "one sentence about their likely WhatsApp use case",
  "scopeSuggestion": "3-4 lines of pre-filled scope of work in plain text, section headers ending with colon, one item per line. e.g.\nFor Sales:\nManage customer queries via WhatsApp\nFor Support:\nAutomate order status updates",
  "keyPainPoints": "one sentence about what they likely struggle with"
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.4, max_tokens: 400 }),
  });
  if (!res.ok) throw new Error("Groq error");
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "{}";
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return null; }
}

// ─── QUOTE LOG ────────────────────────────────────────────────────────────────
const QUOTE_LOG_KEY = "dt_quote_log";
function loadQuoteLog() {
  try { return JSON.parse(localStorage.getItem(QUOTE_LOG_KEY) || "[]"); } catch { return []; }
}
function saveQuoteEntry(entry) {
  try {
    const log = loadQuoteLog();
    const existing = log.find(q => q.qid === entry.qid);
    // Preserve status/closedAt/lostReason if already set
    const merged = { status: "pending", closedAt: null, lostReason: "", ...existing, ...entry };
    const updated = [merged, ...log.filter(q => q.qid !== entry.qid)].slice(0, 100);
    localStorage.setItem(QUOTE_LOG_KEY, JSON.stringify(updated));
  } catch {}
}

function updateQuoteStatus(qid, status, lostReason = "") {
  try {
    const log = loadQuoteLog();
    const updated = log.map(q => q.qid === qid
      ? { ...q, status, lostReason, closedAt: status !== "pending" ? Date.now() : null }
      : q
    );
    localStorage.setItem(QUOTE_LOG_KEY, JSON.stringify(updated));
  } catch {}
}

function deleteQuoteEntry(qid) {
  try {
    const log = loadQuoteLog();
    localStorage.setItem(QUOTE_LOG_KEY, JSON.stringify(log.filter(q => q.qid !== qid)));
  } catch {}
}

function updateQuoteField(qid, fields) {
  try {
    const log = loadQuoteLog();
    const updated = log.map(q => q.qid === qid ? { ...q, ...fields } : q);
    localStorage.setItem(QUOTE_LOG_KEY, JSON.stringify(updated));
  } catch {}
}

const SETTINGS_KEY = "dt_rep_settings";
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; }
}
function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

// ─── DRAFT AUTO-SAVE ──────────────────────────────────────────────────────────
const DRAFT_KEY = "dt_quotation_draft";
function saveDraft(data) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, _savedAt: Date.now() })); } catch {} }
function loadDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; } }
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} }

// ─── QUOTATION REFERENCE ID ────────────────────────────────────────────────────
function generateQID() {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `DT-${year}-${num}`;
}

// ─── NAVY PDF THEME ────────────────────────────────────────────────────────────
const THEMES = {
  green: {
    headerBg: "linear-gradient(135deg, #0b5235 0%, #0e7048 100%)",
    headerSolid: "#0b5235",
    headerMid: "#0e7048",
    accent: "#1aad74",
    accentLight: "#d1fae5",
    subHeaderBg: "#edfbf3",
    subHeaderBorder: "#a7f0c8",
    subHeaderText: "#5aac88",
    footerBg: "#f4f7f5",
    footerBorder: "#1aad74",
    rowEven: "#f9fefe",
    tableDivider: "#e8f8f0",
    tableHeaderBg: "linear-gradient(135deg, #0b5235, #1aad74)",
    catBorder: "#d1fae5",
    sectionBorder: "#a7f0c8",
    sectionTitle: "#0b5235",
    checkColor: "#1aad74",
  },
  navy: {
    headerBg: "linear-gradient(135deg, #0f1f3d 0%, #1a3360 100%)",
    headerSolid: "#0f1f3d",
    headerMid: "#1a3360",
    accent: "#3b82f6",
    accentLight: "#dbeafe",
    subHeaderBg: "#eff6ff",
    subHeaderBorder: "#bfdbfe",
    subHeaderText: "#3b6dbd",
    footerBg: "#f0f4ff",
    footerBorder: "#3b82f6",
    rowEven: "#f8faff",
    tableDivider: "#e8eeff",
    tableHeaderBg: "linear-gradient(135deg, #0f1f3d, #3b82f6)",
    catBorder: "#bfdbfe",
    sectionBorder: "#bfdbfe",
    sectionTitle: "#0f1f3d",
    checkColor: "#3b82f6",
  },
  gold: {
    headerBg: "linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)",
    headerSolid: "#78350f",
    headerMid: "#92400e",
    accent: "#d97706",
    accentLight: "#fef3c7",
    subHeaderBg: "#fffbeb",
    subHeaderBorder: "#fcd34d",
    subHeaderText: "#92400e",
    footerBg: "#fefce8",
    footerBorder: "#d97706",
    rowEven: "#fffdf7",
    tableDivider: "#fef3c7",
    tableHeaderBg: "linear-gradient(135deg, #78350f, #d97706)",
    catBorder: "#fde68a",
    sectionBorder: "#fcd34d",
    sectionTitle: "#78350f",
    checkColor: "#d97706",
  },
};

// ─── TEMPLATE STORAGE ──────────────────────────────────────────────────────────
const TEMPLATE_STORAGE_KEY = "dt_quotation_templates";
function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveTemplates(templates) {
  try { localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates)); } catch {}
}

// ─── ROI CALCULATOR ────────────────────────────────────────────────────────────
async function generateROIWithGroq({ clientName, companyName, planName, billing, scope, totalGST, addonLabels, features, planPrice, discount }) {
  // Build rich context so Groq can generate client-specific (not generic) ROI
  const addonContext = addonLabels.length > 0
    ? `Selected add-ons: ${addonLabels.join(", ")}`
    : "No additional add-ons";

  const scopeContext = scope?.trim()
    ? `Scope of work discussed:\n${scope.trim()}`
    : "No specific scope provided — infer from plan and add-ons";

  const discountContext = discount > 0 ? `A ${discount}% discount has been applied (investment-conscious client).` : "";

  // Pull out key features that hint at their use case
  const featureHighlights = features.slice(0, 8).join(", ");

  const prompt = `You are a senior B2B ROI analyst writing a personalised Return on Investment page for a sales quotation.

CLIENT CONTEXT:
- Company: ${companyName} (contact: ${clientName})
- Plan purchased: DoubleTick ${planName} — ${billing} billing
- Total investment: ₹${totalGST.toLocaleString("en-IN")} incl. GST (plan: ₹${planPrice.toLocaleString("en-IN")})
- ${addonContext}
- Key features included: ${featureHighlights}
- ${discountContext}

${scopeContext}

TASK:
Write a highly specific, numbers-driven ROI summary for ${companyName}. Use their actual scope and add-ons to derive realistic estimates. Do NOT write generic WhatsApp CRM benefits — write benefits specific to what ${companyName} is actually getting.

OUTPUT FORMAT (follow exactly):
For ${companyName}:
[1 punchy opening line about their specific situation, no bullet point]

Efficiency Gains:
[3-4 bullets with % improvements specific to their use case and add-ons]

Cost Savings:
[3 bullets with ₹ monthly estimates, derived from their investment and team size context]

Business Impact:
[3 bullets on revenue/growth outcomes specific to their industry/scope]

STRICT RULES:
- No emoji, no markdown, no asterisks
- Section headers end with colon only
- Plain text bullets — no dashes, no numbers
- All numbers must be ranges (e.g. 40-60%, ₹12,000-18,000/month)
- Reference ${companyName} by name at least twice in the bullets
- Reference specific features they selected (e.g. CTWA, chatbot, CAPI, SLA) where relevant
- Start directly with "For ${companyName}:" — no preamble`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.75,
      max_tokens: 700,
    }),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `Groq error: ${res.status}`); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

// ─── EMAIL DRAFT GENERATOR ─────────────────────────────────────────────────────
async function generateEmailWithGroq({ clientName, companyName, planName, billing, totalGST, expiryDate, qid }) {
  const prompt = `You are a senior B2B sales executive at DoubleTick (a WhatsApp Business CRM company).

Write a professional follow-up email after sending a quotation.

Details:
- Client name: ${clientName}
- Company: ${companyName}
- Plan proposed: DoubleTick ${planName} (${billing} billing)
- Total investment: ₹${totalGST.toLocaleString("en-IN")} incl. GST
- Quotation ID: ${qid}
${expiryDate ? `- Valid until: ${expiryDate}` : ""}

Output EXACTLY this format:
SUBJECT: [subject line here]
---
[email body here]

RULES:
- Subject line: concise, specific, professional
- Body: 3–4 short paragraphs, warm but professional tone
- Mention the QID and plan name
- End with a clear call to action (schedule a call / reply to confirm)
- No placeholders like [Your Name] — sign off as "DoubleTick Sales Team"
- No markdown, no bullet points in the email body
- No emoji`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.6, max_tokens: 700 }),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `Groq error: ${res.status}`); }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
  const subjectMatch = raw.match(/^SUBJECT:[ \t]*(.+)/m);
  const sepIdx = raw.indexOf("---");
  const bodyMatch = sepIdx >= 0 ? [null, raw.slice(sepIdx + 3).trim()] : null;
  return {
    subject: subjectMatch?.[1]?.trim() ?? `DoubleTick ${planName} Quotation — ${companyName}`,
    body: bodyMatch?.[1]?.trim() ?? raw,
  };
}

async function generateScopeWithGroq({ notes, websiteOrBrochure, clientName, companyName, planName, billing }) {
  const contextBlock = websiteOrBrochure
    ? `Client business context (website/brochure): ${websiteOrBrochure}\nUse this to understand their industry, use cases, and business model.`
    : "";

  const prompt = `You are a B2B SaaS sales expert at DoubleTick, a WhatsApp Business API CRM platform.

Generate a professional Scope of Work for a sales quotation.

Client: ${clientName} — ${companyName}
Plan: DoubleTick ${planName} (${billing} billing)
${contextBlock}

Sales rep notes:
${notes}

STRICT FORMAT RULES — violating any of these rules makes the output unusable:
1. Section headers MUST end with a colon only — e.g. "For Sales:" — nothing else on that line
2. Each bullet point is plain text on its own line — no dashes, no numbers, no symbols, no markdown
3. One blank line between sections — no blank lines within a section
4. 3–5 sections total, 3–5 bullets per section
5. NO emoji, NO emoji codes (like :rocket:), NO asterisks, NO bold, NO markdown
6. NO introductory sentence, NO closing sentence, NO summary, NO sign-off
7. Start directly with the first section header — nothing before it
8. End on the last bullet point — nothing after it

Correct example output (follow this exact pattern):
For Sales:
Multi-number team inbox for all agents
Real-time agent performance dashboard
WhatsApp-based order confirmation flows
Number masking for customer privacy

For Marketing:
Bulk broadcast campaigns to segmented lists
CTWA ad integration to reduce lead response time
Automated drip sequences for lead nurturing`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

// ─── SCOPE RENDERER (PDF) ─────────────────────────────────────────────────────
// Section icons — SVG paths keyed by index (cycles if more than 6 sections)
const SCOPE_ICONS = [
  // arrow right
  <path d="M2 6h8M6 2l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
  // chart line
  <path d="M1 9l3-3 2 2 4-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
  // clock
  <><circle cx="6" cy="6" r="4.5" stroke="#fff" strokeWidth="1.5"/><path d="M6 3.5v2.5l1.5 1.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></>,
  // star
  <path d="M6 1l1.5 3h3L8 6l1 3.5L6 8l-3 1.5L4 6 1.5 4h3z" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/>,
  // people
  <><circle cx="4.5" cy="3.5" r="2" stroke="#fff" strokeWidth="1.3"/><path d="M1 10c0-2 1.5-3.5 3.5-3.5S8 8 8 10" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/><circle cx="9" cy="4" r="1.5" stroke="#fff" strokeWidth="1.3"/><path d="M9 7.5c1.5 0 2.5 1 2.5 2.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/></>,
  // lightning
  <path d="M7 1L3 6.5h4L4 11l6-6H7z" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/>,
];

function parseScopeSections(scopeText) {
  const sections = [];
  let current = null;
  scopeText.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const isHeader = /^[A-Za-z*\s()&/,+\-]+:$/.test(trimmed) || /^\*[^*]+\*$/.test(trimmed);
    if (isHeader) {
      current = { header: trimmed.replace(/^\*|\*$/g, "").replace(/:$/, ""), bullets: [] };
      sections.push(current);
    } else {
      const bullet = trimmed.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, "");
      if (!current) { current = { header: null, bullets: [] }; sections.push(current); }
      current.bullets.push(bullet);
    }
  });
  return sections;
}

function renderScopeLines(scopeText, theme = THEMES.green) {
  const sections = parseScopeSections(scopeText);
  if (sections.length === 0) return null;

  return (
    <div style={{ border: "1px solid #c6f0da", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: theme.tableHeaderBg, padding: "9px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase" }}>Category</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase" }}>Deliverables</span>
      </div>
      {sections.map((section, si) => (
        <div key={si} style={{ display: "flex", borderBottom: si < sections.length - 1 ? `1px solid ${theme.tableDivider}` : "none", background: si % 2 === 0 ? theme.rowEven : "#fff", breakInside: "avoid" }}>
          <div style={{ width: 130, flexShrink: 0, padding: "11px 16px", borderRight: `2px solid ${theme.catBorder}`, display: "flex", alignItems: "flex-start" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: theme.sectionTitle, textTransform: "uppercase", letterSpacing: 0.7, lineHeight: 1.4 }}>
              {section.header || "—"}
            </span>
          </div>
          <div style={{ flex: 1, padding: "10px 16px", display: "grid", gap: 5 }}>
            {section.bullets.map((bullet, bi) => (
              <div key={bi} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: theme.checkColor, fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 3 }}>✓</span>
                <span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AI SCOPE GENERATOR UI ────────────────────────────────────────────────────
function AIScopeGenerator({ scope, onGenerated, planName, billing, clientName, companyName }) {
  const [notes, setNotes] = useState("");
  const [websiteOrBrochure, setWebsiteOrBrochure] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [generated, setGenerated] = useState(false); // true after first generation

  const hasKey = !!GROQ_API_KEY;

  const handleGenerate = async () => {
    if (!notes.trim()) { setError("Add some discussion notes first."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await generateScopeWithGroq({ notes, websiteOrBrochure, clientName, companyName, planName, billing });
      onGenerated(result);
      setGenerated(true);
      // keep panel open so user can edit
    } catch (e) {
      setError(e.message || "Something went wrong. Check your Groq API key.");
    } finally {
      setLoading(false);
    }
  };

  if (!hasKey) {
    return (
      <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, fontSize: 12, color: "#f59e0b" }}>
        Add <code style={{ background: "#0d1520", padding: "1px 5px", borderRadius: 3 }}>VITE_GROQ_API_KEY</code> to your <code style={{ background: "#0d1520", padding: "1px 5px", borderRadius: 3 }}>.env</code> to enable AI Scope generation.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setExpanded(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: expanded ? "rgba(23,160,102,0.12)" : "rgba(23,160,102,0.06)", border: `1.5px solid ${expanded ? "#17a066" : "#243242"}`, borderRadius: 8, color: "#21c47a", cursor: "pointer", fontSize: 12.5, fontWeight: 600, width: "100%", transition: "all 0.15s" }}
      >
        <span style={{ fontSize: 15 }}>✨</span>
        {generated ? "Regenerate with AI" : "Generate with AI"}
        <span style={{ fontSize: 10, color: "#3d5264", fontWeight: 400, marginLeft: 2 }}>Powered by Groq · Llama 3.3 70B</span>
        {generated && <span style={{ marginLeft: 4, fontSize: 10, background: "rgba(23,160,102,0.2)", color: "#21c47a", padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>Generated ✓</span>}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#3d5264" }}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div style={{ marginTop: 10, padding: "18px 18px", background: "#16202b", borderRadius: 10, border: "1px solid #1c2836", display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#3d5264", fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
              What did you discuss with the client? *
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. cx wants broadcasting + chatbots + minimal automations. They run a D2C brand and want to reduce WhatsApp support load. Also interested in Zoho CRM integration."
              rows={4}
              style={{ ...baseInput, resize: "vertical", lineHeight: 1.65, fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, color: "#3d5264", fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
              Client website or brochure URL
              <span style={{ color: "#3d5264", textTransform: "none", fontWeight: 400, fontSize: 10, marginLeft: 6 }}>(optional)</span>
            </label>
            <input
              value={websiteOrBrochure}
              onChange={e => setWebsiteOrBrochure(e.target.value)}
              placeholder="e.g. https://acmecorp.com"
              style={{ ...baseInput, fontSize: 13 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ label: "Plan", value: planName }, { label: "Billing", value: billing }, { label: "Client", value: clientName || "—" }].map(({ label, value }) => (
              <div key={label} style={{ padding: "3px 10px", background: "#0d1520", borderRadius: 20, border: "1px solid #1c2836", fontSize: 11.5, color: "#6d8497" }}>
                <span style={{ color: "#3d5264" }}>{label}: </span>
                <span style={{ color: "#21c47a", fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ padding: "9px 13px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !notes.trim()}
            style={{ padding: "10px 22px", background: loading || !notes.trim() ? "#1c2836" : "linear-gradient(135deg, #17a066, #0d7a4e)", border: "none", borderRadius: 8, color: loading || !notes.trim() ? "#3d5264" : "#fff", cursor: loading || !notes.trim() ? "not-allowed" : "pointer", fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 10, alignSelf: "flex-start", transition: "all 0.15s" }}
          >
            {loading
              ? <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Generating…</>
              : generated ? "✨ Regenerate" : "✨ Generate Scope of Work"
            }
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ENTERPRISE TIER BADGE (Step 2 plan card) ─────────────────────────────────
function EnterpriseTierBadge({ customPrice, billing }) {
  const monthly = getEnterpriseMonthlyEquivalent(customPrice, billing);
  if (!customPrice || !monthly) return null;
  const { capi, frictionless, sla, analytics } = getEnterpriseEligibility(customPrice, billing);
  const raw = parseInt(String(customPrice).replace(/[^0-9]/g, ""), 10) || 0;
  const isQuarterly = billing === "quarterly";
  const isYearly = billing === "yearly";

  const rows = [
    {
      label: "CAPI Support",
      sublabel: "Included from ₹10k/mo onwards",
      unlocked: capi,
      hint: "min ₹10k/mo",
    },
    {
      label: "Frictionless Messaging",
      sublabel: isQuarterly ? "≥ ₹10k/mo equiv  or  quarterly ≥ ₹30k" : "≥ ₹10k/mo equiv",
      unlocked: frictionless,
      hint: isQuarterly ? "₹10k/mo or ₹30k/qtr" : "min ₹10k/mo",
    },
    {
      label: "SLA Breached Alerts",
      sublabel: isQuarterly ? "≥ ₹10k/mo equiv  or  quarterly ≥ ₹20k" : "≥ ₹10k/mo equiv",
      unlocked: sla,
      hint: isQuarterly ? "₹10k/mo or ₹20k/qtr" : "min ₹10k/mo",
    },
    {
      label: "Enterprise Analytics",
      sublabel: isYearly ? "≥ ₹15k/mo equiv  or  yearly ≥ ₹5k/mo" : "≥ ₹15k/mo equiv",
      unlocked: analytics,
      hint: isYearly ? "₹15k/mo or yearly ≥₹5k/mo" : "min ₹15k/mo",
    },
  ];

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 5 }}>
      <div style={{ fontSize: 10, color: "#3d5264", fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 }}>
        Feature eligibility · ₹{fmtINR(monthly)}/mo equiv
      </div>
      {rows.map(({ label, sublabel, unlocked, hint }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 7, background: unlocked ? "rgba(23,160,102,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${unlocked ? "#17a066" : "#1c2836"}` }}>
          <span style={{ fontSize: 11, flexShrink: 0 }}>{unlocked ? "✅" : "🔒"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: unlocked ? "#21c47a" : "#6d8497" }}>{label}</div>
            <div style={{ fontSize: 10, color: "#3d5264", marginTop: 1 }}>{sublabel}</div>
          </div>
          {!unlocked && (
            <span style={{ fontSize: 10, color: "#3d5264", flexShrink: 0, whiteSpace: "nowrap", textAlign: "right" }}>requires {hint}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
// ─── REUSABLE DISCOUNT PANEL ─────────────────────────────────────────────────
function DiscountPanel({ label, sub, value, onChange, previewOriginal, previewFinal, previewLabel }) {
  const presets = [0, 5, 10, 15, 20, 25, 30];
  const isCustom = !presets.includes(value) && value > 0;
  return (
    <div style={{ marginTop: 18, background: "#111820", borderRadius: 12, border: `1.5px solid ${value > 0 ? "#17a066" : "#1c2836"}`, transition: "border-color 0.2s", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#e4eaf0" }}>{label}</div>
          <div style={{ fontSize: 11.5, color: "#3d5264", marginTop: 2 }}>{sub} · max 30%</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {presets.map(v => (
            <button key={v} onClick={() => onChange(v)}
              style={{ padding: "5px 12px", borderRadius: 7, border: `1.5px solid ${value === v ? "#17a066" : "#1c2836"}`, background: value === v ? "rgba(23,160,102,0.18)" : "transparent", color: value === v ? "#21c47a" : "#6d8497", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.12s" }}>
              {v === 0 ? "None" : `${v}%`}
            </button>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 4, border: `1.5px solid ${isCustom ? "#17a066" : "#1c2836"}`, borderRadius: 7, padding: "4px 9px", background: isCustom ? "rgba(23,160,102,0.12)" : "transparent", minWidth: 72 }}>
            <input type="number" min={0} max={30} step={0.5} value={value === 0 ? "" : value}
              onChange={e => { const v = parseFloat(e.target.value); if (e.target.value === "") { onChange(0); return; } if (!isNaN(v) && v >= 0 && v <= 30) onChange(Math.round(v * 10) / 10); }}
              placeholder="0.0" style={{ width: 42, background: "transparent", border: "none", outline: "none", color: "#21c47a", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit" }} />
            <span style={{ fontSize: 12, color: "#3d5264" }}>%</span>
          </div>
        </div>
      </div>
      {value > 0 && (
        <>
          <div style={{ margin: "0 18px", height: 1, background: "#1c2836" }} />
          <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <input type="range" min={0} max={30} step={0.5} value={value}
                onChange={e => onChange(Math.round(Number(e.target.value) * 10) / 10)}
                style={{ width: "100%", accentColor: "#17a066", cursor: "pointer", height: 4 }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3d5264", marginTop: 4 }}>
                {[0, 5, 10, 15, 20, 25, 30].map(v => <span key={v}>{v}%</span>)}
              </div>
            </div>
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#21c47a", lineHeight: 1 }}>{value}%</div>
              <div style={{ fontSize: 10, color: "#3d5264", marginTop: 2 }}>off</div>
            </div>
          </div>
          {previewOriginal != null && (
            <div style={{ margin: "0 18px 14px", padding: "10px 14px", background: "rgba(23,160,102,0.05)", borderRadius: 8, border: "1px solid rgba(23,160,102,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12.5, color: "#6d8497" }}>{previewLabel}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#3d5264", textDecoration: "line-through" }}>₹{previewOriginal.toLocaleString("en-IN")}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#21c47a" }}>₹{previewFinal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [clientLogo, setClientLogo] = useState(null);
  const [billing, setBilling] = useState("quarterly");
  const [plan, setPlan] = useState("pro");
  const [addonQty, setAddonQty] = useState({}); // { addonId: quantity }
  const [addonDiscounts, setAddonDiscounts] = useState({}); // { addonId: 0-30 }
  const [enterpriseAIBots, setEnterpriseAIBots] = useState(false);
  const [enterpriseCustomPrice, setEnterpriseCustomPrice] = useState("");
  const [addons, setAddons] = useState([]);
  const [iframeSelections, setIframeSelections] = useState({});
  const [customAddonsList, setCustomAddonsList] = useState([]);
  const [newCustomAddon, setNewCustomAddon] = useState({ label: "", desc: "", price: "", billing: "custom" });
  const [scope, setScope] = useState("");
  const [discount, setDiscount] = useState(0);
  const [preview, setPreview] = useState(false);
  const [customFeatures, setCustomFeatures] = useState(null);
  const [newFeatureText, setNewFeatureText] = useState("");
  // New features
  const [pdfTheme, setPdfTheme] = useState("green");
  const [qid] = useState(generateQID);
  const [expiryDate, setExpiryDate] = useState("");
  const [includeROI, setIncludeROI] = useState(false);
  const [roiText, setRoiText] = useState("");
  const [roiLoading, setRoiLoading] = useState(false);
  const [roiError, setRoiError] = useState("");
  const [emailDraft, setEmailDraft] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [templates, setTemplates] = useState(loadTemplates);
  const [templateName, setTemplateName] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [loadedTemplateName, setLoadedTemplateName] = useState(""); // for toast
  // Floating preview
  // Company auto-fill
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [autoFillDone, setAutoFillDone] = useState(false);
  // Quotation log
  const [quoteLog, setQuoteLog] = useState(loadQuoteLog);
  const [showQuoteLog, setShowQuoteLog] = useState(false);
  const [appPage, setAppPage] = useState("builder"); // "builder" | "dashboard"
  const [logFilter, setLogFilter] = useState("all"); // "all" | "pending" | "won" | "lost"
  const [lostReasonInput, setLostReasonInput] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null); // qid to confirm
  const [repSettings, setRepSettings] = useState(loadSettings);
  const [monthlyTarget, setMonthlyTarget] = useState(() => loadSettings().monthlyTarget || 0);
  const [editingTarget, setEditingTarget] = useState(false);
  // Case study page
  const [includeCaseStudy, setIncludeCaseStudy] = useState(false);
  const [caseStudyText, setCaseStudyText] = useState("");
  const [caseStudyLoading, setCaseStudyLoading] = useState(false);
  // Implementation timeline
  const [includeTimeline, setIncludeTimeline] = useState(false);
  const [timelineMilestones, setTimelineMilestones] = useState([
    { week: "Week 1", title: "Onboarding & Setup", desc: "WhatsApp number activation, agent accounts created, platform walkthrough" },
    { week: "Week 2", title: "Template & Configuration", desc: "Message templates approved, automation flows configured, integrations connected" },
    { week: "Week 3", title: "Go-Live & Training", desc: "Team training completed, first broadcasts sent, live support active" },
    { week: "Week 4", title: "Optimisation", desc: "Performance review, campaign tuning, CSM handover completed" },
  ]);
  const [pstnChannels, setPstnChannels] = useState(1);
  const [pstnAICalling, setPstnAICalling] = useState(false);
  const [draftBanner, setDraftBanner] = useState(() => {
    const d = loadDraft();
    return d && d._savedAt && (Date.now() - d._savedAt) < 7 * 24 * 60 * 60 * 1000 ? d : null;
  });
  const logoRef = useRef();
  const docRef = useRef();

  // ── Auto-save draft every 30 seconds ──────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (!clientName && !companyName) return; // nothing meaningful to save
      saveDraft({ plan, billing, addons, iframeSelections, discount, addonDiscounts, addonQty,
        enterpriseCustomPrice, enterpriseAIBots, customAddonsList, customFeatures,
        scope, includeROI, roiText, includeTimeline, includeCaseStudy, caseStudyText,
        expiryDate, pdfTheme, clientName, companyName, email, pstnChannels, pstnAICalling });
    }, 30000);
    return () => clearInterval(id);
  }, [plan, billing, addons, iframeSelections, discount, addonDiscounts, addonQty,
      enterpriseCustomPrice, enterpriseAIBots, customAddonsList, customFeatures,
      scope, includeROI, roiText, includeTimeline, includeCaseStudy, caseStudyText,
      expiryDate, pdfTheme, clientName, companyName, email, pstnChannels, pstnAICalling]);

  const restoreDraft = (d) => {
    setPlan(d.plan ?? "pro"); setBilling(d.billing ?? "quarterly");
    setAddons(d.addons || []); setIframeSelections(d.iframeSelections || {});
    setDiscount(d.discount || 0); setAddonDiscounts(d.addonDiscounts || {});
    setAddonQty(d.addonQty || {}); setEnterpriseCustomPrice(d.enterpriseCustomPrice || "");
    setEnterpriseAIBots(d.enterpriseAIBots || false); setCustomAddonsList(d.customAddonsList || []);
    setCustomFeatures(d.customFeatures ?? null); setScope(d.scope || "");
    setIncludeROI(d.includeROI || false); setRoiText(d.roiText || "");
    setIncludeTimeline(d.includeTimeline || false); setIncludeCaseStudy(d.includeCaseStudy || false);
    setCaseStudyText(d.caseStudyText || ""); setExpiryDate(d.expiryDate || "");
    setPdfTheme(d.pdfTheme || "green"); setClientName(d.clientName || "");
    setCompanyName(d.companyName || ""); setEmail(d.email || "");
    setPstnChannels(d.pstnChannels || 1); setPstnAICalling(d.pstnAICalling || false);
    setDraftBanner(null);
    clearDraft();
  };

  const planData = PLANS[plan];
  const isEnterpriseCustom = plan === "enterprise";
  // effectiveBilling = billing (same)
  const effectiveBillingLabel = { monthly: "Monthly", quarterly: "Quarterly", halfYearly: "Bi-Annual", yearly: "Yearly" }[billing] ?? "Quarterly";

  // Auto-computed features (recalculate when price/billing changes)
  const autoFeatures = isEnterpriseCustom
    ? getEnterpriseFeatures(enterpriseCustomPrice, billing)
    : planData.features;

  // Active features = manual override if set, else auto
  const enterpriseFeatures = customFeatures ?? autoFeatures;

  const resetCustomFeatures = () => setCustomFeatures(null);

  // Current theme object
  const theme = THEMES[pdfTheme] || THEMES.green;

  // Template save/load
  const saveTemplate = () => {
    if (!templateName.trim()) return;
    const t = {
      id: Date.now(),
      name: templateName.trim(),
      plan, billing, addons, iframeSelections, discount, addonDiscounts,
      enterpriseCustomPrice, enterpriseAIBots,
      customAddonsList, customFeatures,
      createdAt: new Date().toLocaleDateString("en-IN"),
    };
    const updated = [t, ...templates].slice(0, 20);
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateName("");
  };

  const loadTemplate = (t) => {
    // Explicit checks to handle null/false/0/[] correctly
    setPlan(t.plan === "starter" ? "standard" : (t.plan ?? "pro"));
    setBilling(t.billing ?? "quarterly");
    setAddons(Array.isArray(t.addons) ? t.addons : []);
    setIframeSelections(t.iframeSelections && typeof t.iframeSelections === "object" ? t.iframeSelections : {});
    setDiscount(typeof t.discount === "number" ? t.discount : 0);
    setAddonDiscounts(t.addonDiscounts && typeof t.addonDiscounts === "object" ? t.addonDiscounts : {});
    setEnterpriseCustomPrice(t.enterpriseCustomPrice ?? "");
    setEnterpriseAIBots(t.enterpriseAIBots === true);
    setCustomAddonsList(Array.isArray(t.customAddonsList) ? t.customAddonsList : []);
    setCustomFeatures(Array.isArray(t.customFeatures) ? t.customFeatures : null);
    setShowTemplates(false);
    setLoadedTemplateName(t.name);
    // Clear toast after 3 seconds
    setTimeout(() => setLoadedTemplateName(""), 3000);
  };

  const deleteTemplate = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  };

  // ROI generation
  const handleGenerateROI = async () => {
    setRoiLoading(true); setRoiError("");
    try {
      // Build addon labels list for context
      const addonLabels = [
        ...selAddons.map(a => a.label),
        ...customAddonsList.map(ca => ca.label),
      ];
      const text = await generateROIWithGroq({
        clientName,
        companyName,
        planName: planData.name,
        billing: effectiveBillingLabel,
        scope,
        totalGST,
        addonLabels,
        features: enterpriseFeatures,
        planPrice,
        discount,
      });
      setRoiText(text);
    } catch(e) { setRoiError(e.message); }
    finally { setRoiLoading(false); }
  };

  // Company auto-fill
  const handleAutoFill = async () => {
    if (!companyName.trim() || !GROQ_API_KEY) return;
    setAutoFillLoading(true);
    try {
      const data = await autoFillCompanyWithGroq(companyName);
      if (data?.scopeSuggestion && !scope) setScope(data.scopeSuggestion);
      setAutoFillDone(true);
    } catch {}
    finally { setAutoFillLoading(false); }
  };

  // Refresh log from storage
  const refreshLog = () => setQuoteLog(loadQuoteLog());

  // Update status for a quote
  const handleStatusChange = (qid, status, reason = "") => {
    updateQuoteStatus(qid, status, reason);
    refreshLog();
  };

  const handleDeleteQuote = (qid) => {
    if (confirmDelete === qid) {
      deleteQuoteEntry(qid);
      refreshLog();
      setConfirmDelete(null);
    } else {
      setConfirmDelete(qid);
      // Auto-clear after 3s
      setTimeout(() => setConfirmDelete(c => c === qid ? null : c), 3000);
    }
  };

  const handleConfidenceChange = (qid, confidence) => {
    updateQuoteField(qid, { confidence });
    refreshLog();
  };

  const saveMonthlyTarget = (val) => {
    const n = parseInt(val) || 0;
    setMonthlyTarget(n);
    const s = { ...loadSettings(), monthlyTarget: n };
    saveSettings(s);
    setEditingTarget(false);
  };

  // WhatsApp share
  const handleWhatsAppShare = (q) => {
    const expiryStr = q.expiryDate
      ? `
Valid until: ${new Date(q.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
      : "";
    const msg = `Hi ${q.clientName},

Please find your DoubleTick quotation below:

📋 *Ref:* ${q.qid}
🏢 *Client:* ${q.companyName}
📦 *Plan:* DoubleTick ${q.plan} — ${q.billing}
💰 *Total:* ₹${Number(q.totalGST || 0).toLocaleString("en-IN")} (incl. GST)${expiryStr}

To proceed or for any queries, please reply to this message or contact us directly.

Thank you for considering DoubleTick! 🙏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // WhatsApp share from builder preview
  const handleBuilderWhatsAppShare = () => {
    const expiryStr = expiryDate
      ? `\nValid until: ${new Date(expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
      : "";
    const discountStr = discount > 0 ? `\nDiscount: ${discount}% applied` : "";
    const msg = `Hi ${clientName || "there"},

Please find your DoubleTick quotation details below:

📋 *Ref:* ${qid}
🏢 *Client:* ${companyName || "—"}
📦 *Plan:* DoubleTick ${planData.name} — ${effectiveBillingLabel}
💰 *Total:* ₹${totalGST.toLocaleString("en-IN")} (incl. GST)${discountStr}${expiryStr}

The full quotation PDF has been shared separately. To proceed or for any queries, please reply to this message.

Thank you for considering DoubleTick! 🙏`;
    window.open(`https://wa.me/${email && email.match(/^\d{10,}$/) ? "91" + email : ""}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Save current quote to log
  const saveToLog = () => {
    const entry = {
      qid, clientName, companyName, email, plan: planData.name, billing: effectiveBillingLabel,
      planPrice, totalGST, addons: addons.length, discount, addonDiscounts,
      expiryDate, date: new Date().toLocaleDateString("en-IN"),
      timestamp: Date.now(),
      // snapshot of state for reload
      snapshot: { plan, billing, addons, iframeSelections, discount, addonDiscounts, addonQty,
        enterpriseCustomPrice, enterpriseAIBots, customAddonsList, customFeatures,
        scope, includeROI, roiText, includeTimeline, includeCaseStudy, caseStudyText, expiryDate,
        pdfTheme, clientName, companyName, email }
    };
    saveQuoteEntry(entry);
    setQuoteLog(loadQuoteLog());
  };

  // Load quote from log
  const loadFromLog = (entry) => {
    const s = entry.snapshot;
    if (!s) return;
    setPlan(s.plan ?? "pro"); setBilling(s.billing ?? "quarterly");
    setAddons(s.addons || []); setIframeSelections(s.iframeSelections || {});
    setDiscount(s.discount || 0); setAddonDiscounts(s.addonDiscounts || {});
    setAddonQty(s.addonQty || {}); setEnterpriseCustomPrice(s.enterpriseCustomPrice || "");
    setEnterpriseAIBots(s.enterpriseAIBots || false); setCustomAddonsList(s.customAddonsList || []);
    setCustomFeatures(s.customFeatures ?? null); setScope(s.scope || "");
    setIncludeROI(s.includeROI || false); setRoiText(s.roiText || "");
    setIncludeTimeline(s.includeTimeline || false); setIncludeCaseStudy(s.includeCaseStudy || false);
    setCaseStudyText(s.caseStudyText || ""); setExpiryDate(s.expiryDate || "");
    setPdfTheme(s.pdfTheme || "green"); setClientName(s.clientName || "");
    setCompanyName(s.companyName || ""); setEmail(s.email || "");
    setShowQuoteLog(false); setStep(1);
  };

  // Case study generation
  const handleGenerateCaseStudy = async () => {
    setCaseStudyLoading(true);
    // Rotate through different client pairs on each call to force variety
    const ALL_CLIENTS = [
      ["GRT Jewellers", "Raheja Developers"],
      ["Sabyasachi", "Tupperware"],
      ["BVC Logistics", "Malabar Diamonds"],
      ["ICRA", "Birla Brainiacs"],
      ["GRT Jewellers", "BVC Logistics"],
      ["Tupperware", "Raheja Developers"],
      ["Malabar Diamonds", "Sabyasachi"],
    ];
    const pair = ALL_CLIENTS[Math.floor(Math.random() * ALL_CLIENTS.length)];
    try {
      const prompt = `You are a B2B SaaS sales expert at DoubleTick (WhatsApp CRM).
Write 2 different client case studies for a proposal for ${companyName} (scope context: ${scope || "general business"}).

YOU MUST use EXACTLY these 2 clients — do not substitute: ${pair[0]} and ${pair[1]}.

Write each case study fresh and specific to that client's actual industry. Do not reuse phrasing from previous outputs.

STRICT OUTPUT FORMAT — follow exactly:
${pair[0]}:
Industry: [their actual industry]
Challenge: [specific problem they had before DoubleTick — be specific, include a pain point]
Solution: [exactly what DoubleTick feature or workflow solved it]
Result: [specific measurable outcome — use a %, ₹ figure, or time metric]

${pair[1]}:
Industry: [their actual industry]
Challenge: [specific problem they had before DoubleTick — be specific, include a pain point]
Solution: [exactly what DoubleTick feature or workflow solved it]
Result: [specific measurable outcome — use a %, ₹ figure, or time metric]

Rules: No preamble. No closing line. Start directly with "${pair[0]}:". Each field on its own line. Blank line between the two case studies.`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.85,
          max_tokens: 600,
          top_p: 0.95,
        }),
      });
      const data = await res.json();
      setCaseStudyText(data.choices?.[0]?.message?.content?.trim() ?? "");
    } catch {}
    finally { setCaseStudyLoading(false); }
  };

  // Email generation
  const handleGenerateEmail = async () => {
    setEmailLoading(true); setEmailError(""); setShowEmailDraft(true);
    try {
      const draft = await generateEmailWithGroq({ clientName, companyName, planName: planData.name, billing: effectiveBillingLabel, totalGST, expiryDate, qid });
      setEmailDraft(draft);
    } catch(e) { setEmailError(e.message); }
    finally { setEmailLoading(false); }
  };

  const basePlanPrice = isEnterpriseCustom
    ? (parseInt(String(enterpriseCustomPrice).replace(/[^0-9]/g, ""), 10) || 0)
    : (planData[billing] ?? planData.quarterly ?? 0);

  const aiBotsAddon = plan === "enterprise" && enterpriseAIBots
    ? ({ monthly: 15000, quarterly: 45000, halfYearly: 90000, yearly: 180000 }[billing] ?? 15000)
    : 0;
  const planPriceOriginal = basePlanPrice + aiBotsAddon;
  const discountFactor = 1 - discount / 100;
  const planPrice = Math.round(planPriceOriginal * discountFactor);

  // Active addons for current plan/billing
  const planAddons = getAddonsForPlan(plan, billing);
  const selAddons = planAddons.filter(a => addons.includes(a.id));

  const getQty = (id) => addonQty[id] || 1;

  const getAddonLinePrice = (a) => {
    if (a.id === "pstn") return a.dtFeePerChannelPerMonth * pstnChannels;
    if (a.custom) return null;
    const unit = getAddonUnitPrice(a, plan, billing);
    if (unit == null) return null;
    return unit * (a.perUnit ? getQty(a.id) : 1);
  };

  const getAddonDisplayPrice = (a) => {
    if (a.custom) return a.custom;
    const unit = getAddonUnitPrice(a, plan, billing);
    if (unit == null) return "N/A for this billing cycle";
    const label = BILLING_LABELS[billing] || billing;
    return a.perUnit
      ? `₹${fmtINR(unit)} / ${a.unitLabel} / ${label.replace("per ", "")}`
      : `₹${fmtINR(unit)} ${label}`;
  };

  const getAddonPrintLabel = (a) => {
    if (a.custom) return a.custom;
    const line = getAddonLinePrice(a);
    if (line == null) return "—";
    const label = BILLING_LABELS[billing] || billing;
    const qty = a.perUnit ? getQty(a.id) : 1;
    return `INR ${fmtINR(line)}/- (${qty > 1 ? `${qty} × ` : ""}${label})`;
  };

  const numericAddons = selAddons.filter(a => getAddonLinePrice(a) != null);
  const customAddons = selAddons.filter(a => getAddonLinePrice(a) == null);
  // Per-addon discount helpers
  const getAddonDiscount = (id) => addonDiscounts[id] || 0;
  const getAddonDiscountedPrice = (a) => {
    const raw = getAddonLinePrice(a);
    if (raw == null) return null;
    return Math.round(raw * (1 - getAddonDiscount(a.id) / 100));
  };
  const addonSumOriginal = numericAddons.reduce((s, a) => s + (getAddonLinePrice(a) ?? 0), 0)
    + customAddonsList.reduce((s, ca) => s + (parseInt(ca.price) || 0), 0);
  const addonSum = numericAddons.reduce((s, a) => s + (getAddonDiscountedPrice(a) ?? 0), 0)
    + customAddonsList.reduce((s, ca) => s + (parseInt(ca.price) || 0), 0);
  const totalAddonSaving = addonSumOriginal - addonSum;
  const total = planPrice + addonSum;
  const totalGST = Math.round(total * 1.18);
  const teamName = companyName || "Client";

  const toggleAddon = id => setAddons(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const handleLogoUpload = e => {
    const f = e.target.files[0];
    if (f) { const r = new FileReader(); r.onload = ev => setClientLogo(ev.target.result); r.readAsDataURL(f); }
  };

  const download = () => {
    const origin = window.location.origin;
    const fixedHtml = docRef.current.outerHTML
      .replace(/src="\/dt logo\.jpg"/g, `src="${origin}/dt logo.jpg"`)
      .replace(/src="\/Shivam Sign\.jpg"/g, `src="${origin}/Shivam Sign.jpg"`);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>DoubleTick Quotation — ${companyName}</title>
      <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
      <style>
        *, *::before, *::after { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: #fff; }
        @page { margin: 0; size: A4; }
        @media print { body { width: 210mm; } tr { break-inside: avoid !important; } thead { display: table-header-group; } }
      </style>
    </head><body>${fixedHtml}<script>window.onload=()=>{setTimeout(()=>{window.print();},800);}<\/script></body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) { const a = document.createElement("a"); a.href = url; a.download = `DoubleTick-Quotation-${companyName || "Client"}.html`; a.click(); }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const STEPS = ["Client Info", "Plan & Billing", "Add-ons", "Review"];

  const PrintDoc = () => (
    <div ref={docRef} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#1e2d3d", background: "#fff", maxWidth: 860, margin: "0 auto" }}>

      {/* PAGE 1 */}
      <div>
        <div style={{ background: theme.headerBg, padding: "38px 56px 30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 9.5, letterSpacing: 3.5, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 14, fontWeight: 500 }}>APPORT SOFTWARE SOLUTIONS PVT LTD</div>
              <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.97)", borderRadius: 9, padding: "8px 18px", marginBottom: 18 }}>
                <img src={DOUBLETICK_LOGO} alt="DoubleTick" style={{ height: 28, display: "block", objectFit: "contain" }} />
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.85, marginTop: 2 }}>
                Office No. 3, 4th Floor, Second Avenue, Connekt Coworks,<br />
                Subhash Nagar, Andheri East, Mumbai, Maharashtra — 400093<br />
                kush.ambekar@quicksell.co &nbsp;&nbsp;|&nbsp;&nbsp; +91 79778 14709
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}>
              {clientLogo ? (
                <div style={{ background: "#ffffff", borderRadius: 12, padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 150, minHeight: 72, boxShadow: "0 2px 12px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.6)" }}>
                  <img src={clientLogo} alt={companyName} style={{ maxHeight: 52, maxWidth: 170, objectFit: "contain", display: "block" }} />
                </div>
              ) : (
                <div style={{ background: "#ffffff", borderRadius: 12, padding: "14px 22px", minWidth: 150, minHeight: 72, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.18)" }}>
                  <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#0b5235", textTransform: "uppercase", fontWeight: 700, textAlign: "center", lineHeight: 1.4 }}>{companyName}</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ background: theme.subHeaderBg, borderBottom: `2px solid ${theme.subHeaderBorder}`, padding: "18px 56px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9.5, letterSpacing: 2.5, color: "#5aac88", textTransform: "uppercase", marginBottom: 5, fontWeight: 600 }}>Prepared For</div>
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 24, fontWeight: 600, color: theme.headerSolid, lineHeight: 1.2 }}>{clientName}</div>
            <div style={{ fontSize: 14, color: "#2d4a3a", fontWeight: 600, marginTop: 3 }}>{companyName}</div>
            {email && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{email}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9.5, letterSpacing: 2.5, color: theme.subHeaderText, textTransform: "uppercase", marginBottom: 5, fontWeight: 600 }}>Date</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
            <div style={{ marginTop: 6, display: "inline-block", background: theme.headerSolid, color: "#fff", fontSize: 10.5, fontWeight: 600, borderRadius: 30, padding: "4px 14px", letterSpacing: 0.5 }}>{planData.name} Plan &nbsp;·&nbsp; {effectiveBillingLabel} Billing</div>
            <div style={{ marginTop: 5, fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Ref: {qid}</div>
            {expiryDate && <div style={{ marginTop: 4, fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Valid until {new Date(expiryDate).toLocaleDateString("en-IN", {day:"numeric",month:"long",year:"numeric"})}</div>}
          </div>
        </div>
        <div style={{ padding: "38px 56px" }}>
          <PrintSection title="Company Overview" theme={theme}>
            <p style={{ color: "#374151", lineHeight: 1.9, margin: 0, fontSize: 13 }}>QuickSell is a conversational commerce company empowering global brands with scalable personal commerce and relationship-led sales on WhatsApp. Started in 2017 with a vision of enabling global brands to win more customers using simple yet robust technology on mobile, today we have over 7,000+ customers across 100+ countries using our technology to grow digitally.</p>
          </PrintSection>
          <PrintSection title="About DoubleTick" theme={theme}>
            <p style={{ color: "#374151", lineHeight: 1.9, marginBottom: 12, fontSize: 13 }}>DoubleTick is a mobile-first conversational CRM built on top of WhatsApp Business API to unlock marketing and sales capabilities of WhatsApp with top-notch features such as a cloud-based team inbox, unlimited broadcast and bulk messaging, real-time broadcast analytics, dynamic cataloging, chatbot, commerce BOT and many more.</p>
            <p style={{ color: "#374151", lineHeight: 1.9, marginBottom: 12, fontSize: 13 }}>Some of the brands powered by DoubleTick include GRT Jewellers, Raheja Developers, Sabyasachi, Tarun Tahiliani, ICRA, BVC Logistics, Tupperware, Birla Brainiacs KGK Group, Walking Tree, CKC Group, Malabar Diamonds and Gold, Emerald India, Prima Art, Siroya, SabyaSachi, etc. Backed by investors from Silicon Valley, Info Edge Ventures and BeeNext Asia, we are headquartered in Mumbai, India.</p>
            <p style={{ color: "#374151", lineHeight: 1.9, marginBottom: 16, fontSize: 13 }}>DoubleTick.io is EU GDPR compliant, ISO 27001 certified, and a Meta Business Partner, powered by the Official WhatsApp Business API. Recognized as Meta Emerging Technology Partner of the Year 2025 and trusted by businesses globally.</p>
            <div style={{ padding: "14px 18px", background: "#f0fdf8", borderRadius: 9, border: "1px solid #a7f0c8", fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: "#0b5235", marginBottom: 8 }}>Customer Reviews</div>
              <div style={{ color: "#2d6a4f", lineHeight: 2 }}>
                G2: https://www.g2.com/products/doubletick-io/reviews<br />
                App Store: https://apps.apple.com/in/app/doubletick/id1662977073<br />
                Play Store: https://play.google.com/store/apps/details?id=io.doubletick.mobile.crm
              </div>
            </div>
          </PrintSection>
        </div>
        <PrintFooter theme={theme} />
      </div>

      {/* PAGE 2 */}
      <div style={{ breakBefore: "page" }}>
        <PrintPageHeader title="Commercial Proposal" sub={`${companyName}  ·  ${effectiveBillingLabel} Billing`} clientLogo={clientLogo} companyName={companyName} theme={theme} />
        <div style={{ padding: "24px 56px" }}>
          {/* ── Plan pricing ── */}
          <PrintSection title={`${effectiveBillingLabel} Pricing Summary`} theme={theme}>
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: theme.headerSolid }}>
                  <th style={{ padding: "12px 16px", textAlign: "center", width: 48, fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: 0.5 }}>#</th>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: 0.5 }}>PARTICULARS</th>
                  <th style={{ padding: "12px 18px", textAlign: "right", fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: 0.5 }}>AMOUNT (EXCL. GST)</th>
                </tr>
              </thead>
              <tbody>
                {/* Plan row */}
                <tr style={{ background: "#fff" }}>
                  <td style={{ ...pTdc, padding: "14px 16px", color: theme.sectionTitle, fontWeight: 700, fontSize: 13 }}>1</td>
                  <td style={{ ...pTdl, padding: "14px 18px" }}>
                    <div style={{ fontWeight: 700, color: "#111827", fontSize: 13.5, marginBottom: 3 }}>DoubleTick {planData.name} Plan &mdash; {effectiveBillingLabel}</div>
                    {discount > 0 && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "#16a34a", fontWeight: 600, background: "#f0fdf4", borderRadius: 4, padding: "2px 7px", marginBottom: 3 }}>
                        <span>✓</span> {discount}% discount · was INR {fmtINR(planPriceOriginal)}/-
                      </div>
                    )}
                    {(() => {
                      const billingMonths = { monthly: 1, quarterly: 3, halfYearly: 6, yearly: 12 }[billing] || 1;
                      const baseMonthly = Math.round(basePlanPrice / billingMonths);
                      return baseMonthly > 0 ? (
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          {plan === "enterprise" && enterpriseAIBots
                            ? `Base: ₹${fmtINR(Math.round((basePlanPrice - aiBotsAddon) / billingMonths))}/mo + AI Bots: ₹15,000/mo`
                            : `₹${fmtINR(baseMonthly)}/month × ${billingMonths} month${billingMonths > 1 ? "s" : ""}`}
                        </div>
                      ) : null;
                    })()}
                  </td>
                  <td style={{ ...pTdr, padding: "14px 18px", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", whiteSpace: "nowrap" }}>INR {fmtINR(planPrice)}/-</div>
                  </td>
                </tr>

                {/* Optional Add-ons sub-header */}
                {(numericAddons.length > 0 || customAddons.length > 0 || customAddonsList.length > 0) && (
                  <tr>
                    <td colSpan={3} style={{ padding: "0" }}>
                      <div style={{ display: "flex", alignItems: "center", background: theme.subHeaderBg, borderTop: `2px solid ${theme.subHeaderBorder}`, borderBottom: `1px solid ${theme.subHeaderBorder}`, padding: "8px 18px", gap: 10 }}>
                        <div style={{ width: 3, height: 16, background: theme.accent, borderRadius: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: theme.sectionTitle, textTransform: "uppercase", letterSpacing: 1.8 }}>Optional Add-ons</span>
                        <span style={{ fontSize: 10.5, color: "#9ca3af" }}>selected by {companyName}</span>
                        <div style={{ marginLeft: "auto", fontSize: 10, color: "#9ca3af" }}>{numericAddons.length + customAddons.length + customAddonsList.length} item{(numericAddons.length + customAddons.length + customAddonsList.length) !== 1 ? "s" : ""}</div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Addon rows */}
                {[...numericAddons, ...customAddons].map((a, i) => {
                  const isCustomAddon = !!a.custom;
                  const linePrice = isCustomAddon ? null : getAddonLinePrice(a);
                  const disc = getAddonDiscount(a.id);
                  const discountedLine = linePrice != null ? getAddonDiscountedPrice(a) : null;
                  const rowBg = i % 2 === 0 ? "#fafafa" : "#fff";
                  return (
                    <tr key={a.id} style={{ background: rowBg }}>
                      <td style={{ ...pTdc, padding: "13px 16px", color: "#9ca3af", fontSize: 12 }}>{i + 2}</td>
                      <td style={{ ...pTdl, padding: "10px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>
                            {a.label}
                            {iframeSelections[a.id] === "iframe" && a.iframeYearly && (
                              <span style={{ fontSize: 10.5, color: "#9ca3af", marginLeft: 5, fontWeight: 400 }}>(with iframe)</span>
                            )}
                          </span>
                          {disc > 0 && (
                            <span style={{ fontSize: 9.5, color: "#16a34a", fontWeight: 600, background: "#f0fdf4", borderRadius: 3, padding: "1px 5px", border: "1px solid #bbf7d0", whiteSpace: "nowrap" }}>
                              {disc}% off
                            </span>
                          )}
                        </div>
                        {a.desc && <div style={{ fontSize: 10.5, color: "#9ca3af", fontStyle: "italic", lineHeight: 1.5, marginTop: 1 }}>{a.desc}</div>}
                        {a.perUnit && getQty(a.id) > 1 && <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 1 }}>{getQty(a.id)} × {a.unitLabel} @ ₹{fmtINR(getAddonUnitPrice(a, plan, billing))}/{a.unitLabel}</div>}
                      </td>
                      <td style={{ ...pTdr, padding: "10px 18px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        {isCustomAddon ? (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", fontStyle: "italic", textAlign: "right" }}>{a.custom}</div>
                            {a.id === "pstn" && pstnChannels > 0 && (
                              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2, textAlign: "right" }}>
                                ₹{fmtINR(a.dtFeePerChannelPerMonth * pstnChannels)}/mo DT fee · {pstnChannels} channel{pstnChannels > 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {disc > 0 && linePrice != null && (
                              <div style={{ fontSize: 10.5, color: "#9ca3af", textDecoration: "line-through", textAlign: "right", marginBottom: 2 }}>INR {fmtINR(linePrice)}/-</div>
                            )}
                            <div style={{ fontSize: 15, fontWeight: 800, color: disc > 0 ? "#16a34a" : "#111827" }}>INR {fmtINR(discountedLine ?? linePrice)}/-</div>
                            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{BILLING_LABELS[billing]}</div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Custom addons */}
                {customAddonsList.map((ca, i) => (
                  <tr key={ca.id} style={{ background: ([...numericAddons, ...customAddons].length + i) % 2 === 0 ? "#fafafa" : "#fff" }}>
                    <td style={{ ...pTdc, padding: "13px 16px", color: "#9ca3af", fontSize: 12 }}>{numericAddons.length + customAddons.length + i + 2}</td>
                    <td style={{ ...pTdl, padding: "13px 18px" }}>
                      <div style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>{ca.label}</div>
                      {ca.desc && <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 3, lineHeight: 1.5, fontStyle: "italic" }}>{ca.desc}</div>}
                    </td>
                    <td style={{ ...pTdr, padding: "13px 18px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{ca.price ? `INR ${Number(ca.price).toLocaleString("en-IN")}/-` : "—"}</div>
                      {ca.billing && ca.billing !== "custom" && (
                        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>
                          {({ monthly: "per month", quarterly: "per 3 months", halfYearly: "per 6 months", yearly: "per year" }[ca.billing]) || ca.billing}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Savings row */}


                {/* Total row */}
                <tr style={{ background: theme.subHeaderBg }}>
                  <td colSpan={2} style={{ padding: "14px 18px", textAlign: "right", fontSize: 12.5, color: "#6b7280", borderTop: `2px solid ${theme.subHeaderBorder}`, fontWeight: 500 }}>
                    Subtotal + 18% GST
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "right", borderTop: `2px solid ${theme.subHeaderBorder}`, whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: theme.sectionTitle, whiteSpace: "nowrap" }}>INR {fmtINR(totalGST)}/-</div>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
            <div style={{ marginTop: 7, fontSize: 10.5, color: "#9ca3af", fontStyle: "italic" }}>* GST at 18% is applicable additionally on all taxable line items.</div>
          </PrintSection>

          {/* Features — dynamic for enterprise */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 16.5, fontWeight: 600, color: theme.sectionTitle, paddingBottom: 7, borderBottom: `1.5px solid ${theme.sectionBorder}`, marginBottom: 14 }}>{`DoubleTick ${planData.name} Plan — Included Features`}</div>
            <div style={{ columns: 2, columnGap: 30, marginBottom: 14 }}>
              {enterpriseFeatures.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: "#374151", lineHeight: 1.65, breakInside: "avoid", marginBottom: 2 }}>
                  <span style={{ color: theme.accent, flexShrink: 0, marginTop: 3, fontSize: 10 }}>▶</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            {/* Clarification note */}
            <div style={{ padding: "10px 14px", background: theme.subHeaderBg, borderRadius: 7, border: `1px solid ${theme.subHeaderBorder}`, fontSize: 11.5, color: "#374151", lineHeight: 1.7, breakInside: "avoid" }}>
              <strong style={{ color: theme.sectionTitle }}>Note: </strong>
              The features listed above are included as part of the {planData.name} plan subscription.
              {(numericAddons.length > 0 || customAddons.length > 0) && (
                <> Any additional capabilities selected as add-ons (see Pricing Summary) are available as optional enhancements and will be activated as part of your deployment.</>
              )}
              {" "}Features not listed here are not part of the base plan and may be available as separate add-ons.
            </div>
          </div>

          <div style={{ padding: "16px 20px", background: "#fffbeb", borderRadius: 9, border: "1px solid #fcd34d", fontSize: 12.5 }}>
            <div style={{ fontWeight: 700, color: "#78350f", marginBottom: 10, fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>Important Notes</div>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                ["Cold Messaging", "Meta strictly prohibits cold messaging via WhatsApp Business API. All outbound communications must comply with Meta's messaging policies."],
                ["WhatsApp Groups", "Groups created via WhatsApp APIs support a maximum of 8 participants. Adding more than 8 members requires the Collaborators add-on. BlueTick on the WhatsApp API enabled number is required by Meta to operate group-based communication at scale. Pro & Enterprise plans include 5 WhatsApp groups by default."],
                ["Platform Operations", "All agents will be required to use the DoubleTick App (Web or Mobile) for day-to-day operations."],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 10, color: "#7c2d12", lineHeight: 1.7 }}>
                  <strong style={{ flexShrink: 0, minWidth: 130, color: "#92400e" }}>{k}:</strong>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 3 — SCOPE OF WORK — only if scope content exists */}
      {scope && scope.trim() && (
        <div style={{ breakBefore: "page" }}>
          <PrintPageHeader title="Support & Onboarding" sub="Scope of Work" clientLogo={clientLogo} companyName={companyName} theme={theme} />
          <div style={{ padding: "24px 56px" }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ marginTop: 4 }}>
                {renderScopeLines(scope, theme)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE ROI — optional */}
      {includeROI && roiText && (
        <div style={{ breakBefore: "page" }}>
          <PrintPageHeader title="Return on Investment" sub="Business Impact Analysis" clientLogo={clientLogo} companyName={companyName} theme={theme} />
          <div style={{ padding: "28px 56px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 24, background: theme.headerSolid, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 17, fontWeight: 700, color: theme.sectionTitle, letterSpacing: 0.2 }}>Projected ROI for {companyName}</div>
            </div>
            <div style={{ padding: "6px 16px 14px", background: theme.subHeaderBg, borderRadius: 9, border: `1px solid ${theme.subHeaderBorder}`, marginBottom: 16, fontSize: 12.5, color: "#374151", lineHeight: 1.4 }}>
              Based on DoubleTick {planData.name} plan ({effectiveBillingLabel} billing) · Investment: ₹{fmtINR(totalGST)}/- incl. GST
            </div>
            {renderScopeLines(roiText, theme)}
          </div>
        </div>
      )}

      {/* PAGE CASE STUDY — optional */}
      {includeCaseStudy && caseStudyText && (
        <div style={{ breakBefore: "page" }}>
          <PrintPageHeader title="Why DoubleTick" sub="Client Success Stories" clientLogo={clientLogo} companyName={companyName} theme={theme} />
          <div style={{ padding: "28px 56px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 4, height: 24, background: theme.headerSolid, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 17, fontWeight: 700, color: theme.sectionTitle }}>Trusted by Industry Leaders</div>
            </div>
            <p style={{ color: "#6b7280", fontSize: 12.5, marginBottom: 20, lineHeight: 1.7 }}>
              DoubleTick powers some of India's most recognised brands. Here are two examples most relevant to {companyName}'s context.
            </p>
            <div style={{ display: "grid", gap: 16 }}>
              {caseStudyText.split("\n\n").filter(s => s.trim()).map((study, i) => {
                const lines = study.trim().split("\n").filter(l => l.trim());
                const title = lines[0]?.replace(/:$/, "");
                const fields = lines.slice(1).map(l => { const [k, ...v] = l.split(":"); return { k: k?.trim(), v: v.join(":").trim() }; }).filter(f => f.k && f.v);
                return (
                  <div key={i} style={{ padding: "16px 20px", background: theme.subHeaderBg, borderRadius: 10, border: `1px solid ${theme.subHeaderBorder}`, breakInside: "avoid" }}>
                    <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, fontWeight: 700, color: theme.sectionTitle, marginBottom: 10 }}>{title}</div>
                    <div style={{ display: "grid", gap: 7 }}>
                      {fields.map(({ k, v }) => (
                        <div key={k} style={{ display: "flex", gap: 10, fontSize: 12.5 }}>
                          <strong style={{ flexShrink: 0, width: 80, color: theme.sectionTitle, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, paddingTop: 2 }}>{k}</strong>
                          <span style={{ color: "#374151", lineHeight: 1.6 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PAGE TIMELINE — optional */}
      {includeTimeline && (
        <div style={{ breakBefore: "page" }}>
          <PrintPageHeader title="Implementation Plan" sub="What happens after you sign" clientLogo={clientLogo} companyName={companyName} theme={theme} />
          <div style={{ padding: "28px 56px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 4, height: 24, background: theme.headerSolid, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 17, fontWeight: 700, color: theme.sectionTitle }}>Your Onboarding Timeline</div>
            </div>
            <p style={{ color: "#6b7280", fontSize: 12.5, marginBottom: 22, lineHeight: 1.7 }}>
              Here's exactly what to expect after the agreement is signed. Our team handles every step.
            </p>
            <div style={{ position: "relative" }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 28, top: 0, bottom: 0, width: 2, background: theme.accentLight || "#d1fae5" }} />
              {timelineMilestones.filter(m => m.title).map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 20, marginBottom: 20, position: "relative", breakInside: "avoid" }}>
                  {/* Circle */}
                  <div style={{ width: 56, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, zIndex: 1 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: theme.headerSolid, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: theme.accent || "#1aad74", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{m.week}</span>
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, padding: "12px 16px", background: "#fff", borderRadius: 9, border: `1px solid ${theme.subHeaderBorder || "#a7f0c8"}`, marginBottom: 2 }}>
                    <div style={{ fontWeight: 700, color: "#111827", fontSize: 13, marginBottom: 4 }}>{m.title}</div>
                    <div style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.6 }}>{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAGE 4 — CSM */}
      <div style={{ breakBefore: "page" }}>
        <PrintPageHeader title="Support & Onboarding" sub="Customer Success Programme" clientLogo={clientLogo} companyName={companyName} theme={theme} />
        <div style={{ padding: "24px 56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 4, height: 24, background: "#0b5235", borderRadius: 2, flexShrink: 0 }} />
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 17, fontWeight: 700, color: "#0b5235", letterSpacing: 0.2 }}>Customer Success Manager (CSM) Programme</div>
          </div>
          {plan === "enterprise" ? (
            <>
              <div style={{ padding: "10px 16px", background: "#edfbf3", borderRadius: 8, border: "1px solid #a7f0c8", marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: "#0b5235", fontSize: 12.5 }}>Dedicated Account Management &mdash; Active for the lifetime of your account</div>
              </div>
              <p style={{ color: "#374151", lineHeight: 1.8, marginBottom: 7, fontSize: 12.5 }}>Enterprise accounts receive a dedicated Account Management Contact (AMC) for the full duration of the active subscription. Your AMC serves as your primary point of contact for account setup, onboarding, escalations, and ongoing platform implementation — with no time limit.</p>
              <p style={{ color: "#374151", lineHeight: 1.8, marginBottom: 12, fontSize: 12.5 }}>Accounts with an MRR of ₹15,000 or above will additionally receive a dedicated WhatsApp support group, ensuring priority handling and faster resolution on all queries. You will also have full access to the DoubleTick Support Channel at any time.</p>
            </>
          ) : (
            <>
              <div style={{ padding: "10px 16px", background: "#edfbf3", borderRadius: 8, border: "1px solid #a7f0c8", marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: "#0b5235", fontSize: 12.5 }}>60-Day Dedicated CSM Policy &mdash; Effective 3 October 2025</div>
              </div>
              <p style={{ color: "#374151", lineHeight: 1.8, marginBottom: 7, fontSize: 12.5 }}>Every account will have a dedicated Customer Success Manager assigned for 60 days from the date of activation. The CSM will serve as your primary point of contact, assisting with account setup, onboarding, and ensuring a smooth implementation of the platform.</p>
              <p style={{ color: "#374151", lineHeight: 1.8, marginBottom: 12, fontSize: 12.5 }}>After the 60-day CSM period, you will receive a brief feedback form. You will continue to have full access to the DoubleTick Support Channel for ongoing assistance at any time.</p>
            </>
          )}
          <div style={{ breakInside: "avoid" }}>
            <div style={{ fontWeight: 600, color: "#1f2937", marginBottom: 8, fontSize: 12.5 }}>{plan === "enterprise" ? "Your Dedicated AMC Support Includes:" : "Your 60-Day CSM Support Includes:"}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <tbody>
                {[
                  ["01", "1-on-1 Onboarding", "Setting up your WhatsApp number on the DoubleTick platform"],
                  ["02", "Facebook Business Verification", "Step-by-step guidance through the Meta business verification process"],
                  ["03", "Agents & WABA Setup", "Adding team agents and mapping WhatsApp Business Accounts to your dashboard"],
                  ["04", "Use-Case Consultation", "Expert discussion on your business use-cases and feature recommendations tailored to your industry"],
                  ["05", "Add-on Integration Support", "Assistance configuring and integrating optional add-on features"],
                  ["06", "Platform Walkthrough", "A dedicated 15-minute guided walkthrough of the full DoubleTick platform"],
                ].map(([num, title, desc], i) => (
                  <tr key={num} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e5e7eb", breakInside: "avoid" }}>
                    <td style={{ padding: "9px 12px", width: 38, fontWeight: 700, color: "#0b5235", fontSize: 14, verticalAlign: "middle", fontFamily: "'EB Garamond', serif", textAlign: "center", borderRight: "1px solid #e5e7eb" }}>{num}</td>
                    <td style={{ padding: "9px 14px", fontWeight: 600, color: "#111827", width: 180, verticalAlign: "middle", fontSize: 12, borderRight: "1px solid #e5e7eb" }}>{title}</td>
                    <td style={{ padding: "9px 14px", color: "#4b5563", fontSize: 12, lineHeight: 1.6 }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 16px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fcd34d", fontSize: 12, color: "#374151", lineHeight: 1.7, breakInside: "avoid", marginTop: 14, marginBottom: 18 }}>
            <strong style={{ color: "#92400e" }}>Please Note: </strong>Your CSM will guide you through creating your first WhatsApp message template and share best practices to ensure campaign compliance and successful message delivery.
          </div>
          <div style={{ breakInside: "avoid" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 4, height: 24, background: "#0b5235", borderRadius: 2, flexShrink: 0 }} />
              <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 17, fontWeight: 700, color: "#0b5235", letterSpacing: 0.2 }}>Self-Service Resources</div>
            </div>
            <p style={{ color: "#374151", lineHeight: 1.8, marginBottom: 10, fontSize: 12.5 }}>To maximise your use of the platform at any time, we encourage you to utilise the following self-service resources:</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[["Video Courses & Help Center", "Step-by-step tutorials covering all platform features"], ["Live & Recorded Webinars", "Best-practice sessions hosted by the DoubleTick team"], ["Developer Documentation", "Comprehensive API guides for custom integrations"]].map(([t, d]) => (
                <div key={t} style={{ padding: "11px 13px", background: "#f8fafc", borderRadius: 9, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: 600, color: "#0b5235", marginBottom: 4, fontSize: 12 }}>{t}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 5 — T&C */}
      <div style={{ breakBefore: "page" }}>
        <PrintPageHeader title="Terms & Conditions" sub="Commercial Agreement" clientLogo={clientLogo} companyName={companyName} theme={theme} />
        <div style={{ padding: "24px 56px" }}>
          <PrintSection title="Payment & Agreement Terms" theme={theme}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Payment Terms", "Full payment is due upfront, prior to account activation."],
                  ["Taxation", "GST at 18% is applicable in addition to all listed prices."],
                  ["Purchase Order", `Upon acceptance, ${teamName} shall issue a Purchase Order (PO) to formalise the commercial agreement.`],
                  ["Advance Payment", `${teamName} agrees to remit payment in advance per agreed commercial terms.`],
                  ["Billing Cycle", `${effectiveBillingLabel}${effectiveBillingLabel === "Monthly" ? " (subject to management approval)" : ""}. Renewal terms shall be mutually agreed upon prior to the next cycle.`],
                  ["Refund Policy", "Please refer to our refund and cancellation policy at: https://doubletick.io/refund-and-cancellations"],
                ].map(([label, val], i) => (
                  <tr key={label} style={{ background: i % 2 === 0 ? "#f9fafb" : "#fff", borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "8px 14px", fontWeight: 600, color: "#111827", width: 175, verticalAlign: "top", fontSize: 12 }}>{label}</td>
                    <td style={{ padding: "8px 14px", color: "#374151", lineHeight: 1.6, fontSize: 12 }}>
                      {label === "Refund Policy" ? (
                        <>Please refer to our refund and cancellation policy at: <a href="https://doubletick.io/refund-and-cancellations" style={{ color: theme.accent, textDecoration: "underline" }}>doubletick.io/refund-and-cancellations</a></>
                      ) : val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintSection>
          <PrintSection title="WhatsApp API Message Costs" theme={theme}>
            <p style={{ color: "#374151", lineHeight: 1.7, marginBottom: 10, fontSize: 12 }}>WhatsApp message costs are charged separately by Meta effective <strong>January 1, 2026</strong>. These are prepaid — the client recharges the DoubleTick Wallet directly. Rates are subject to change per Meta's pricing policy. No setup fees apply.</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: theme.headerSolid, color: "#fff" }}>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, fontSize: 11.5 }}>Message Type</th>
                  <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600, fontSize: 11.5 }}>Rate (per delivered message)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Marketing Template Message", "INR 0.99", false, null],
                  ["Utility Template Message", "INR 0.13", false, null],
                  ["Authentication Template Message", "INR 0.35", false, null],
                  ["Incoming Service Message", "Free", true, null],
                  ["Utility Messages (within 24h service window)", "Free", true, "Utility messages sent in response to user messages within the 24-hour service window are free"],
                  ["WhatsApp API Calling — Inbound", "INR 0.24425/min", false, null],
                  ["WhatsApp API Calling — Outbound", "INR 0.52620/min", false, null],
                ].map(([type, rate, free, note], i) => (
                  <tr key={type} style={{ background: i % 2 === 0 ? "#fff" : "#f7faf9", borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "7px 14px", color: "#374151", fontSize: 12 }}>
                      {type}
                      {note && <div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 1, fontStyle: "italic" }}>{note}</div>}
                    </td>
                    <td style={{ padding: "7px 14px", textAlign: "right", fontWeight: 600, color: free ? "#0b5235" : "#111827", fontSize: 12 }}>{rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 10, fontSize: 11.5, color: "#6b7280" }}>For rates outside India: <span style={{ color: "#1aad74" }}>https://doubletick.io/conversation-cost</span></div>
          </PrintSection>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, breakInside: "avoid", breakBefore: "avoid" }}>
            <div style={{ textAlign: "center", minWidth: 220 }}>
              <img src={SHIVAM_SIG} alt="Authorised Signatory" style={{ width: 180, objectFit: "contain", display: "block", margin: "0 auto" }} />
            </div>
          </div>
        </div>
        <PrintFooter theme={theme} />
      </div>
    </div>
  );

  // ─── APP SHELL ──────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: T.bg, color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
        input::placeholder, textarea::placeholder { color: #2e4255; }
        input:focus, textarea:focus { border-color: ${T.green} !important; box-shadow: 0 0 0 3px rgba(23,160,102,0.13); }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0d1520; }
        ::-webkit-scrollbar-thumb { background: #1c2836; border-radius: 3px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
      `}</style>

      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ background: "#fff", borderRadius: 7, padding: "5px 13px", display: "inline-flex", alignItems: "center" }}>
            <img src={DOUBLETICK_LOGO} alt="DoubleTick" style={{ height: 24, objectFit: "contain", display: "block" }} />
          </div>
          <div style={{ height: 20, width: 1, background: T.border }} />
          <span style={{ fontSize: 11.5, color: T.textMuted, letterSpacing: 1.8, textTransform: "uppercase", fontWeight: 500 }}>Quotation Builder</span>
          <div style={{ padding: "3px 10px", background: T.surfaceHigh, borderRadius: 20, border: `1px solid ${T.border}`, fontSize: 11, color: T.textSub, fontWeight: 600, letterSpacing: 0.5 }}>{qid}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Dashboard nav */}
          <button onClick={() => setAppPage(p => p === "dashboard" ? "builder" : "dashboard")} style={{ padding: "6px 12px", background: appPage === "dashboard" ? "rgba(23,160,102,0.15)" : "transparent", border: `1px solid ${appPage === "dashboard" ? T.green : T.borderMed}`, borderRadius: 7, color: appPage === "dashboard" ? T.greenLt : T.textSub, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="8" width="3" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="5.5" y="5" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="10" y="1" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>
            Dashboard {quoteLog.length > 0 && <span style={{ background: T.green, color: "#fff", borderRadius: 10, fontSize: 9.5, padding: "1px 5px", fontWeight: 700 }}>{quoteLog.length}</span>}
          </button>
          {/* Quote Log (history drawer) */}
          <button onClick={() => setShowQuoteLog(p => !p)} style={{ padding: "6px 12px", background: showQuoteLog ? "rgba(23,160,102,0.12)" : "transparent", border: `1px solid ${showQuoteLog ? T.green : T.borderMed}`, borderRadius: 7, color: T.textSub, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4.5h6M4 7h6M4 9.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            History
          </button>

          {/* PDF Theme Toggle */}
          <div style={{ display: "flex", background: T.surfaceHigh, borderRadius: 8, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            {[["green","Green"],["navy","Navy"],["gold","Gold"]].map(([t, label]) => (
              <button key={t} onClick={() => setPdfTheme(t)}
                style={{ padding: "6px 12px", background: pdfTheme === t ? (t === "gold" ? "#d97706" : t === "navy" ? "#1a3360" : T.green) : "transparent", border: "none", color: pdfTheme === t ? "#fff" : T.textMuted, cursor: "pointer", fontSize: 11.5, fontWeight: 600 }}>
                {label}
              </button>
            ))}
          </div>
          {preview ? (
            <>
              <button onClick={() => setPreview(false)} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${T.borderMed}`, borderRadius: 7, color: T.textSub, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>← Edit</button>
              <button onClick={handleBuilderWhatsAppShare} title="Send via WhatsApp"
                style={{ padding: "8px 16px", background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.35)", borderRadius: 7, color: "#25d366", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.096.537 4.07 1.482 5.793L.057 24l6.345-1.438A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.49-5.186-1.348l-.371-.214-3.768.854.888-3.662-.233-.38A10 10 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                WhatsApp
              </button>
              <button onClick={download} style={{ padding: "8px 20px", background: `linear-gradient(135deg, ${T.green}, ${T.greenDk})`, border: "none", borderRadius: 7, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>↓ Download PDF</button>
            </>
          ) : null}
        </div>
      </div>

      {/* ── DRAFT RESTORE BANNER ── */}
      {draftBanner && (
        <div style={{ background: "rgba(217,119,6,0.08)", borderBottom: "1px solid rgba(217,119,6,0.25)", padding: "10px 28px", display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#d97706" strokeWidth="1.5"/><path d="M8 4.5v4l2.5 2" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span style={{ fontSize: 12.5, color: "#d97706", fontWeight: 600 }}>Unsaved draft found</span>
          <span style={{ fontSize: 12, color: "#92400e" }}>
            {draftBanner.clientName ? `${draftBanner.clientName} · ` : ""}{draftBanner.companyName || ""}
            {draftBanner._savedAt ? ` · ${new Date(draftBanner._savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={() => restoreDraft(draftBanner)}
              style={{ padding: "5px 14px", background: "#d97706", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Restore Draft
            </button>
            <button onClick={() => { clearDraft(); setDraftBanner(null); }}
              style={{ padding: "5px 12px", background: "transparent", border: "1px solid rgba(217,119,6,0.3)", borderRadius: 6, color: "#92400e", fontSize: 12, cursor: "pointer" }}>
              Discard
            </button>
          </div>
        </div>
      )}

      {/* ── QUOTE LOG DRAWER ── */}
      {showQuoteLog && (
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "16px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Quote History</div>
              {/* Filter tabs */}
              <div style={{ display: "flex", background: T.surfaceHigh, borderRadius: 7, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                {[["all","All"], ["pending","Pending"], ["won","Won"], ["lost","Lost"]].map(([f, label]) => (
                  <button key={f} onClick={() => setLogFilter(f)}
                    style={{ padding: "4px 12px", background: logFilter === f ? (f === "won" ? "rgba(34,197,94,0.2)" : f === "lost" ? "rgba(239,68,68,0.15)" : T.green) : "transparent", border: "none", color: logFilter === f ? (f === "won" ? "#4ade80" : f === "lost" ? "#f87171" : "#fff") : T.textMuted, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                    {label} <span style={{ opacity: 0.7 }}>({quoteLog.filter(q => f === "all" || q.status === f || (!q.status && f === "pending")).length})</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowQuoteLog(false)} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
          {quoteLog.length === 0 ? (
            <div style={{ fontSize: 13, color: T.textMuted, padding: "12px 0" }}>No quotes saved yet. Generate a quotation and it will appear here.</div>
          ) : (() => {
            const filtered = quoteLog.filter(q => logFilter === "all" || q.status === logFilter || (!q.status && logFilter === "pending"));
            return filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: T.textMuted, padding: "8px 0" }}>No {logFilter} quotes.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 8 }}>
                {filtered.map(q => {
                  const status = q.status || "pending";
                  const statusColors = { won: { bg: "rgba(34,197,94,0.1)", border: "#4ade80", text: "#4ade80", label: "Won" }, lost: { bg: "rgba(239,68,68,0.08)", border: "#f87171", text: "#f87171", label: "Lost" }, pending: { bg: T.surfaceHigh, border: T.border, text: T.textMuted, label: "Pending" } };
                  const sc = statusColors[status];
                  const daysOpen = q.closedAt ? Math.round((q.closedAt - q.timestamp) / 86400000) : Math.round((Date.now() - (q.timestamp || Date.now())) / 86400000);
                  return (
                    <div key={q.qid} style={{ padding: "12px 14px", background: sc.bg, borderRadius: 10, border: `1px solid ${sc.border}`, transition: "all 0.15s" }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{q.clientName}</div>
                          <div style={{ fontSize: 11, color: T.textMuted }}>{q.companyName}</div>
                        </div>
                        <span style={{ fontSize: 9, color: T.textMuted, background: "#0d1520", borderRadius: 4, padding: "2px 6px", border: `1px solid ${T.border}`, fontWeight: 500, letterSpacing: 0.3 }}>{q.qid}</span>
                      </div>
                      {/* Stats row */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: T.textSub }}>{q.plan} · {q.billing}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.greenLt }}>₹{Number(q.totalGST || 0).toLocaleString("en-IN")}</span>
                        <span style={{ fontSize: 10.5, color: T.textMuted }}>{q.date}</span>
                        {daysOpen > 0 && <span style={{ fontSize: 10.5, color: status === "won" ? "#4ade80" : status === "lost" ? "#f87171" : T.textMuted }}>{status === "pending" ? `${daysOpen}d open` : `closed in ${daysOpen}d`}</span>}
                      </div>
                      {/* Lost reason */}
                      {status === "lost" && q.lostReason && (
                        <div style={{ fontSize: 11, color: "#f87171", marginBottom: 6, fontStyle: "italic" }}>"{q.lostReason}"</div>
                      )}
                      {/* Confidence stars */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 7 }}>
                        <span style={{ fontSize: 10, color: T.textMuted, marginRight: 3 }}>Confidence:</span>
                        {[1,2,3,4,5].map(star => (
                          <button key={star} onClick={() => handleConfidenceChange(q.qid, q.confidence === star ? 0 : star)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "0 1px", fontSize: 14, color: (q.confidence || 0) >= star ? "#f59e0b" : T.textMuted, lineHeight: 1 }}>
                            {(q.confidence || 0) >= star ? "★" : "☆"}
                          </button>
                        ))}
                        {q.confidence > 0 && <span style={{ fontSize: 10, color: "#f59e0b", marginLeft: 2 }}>{["","Low","Low","Medium","High","Very High"][q.confidence]}</span>}
                      </div>
                      {/* Status buttons + actions */}
                      <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                        {["won", "pending", "lost"].map(s => (
                          <button key={s} onClick={() => handleStatusChange(q.qid, s)}
                            style={{ padding: "3px 9px", borderRadius: 5, border: `1px solid ${s === "won" ? "#4ade80" : s === "lost" ? "#f87171" : T.borderMed}`, background: status === s ? (s === "won" ? "rgba(34,197,94,0.2)" : s === "lost" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)") : "transparent", color: s === "won" ? "#4ade80" : s === "lost" ? "#f87171" : T.textMuted, fontSize: 10.5, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                            {s === "won" ? "✓ Won" : s === "lost" ? "✗ Lost" : "⏳ Pending"}
                          </button>
                        ))}
                        <div style={{ marginLeft: "auto", display: "flex", gap: 5, alignItems: "center" }}>
                          <button onClick={() => handleWhatsAppShare(q)} title="Share on WhatsApp"
                            style={{ padding: "3px 8px", background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)", borderRadius: 5, color: "#25d366", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                            WA
                          </button>
                          <button onClick={() => loadFromLog(q)}
                            style={{ padding: "3px 10px", background: T.green, border: "none", borderRadius: 5, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                            Load
                          </button>
                          <button onClick={() => handleDeleteQuote(q.qid)}
                            title={confirmDelete === q.qid ? "Click again to confirm" : "Delete quote"}
                            style={{ padding: "3px 8px", background: confirmDelete === q.qid ? "rgba(239,68,68,0.2)" : "transparent", border: `1px solid ${confirmDelete === q.qid ? "#f87171" : T.border}`, borderRadius: 5, color: confirmDelete === q.qid ? "#f87171" : T.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                            {confirmDelete === q.qid ? "Confirm ✕" : "✕"}
                          </button>
                        </div>
                      </div>
                      {/* Lost reason input */}
                      {status === "lost" && (
                        <div style={{ marginTop: 7, display: "flex", gap: 5 }}>
                          <input value={lostReasonInput[q.qid] || q.lostReason || ""}
                            onChange={e => setLostReasonInput(p => ({ ...p, [q.qid]: e.target.value }))}
                            placeholder="Reason for loss (e.g. price, competitor, no budget)"
                            style={{ ...baseInput, fontSize: 11, padding: "5px 9px" }}
                            onBlur={e => { if (e.target.value !== q.lostReason) handleStatusChange(q.qid, "lost", e.target.value); }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}



      {/* ── DASHBOARD PAGE ── */}
      {appPage === "dashboard" && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 28px 80px" }}>
          {(() => {
            const all = quoteLog;
            const won = all.filter(q => q.status === "won");
            const lost = all.filter(q => q.status === "lost");
            const pending = all.filter(q => !q.status || q.status === "pending");
            const now = Date.now();
            const thisMonth = all.filter(q => q.timestamp && (now - q.timestamp) < 30 * 86400000);
            const avgDeal = won.length > 0 ? Math.round(won.reduce((s, q) => s + (q.totalGST || 0), 0) / won.length) : 0;
            const winRate = (won.length + lost.length) > 0 ? Math.round(won.length / (won.length + lost.length) * 100) : 0;
            const closedDeals = [...won, ...lost].filter(q => q.closedAt && q.timestamp);
            const avgDays = closedDeals.length > 0 ? Math.round(closedDeals.reduce((s, q) => s + (q.closedAt - q.timestamp) / 86400000, 0) / closedDeals.length) : null;
            // Plan performance
            const planStats = {};
            all.forEach(q => {
              if (!planStats[q.plan]) planStats[q.plan] = { won: 0, lost: 0, pending: 0 };
              planStats[q.plan][q.status || "pending"]++;
            });
            // Discount sensitivity
            const discountBuckets = { "0%": { won: 0, lost: 0 }, "1-10%": { won: 0, lost: 0 }, "11-20%": { won: 0, lost: 0 }, "21-30%": { won: 0, lost: 0 } };
            [...won, ...lost].forEach(q => {
              const d = q.discount || 0;
              const bucket = d === 0 ? "0%" : d <= 10 ? "1-10%" : d <= 20 ? "11-20%" : "21-30%";
              discountBuckets[bucket][q.status]++;
            });
            // Loss reasons
            const lossReasons = lost.filter(q => q.lostReason).reduce((acc, q) => {
              const r = q.lostReason.toLowerCase();
              const key = r.includes("price") || r.includes("expensive") || r.includes("cost") ? "Price / Budget"
                : r.includes("competitor") || r.includes("wati") || r.includes("other") ? "Went with competitor"
                : r.includes("time") || r.includes("later") || r.includes("defer") ? "Deferred / Not now"
                : "Other";
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {});
            // Most recent 8 deals for velocity timeline
            const recentDeals = [...all].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 8);
            // Confidence calibration
            const ratedDeals = [...won, ...lost].filter(q => q.confidence > 0);
            const confBuckets = {};
            ratedDeals.forEach(q => {
              const label = ["","⭐","⭐⭐","⭐⭐⭐","⭐⭐⭐⭐","⭐⭐⭐⭐⭐"][q.confidence];
              if (!confBuckets[label]) confBuckets[label] = { won: 0, total: 0 };
              confBuckets[label].total++;
              if (q.status === "won") confBuckets[label].won++;
            });
            const avgConfidence = all.filter(q => q.confidence > 0).length > 0
              ? (all.filter(q => q.confidence > 0).reduce((s, q) => s + q.confidence, 0) / all.filter(q => q.confidence > 0).length).toFixed(1)
              : null;

            const KPI = ({ label, value, sub, color }) => (
              <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: color || T.greenLt, lineHeight: 1 }}>{value}</div>
                {sub && <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 4 }}>{sub}</div>}
              </div>
            );

            const BarRow = ({ label, won, lost, pending, total }) => {
              const wPct = total > 0 ? (won / total * 100) : 0;
              const lPct = total > 0 ? (lost / total * 100) : 0;
              const pPct = total > 0 ? (pending / total * 100) : 0;
              return (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, color: T.text, fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 11.5, color: T.textMuted }}>{total} quote{total !== 1 ? "s" : ""} · {won} won</span>
                  </div>
                  <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: T.surfaceHigh, gap: 1 }}>
                    {wPct > 0 && <div style={{ width: `${wPct}%`, background: "#4ade80", transition: "width 0.4s" }} />}
                    {lPct > 0 && <div style={{ width: `${lPct}%`, background: "#f87171" }} />}
                    {pPct > 0 && <div style={{ width: `${pPct}%`, background: T.border }} />}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 3 }}>
                    <span style={{ fontSize: 10, color: "#4ade80" }}>✓ {won} won</span>
                    <span style={{ fontSize: 10, color: "#f87171" }}>✗ {lost} lost</span>
                    <span style={{ fontSize: 10, color: T.textMuted }}>⏳ {pending} pending</span>
                  </div>
                </div>
              );
            };

            return (
              <>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                  <div>
                    <h2 style={{ fontFamily: "'EB Garamond', serif", fontSize: 28, fontWeight: 600, color: T.text, marginBottom: 4 }}>Sales Dashboard</h2>
                    <div style={{ fontSize: 13, color: T.textMuted }}>Based on {all.length} saved quote{all.length !== 1 ? "s" : ""} · localStorage only · no backend</div>
                  </div>
                  <button onClick={() => setAppPage("builder")} style={{ padding: "9px 20px", background: `linear-gradient(135deg, ${T.green}, ${T.greenDk})`, border: "none", borderRadius: 9, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ New Quote</button>
                </div>

                {all.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: T.textMuted, fontSize: 14 }}>
                    No quotes yet. Generate your first quotation to see analytics here.
                  </div>
                ) : (
                  <>
                    {/* KPI row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
                      <KPI label="Total Quotes" value={all.length} sub={`${thisMonth.length} this month`} />
                      <KPI label="Win Rate" value={`${winRate}%`} sub={`${won.length} won · ${lost.length} lost`} color={winRate >= 50 ? "#4ade80" : "#f59e0b"} />
                      <KPI label="Avg Deal Size" value={avgDeal > 0 ? `₹${Math.round(avgDeal/1000)}k` : "—"} sub="incl. GST · won deals" />
                      <KPI label="Avg Days to Close" value={avgDays != null ? `${avgDays}d` : "—"} sub={closedDeals.length > 0 ? `${closedDeals.length} closed deals` : "No closed deals yet"} color="#f59e0b" />
                      <KPI label="Pipeline Value" value={`₹${Math.round(pending.reduce((s, q) => s + (q.totalGST || 0), 0) / 1000)}k`} sub={`${pending.length} open quotes`} color={T.textSub} />
                    </div>


                    {/* Monthly target */}
                    {(() => {
                      const wonThisMonth = won.filter(q => q.timestamp && (now - q.timestamp) < 30 * 86400000);
                      const wonAmount = wonThisMonth.reduce((s, q) => s + (q.totalGST || 0), 0);
                      const pct = monthlyTarget > 0 ? Math.min(100, Math.round(wonAmount / monthlyTarget * 100)) : 0;
                      return (
                        <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: "16px 20px", marginBottom: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1.2 }}>Monthly Revenue Target</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {editingTarget ? (
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <span style={{ fontSize: 12, color: T.textMuted }}>₹</span>
                                  <input autoFocus type="number" defaultValue={monthlyTarget || ""}
                                    placeholder="e.g. 500000"
                                    onKeyDown={e => { if (e.key === "Enter") saveMonthlyTarget(e.target.value); if (e.key === "Escape") setEditingTarget(false); }}
                                    onBlur={e => saveMonthlyTarget(e.target.value)}
                                    style={{ ...baseInput, width: 120, fontSize: 12, padding: "5px 9px" }} />
                                </div>
                              ) : (
                                <>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{monthlyTarget > 0 ? `₹${(monthlyTarget/100000).toFixed(1)}L target` : "No target set"}</span>
                                  <button onClick={() => setEditingTarget(true)} style={{ fontSize: 11, color: T.greenLt, background: "none", border: `1px solid ${T.borderMed}`, borderRadius: 5, cursor: "pointer", padding: "3px 9px" }}>Edit</button>
                                </>
                              )}
                            </div>
                          </div>
                          {monthlyTarget > 0 ? (
                            <>
                              <div style={{ height: 10, borderRadius: 5, background: T.surfaceHigh, overflow: "hidden", marginBottom: 8 }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#4ade80" : pct >= 60 ? T.green : "#f59e0b", borderRadius: 5, transition: "width 0.5s" }} />
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                                <span style={{ color: pct >= 100 ? "#4ade80" : T.textSub, fontWeight: 600 }}>₹{(wonAmount/100000).toFixed(2)}L closed this month</span>
                                <span style={{ color: pct >= 100 ? "#4ade80" : T.textMuted, fontWeight: 700 }}>{pct}% of ₹{(monthlyTarget/100000).toFixed(1)}L target</span>
                              </div>
                              {pct >= 100 && <div style={{ marginTop: 6, fontSize: 12, color: "#4ade80", fontWeight: 600 }}>🎯 Target hit this month!</div>}
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: T.textMuted }}>Set a monthly target to track progress here.</div>
                          )}
                        </div>
                      );
                    })()}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      {/* Plan performance */}
                      <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: "18px 20px" }}>
                        <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16 }}>Plan Performance</div>
                        {Object.keys(planStats).length === 0 ? <div style={{ color: T.textMuted, fontSize: 12 }}>No data</div> : (
                          Object.entries(planStats).map(([plan, s]) => (
                            <BarRow key={plan} label={plan} won={s.won} lost={s.lost} pending={s.pending} total={s.won + s.lost + s.pending} />
                          ))
                        )}
                      </div>

                      {/* Discount sensitivity */}
                      <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: "18px 20px" }}>
                        <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16 }}>Discount Sensitivity</div>
                        {Object.entries(discountBuckets).map(([bucket, s]) => {
                          const total = s.won + s.lost;
                          const rate = total > 0 ? Math.round(s.won / total * 100) : null;
                          return (
                            <div key={bucket} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                              <div style={{ width: 52, fontSize: 11.5, color: T.text, fontWeight: 600, flexShrink: 0 }}>{bucket}</div>
                              <div style={{ flex: 1, height: 8, borderRadius: 4, background: T.surfaceHigh, overflow: "hidden" }}>
                                {total > 0 && <div style={{ width: `${s.won / total * 100}%`, height: "100%", background: "#4ade80", transition: "width 0.4s" }} />}
                              </div>
                              <div style={{ fontSize: 11, color: T.textMuted, flexShrink: 0, minWidth: 70, textAlign: "right" }}>
                                {total === 0 ? "no data" : `${rate}% win (${total} deals)`}
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ marginTop: 8, fontSize: 11, color: T.textMuted, fontStyle: "italic" }}>Based on {won.length + lost.length} closed deals</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                      {/* Loss reasons */}
                      <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: "18px 20px" }}>
                        <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 }}>Why Deals Are Lost</div>
                        {lost.length === 0 ? (
                          <div style={{ fontSize: 12, color: T.textMuted }}>No lost deals tagged yet.</div>
                        ) : Object.keys(lossReasons).length === 0 ? (
                          <div style={{ fontSize: 12, color: T.textMuted }}>Add loss reasons in quote history to see patterns.</div>
                        ) : (
                          Object.entries(lossReasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                            <div key={reason} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <span style={{ fontSize: 12.5, color: T.textSub }}>{reason}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ display: "flex", gap: 2 }}>
                                  {Array.from({ length: count }).map((_, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: "#f87171" }} />)}
                                </div>
                                <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600, minWidth: 16 }}>{count}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Confidence calibration */}
                      <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: "18px 20px" }}>
                        <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Confidence Calibration</div>
                        <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 14 }}>
                          {avgConfidence ? `Avg confidence: ${avgConfidence}/5 · ${ratedDeals.length} rated deals` : "Rate deals in history to see calibration"}
                        </div>
                        {Object.keys(confBuckets).length === 0 ? (
                          <div style={{ fontSize: 12, color: T.textMuted }}>No rated deals yet. Star deals in quote history.</div>
                        ) : Object.entries(confBuckets).sort((a,b) => a[0].length - b[0].length).map(([label, s]) => {
                          const rate = s.total > 0 ? Math.round(s.won / s.total * 100) : 0;
                          return (
                            <div key={label} style={{ marginBottom: 12 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: "#f59e0b" }}>{label}</span>
                                <span style={{ fontSize: 11, color: T.textMuted }}>{rate}% win · {s.total} deal{s.total !== 1 ? "s" : ""}</span>
                              </div>
                              <div style={{ height: 6, borderRadius: 3, background: T.surfaceHigh, overflow: "hidden" }}>
                                <div style={{ width: `${rate}%`, height: "100%", background: rate >= 60 ? "#4ade80" : rate >= 40 ? "#f59e0b" : "#f87171" }} />
                              </div>
                            </div>
                          );
                        })}
                        {Object.keys(confBuckets).length > 1 && (() => {
                          const sorted = Object.entries(confBuckets).sort((a,b) => a[0].length - b[0].length);
                          const best = sorted.reduce((a, b) => (b[1].won/b[1].total) > (a[1].won/a[1].total) ? b : a);
                          return <div style={{ marginTop: 10, fontSize: 11, color: T.textMuted, fontStyle: "italic" }}>Your {best[0]} deals win most often ({Math.round(best[1].won/best[1].total*100)}%)</div>;
                        })()}
                      </div>

                      {/* Deal velocity timeline */}
                      <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: "18px 20px" }}>
                        <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 }}>Recent Deals</div>
                        {recentDeals.map(q => {
                          const status = q.status || "pending";
                          const daysOpen = q.closedAt ? Math.round((q.closedAt - q.timestamp) / 86400000) : Math.round((Date.now() - (q.timestamp || Date.now())) / 86400000);
                          const dotColor = status === "won" ? "#4ade80" : status === "lost" ? "#f87171" : "#f59e0b";
                          return (
                            <div key={q.qid} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9, padding: "7px 10px", background: T.surfaceHigh, borderRadius: 7 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, color: T.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.clientName} — {q.companyName}</div>
                                <div style={{ fontSize: 11, color: T.textMuted }}>{q.plan} · ₹{Number(q.totalGST || 0).toLocaleString("en-IN")}</div>
                              </div>
                              <div style={{ flexShrink: 0, textAlign: "right" }}>
                                <div style={{ fontSize: 10.5, color: dotColor, fontWeight: 600, textTransform: "capitalize" }}>{status}</div>
                                <div style={{ fontSize: 10, color: T.textMuted }}>{daysOpen}d</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      {appPage === "builder" && !preview ? (
        <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
          {/* ── LEFT: Form panel ── */}
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
            {/* Pill steps sub-header (Concept B style) */}
            <div style={{ borderBottom: `1px solid ${T.border}`, background: T.surface, padding: "0 32px", display: "flex", alignItems: "center", gap: 4 }}>
              {/* Progress bar under steps */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "12px 0", flex: 1 }}>
                {STEPS.map((s, i) => {
                  const done = step > i + 1;
                  const active = step === i + 1;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center" }}>
                      <div
                        onClick={() => done && setStep(i + 1)}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 20, background: active ? T.green : done ? "rgba(23,160,102,0.12)" : "transparent", border: `1.5px solid ${active ? T.green : done ? T.green : T.border}`, cursor: done ? "pointer" : "default", transition: "all 0.2s" }}
                      >
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: active ? "rgba(255,255,255,0.25)" : done ? T.green : T.surfaceHigh, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: active || done ? "#fff" : T.textMuted, flexShrink: 0 }}>
                          {done ? "✓" : i + 1}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: active ? 700 : done ? 600 : 400, color: active ? "#fff" : done ? T.greenLt : T.textMuted, whiteSpace: "nowrap" }}>{s}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div style={{ width: 20, height: 1.5, background: done ? T.green : T.border, transition: "background 0.3s", flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Running total in step bar */}
              {(planPrice > 0) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 16, borderLeft: `1px solid ${T.border}`, marginLeft: 4 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: 0.5 }}>Total incl. GST</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.greenLt }}>₹{fmtINR(totalGST)}</div>
                  </div>
                </div>
              )}
            </div>
            {/* Step content */}
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 28px 100px" }}>

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <StepHead title="Client Information" sub="Enter the recipient's details for this quotation." />
              {/* Welcome banner */}
              <div style={{ margin: "0 0 20px", padding: "20px 24px", background: "linear-gradient(135deg, rgba(23,160,102,0.08) 0%, rgba(13,21,32,0) 70%)", border: `1px solid rgba(23,160,102,0.15)`, borderRadius: 14, display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(23,160,102,0.12)", border: "1px solid rgba(23,160,102,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2L3 6v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V6L11 2z" stroke="#21c47a" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 11l2 2 4-4" stroke="#21c47a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 3 }}>New Quotation</div>
                  <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>Fill in the client details below, or load a saved template to get started quickly.</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Quote ID</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.greenLt, fontFamily: "monospace" }}>{qid}</div>
                </div>
              </div>

              {/* Templates panel */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: showTemplates ? 12 : 0 }}>
                  <button onClick={() => setShowTemplates(p => !p)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", background: showTemplates ? "rgba(23,160,102,0.1)" : "rgba(23,160,102,0.05)", border: `1.5px solid ${showTemplates ? T.green : T.borderMed}`, borderRadius: 9, color: T.greenLt, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><rect x="1" y="1" width="12" height="12" rx="2" stroke="#21c47a" strokeWidth="1.3"/><path d="M4 5h6M4 7.5h6M4 10h4" stroke="#21c47a" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    {templates.length > 0 ? "Load Saved Template" : "Saved Templates"}
                    {templates.length > 0 && <span style={{ background: T.green, color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 6px", fontWeight: 700 }}>{templates.length}</span>}
                    <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 2 }}>{showTemplates ? "▲" : "▼"}</span>
                  </button>
                  {/* Toast — shown after loading */}
                  {loadedTemplateName && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "rgba(23,160,102,0.12)", border: `1px solid ${T.green}`, borderRadius: 20, fontSize: 12, color: T.greenLt, fontWeight: 600, animation: "fadeIn 0.2s ease" }}>
                      <span style={{ fontSize: 11 }}>✓</span> "{loadedTemplateName}" loaded — continue to Step 2 to confirm
                    </div>
                  )}
                </div>

                {showTemplates && (
                  <div style={{ background: T.surfaceHigh, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                    {templates.length === 0 ? (
                      <div style={{ padding: "24px", textAlign: "center" }}>
                        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 4 }}>No saved templates yet</div>
                        <div style={{ fontSize: 11.5, color: T.textMuted }}>Configure a quote in Steps 2–3, then save it from Step 4</div>
                      </div>
                    ) : (
                      <div>
                        {templates.map((t, i) => {
                          const PLANS_MAP = { standard: "Standard", pro: "Pro", enterprise: "Enterprise" };
                          const addonCount = (t.addons || []).length + (t.customAddonsList || []).length;
                          return (
                            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: i < templates.length - 1 ? `1px solid ${T.border}` : "none", transition: "background 0.1s" }}
                              onMouseEnter={e => e.currentTarget.style.background = "rgba(23,160,102,0.03)"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text, marginBottom: 4 }}>{t.name}</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {[
                                    PLANS_MAP[t.plan] || t.plan,
                                    t.billing?.charAt(0).toUpperCase() + t.billing?.slice(1),
                                    t.discount > 0 && `${t.discount}% off`,
                                    addonCount > 0 && `${addonCount} add-on${addonCount > 1 ? "s" : ""}`,
                                    t.enterpriseCustomPrice && `₹${Number(t.enterpriseCustomPrice).toLocaleString("en-IN")}`,
                                  ].filter(Boolean).map(badge => (
                                    <span key={badge} style={{ fontSize: 10.5, color: T.textSub, background: "#0d1520", border: `1px solid ${T.border}`, borderRadius: 12, padding: "2px 8px" }}>{badge}</span>
                                  ))}
                                  <span style={{ fontSize: 10.5, color: T.textMuted }}>{t.createdAt}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => loadTemplate(t)}
                                style={{ flexShrink: 0, padding: "6px 18px", background: T.green, border: "none", borderRadius: 7, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                              >
                                Load
                              </button>
                              <button onClick={() => deleteTemplate(t.id)} style={{ flexShrink: 0, background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14, padding: "0 2px", lineHeight: 1 }}>✕</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <PanelCard>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.6px", color: "#64748b", textTransform: "uppercase", marginBottom: 18 }}>Client Details</div>
                <div style={{ display: "grid", gap: 20 }}>
                  <FField label="Client's Full Name *"><input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Anurag Sharma" style={baseInput} /></FField>
                  <FField label="Company Name *">
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <input value={companyName} onChange={e => { setCompanyName(e.target.value); setAutoFillDone(false); }} placeholder="e.g. XFAS Logistics" style={{ ...baseInput, flex: 1 }} />
                      {GROQ_API_KEY && companyName.trim().length > 2 && (
                        <button
                          onClick={handleAutoFill}
                          disabled={autoFillLoading}
                          title="AI: pre-fill scope & context from company name"
                          style={{ flexShrink: 0, padding: "0 14px", height: 42, background: autoFillDone ? "rgba(23,160,102,0.15)" : "rgba(23,160,102,0.07)", border: `1.5px solid ${autoFillDone ? T.green : T.borderMed}`, borderRadius: 8, color: autoFillDone ? T.greenLt : T.textSub, cursor: autoFillLoading ? "wait" : "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
                        >
                          {autoFillLoading
                            ? <><span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: T.greenLt, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Searching…</>
                            : autoFillDone ? "✓ AI filled" : "✨ Auto-fill"
                          }
                        </button>
                      )}
                    </div>
                    {autoFillDone && <div style={{ marginTop: 5, fontSize: 11.5, color: T.greenLt }}>✓ Scope pre-filled from company context — review in Step 4</div>}
                  </FField>
                  <FField label="Email Address"><input value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. contact@xfaslogistics.com" type="email" style={baseInput} /></FField>
                  <FField label="Client Company Logo">
                    <div onClick={() => logoRef.current.click()} style={{ border: `2px dashed ${clientLogo ? T.green : T.border}`, borderRadius: 11, padding: clientLogo ? "20px 24px" : "30px 24px", textAlign: "center", cursor: "pointer", background: clientLogo ? "rgba(23,160,102,0.04)" : "#0d1520", transition: "all 0.2s" }} onMouseEnter={e => !clientLogo && (e.currentTarget.style.borderColor = T.greenDk)} onMouseLeave={e => !clientLogo && (e.currentTarget.style.borderColor = T.border)}>
                      {clientLogo ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                          <div style={{ background: "#fff", borderRadius: 8, padding: "10px 20px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            <img src={clientLogo} alt="logo" style={{ maxHeight: 56, maxWidth: 200, objectFit: "contain", display: "block" }} />
                          </div>
                          <span style={{ fontSize: 12, color: T.greenLt }}>Click to replace</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 28, color: T.textMuted, marginBottom: 8, lineHeight: 1 }}>+</div>
                          <div style={{ fontSize: 14, color: T.textSub, marginBottom: 4 }}>Upload client logo</div>
                          <div style={{ fontSize: 11.5, color: T.textMuted }}>PNG, JPG or SVG &nbsp;·&nbsp; Will appear prominently on the quotation</div>
                        </>
                      )}
                      <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                    </div>
                    {clientLogo && <button onClick={() => setClientLogo(null)} style={{ marginTop: 8, background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 12, padding: 0 }}>✕ Remove logo</button>}
                  </FField>
                </div>
                <NavBtns next={() => setStep(2)} nextDisabled={!clientName || !companyName} />
              </PanelCard>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <StepHead title="Plan & Billing" sub="Choose the billing cycle and DoubleTick plan to propose." />
              <PanelCard>
                {/* ── VARIANT A: Segmented billing pill ── */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.6px", color: "#64748b", textTransform: "uppercase", marginBottom: 10 }}>Billing Cycle</div>
                  <div style={{ display: "flex", background: "#0b1520", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 4, gap: 2 }}>
                    {[
                      ["monthly", "Monthly", "Custom / Approval"],
                      ["quarterly", "Quarterly", "Standard"],
                      ["halfYearly", "Bi-Annual", "6 Months"],
                      ["yearly", "Yearly", "Best Value"],
                    ].map(([b, label, badge]) => (
                      <div key={b} onClick={() => { setBilling(b); setAddonQty({}); }} style={{ flex: 1, padding: "10px 8px", borderRadius: 9, cursor: "pointer", textAlign: "center", background: billing === b ? "rgba(23,160,102,0.12)" : "transparent", transition: "all 0.18s" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: billing === b ? T.greenLt : "#64748b", transition: "color 0.18s" }}>{label}</div>
                        <div style={{ fontSize: 10, color: billing === b ? "rgba(74,222,128,0.6)" : "#374151", marginTop: 3 }}>{badge}</div>
                      </div>
                    ))}
                  </div>
                  {billing === "monthly" && <div style={{ marginTop: 8, padding: "8px 13px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, fontSize: 11.5, color: "#f59e0b" }}>{plan === "enterprise" ? "Enterprise monthly pricing is custom — enter the agreed amount below." : "Monthly billing requires management approval before sending."}</div>}
                </div>

                {/* ── VARIANT A: 3-column horizontal plan cards ── */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.6px", color: "#64748b", textTransform: "uppercase", marginBottom: 10 }}>Plan</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {Object.entries(PLANS).map(([key, p]) => {
                      const isEnt = key === "enterprise";
                      const basePrice = isEnt ? (parseInt(enterpriseCustomPrice.replace(/[^0-9]/g, ""), 10) || null) : (p[billing] ?? p.quarterly);
                      const aiExtra = isEnt && enterpriseAIBots ? (billing === "quarterly" ? 45000 : billing === "yearly" ? 180000 : 15000) : 0;
                      const displayPrice = basePrice != null ? basePrice + aiExtra : null;
                      const isSelected = plan === key;
                      const billingShort = billing === "monthly" ? "mo" : billing === "quarterly" ? "qtr" : billing === "halfYearly" ? "6mo" : "yr";
                      const discountedPrice = Math.round((displayPrice ?? 0) * (1 - discount / 100));
                      return (
                        <div key={key} style={{ position: "relative" }}>
                          <div onClick={() => setPlan(key)} style={{ border: `1.5px solid ${isSelected ? T.green : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: "16px 14px", cursor: "pointer", background: isSelected ? "rgba(13,31,19,0.9)" : "#0f1822", transition: "all 0.18s", height: "100%" }}>
                            {/* Radio indicator */}
                            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${isSelected ? T.green : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, transition: "all 0.15s" }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, transform: isSelected ? "scale(1)" : "scale(0)", transition: "transform 0.15s" }} />
                            </div>
                            {key === "pro" && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 5, background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)", letterSpacing: "0.3px" }}>POPULAR</div>}
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 3 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 14, lineHeight: 1.4 }}>{p.subtitle}</div>
                            {isEnt ? (
                              <div>
                                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Custom {billing} price</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: T.white }}>₹</span>
                                  <input value={enterpriseCustomPrice} onChange={e => setEnterpriseCustomPrice(e.target.value)} onClick={e => e.stopPropagation()} placeholder="45,000" style={{ width: "100%", padding: "6px 8px", background: "#0d1520", border: `1.5px solid ${T.green}`, borderRadius: 7, color: T.white, fontSize: 14, fontWeight: 700, outline: "none", fontFamily: "inherit" }} />
                                </div>
                                {enterpriseCustomPrice && (() => {
                                  const raw = parseInt(enterpriseCustomPrice.replace(/[^0-9]/g,""),10) || 0;
                                  return raw > 0 ? (
                                    <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(23,160,102,0.06)", borderRadius: 8, border: "1px solid rgba(23,160,102,0.15)" }}>
                                      <div style={{ fontSize: 20, fontWeight: 800, color: T.greenLt, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                                        ₹{fmtINR(raw)}
                                        <span style={{ fontSize: 11, fontWeight: 400, color: "#64748b", marginLeft: 4 }}>/{billingShort}</span>
                                      </div>
                                      <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 3 }}>+GST · ₹{fmtINR(Math.round(raw * 1.18))} total</div>
                                    </div>
                                  ) : null;
                                })()}
                                <div style={{ fontSize: 10, color: enterpriseAIBots ? T.greenLt : "#475569", marginTop: 4 }}>{enterpriseAIBots ? `+₹${billing==="yearly"?"1,80,000":billing==="quarterly"?"45,000":"15,000"} AI Bots` : "without AI Bots"}</div>
                              </div>
                            ) : (
                              <div>
                                {discount > 0 && <div style={{ fontSize: 11, color: "#475569", textDecoration: "line-through", marginBottom: 2 }}>₹{fmtINR(displayPrice ?? 0)}</div>}
                                <div style={{ fontSize: 22, fontWeight: 800, color: isSelected ? T.greenLt : "#f8fafc", letterSpacing: "-0.5px" }}>₹{fmtINR(discountedPrice)}</div>
                                {discount > 0 && <div style={{ fontSize: 10, color: T.greenLt, fontWeight: 600, marginTop: 1 }}>{discount}% off</div>}
                                <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 3 }}>+GST · ₹{fmtINR(Math.round(discountedPrice * 1.18))} total</div>
                              </div>
                            )}
                            {isEnt && isSelected && enterpriseCustomPrice && (
                              <EnterpriseTierBadge customPrice={enterpriseCustomPrice} billing={billing} />
                            )}
                          </div>
                          {/* Enterprise AI Bots toggle below card when selected */}
                          {isSelected && isEnt && (
                            <div style={{ marginTop: 8, padding: "11px 14px", background: T.surfaceHigh, borderRadius: 9, border: `1px solid ${T.borderMed}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>AI Chat Bots?</div>
                                <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 1 }}>+₹15k/mo · ChatGPT Plus req.</div>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={e => { e.stopPropagation(); setEnterpriseAIBots(false); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${!enterpriseAIBots ? T.green : T.border}`, background: !enterpriseAIBots ? "rgba(23,160,102,0.1)" : "transparent", color: !enterpriseAIBots ? T.greenLt : T.textSub, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>No</button>
                                <button onClick={e => { e.stopPropagation(); setEnterpriseAIBots(true); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${enterpriseAIBots ? T.green : T.border}`, background: enterpriseAIBots ? "rgba(23,160,102,0.1)" : "transparent", color: enterpriseAIBots ? T.greenLt : T.textSub, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Yes</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── VARIANT A: Features box ── */}
                <div style={{ marginTop: 18, background: "#0f1822", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.3px", textTransform: "uppercase" }}>Included Features</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, color: "#475569" }}>{customFeatures ? "Manually edited" : "Auto-computed from price"}</span>
                      <button onClick={() => setCustomFeatures(null)} style={{ fontSize: 11, color: T.greenLt, cursor: "pointer", textDecoration: "none", background: "none", border: "none", padding: 0, fontFamily: "inherit" }}>Reset to auto</button>
                      {customFeatures && <span style={{ fontSize: 10, background: "rgba(23,160,102,0.15)", color: T.greenLt, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Edited</span>}
                    </div>
                  </div>
                  <div style={{ padding: "6px 10px 2px" }}>
                    {enterpriseFeatures.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 7, transition: "background 0.12s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, color: "#cbd5e1" }}>{f}</span>
                        <button
                          onClick={() => setCustomFeatures((enterpriseFeatures).filter((_, fi) => fi !== i))}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13, padding: "0 2px", lineHeight: 1, flexShrink: 0, opacity: 0.7 }}
                          title="Remove feature"
                          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={newFeatureText}
                      onChange={e => setNewFeatureText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newFeatureText.trim()) {
                          setCustomFeatures([...enterpriseFeatures, newFeatureText.trim()]);
                          setNewFeatureText("");
                        }
                      }}
                      placeholder="Add a feature (press Enter or click +)"
                      style={{ ...baseInput, fontSize: 13, padding: "8px 12px" }}
                    />
                    <button
                      onClick={() => {
                        if (!newFeatureText.trim()) return;
                        setCustomFeatures([...enterpriseFeatures, newFeatureText.trim()]);
                        setNewFeatureText("");
                      }}
                      style={{ flexShrink: 0, background: T.green, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 16px", cursor: "pointer" }}
                    >+</button>
                  </div>
                </div>

                {/* ── DISCOUNT PANEL ── */}
                <DiscountPanel
                  label="Plan Discount"
                  sub="Applies to plan base price only"
                  value={discount}
                  onChange={setDiscount}
                  previewOriginal={planPriceOriginal}
                  previewFinal={planPrice}
                  previewLabel="Plan price after discount"
                />
                <NavBtns prev={() => setStep(1)} next={() => setStep(3)} />
              </PanelCard>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <StepHead title="Add-on Features" sub={`Add-ons for DoubleTick ${planData.name} · ${effectiveBillingLabel} billing`} />
              <PanelCard>
                {/* Group addons by group label */}
                {["Platform Features", "Users & Numbers", "Integrations", "Platform Extras", "One-Time & Usage", "Calling Infrastructure"].map(groupName => {
                  const groupItems = planAddons.filter(a => a.group === groupName);
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={groupName} style={{ marginBottom: 26 }}>
                      {/* Group header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{ fontSize: 9.5, color: "#4a6070", textTransform: "uppercase", letterSpacing: 2.5, fontWeight: 700, whiteSpace: "nowrap" }}>{groupName}</div>
                        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, #1c2836, transparent)" }} />
                      </div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {groupItems.map(a => {
                          const on = addons.includes(a.id);
                          const qty = getQty(a.id);
                          const unitPrice = getAddonUnitPrice(a, plan, billing);
                          const lineTotal = getAddonLinePrice(a);
                          return (
                            <div key={a.id} style={{ borderRadius: 12, border: `1.5px solid ${on ? T.green : T.border}`, background: on ? "rgba(23,160,102,0.04)" : "#0e1620", transition: "border-color 0.15s, background 0.15s", overflow: "hidden", boxShadow: on ? "0 0 0 1px rgba(23,160,102,0.15)" : "none" }}>
                              {/* Main row */}
                              <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                                {/* Checkbox */}
                                <div onClick={() => toggleAddon(a.id)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${on ? T.green : "#243242"}`, background: on ? T.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", marginTop: 3, transition: "all 0.15s" }}>
                                  {on && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                {/* Label + desc */}
                                <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => toggleAddon(a.id)}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 13.5, fontWeight: 600, color: on ? "#e4eaf0" : "#6d8497", lineHeight: 1.3 }}>{a.label}</span>
                                    {a.isInstagram && <span style={{ fontSize: 9.5, background: "rgba(131,58,180,0.18)", color: "#c084fc", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 10, padding: "2px 8px", fontWeight: 700, letterSpacing: 0.3 }}>NEW</span>}
                                  </div>
                                  {a.desc && <div style={{ fontSize: 12, color: "#4a6070", lineHeight: 1.6, maxWidth: 380 }}>{a.desc}</div>}
                                </div>
                                {/* Price block */}
                                <div style={{ flexShrink: 0, textAlign: "right", paddingLeft: 8 }}>
                                  {a.custom ? (
                                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#c084fc" }}>{a.custom}</div>
                                  ) : unitPrice != null ? (
                                    <>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: on ? "#21c47a" : "#6d8497", letterSpacing: "-0.3px" }}>
                                        ₹{fmtINR(unitPrice)}
                                        {a.perUnit && <span style={{ fontSize: 10, fontWeight: 500, color: "#3d5264" }}>/{a.unitLabel}</span>}
                                      </div>
                                      <div style={{ fontSize: 10.5, color: "#3d5264", marginTop: 1 }}>{BILLING_LABELS[billing]}</div>
                                    </>
                                  ) : (
                                    <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, padding: "3px 8px", background: "rgba(245,158,11,0.08)", borderRadius: 6 }}>Not available</div>
                                  )}
                                </div>
                              </div>
                              {/* PSTN configurator */}
                              {a.id === "pstn" && on && (
                                <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>Configure Channels</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: "#d1d5db" }}>Channels:</span>
                                    <button onClick={() => setPstnChannels(Math.max(1, pstnChannels - 1))} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #374151", background: "#1f2937", color: "#fff", cursor: "pointer", fontSize: 14 }}>−</button>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", minWidth: 24, textAlign: "center" }}>{pstnChannels}</span>
                                    <button onClick={() => setPstnChannels(pstnChannels + 1)} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #374151", background: "#1f2937", color: "#fff", cursor: "pointer", fontSize: 14 }}>+</button>
                                  </div>
                                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>DoubleTick fee: ₹{pstnChannels * 150}/month ({pstnChannels} × ₹150)</div>
                                  <div style={{ fontSize: 11, color: "#f59e0b" }}>Tata Tele: ₹{pstnChannels * 700}/month — paid directly to TTBS (not in quote)</div>
                                  <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, cursor: "pointer" }}>
                                    <input type="checkbox" checked={pstnAICalling} onChange={(e) => setPstnAICalling(e.target.checked)} style={{ accentColor: "#10b981" }} />
                                    <span style={{ fontSize: 12, color: "#d1d5db" }}>Add AI Calling (+₹5/min)</span>
                                  </label>
                                  {pstnAICalling && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Calling charges: ₹0.40/min + AI: ₹5/min</div>}
                                </div>
                              )}
                              {/* Quantity row */}
                              {on && a.perUnit && unitPrice != null && (
                                <div style={{ borderTop: `1px solid ${T.border}`, padding: "10px 16px", background: "rgba(23,160,102,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 11, color: "#4a6070", fontWeight: 500, letterSpacing: 0.3 }}>QTY</span>
                                    <div style={{ display: "flex", alignItems: "center", background: "#0b1015", border: `1px solid #1c2836`, borderRadius: 8, overflow: "hidden" }}>
                                      <button onClick={() => setAddonQty(q => ({ ...q, [a.id]: Math.max(1, (q[a.id] || 1) - 1) }))} style={{ width: 30, height: 30, background: "transparent", border: "none", color: "#e4eaf0", cursor: "pointer", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.1s" }} onMouseEnter={e => e.target.style.background="#1c2836"} onMouseLeave={e => e.target.style.background="transparent"}>−</button>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: "#e4eaf0", minWidth: 32, textAlign: "center", borderLeft: "1px solid #1c2836", borderRight: "1px solid #1c2836", lineHeight: "30px" }}>{qty}</span>
                                      <button onClick={() => setAddonQty(q => ({ ...q, [a.id]: (q[a.id] || 1) + 1 }))} style={{ width: 30, height: 30, background: "transparent", border: "none", color: "#e4eaf0", cursor: "pointer", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.1s" }} onMouseEnter={e => e.target.style.background="#1c2836"} onMouseLeave={e => e.target.style.background="transparent"}>+</button>
                                    </div>
                                    <span style={{ fontSize: 11.5, color: "#4a6070" }}>{a.unitLabel}{qty > 1 ? "s" : ""}</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#21c47a" }}>₹{fmtINR(lineTotal)}</span>
                                    <span style={{ fontSize: 10.5, color: "#3d5264" }}>{BILLING_LABELS[billing]}</span>
                                  </div>
                                </div>
                              )}
                              {/* Per-addon discount row — shown when selected and has a numeric price */}
                              {on && !a.custom && unitPrice != null && (() => {
                                const d = getAddonDiscount(a.id);
                                const presets = [0, 5, 10, 15, 20, 25, 30];
                                const discountedAmt = getAddonDiscountedPrice(a);
                                return (
                                  <div style={{ borderTop: `1px solid ${T.border}`, padding: "10px 16px", background: d > 0 ? "rgba(23,160,102,0.03)" : "#0b1015", transition: "background 0.15s" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontSize: 10.5, color: "#4a6070", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Discount</span>
                                        <div style={{ display: "flex", gap: 4 }}>
                                          {presets.map(v => (
                                            <button key={v} onClick={() => setAddonDiscounts(p => ({ ...p, [a.id]: v }))}
                                              style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${d === v ? "#17a066" : "#1c2836"}`, background: d === v ? "rgba(23,160,102,0.2)" : "transparent", color: d === v ? "#21c47a" : "#3d5264", cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all 0.1s" }}>
                                              {v === 0 ? "None" : `${v}%`}
                                            </button>
                                          ))}
                                          {/* Custom input */}
                                          <div style={{ display: "flex", alignItems: "center", border: `1px solid ${!presets.includes(d) && d > 0 ? "#17a066" : "#1c2836"}`, borderRadius: 5, padding: "2px 6px", background: !presets.includes(d) && d > 0 ? "rgba(23,160,102,0.12)" : "transparent" }}>
                                            <input type="number" min={0} max={30} step={0.5}
                                              value={presets.includes(d) ? "" : (d || "")}
                                              onChange={e => { const v = parseFloat(e.target.value); if (e.target.value === "") { setAddonDiscounts(p => ({ ...p, [a.id]: 0 })); return; } if (!isNaN(v) && v >= 0 && v <= 30) setAddonDiscounts(p => ({ ...p, [a.id]: Math.round(v * 10) / 10 })); }}
                                              placeholder="%" style={{ width: 30, background: "transparent", border: "none", outline: "none", color: "#21c47a", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }} />
                                            <span style={{ fontSize: 10, color: "#3d5264" }}>%</span>
                                          </div>
                                        </div>
                                      </div>
                                      {d > 0 && (
                                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                                          <span style={{ fontSize: 11, color: "#3d5264", textDecoration: "line-through" }}>₹{fmtINR(lineTotal)}</span>
                                          <span style={{ fontSize: 13, fontWeight: 700, color: "#21c47a" }}>₹{fmtINR(discountedAmt)}</span>
                                          <span style={{ fontSize: 10, color: "#3d5264" }}>{BILLING_LABELS[billing]}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Custom Add-on */}
                <div style={{ marginTop: 4, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 9.5, color: "#4a6070", textTransform: "uppercase", letterSpacing: 2.5, fontWeight: 700 }}>Custom Add-on</div>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, #1c2836, transparent)" }} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "center" }}>
                      <input value={newCustomAddon.label} onChange={e => setNewCustomAddon(p => ({ ...p, label: e.target.value }))} placeholder="Add-on name *" style={{ ...baseInput, fontSize: 13, padding: "9px 12px" }} />
                      <input value={newCustomAddon.price} onChange={e => setNewCustomAddon(p => ({ ...p, price: e.target.value }))} placeholder="Price" style={{ ...baseInput, fontSize: 13, padding: "9px 12px", width: 110 }} />
                      <select value={newCustomAddon.billing} onChange={e => setNewCustomAddon(p => ({ ...p, billing: e.target.value }))} style={{ ...baseInput, fontSize: 13, padding: "9px 12px", width: 130, cursor: "pointer" }}>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="halfYearly">Bi-Annual</option>
                        <option value="yearly">Yearly</option>
                        <option value="one-time">One-Time</option>
                        <option value="custom">Custom</option>
                      </select>
                      <button onClick={() => { if (!newCustomAddon.label.trim()) return; setCustomAddonsList(p => [...p, { ...newCustomAddon, id: `custom_${Date.now()}` }]); setNewCustomAddon({ label: "", desc: "", price: "", billing: "custom" }); }} style={{ background: T.green, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 16px", cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</button>
                    </div>
                    <input value={newCustomAddon.desc} onChange={e => setNewCustomAddon(p => ({ ...p, desc: e.target.value }))} placeholder="Description (optional) — shown on the quote" style={{ ...baseInput, fontSize: 12.5, padding: "8px 12px" }} />
                  </div>
                  {customAddonsList.length > 0 && (
                    <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                      {customAddonsList.map(ca => (
                        <div key={ca.id} style={{ padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${T.green}`, background: "rgba(23,160,102,0.05)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{ca.label}</div>
                            {ca.desc && <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3, lineHeight: 1.4 }}>{ca.desc}</div>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                            <span style={{ fontSize: 12, color: T.greenLt, fontWeight: 600 }}>{ca.price ? `₹${Number(ca.price).toLocaleString("en-IN")}` : "—"} · {ca.billing}</span>
                            <button onClick={() => setCustomAddonsList(p => p.filter(x => x.id !== ca.id))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13, padding: 0 }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>



                {/* ── RUNNING TOTAL ── */}
                {(addons.length > 0 || customAddonsList.length > 0) && (
                  <div style={{ marginTop: 14, background: "#0d1520", borderRadius: 12, border: `1px solid #1c2836`, overflow: "hidden" }}>
                    <div style={{ padding: "12px 18px", borderBottom: "1px solid #1c2836", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#3d5264", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Running Total</span>
                      <span style={{ fontSize: 11, color: "#3d5264" }}>{addons.length} add-on{addons.length !== 1 ? "s" : ""} selected</span>
                    </div>
                    <div style={{ padding: "14px 18px" }}>
                      {/* Plan row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #1c2836" }}>
                        <span style={{ fontSize: 13, color: "#6d8497" }}>{planData.name} Plan</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e4eaf0" }}>₹{fmtINR(planPrice)}</span>
                      </div>
                      {/* Addon rows */}
                      {numericAddons.map(a => {
                        const raw = getAddonLinePrice(a);
                        const disc = getAddonDiscount(a.id);
                        const discounted = getAddonDiscountedPrice(a);
                        return (
                          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
                            <div style={{ flex: 1, paddingRight: 10 }}>
                              <span style={{ fontSize: 12.5, color: "#6d8497" }}>
                                {a.label}{a.perUnit && getQty(a.id) > 1 ? <span style={{ color: "#3d5264", fontSize: 11 }}> ×{getQty(a.id)}</span> : ""}
                              </span>
                              {disc > 0 && <span style={{ marginLeft: 6, fontSize: 10.5, color: "#21c47a", fontWeight: 600, background: "rgba(23,160,102,0.12)", borderRadius: 4, padding: "1px 5px" }}>{disc}% off</span>}
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              {disc > 0 && <div style={{ fontSize: 11, color: "#3d5264", textDecoration: "line-through" }}>₹{fmtINR(raw)}</div>}
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: disc > 0 ? "#21c47a" : "#e4eaf0" }}>₹{fmtINR(discounted)}</span>
                            </div>
                          </div>
                        );
                      })}
                      {customAddons.map(a => (
                        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                          <span style={{ fontSize: 12.5, color: "#6d8497" }}>{a.label}</span>
                          <span style={{ fontSize: 12, color: "#c084fc", fontStyle: "italic" }}>Custom</span>
                        </div>
                      ))}
                      {customAddonsList.map(ca => (
                        <div key={ca.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                          <span style={{ fontSize: 12.5, color: "#6d8497" }}>{ca.label}</span>
                          <span style={{ fontSize: 12.5, color: "#e4eaf0", fontWeight: 600 }}>{ca.price ? `₹${Number(ca.price).toLocaleString("en-IN")}` : "—"}</span>
                        </div>
                      ))}
                      {/* Subtotals */}
                      {totalAddonSaving > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "8px 10px", background: "rgba(23,160,102,0.06)", borderRadius: 7 }}>
                          <span style={{ fontSize: 12, color: "#21c47a" }}>Total add-on savings</span>
                          <span style={{ fontSize: 12, color: "#21c47a", fontWeight: 600 }}>−₹{fmtINR(totalAddonSaving)}</span>
                        </div>
                      )}
                      {/* Grand total */}
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1c2836", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#e4eaf0" }}>Total incl. 18% GST</div>
                          <div style={{ fontSize: 11, color: "#3d5264", marginTop: 2 }}>Plan + add-ons + tax</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#21c47a" }}>₹{fmtINR(totalGST)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <NavBtns prev={() => setStep(2)} next={() => setStep(4)} />
              </PanelCard>
            </>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <>
              <StepHead title="Review & Generate" sub="Optionally add a scope note, verify the summary, then generate your quotation." />
              <PanelCard>
                <FField label="Scope of Work (optional)">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {/* LEFT — editable textarea */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <textarea
                        value={scope}
                        onChange={e => setScope(e.target.value)}
                        placeholder={`Lines ending with colon become section headers.\n\nFor Sales:\nMulti-number team inbox\nNative WhatsApp-like app\n\nFor Marketing:\nCTWA Integration\nBulk broadcasts`}
                        rows={12}
                        style={{ ...baseInput, resize: "vertical", lineHeight: 1.7, fontSize: 13, height: "100%", minHeight: 220 }}
                      />
                      <div style={{ fontSize: 11, color: T.textMuted }}>
                        💡 Lines ending with <code style={{ background: "#0d1520", padding: "1px 5px", borderRadius: 3, color: T.greenLt }}>:</code> = section headers · all others = bullets
                      </div>
                    </div>
                    {/* RIGHT — live preview */}
                    <div>
                      <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>Live Preview</div>
                      {scope.trim() ? (
                        <div style={{ transform: "scale(0.88)", transformOrigin: "top left", width: "114%" }}>
                          {renderScopeLines(scope, THEMES.green)}
                        </div>
                      ) : (
                        <div style={{ border: "1.5px dashed #1c2836", borderRadius: 10, padding: "28px 16px", textAlign: "center", color: T.textMuted, fontSize: 12 }}>
                          Your scope preview<br />will appear here
                        </div>
                      )}
                    </div>
                  </div>
                  <AIScopeGenerator
                    scope={scope}
                    onGenerated={(text) => setScope(text)}
                    planName={planData.name}
                    billing={effectiveBillingLabel}
                    clientName={clientName}
                    companyName={companyName}
                  />
                </FField>

                {/* ── SETTINGS ROW: expiry + ROI toggle + template save ── */}
                <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <FField label="Quotation Expiry Date (optional)">
                    <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={{ ...baseInput, fontSize: 13 }} />
                  </FField>
                  <FField label="Save as Template">
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={templateName} onChange={e => setTemplateName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveTemplate()} placeholder='e.g. "Standard Pro Quarterly"' style={{ ...baseInput, fontSize: 13 }} />
                      <button onClick={saveTemplate} disabled={!templateName.trim()} style={{ flexShrink: 0, padding: "0 16px", background: templateName.trim() ? T.green : "#1c2836", border: "none", borderRadius: 8, color: templateName.trim() ? "#fff" : T.textMuted, fontWeight: 700, fontSize: 13, cursor: templateName.trim() ? "pointer" : "not-allowed" }}>Save</button>
                    </div>
                  </FField>
                </div>

                {/* ── ROI PAGE TOGGLE ── */}
                <div style={{ marginTop: 14, borderRadius: 12, border: `1.5px solid ${includeROI ? T.green : T.border}`, overflow: "hidden", transition: "border-color 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: includeROI ? "rgba(23,160,102,0.06)" : T.surfaceHigh }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: includeROI ? "rgba(23,160,102,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${includeROI ? "rgba(23,160,102,0.3)" : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                      <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><rect x="2" y="11" width="3" height="4" rx="1" stroke={includeROI ? "#21c47a" : "#475569"} strokeWidth="1.3"/><rect x="7" y="7" width="3" height="8" rx="1" stroke={includeROI ? "#21c47a" : "#475569"} strokeWidth="1.3"/><rect x="12" y="3" width="3" height="12" rx="1" stroke={includeROI ? "#21c47a" : "#475569"} strokeWidth="1.3"/><path d="M2 8.5l4-3 4 2 5-5" stroke={includeROI ? "#21c47a" : "#475569"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>Include ROI Calculator Page</div>
                      <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, lineHeight: 1.4 }}>AI-generated page estimating cost savings, leads captured, and business impact</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setIncludeROI(false)} style={{ padding: "6px 14px", borderRadius: 7, border: `1.5px solid ${!includeROI ? T.green : T.border}`, background: !includeROI ? "rgba(23,160,102,0.12)" : "transparent", color: !includeROI ? T.greenLt : T.textSub, cursor: "pointer", fontSize: 12.5, fontWeight: 600, transition: "all 0.15s" }}>No</button>
                      <button onClick={() => { setIncludeROI(true); if (!roiText) handleGenerateROI(); }} style={{ padding: "6px 14px", borderRadius: 7, border: `1.5px solid ${includeROI ? T.green : T.border}`, background: includeROI ? "rgba(23,160,102,0.12)" : "transparent", color: includeROI ? T.greenLt : T.textSub, cursor: "pointer", fontSize: 12.5, fontWeight: 600, transition: "all 0.15s" }}>Yes</button>
                    </div>
                  </div>
                  {includeROI && (
                    <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.border}`, background: "#0a1219" }}>
                      {roiLoading ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.textMuted, fontSize: 13, padding: "8px 0" }}>
                          <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: T.greenLt, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                          Generating ROI analysis…
                        </div>
                      ) : roiError ? (
                        <div style={{ fontSize: 12, color: "#f87171", padding: "6px 0" }}>{roiError}</div>
                      ) : roiText ? (
                        <div>
                          <textarea value={roiText} onChange={e => setRoiText(e.target.value)} rows={6} style={{ ...baseInput, fontSize: 12.5, lineHeight: 1.7, resize: "vertical", background: "#0d1520" }} />
                          <button onClick={handleGenerateROI} style={{ marginTop: 8, fontSize: 11.5, color: T.greenLt, background: "rgba(23,160,102,0.06)", border: `1px solid rgba(23,160,102,0.2)`, cursor: "pointer", padding: "5px 12px", borderRadius: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>↺ Regenerate</button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* ── SUMMARY ── */}
                <div style={{ marginTop: 18, background: T.surfaceHigh, borderRadius: 11, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                  <div style={{ padding: "13px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>Quotation Summary</span>
                    <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>{qid}</span>
                  </div>
                  <div style={{ padding: "18px 20px" }}>
                    {[["Client", clientName], ["Company", companyName], email && ["Email", email], ["Plan", `${planData.name} · ${effectiveBillingLabel}`], ["Plan Price", `₹${fmtINR(planPrice)} + 18% GST`], discount > 0 && ["Plan Discount", `${discount}% applied`], plan === "enterprise" && ["Enterprise Type", enterpriseAIBots ? "With AI Bots" : "Without AI Bots"], addons.length > 0 && ["Add-ons", `${addons.length} selected`], totalAddonSaving > 0 && ["Add-on Savings", `−₹${fmtINR(totalAddonSaving)}`], expiryDate && ["Valid Until", new Date(expiryDate).toLocaleDateString("en-IN", {day:"numeric",month:"long",year:"numeric"})], includeROI && ["ROI Page", "Included"]].filter(Boolean).map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ color: T.textMuted, fontSize: 13 }}>{l}</span>
                        <span style={{ color: T.text, fontSize: 13, fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 14, paddingBottom: 2 }}>
                      <span style={{ color: T.textSub, fontSize: 15, fontWeight: 600 }}>Grand Total (incl. GST)</span>
                      <span style={{ color: T.greenLt, fontSize: 17, fontWeight: 700 }}>₹{fmtINR(totalGST)}</span>
                    </div>
                  </div>
                </div>

                {/* ── EMAIL DRAFT ── */}
                <div style={{ marginTop: 14 }}>
                  <button onClick={handleGenerateEmail} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "rgba(23,160,102,0.06)", border: `1.5px solid ${T.borderMed}`, borderRadius: 8, color: T.greenLt, cursor: "pointer", fontSize: 12.5, fontWeight: 600, width: "100%" }}>
                    ✉️ Generate Follow-up Email Draft
                    {emailLoading && <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: T.greenLt, borderRadius: "50%", animation: "spin 0.7s linear infinite", marginLeft: 4 }} />}
                  </button>
                  {showEmailDraft && (emailLoading ? (
                    <div style={{ marginTop: 10, padding: "14px 16px", background: T.surfaceHigh, borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 13, color: T.textMuted }}>Generating email draft…</div>
                  ) : emailError ? (
                    <div style={{ marginTop: 10, padding: "14px 16px", background: "rgba(239,68,68,0.08)", borderRadius: 9, border: "1px solid rgba(239,68,68,0.25)", fontSize: 12, color: "#f87171" }}>{emailError}</div>
                  ) : emailDraft ? (
                    <div style={{ marginTop: 10, background: T.surfaceHigh, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Subject:</span>
                        <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{emailDraft.subject}</span>
                        <button onClick={() => navigator.clipboard?.writeText(`Subject: ${emailDraft.subject}

${emailDraft.body}`)} style={{ marginLeft: "auto", fontSize: 11, color: T.greenLt, background: "none", border: `1px solid ${T.borderMed}`, cursor: "pointer", padding: "2px 8px", borderRadius: 5 }}>Copy</button>
                      </div>
                      <textarea value={emailDraft.body} onChange={e => setEmailDraft(d => ({...d, body: e.target.value}))} rows={10} style={{ ...baseInput, fontSize: 13, lineHeight: 1.7, borderRadius: 0, border: "none", resize: "vertical", borderTop: `1px solid ${T.border}` }} />
                    </div>
                  ) : null)}
                </div>

                {/* ── CASE STUDY TOGGLE ── */}
                <div style={{ marginTop: 14, borderRadius: 12, border: `1.5px solid ${includeCaseStudy ? T.green : T.border}`, overflow: "hidden", transition: "border-color 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: includeCaseStudy ? "rgba(23,160,102,0.06)" : T.surfaceHigh }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: includeCaseStudy ? "rgba(23,160,102,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${includeCaseStudy ? "rgba(23,160,102,0.3)" : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                      <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><rect x="2" y="2" width="13" height="13" rx="2.5" stroke={includeCaseStudy ? "#21c47a" : "#475569"} strokeWidth="1.3"/><path d="M5 6h7M5 8.5h7M5 11h4.5" stroke={includeCaseStudy ? "#21c47a" : "#475569"} strokeWidth="1.3" strokeLinecap="round"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>Include Client Case Studies</div>
                      <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, lineHeight: 1.4 }}>AI picks 2 relevant stories from DoubleTick's real client base based on your scope</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setIncludeCaseStudy(false)} style={{ padding: "6px 14px", borderRadius: 7, border: `1.5px solid ${!includeCaseStudy ? T.green : T.border}`, background: !includeCaseStudy ? "rgba(23,160,102,0.12)" : "transparent", color: !includeCaseStudy ? T.greenLt : T.textSub, cursor: "pointer", fontSize: 12.5, fontWeight: 600, transition: "all 0.15s" }}>No</button>
                      <button onClick={() => { setIncludeCaseStudy(true); if (!caseStudyText) handleGenerateCaseStudy(); }} style={{ padding: "6px 14px", borderRadius: 7, border: `1.5px solid ${includeCaseStudy ? T.green : T.border}`, background: includeCaseStudy ? "rgba(23,160,102,0.12)" : "transparent", color: includeCaseStudy ? T.greenLt : T.textSub, cursor: "pointer", fontSize: 12.5, fontWeight: 600, transition: "all 0.15s" }}>Yes</button>
                    </div>
                  </div>
                  {includeCaseStudy && (
                    <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.border}`, background: "#0a1219" }}>
                      {caseStudyLoading ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.textMuted, fontSize: 13, padding: "8px 0" }}>
                          <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: T.greenLt, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                          Selecting relevant case studies…
                        </div>
                      ) : caseStudyText ? (
                        <div>
                          <textarea value={caseStudyText} onChange={e => setCaseStudyText(e.target.value)} rows={7} style={{ ...baseInput, fontSize: 12.5, lineHeight: 1.7, resize: "vertical", background: "#0d1520" }} />
                          <button onClick={handleGenerateCaseStudy} style={{ marginTop: 8, fontSize: 11.5, color: T.greenLt, background: "rgba(23,160,102,0.06)", border: `1px solid rgba(23,160,102,0.2)`, cursor: "pointer", padding: "5px 12px", borderRadius: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>↺ Regenerate</button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* ── TIMELINE TOGGLE ── */}
                <div style={{ marginTop: 14, padding: "14px 16px", background: T.surfaceHigh, borderRadius: 10, border: `1px solid ${includeTimeline ? T.green : T.border}`, transition: "border-color 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>Include Implementation Timeline</div>
                      <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>Shows the client exactly what happens after they sign — Week 1 to Go-Live</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
                      <button onClick={() => setIncludeTimeline(false)} style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${!includeTimeline ? T.green : T.border}`, background: !includeTimeline ? "rgba(23,160,102,0.1)" : "transparent", color: !includeTimeline ? T.greenLt : T.textSub, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>No</button>
                      <button onClick={() => setIncludeTimeline(true)} style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${includeTimeline ? T.green : T.border}`, background: includeTimeline ? "rgba(23,160,102,0.1)" : "transparent", color: includeTimeline ? T.greenLt : T.textSub, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Yes</button>
                    </div>
                  </div>
                  {includeTimeline && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: "grid", gap: 8 }}>
                      {timelineMilestones.map((m, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 8, alignItems: "center" }}>
                          <input value={m.week} onChange={e => setTimelineMilestones(ms => ms.map((x, j) => j === i ? {...x, week: e.target.value} : x))} style={{ ...baseInput, fontSize: 12, padding: "6px 9px", textAlign: "center" }} />
                          <input value={m.title} onChange={e => setTimelineMilestones(ms => ms.map((x, j) => j === i ? {...x, title: e.target.value} : x))} placeholder="Title" style={{ ...baseInput, fontSize: 12, padding: "6px 9px" }} />
                          <input value={m.desc} onChange={e => setTimelineMilestones(ms => ms.map((x, j) => j === i ? {...x, desc: e.target.value} : x))} placeholder="Description" style={{ ...baseInput, fontSize: 12, padding: "6px 9px" }} />
                        </div>
                      ))}
                      <button onClick={() => setTimelineMilestones(ms => [...ms, { week: `Week ${ms.length + 1}`, title: "", desc: "" }])} style={{ background: "none", border: `1px dashed ${T.border}`, borderRadius: 7, color: T.textMuted, cursor: "pointer", padding: "6px 14px", fontSize: 12, marginTop: 4 }}>+ Add milestone</button>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep(3)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${T.borderMed}`, borderRadius: 8, color: T.textSub, cursor: "pointer", fontSize: 13 }}>← Back</button>
                  <button onClick={() => { saveToLog(); setPreview(true); }} style={{ padding: "12px 34px", background: `linear-gradient(135deg, ${T.green}, ${T.greenDk})`, border: "none", borderRadius: 9, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, letterSpacing: 0.3 }}>Generate Quotation →</button>
                </div>
              </PanelCard>
            </>
          )}
            </div>
          </div>

          {/* ── RIGHT: Live PDF preview panel (Concept D) ── */}
          <div style={{ width: 340, flexShrink: 0, borderLeft: `1px solid ${T.border}`, background: "#1a2535", display: "flex", flexDirection: "column", position: "sticky", top: 60, height: "calc(100vh - 60px)" }}>
            {/* Panel header */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.surface }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.greenLt }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: T.text }}>Live Preview</span>
              </div>
              <span style={{ fontSize: 10, color: T.textMuted }}>updates as you fill</span>
            </div>
            {/* Scrollable preview area */}
            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              {clientName || companyName ? (
                <div style={{ transform: "scale(0.38)", transformOrigin: "top left", width: "263%", pointerEvents: "none" }}>
                  <PrintDoc />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: T.surfaceHigh, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="2" width="16" height="18" rx="2" stroke="#3d5264" strokeWidth="1.5"/><path d="M7 7h8M7 11h8M7 15h5" stroke="#3d5264" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 5 }}>No preview yet</div>
                  <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.6 }}>Enter client name and company to see a live PDF preview here</div>
                </div>
              )}
            </div>
            {/* Bottom total strip */}
            {planPrice > 0 && (
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, background: T.surface, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>Total incl. 18% GST</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.greenLt }}>₹{fmtINR(totalGST)}</div>
                </div>
                {step === 4 && (
                  <button onClick={() => { saveToLog(); setPreview(true); }}
                    style={{ padding: "8px 18px", background: `linear-gradient(135deg, ${T.green}, ${T.greenDk})`, border: "none", borderRadius: 8, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                    Generate →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : appPage === "builder" ? (
        <div style={{ background: "#dde3e8", padding: "36px 20px 72px" }}>
          <PrintDoc />
        </div>
      ) : null}
    </div>
  );
}

function PrintPageHeader({ title, sub, clientLogo, companyName, theme = THEMES.green }) {
  return (
    <div style={{ background: theme.headerBg, padding: "15px 56px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 19, fontWeight: 600, color: "#fff" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>{sub}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {clientLogo ? (
          <div style={{ background: "#ffffff", borderRadius: 7, padding: "5px 14px", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 36, minWidth: 70, boxShadow: "0 1px 6px rgba(0,0,0,0.15)" }}>
            <img src={clientLogo} alt="Client" style={{ maxHeight: 24, maxWidth: 100, objectFit: "contain", display: "block" }} />
          </div>
        ) : companyName ? (
          <div style={{ background: "#ffffff", borderRadius: 7, padding: "6px 14px", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 36 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.sectionTitle, letterSpacing: 1, textTransform: "uppercase" }}>{companyName}</span>
          </div>
        ) : null}
        <div style={{ background: "#ffffff", borderRadius: 7, padding: "5px 12px", display: "inline-flex", alignItems: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.15)" }}>
          <img src={DOUBLETICK_LOGO} alt="DoubleTick" style={{ height: 20, display: "block", objectFit: "contain" }} />
        </div>
      </div>
    </div>
  );
}

function PrintSection({ title, children, theme = THEMES.green }) {
  return (
    <div style={{ marginBottom: 20, breakInside: "avoid" }}>
      <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 16.5, fontWeight: 600, color: theme.sectionTitle, paddingBottom: 7, borderBottom: `1.5px solid ${theme.sectionBorder}`, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function PrintFooter({ theme = THEMES.green }) {
  return (
    <div style={{ background: theme.footerBg, borderTop: `2px solid ${theme.footerBorder}`, padding: "10px 56px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
      <img src={DOUBLETICK_LOGO} alt="DoubleTick" style={{ height: 18, objectFit: "contain", display: "block" }} />
      <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: 0.5 }}>doubletick.io &nbsp;·&nbsp; Meta Business Partner &nbsp;·&nbsp; ISO 27001 Certified &nbsp;·&nbsp; EU GDPR Compliant</div>
    </div>
  );
}

function StepHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "'EB Garamond', serif", fontSize: 27, fontWeight: 600, margin: "0 0 6px", color: "#fff" }}>{title}</h2>
      <p style={{ margin: 0, color: "#4a6070", fontSize: 14 }}>{sub}</p>
    </div>
  );
}
function PanelCard({ children }) {
  return <div style={{ background: "#111820", border: "1px solid #1c2836", borderRadius: 14, padding: "28px 28px 24px" }}>{children}</div>;
}
function FField({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11.5, color: "#4a6070", fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}
function NavBtns({ prev, next, nextDisabled }) {
  return (
    <div style={{ marginTop: 28, display: "flex", justifyContent: prev ? "space-between" : "flex-end" }}>
      {prev && <button onClick={prev} style={{ padding: "10px 20px", background: "transparent", border: "1px solid #243242", borderRadius: 8, color: "#6d8497", cursor: "pointer", fontSize: 13 }}>← Back</button>}
      {next && <button onClick={next} disabled={nextDisabled} style={{ padding: "10px 26px", background: nextDisabled ? "#1c2836" : "linear-gradient(135deg, #17a066, #0d7a4e)", border: "none", borderRadius: 8, color: nextDisabled ? "#3d5264" : "#fff", cursor: nextDisabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>Continue →</button>}
    </div>
  );
}

const pTdc = { padding: "10px 14px", textAlign: "center", fontSize: 12.5, borderBottom: "1px solid #e5e7eb", color: "#9ca3af", width: 44 };
const pTdl = { padding: "10px 16px", textAlign: "left", fontSize: 12.5, borderBottom: "1px solid #e5e7eb", color: "#374151" };
const pTdr = { padding: "10px 16px", textAlign: "right", fontSize: 12.5, borderBottom: "1px solid #e5e7eb", color: "#111827" };
