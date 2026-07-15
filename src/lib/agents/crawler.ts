import { streamText } from "ai";
import { anthropic } from "@/lib/anthropic";
import { getCrawlerModel, googleTools, type ModelProvider } from "@/lib/providers";
import { tavilySearch } from "@/lib/tavily";
import { trackTokens } from "@/lib/tokenTracker";
import type { SendFn } from "./types";

export interface CrawlerInput {
  productName: string;
  queries: string[];
  userContext: string;
  modelParam: ModelProvider;
  maxCrawlerTokens: number;
  sessionId: string;
  send: SendFn;
}

export interface CrawlerResult {
  researchText: string;
  crawlCount: number;
}

const MAX_SOURCES = 15;

function extractURLs(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)>\]"',]+/g) ?? [];
  return Array.from(new Set(matches)).slice(0, MAX_SOURCES);
}

function extractFindingsShort(domain: string, text: string): string | undefined {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const base = domain.replace("www.", "").split(".")[0];
  const match = sentences.find((s) => s.toLowerCase().includes(base.toLowerCase()) && s.length > 20 && s.length < 200);
  return match ? match.slice(0, 120) + (match.length > 120 ? "…" : ".") : undefined;
}

function buildCrawlerPrompt(productName: string, queries: string[], userContext: string): string {
  return `Search for "${productName}" and extract key facts. Run these searches:
${queries.map((q, i) => `${i + 1}. ${q}`).join("\n")}
${userContext ? `USER CONTEXT: ${userContext}\n` : ""}
Output numbers, names, dates only. No prose. Cover: pricing, funding, reviews, competitors, tech, market size.`;
}

export async function runCrawlerAgent(input: CrawlerInput): Promise<CrawlerResult> {
  const { productName, queries, userContext, modelParam, maxCrawlerTokens, sessionId, send } = input;
  const seenDomains = new Set<string>();
  let researchText = "";
  let crawlCount = 0;
  const startTime = Date.now();
  const totalSources = queries.length;

  send({ type: "sources", crawled: 0, total: totalSources });

  // ── Groq path: Tavily search ──────────────────────────────────────────────
  if (modelParam === "groq") {
    const allResults: Array<{ url: string; title: string; content: string }> = [];

    for (const query of queries) {
      const results = await tavilySearch(query, 3);
      for (const r of results) {
        if (crawlCount >= MAX_SOURCES) break;
        try {
          const domain = new URL(r.url).hostname.replace("www.", "");
          if (!seenDomains.has(domain)) {
            seenDomains.add(domain);
            crawlCount++;
            send({ type: "crawl", url: domain, message: `Indexed ${domain}`, findings: r.title });
            send({ type: "sources", crawled: crawlCount, total: totalSources });
            allResults.push(r);
          }
        } catch {}
      }
    }

    researchText = allResults
      .map((r) => `SOURCE: ${r.url}\nTITLE: ${r.title}\nSNIPPET: ${r.content}`)
      .join("\n\n---\n\n") || `Limited search results available for ${productName}.`;

  // ── Gemini path: Google Search grounding ──────────────────────────────────
  } else if (modelParam === "gemini") {
    const crawlerPrompt = buildCrawlerPrompt(productName, queries, userContext);
    const geminiCrawler = streamText({
      model: getCrawlerModel("gemini"),
      maxOutputTokens: maxCrawlerTokens,
      prompt: crawlerPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: { google_search: googleTools.googleSearch({}) as any },
    });

    for await (const part of geminiCrawler.fullStream) {
      if (part.type === "text-delta") {
        researchText += part.text;
      } else if (part.type === "source") {
        const src = part as { url?: string; title?: string };
        if (src.url && crawlCount < MAX_SOURCES) {
          try {
            const domain = new URL(src.url).hostname.replace("www.", "");
            if (!seenDomains.has(domain)) {
              seenDomains.add(domain);
              crawlCount++;
              send({ type: "crawl", url: domain, message: `Indexed ${domain}`, findings: src.title?.slice(0, 120) });
              send({ type: "sources", crawled: crawlCount, total: totalSources });
            }
          } catch {}
        }
      }
    }

    if (crawlCount === 0) {
      const meta = await geminiCrawler.providerMetadata;
      type GoogleMeta = { groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string | null } }> } };
      const chunks = (meta?.google as GoogleMeta | undefined)?.groundingMetadata?.groundingChunks ?? [];
      for (const chunk of chunks) {
        if (!chunk.web?.uri || crawlCount >= MAX_SOURCES) continue;
        try {
          const domain = new URL(chunk.web.uri).hostname.replace("www.", "");
          if (!seenDomains.has(domain)) {
            seenDomains.add(domain);
            crawlCount++;
            send({ type: "crawl", url: domain, message: `Indexed ${domain}`, findings: chunk.web.title?.slice(0, 120) ?? undefined });
            send({ type: "sources", crawled: crawlCount, total: totalSources });
          }
        } catch {}
      }
    }

    const geminiUsage = await geminiCrawler.usage;
    if (geminiUsage) {
      await trackTokens(sessionId, productName, "crawler_agent", "gemini-2.0-flash",
        geminiUsage.inputTokens, geminiUsage.outputTokens, { durationMs: Date.now() - startTime });
    }

  // ── Claude path: Anthropic native web search ──────────────────────────────
  } else {
    const crawlerPrompt = buildCrawlerPrompt(productName, queries, userContext);
    const claudeCrawler = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      maxOutputTokens: maxCrawlerTokens,
      tools: { webSearch: anthropic.tools.webSearch_20250305({ maxUses: queries.length }) },
      messages: [{ role: "user", content: crawlerPrompt }],
    });

    for await (const part of claudeCrawler.fullStream) {
      if (part.type === "text-delta") {
        researchText += part.text;
      } else if (part.type === "source") {
        const src = part as { url?: string; title?: string };
        if (src.url && crawlCount < MAX_SOURCES) {
          try {
            const domain = new URL(src.url).hostname.replace("www.", "");
            if (!seenDomains.has(domain)) {
              seenDomains.add(domain);
              crawlCount++;
              send({ type: "crawl", url: domain, message: `Indexed ${domain}`, findings: src.title?.slice(0, 120) });
              send({ type: "sources", crawled: crawlCount, total: totalSources });
            }
          } catch {}
        }
      }
    }

    if (crawlCount === 0) {
      extractURLs(researchText).forEach((url, i) => {
        try {
          const domain = new URL(url).hostname.replace("www.", "");
          send({ type: "crawl", url: domain, message: `Fetched ${domain}`, findings: extractFindingsShort(domain, researchText) });
          send({ type: "sources", crawled: i + 1, total: queries.length });
        } catch {}
      });
    }

    const claudeUsage = await claudeCrawler.usage;
    if (claudeUsage) {
      await trackTokens(sessionId, productName, "crawler_agent", "claude-haiku-4-5-20251001",
        claudeUsage.inputTokens, claudeUsage.outputTokens, { durationMs: Date.now() - startTime });
    }
  }

  return { researchText, crawlCount };
}
