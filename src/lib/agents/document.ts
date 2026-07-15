import { streamText } from "ai";
import { getDocumentModel, resolveModelName, type ModelProvider } from "@/lib/providers";
import { trackTokens } from "@/lib/tokenTracker";
import type { ResearchDoc } from "@/types/teardown";
import type { DepthConfig, SendFn } from "./types";

export interface DocumentAgentInput {
  productName: string;
  tier1: { goal?: string; depth?: string; dimensions?: string[] };
  tier2Context: string;
  userContext: string;
  research: string;
  modelParam: ModelProvider;
  depthConfig: DepthConfig;
  sectionsNeeded: string[];
  sessionId: string;
  send: SendFn;
}

export interface DocumentAgentResult {
  docData: ResearchDoc;
}

const COMPRESS_MAX_CHARS = 4000;
const CHARS_PER_SEC = 180;

function compressCrawlerText(text: string): string {
  if (text.length <= COMPRESS_MAX_CHARS) return text;
  return text.slice(0, 7000) + "\n\n[...truncated...]\n\n" + text.slice(-3000);
}

// ── JSON safety helpers ───────────────────────────────────────────────────────
function sanitizeJSONString(text: string): string {
  let inString = false, escape = false, result = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) { result += c; escape = false; continue; }
    if (c === "\\" && inString) { result += c; escape = true; continue; }
    if (c === '"') { inString = !inString; result += c; continue; }
    if (inString) {
      if (c === "\n") { result += "\\n"; continue; }
      if (c === "\r") { result += "\\r"; continue; }
      if (c === "\t") { result += "\\t"; continue; }
    }
    result += c;
  }
  return result;
}

function recoverTruncatedJSON<T>(json: string): T {
  let depth = 0, inString = false, escape = false;
  let lastSectionEnd = -1;
  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (c === "}" && depth === 2) lastSectionEnd = i;
    }
  }
  if (lastSectionEnd > 0) {
    const recovered = sanitizeJSONString(json.slice(0, lastSectionEnd + 1)) + '],"sources":[]}';
    try { return JSON.parse(recovered) as T; } catch {}
  }
  const openBraces = (json.match(/\{/g) ?? []).length - (json.match(/\}/g) ?? []).length;
  const openBrackets = (json.match(/\[/g) ?? []).length - (json.match(/\]/g) ?? []).length;
  if (openBraces > 0 || openBrackets > 0) {
    const trimmed = json.replace(/,?\s*"[^"]*"\s*:\s*[^,}\]]*$/, "").replace(/,\s*$/, "");
    const close = "}".repeat(Math.max(0, openBraces)) + "]".repeat(Math.max(0, openBrackets));
    const attempt = sanitizeJSONString(trimmed) + close + '],"sources":[]}';
    try { return JSON.parse(attempt) as T; } catch {}
  }
  throw new Error("JSON recovery failed — output was truncated too early");
}

function extractJSON<T>(text: string): T {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(sanitizeJSONString(codeBlock[1].trim())) as T; } catch {}
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(sanitizeJSONString(text.slice(start, end + 1))) as T; }
    catch { return recoverTruncatedJSON<T>(text.slice(start)); }
  }
  throw new Error("No JSON found in model response");
}

function buildDocPrompt(
  productName: string,
  focusAreas: string,
  tier1: { goal?: string; depth?: string },
  tier2Context: string,
  userContext: string,
  research: string,
  depthConfig: DepthConfig,
  sectionsNeeded?: string[],
): string {
  return `Product analyst. Teardown of "${productName}" as raw JSON only — no markdown, no backticks.

RESEARCH:
${research}

FOCUS: ${focusAreas} | goal=${tier1.goal ?? "general"}${userContext ? ` | ${userContext}` : ""}
USER SELECTIONS (Tier 2): ${tier2Context || "none"}
${sectionsNeeded ? `\nONLY GENERATE THESE SECTION IDS (the rest already exist from a prior cached run — do not regenerate them): ${sectionsNeeded.join(", ")}\n` : ""}

RULES:
- content: 1 paragraph, ${depthConfig.wordRange} words, real data only (numbers/names/dates)
- stats: ${depthConfig.statsCount} items, real values only. Never write "N/A" or a placeholder.
- bullets: ${depthConfig.bulletsCount} items, 8-12 words each
- tables: 2-3 rows, all cells filled with real values
- chartData: real estimates, not 0. Mark as "est." if guessing.
- Escape: \\n for newlines, \\" for quotes.${depthConfig.extraGuidance ? `\n- ${depthConfig.extraGuidance}` : ""}
- SKIP LOGIC: if the research genuinely has nothing specific for a section below, do NOT include
  that section's id in the output at all — omit it entirely rather than filling it with "N/A" or
  generic filler. Before skipping, first check USER SELECTIONS: if the user picked a related
  angle there (e.g. they selected "pricing" under business model aspects), use whatever adjacent
  signal exists in the research to answer that angle instead of leaving the section out — only
  skip if there's truly nothing usable for that section even considering their selections.
- CITATIONS: every section you DO include must have a "sourceNums" array — the actual source
  numbers (matching the "sources" list below) whose content backs that section's claims. Only
  cite a source in a section if it genuinely informed that section. A source can be cited by
  more than one section. Every source in your "sources" list must be cited by at least one
  section's "sourceNums" — don't list a source you never actually used.

JSON:
{"sections":[
{"id":"exec_summary","title":"Executive Summary","content":"...","keyInsight":"...","stats":[{"label":"Founded","value":"..."},{"label":"Valuation","value":"..."},{"label":"Users","value":"..."}],"bullets":["...","...","..."],"sourceNums":[1,2]},
{"id":"product_ux","title":"Product & UX Analysis","content":"...","keyInsight":"...","stats":[{"label":"G2 Rating","value":"..."},{"label":"App Store","value":"..."},{"label":"Top Issue","value":"..."}],"bullets":["...","...","..."],"tables":[{"id":"features","title":"Feature Comparison","headers":["Feature","Free","Pro","Enterprise"],"rows":[["Storage","...","...","..."],["API","...","...","..."],["Support","...","...","..."]]}],"sourceNums":[3]},
{"id":"business_model","title":"Business Model & Revenue","content":"...","keyInsight":"...","stats":[{"label":"ARR","value":"..."},{"label":"Model","value":"..."},{"label":"Margin","value":"..."}],"bullets":["...","...","..."],"chartData":[{"id":"rev","type":"pie","title":"Revenue Mix","data":[{"label":"Enterprise","value":50},{"label":"SMB","value":30},{"label":"Self-serve","value":20}]}],"sourceNums":[2]},
{"id":"pricing_analysis","title":"Pricing Deep-Dive","content":"...","keyInsight":"...","stats":[{"label":"Free Tier","value":"..."},{"label":"Entry Price","value":"..."},{"label":"Enterprise","value":"Custom"}],"bullets":["...","...","..."],"tables":[{"id":"tiers","title":"Pricing Tiers","headers":["Plan","Price","Key Feature"],"rows":[["Free","$0","..."],["Pro","...","..."],["Enterprise","Custom","..."]]}],"chartData":[{"id":"price_compare","type":"bar","title":"Price vs Competitors ($/mo)","xAxis":"Product","yAxis":"$","unit":"$","data":[{"label":"${productName}","value":10},{"label":"Competitor A","value":12},{"label":"Competitor B","value":8}]}],"sourceNums":[1]},
{"id":"gtm_growth","title":"GTM & Growth Strategy","content":"...","keyInsight":"...","stats":[{"label":"Motion","value":"..."},{"label":"Traffic","value":"..."},{"label":"Growth","value":"..."}],"bullets":["...","...","..."],"chartData":[{"id":"growth","type":"line","title":"Growth Trajectory","xAxis":"Year","yAxis":"Scale","data":[{"label":"2022","value":1},{"label":"2023","value":3},{"label":"2024","value":7},{"label":"2025","value":12}]}],"sourceNums":[4]},
{"id":"tech_arch","title":"Technical Architecture","content":"...","keyInsight":"...","stats":[{"label":"Cloud","value":"..."},{"label":"Languages","value":"..."},{"label":"API","value":"..."}],"bullets":["...","...","..."],"tables":[{"id":"stack","title":"Tech Stack","headers":["Layer","Tech"],"rows":[["Frontend","..."],["Backend","..."],["Database","..."]]}],"sourceNums":[5]},
{"id":"market_comp","title":"Market & Competitive Landscape","content":"...","keyInsight":"...","stats":[{"label":"TAM","value":"..."},{"label":"CAGR","value":"..."},{"label":"Top Rival","value":"..."}],"bullets":["...","...","..."],"tables":[{"id":"comp","title":"Competitor Snapshot","headers":["Dimension","${productName}","Rival A","Rival B"],"rows":[["Price","...","...","..."],["Free tier","...","...","..."],["Best for","...","...","..."]]}],"chartData":[{"id":"mktshare","type":"pie","title":"Market Share Est.","data":[{"label":"${productName}","value":30},{"label":"Rival A","value":25},{"label":"Others","value":45}]}],"sourceNums":[6]},
{"id":"customer_profiles","title":"Customer Profiles & ICP","content":"...","keyInsight":"...","stats":[{"label":"Segment","value":"..."},{"label":"Buyer","value":"..."},{"label":"ACV","value":"..."}],"bullets":["...","...","..."],"chartData":[{"id":"custmix","type":"donut","title":"Customer Mix","data":[{"label":"Enterprise","value":30},{"label":"SMB","value":40},{"label":"Self-serve","value":30}]}],"sourceNums":[3]},
{"id":"community","title":"Community & Ecosystem","content":"...","keyInsight":"...","stats":[{"label":"Community","value":"..."},{"label":"Integrations","value":"..."},{"label":"Partners","value":"..."}],"bullets":["...","...","..."],"sourceNums":[4]},
{"id":"financials","title":"Financials & Funding","content":"...","keyInsight":"...","stats":[{"label":"Raised","value":"..."},{"label":"Last Round","value":"..."},{"label":"Valuation","value":"..."}],"bullets":["...","...","..."],"tables":[{"id":"rounds","title":"Funding","headers":["Round","Year","Amount"],"rows":[["Seed","...","..."],["Series A","...","..."],["Later","...","..."]]}],"chartData":[{"id":"funding","type":"bar","title":"Funding ($M)","xAxis":"Round","yAxis":"$M","unit":"$M","data":[{"label":"Seed","value":2},{"label":"Series A","value":15},{"label":"Later","value":80}]}],"sourceNums":[2]},
{"id":"swot_analysis","title":"SWOT Analysis","content":"Strengths: ...\\n\\nWeaknesses: ...","keyInsight":"...","bullets":["STRENGTH: ...","STRENGTH: ...","WEAKNESS: ...","OPPORTUNITY: ...","THREAT: ..."],"sourceNums":[1,6]},
{"id":"strategic_outlook","title":"Strategic Outlook & Risks","content":"...","keyInsight":"Bull or bear in one sentence","stats":[{"label":"Verdict","value":"..."},{"label":"Risk","value":"..."},{"label":"Catalyst","value":"..."}],"bullets":["...","...","..."],"sourceNums":[2,6]}
],"sources":[{"num":1,"domain":"...","title":"...","url":"https://...","usedIn":"..."},{"num":2,"domain":"...","title":"...","url":"https://...","usedIn":"..."}]}

Only include sections above that the research actually supports (per SKIP LOGIC) — the list above is the full possible set, not a required set.`;
}

export async function runDocumentAgent(input: DocumentAgentInput): Promise<DocumentAgentResult> {
  const { productName, tier1, tier2Context, userContext, research, modelParam, depthConfig, sectionsNeeded, sessionId, send } = input;

  const focusAreas = (tier1.dimensions ?? []).join(", ") || "all areas";
  const compressedResearch = compressCrawlerText(research);
  const docPrompt = buildDocPrompt(productName, focusAreas, tier1, tier2Context, userContext, compressedResearch, depthConfig, sectionsNeeded);

  const docStream = streamText({
    model: getDocumentModel(modelParam),
    maxOutputTokens: depthConfig.maxDocTokens,
    messages: [{ role: "user", content: docPrompt }],
  });

  let docText = "";
  const docStartTime = Date.now();
  let lastProgressAt = Date.now();

  try {
    for await (const chunk of docStream.textStream) {
      docText += chunk;
      const now = Date.now();
      if (now - lastProgressAt >= 2000) {
        lastProgressAt = now;
        const elapsed = Math.max(1, (now - docStartTime) / 1000);
        const cps = docText.length / elapsed;
        const remaining = cps > 0 ? Math.max(0, Math.round((depthConfig.estimatedOutChars - docText.length) / cps)) : 0;
        const pct = Math.min(95, Math.round((docText.length / depthConfig.estimatedOutChars) * 100));
        const remStr = remaining > 60 ? `~${Math.ceil(remaining / 60)}m remaining`
                     : remaining > 0  ? `~${remaining}s remaining`
                     : "almost done…";
        send({ type: "agent", agent: "Document Agent", status: "running", message: `Writing ${pct}% · ${remStr}`, progress: pct });
      }
    }
  } catch (streamErr) {
    throw new Error(`Document Agent stream failed: ${streamErr instanceof Error ? streamErr.message : String(streamErr)}`);
  }

  if (!docText.trim()) {
    throw new Error("Document Agent returned an empty response. The model may be rate-limited or the prompt was rejected. Please retry.");
  }

  try {
    const docUsage = await docStream.usage;
    if (docUsage) {
      await trackTokens(
        sessionId, productName, "document_agent",
        resolveModelName(modelParam, "document"),
        docUsage.inputTokens, docUsage.outputTokens,
        { sectionIds: sectionsNeeded, durationMs: Date.now() - docStartTime },
      );
    }
  } catch { /* usage tracking failure is non-fatal */ }

  return { docData: extractJSON<ResearchDoc>(docText) };
}

export { CHARS_PER_SEC };
