export interface TavilyResult {
  url: string;
  title: string;
  content: string;
  score: number;
}

export async function tavilySearch(query: string, maxResults = 5): Promise<TavilyResult[]> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        include_answer: false,
        max_results: maxResults,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []) as TavilyResult[];
  } catch {
    return [];
  }
}

export function buildGroqSearchQueries(productName: string): string[] {
  return [
    `${productName} pricing plans funding ARR valuation 2025`,
    `${productName} reviews G2 competitors alternatives market share`,
    `${productName} tech stack customers growth news 2025`,
  ];
}
