const PRODUCT_CATEGORIES: Record<string, string> = {
  Notion: "Productivity", Obsidian: "Note-taking", Coda: "Productivity", Roam: "Note-taking",
  Figma: "Design tools", Sketch: "Design tools", Framer: "Design tools", Canva: "Design tools",
  Linear: "Dev tools", GitHub: "Dev tools", Vercel: "Dev tools", Jira: "Dev tools",
  Shopify: "E-commerce", Stripe: "Payments", Klaviyo: "Marketing",
  Slack: "Communication", Discord: "Communication", Zoom: "Communication", Loom: "Communication",
  ChatGPT: "AI tools", Claude: "AI tools", Midjourney: "AI tools", Cursor: "AI tools",
  Superhuman: "Email", Asana: "Project management", Monday: "Project management", ClickUp: "Project management",
};

export function getProductCategory(productName: string): string {
  const key = Object.keys(PRODUCT_CATEGORIES).find(
    (k) => k.toLowerCase() === productName.toLowerCase()
  );
  return key ? PRODUCT_CATEGORIES[key] : "";
}
