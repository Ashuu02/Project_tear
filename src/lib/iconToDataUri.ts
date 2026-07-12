import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LucideIcon } from "lucide-react";

export function iconToDataUri(Icon: LucideIcon, color: string, size = 64): string {
  const svg = renderToStaticMarkup(createElement(Icon, { size, color, strokeWidth: 1.75 }));
  // Base64 (not just URI-encoded) so this is also directly usable as PptxGenJS image
  // `data` — it expects "image/svg+xml;base64,...." for the exported .pptx. Plain btoa is
  // safe here (no encodeURIComponent/unescape dance needed) since rendered Lucide markup
  // is pure ASCII — icon names, hex colors, and numeric path data only.
  return `data:image/svg+xml;base64,${window.btoa(svg)}`;
}

export const ICON_LIBRARY = [
  "CheckCircle2", "Target", "Lightbulb", "TrendingUp", "TrendingDown", "Users", "Rocket", "Star",
  "Zap", "Award", "BarChart3", "PieChart", "DollarSign", "Globe", "Shield", "Heart", "ThumbsUp",
  "AlertTriangle", "ArrowRight", "ArrowUpRight", "Clock", "Calendar", "Building2", "Briefcase",
  "Layers", "Package", "Puzzle", "Flag", "Sparkles", "CheckSquare", "XCircle", "Info", "Lock",
  "Unlock", "Database", "Cloud", "Smartphone", "Monitor", "MessageCircle", "Mail", "Link2",
] as const;
