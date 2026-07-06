import type { ResearchDoc, DeckData } from "@/types/teardown";

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function getMockResearchDoc(productName: string): ResearchDoc {
  const p = productName;
  return {
    sections: [
      {
        id: "exec_summary",
        title: "Executive Summary",
        content: `${p} is an all-in-one workspace platform that combines notes, databases, wikis, and project management into a single, highly customizable interface. Founded in 2016, it has grown to over 30 million registered users across individuals, startups, and enterprise teams at companies like Nike, Figma, and Amazon.\n\nThe platform's core strength lies in its block-based editor, where every piece of content is a draggable, nestable block, creating an infinite canvas that appeals to power users while remaining approachable for beginners. The product has expanded with AI features, website publishing, and deep API integrations.\n\n${p} raised a landmark $275M Series C in 2021 at a $10B valuation, led by Sequoia and Coatue. The company is reported to be profitable and building toward long-term independence rather than a quick IPO.`,
        keyInsight: `${p}'s block-based architecture creates unusually deep switching costs; users don't just store data, they build entire operational systems, making migration nearly impossible.`,
        stats: [
          { label: "Registered Users", value: "30M+", sub: "as of 2024" },
          { label: "Valuation", value: "$10B", sub: "Series C, 2021" },
          { label: "Total Raised", value: "$343M", sub: "across all rounds" },
        ],
      },
      {
        id: "product_ux",
        title: "Product & UX",
        content: `${p}'s UI is built around blocks, where every piece of content (text, image, database, toggle, callout) is a block that can be dragged, nested, and transformed. This creates an infinite canvas feel that rewards power users while remaining approachable. The web app is a React SPA with fast client-side navigation and real-time collaboration.\n\nThe product has expanded significantly: ${p} AI (2023) adds inline writing assistance, summarization, and Q&A across your workspace. Sites (2024) lets users publish pages as public websites. Mobile apps on iOS and Android maintain feature parity with desktop.\n\nThe biggest UX criticism is the learning curve, as infinite flexibility can be overwhelming. New users often struggle to structure their workspace, leading to the common 'setup graveyard' phenomenon where elaborate systems get abandoned after a few weeks.`,
        keyInsight: "The same flexibility that makes the product powerful is its biggest acquisition barrier. Onboarding is a constant product challenge that requires active investment.",
      },
      {
        id: "business_model",
        title: "Business Model & Revenue",
        content: `${p} operates a freemium SaaS model with four tiers: Free (unlimited blocks, personal use), Plus ($10/mo per seat), Business ($15/mo per seat), and Enterprise (custom pricing). The free tier is genuinely generous, driving strong bottom-up adoption inside organizations before any purchase decision is made.\n\nRevenue is primarily seat-based, with Enterprise contracts adding SSO, audit logs, advanced permissions, and dedicated support. The AI add-on is $10/month per member on top of any plan. Analysts estimate ARR in the $400–600M range based on user growth curves and pricing.\n\nThe PLG (product-led growth) motion is central to GTM: individuals adopt the tool, invite teammates, and eventually the company upgrades to a paid plan. Enterprise now represents a growing share of revenue as the team invests in security, compliance, and admin controls.`,
        keyInsight: `The free tier is a deliberate loss leader; the real bet is that individual users become internal champions who drive multi-seat enterprise deals without a sales touch.`,
        stats: [
          { label: "Est. ARR", value: "$400–600M", sub: "analyst estimate" },
          { label: "Plus Plan", value: "$10/mo", sub: "per seat" },
          { label: "Business Plan", value: "$15/mo", sub: "per seat" },
        ],
      },
      {
        id: "gtm_growth",
        title: "GTM & Growth",
        content: `${p}'s growth engine is almost entirely product-led. The free tier removes the purchase barrier, and the collaborative nature of workspaces means every shared page is effectively a distribution channel. The company spent very little on paid marketing for most of its history, growing primarily through word-of-mouth.\n\nTemplate galleries have been a powerful organic growth lever: the ecosystem has thousands of community-built templates shared across Twitter, YouTube, and Reddit, creating a constant stream of inbound discovery. Top creators have built entire businesses teaching the platform, amplifying brand awareness at zero marginal cost.\n\nMore recently, the team has invested in direct enterprise sales and partnerships with consulting firms for implementation. Global expansion, particularly in Japan and Korea, has been significant, with disproportionately large market presence relative to US-centric competitors.`,
        keyInsight: "The template ecosystem is one of the most underrated distribution moats in SaaS, generating millions of organic impressions per month with no marginal cost to the company.",
      },
      {
        id: "tech_arch",
        title: "Technical Architecture",
        content: `${p} is built as a React single-page application with a custom block-based editor that predates and rivals Slate.js implementations. The editor handles real-time collaborative editing via operational transforms (OT), a technical choice that has caused occasional sync conflicts reported by power users with very large workspaces.\n\nThe backend runs on AWS with a PostgreSQL database that stores blocks in a hierarchical tree structure. Every block is a database row, which gives maximum flexibility but has historically caused performance issues on pages with 1000+ blocks. Significant infrastructure investment since 2022 has improved load times.\n\nThe AI layer is powered by a mix of GPT-4 class models with a proprietary context retrieval layer built on top, allowing AI to query across a user's entire workspace rather than just the current page.`,
        keyInsight: "The block-as-database-row architecture is elegant for flexibility but creates real scaling challenges; it's essentially a graph database masquerading as a relational one.",
      },
      {
        id: "market_comp",
        title: "Market & Competition",
        content: `The all-in-one workspace market is estimated at $15B+ and growing at ~15% CAGR. Key competitors include Confluence (Atlassian) for enterprise wikis, Coda for spreadsheet-heavy workflows, Obsidian for personal knowledge management, and Google Workspace for lightweight document collaboration.\n\nMicrosoft Loop is the most credible emerging threat, bringing similar block components directly into the Microsoft 365 ecosystem where enterprises already live. The distribution advantage is enormous. Google's equivalent is less competitive on UX but benefits from massive organizational lock-in.\n\nThe defensible moat is the community, template ecosystem, and deeply embedded workflows users build over time. However, the commoditization of block editors means winning long-term requires leading on AI and enterprise features.`,
        keyInsight: "Microsoft Loop is the only competitor with both the UX sophistication and enterprise distribution to meaningfully threaten this product in the mid-market and above.",
      },
      {
        id: "community",
        title: "Community & Ecosystem",
        content: `The creator community is one of the strongest in SaaS. On YouTube alone, related content has hundreds of millions of views, with dedicated channels teaching the platform to millions of subscribers. The subreddit has over 700K members, a remarkably engaged community for a productivity tool.\n\nThe template marketplace spans thousands of free and paid templates. Top creators earn $10K–$50K+/year selling templates through Gumroad and the native marketplace. This creator economy turns power users into financial stakeholders who are incentivized to grow the platform.\n\nThe public API (launched 2021) has spawned a rich integration ecosystem: Make, Zapier, and hundreds of native connections link the tool to the modern stack. Community-built tools like Super (website builder) and Notionforms have built sizeable businesses on top of the platform's primitives.`,
        keyInsight: "The template creator economy is a flywheel most competitors can't replicate; it turns power users into unpaid evangelists with a financial incentive to grow the platform.",
        stats: [
          { label: "Reddit Members", value: "700K+", sub: "r/Notion" },
          { label: "API Integrations", value: "1,000+", sub: "via Zapier / Make" },
        ],
      },
      {
        id: "financials",
        title: "Financials & Funding",
        content: `Total funding raised is $343M across five rounds. The landmark event was the October 2021 Series C: $275M at a $10B valuation, led by Sequoia and Coatue, making it one of the most valuable private productivity software companies at that time. The round came at peak SaaS valuations and has not been publicly marked up or down since.\n\nThe company is reportedly profitable or near-profitable, a rare distinction at this scale. The CEO has consistently stated there is no rush toward IPO and the company values long-term independence. Unlike many SaaS peers post-2022, there have been no layoffs, a signal of healthy unit economics.\n\nAt current SaaS multiples (~8–12x ARR), the $10B valuation implies expected ARR of $800M–1B+, suggesting continued growth is required to justify the last round price. The path is plausible given the enterprise expansion trajectory.`,
        keyInsight: "Rumored profitability at a $10B valuation without an IPO push signals a deliberately patient capital strategy: building to be a durable independent company, not a quick exit.",
        stats: [
          { label: "Total Raised", value: "$343M" },
          { label: "Last Valuation", value: "$10B", sub: "Series C, Oct 2021" },
          { label: "Lead Investors", value: "Sequoia + Coatue" },
        ],
      },
    ],
    sources: [
      { num: 1, domain: "notion.so", title: `${p} Pricing Page`, url: "https://notion.so/pricing", usedIn: "Business Model" },
      { num: 2, domain: "techcrunch.com", title: `${p} raises $275M at $10B valuation`, url: "https://techcrunch.com", usedIn: "Financials" },
      { num: 3, domain: "g2.com", title: `${p} Reviews | G2`, url: "https://g2.com", usedIn: "Product & UX" },
      { num: 4, domain: "reddit.com", title: `r/${p} community, 700K members`, url: "https://reddit.com", usedIn: "Community" },
      { num: 5, domain: "bloomberg.com", title: `${p} Is Worth $10 Billion`, url: "https://bloomberg.com", usedIn: "Executive Summary" },
    ],
  };
}

export function getMockDeckData(productName: string): DeckData {
  const p = productName;
  return {
    slides: [
      {
        type: "cover",
        title: p,
        subtitle: "AI-Powered Product Teardown",
      },
      {
        type: "bullets",
        sectionNum: "01",
        title: "Executive Summary",
        bullets: [
          { text: "All-in-one workspace", sub: "Notes, databases, wikis, and tasks in one tool" },
          { text: "30M+ registered users", sub: "Strong individual and enterprise adoption" },
          { text: "PLG growth engine", sub: "Free tier drives bottom-up enterprise conversion" },
          { text: "$10B valuation", sub: "Series C led by Sequoia & Coatue, Oct 2021" },
        ],
        stats: [
          { label: "Users", value: "30M+" },
          { label: "Raised", value: "$343M" },
          { label: "Valuation", value: "$10B" },
          { label: "Est. ARR", value: "$500M+" },
        ],
      },
      {
        type: "features",
        sectionNum: "02",
        title: "Product & UX",
        items: [
          { name: "Block Editor", desc: "Every content type is a draggable, nestable block" },
          { name: "Databases", desc: "Table, board, calendar, gallery views (all relational)" },
          { name: `${p} AI`, desc: "Inline writing, summarization, Q&A across workspace" },
          { name: "Sites", desc: "Publish any page as a public website instantly" },
          { name: "Real-time collab", desc: "Live cursors and comments across all pages" },
        ],
      },
      {
        type: "pricing",
        sectionNum: "03",
        title: "Business Model & Revenue",
        tiers: [
          { name: "Free", price: "$0", target: "Individuals", highlight: false },
          { name: "Plus", price: "$10/mo", target: "Small teams", highlight: true },
          { name: "Business", price: "$15/mo", target: "Growing orgs", highlight: false },
          { name: "Enterprise", price: "Custom", target: "Large companies", highlight: false },
        ],
        revenueStats: [
          { label: "Est. ARR", value: "$500M+" },
          { label: "AI Add-on", value: "$10/mo" },
          { label: "Enterprise %", value: "Growing" },
        ],
      },
      {
        type: "gtm",
        sectionNum: "04",
        title: "GTM & Growth",
        phases: [
          { label: "PLG Adoption", desc: "Free tier removes purchase barrier, users self-onboard", metric: "Viral" },
          { label: "Team Expansion", desc: "Collaborative workspaces pull in teammates naturally", metric: "Bottom-up" },
          { label: "Enterprise Sales", desc: "Champion-led deals with SSO and admin controls", metric: "ACV up" },
        ],
      },
      {
        type: "techstack",
        sectionNum: "05",
        title: "Technical Architecture",
        layers: [
          { layer: "Frontend", detail: "React SPA + custom block editor" },
          { layer: "Backend", detail: "Node.js services on AWS" },
          { layer: "Database", detail: "PostgreSQL (blocks as rows)" },
          { layer: "Real-time", detail: "Operational Transforms (OT)" },
          { layer: "AI", detail: "GPT-4 class + proprietary retrieval" },
        ],
      },
      {
        type: "competitive",
        sectionNum: "06",
        title: "Market & Competition",
        tam: "$15B+",
        cagr: "15%",
        competitors: [
          { name: "Microsoft Loop", angle: "M365 integration", threat: "High" },
          { name: "Confluence", angle: "Enterprise wikis", threat: "Medium" },
          { name: "Coda", angle: "Spreadsheet-first", threat: "Medium" },
          { name: "Obsidian", angle: "Local-first PKM", threat: "Low" },
          { name: "Google Docs", angle: "Distribution", threat: "Low" },
        ],
      },
      {
        type: "stats",
        sectionNum: "07",
        title: "Community & Ecosystem",
        stats: [
          { label: "Reddit Members", value: "700K+" },
          { label: "API Integrations", value: "1,000+" },
          { label: "Templates", value: "10,000+" },
          { label: "YouTube Views", value: "100M+" },
        ],
        insight: "Template creator economy turns power users into unpaid evangelists with financial incentive to grow the platform.",
      },
      {
        type: "funding",
        sectionNum: "08",
        title: "Financials & Funding",
        rounds: [
          { round: "Seed", year: "2018", amount: "$2M", lead: "First Round" },
          { round: "Series A", year: "2019", amount: "$10M", lead: "Index Ventures" },
          { round: "Series B", year: "2020", amount: "$50M", lead: "Index Ventures" },
          { round: "Series C", year: "2021", amount: "$275M", lead: "Sequoia + Coatue" },
        ],
        totalRaised: "$343M",
        valuation: "$10B",
        arr: "$400–600M+",
      },
      {
        type: "sources",
        title: "Sources & Appendix",
        sources: [
          "[1] Notion Pricing | notion.so",
          "[2] Series C Announcement | techcrunch.com",
          "[3] User Reviews | g2.com",
          "[4] Community | reddit.com/r/Notion",
          "[5] Valuation Profile | bloomberg.com",
        ],
      },
    ],
  };
}
