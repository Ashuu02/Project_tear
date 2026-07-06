from fpdf import FPDF
from datetime import date
import os

C_PRIMARY   = (194, 69, 30)
C_DARK      = (28, 20, 18)
C_MUTED     = (124, 110, 104)
C_BG        = (245, 239, 228)
C_BORDER    = (232, 221, 210)
C_WHITE     = (255, 255, 255)
C_LIGHT     = (253, 250, 246)
C_GREEN     = (34, 160, 91)
C_GREEN_BG  = (235, 247, 240)
C_BLUE      = (59, 130, 246)
C_BLUE_BG   = (219, 234, 254)
C_PURPLE    = (109, 40, 217)
C_PURPLE_BG = (237, 233, 254)
C_AMBER     = (160, 100, 0)
C_AMBER_BG  = (254, 243, 199)

TODAY = date.today().strftime("%B %d, %Y")

PAGE_H = 274  # safe usable height in mm (297 - 23mm bottom buffer)


class TearPDF(FPDF):
    def need_page(self, needed_mm=10):
        """Add a new page if there isn't enough vertical room for needed_mm."""
        if self.get_y() + needed_mm > PAGE_H:
            self.add_page()

    def header(self):
        if self.page_no() == 1:
            return
        self.set_fill_color(*C_PRIMARY)
        self.rect(0, 0, 210, 7, "F")
        self.set_y(10)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(*C_MUTED)
        self.set_x(10)
        self.cell(95, 4, "Tear - AI Product Teardown Platform", align="L")
        self.cell(95, 4, f"Technical Architecture  -  Page {self.page_no()}", align="R")
        self.ln(6)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-13)
        self.set_fill_color(*C_BG)
        self.rect(0, 284, 210, 13, "F")
        self.set_y(-10)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*C_MUTED)
        self.cell(0, 5, f"Confidential  -  legendashish  -  {TODAY}", align="C")

    def h1(self, text, sub=None):
        self.need_page(20)
        y = self.get_y()
        h = 19 if sub else 13
        self.set_fill_color(*C_BG)
        self.rect(10, y, 190, h, "F")
        self.set_fill_color(*C_PRIMARY)
        self.rect(10, y, 3, h, "F")
        self.set_xy(16, y + 3)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*C_PRIMARY)
        self.cell(0, 6, text, ln=True)
        if sub:
            self.set_x(16)
            self.set_font("Helvetica", "", 8.5)
            self.set_text_color(*C_MUTED)
            self.cell(0, 5, sub, ln=True)
        self.set_text_color(*C_DARK)
        self.ln(4)

    def arrow_down(self, x, y, ln=8):
        self.set_draw_color(*C_MUTED)
        self.set_line_width(0.4)
        self.line(x, y, x, y + ln - 2)
        self.line(x - 1.5, y + ln - 2, x, y + ln)
        self.line(x + 1.5, y + ln - 2, x, y + ln)

    def trow(self, cells, widths, fill=False, header=False, aligns=None):
        self.need_page(8)
        if aligns is None:
            aligns = ["L"] * len(cells)
        h = 7
        if header:
            self.set_fill_color(*C_PRIMARY)
            self.set_text_color(*C_WHITE)
            self.set_font("Helvetica", "B", 8)
        else:
            self.set_fill_color(*(C_BG if fill else C_WHITE))
            self.set_text_color(*C_DARK)
            self.set_font("Helvetica", "", 8)
        x0, y0 = self.get_x(), self.get_y()
        for i, (cell, w) in enumerate(zip(cells, widths)):
            self.set_xy(x0 + sum(widths[:i]), y0)
            self.cell(w, h, str(cell), border="B" if not header else 0, fill=True, align=aligns[i])
        self.set_xy(x0, y0 + h)
        self.set_text_color(*C_DARK)


pdf = TearPDF()
pdf.set_margins(10, 18, 10)
pdf.set_auto_page_break(False)  # manual page management via need_page()


# ===============================================================
# PAGE 1 - COVER
# ===============================================================
pdf.add_page()

pdf.set_fill_color(*C_PRIMARY)
pdf.rect(0, 0, 210, 90, "F")
pdf.set_y(20)
pdf.set_font("Helvetica", "B", 52)
pdf.set_text_color(*C_WHITE)
pdf.cell(0, 22, "TEAR", align="C", ln=True)
pdf.set_font("Helvetica", "", 14)
pdf.cell(0, 8, "AI-Powered Product Teardown Platform", align="C", ln=True)
pdf.set_font("Helvetica", "", 9)
pdf.set_text_color(255, 200, 180)
pdf.cell(0, 6, "Technical Architecture  -  Data Flow  -  User Journey  -  System Design", align="C", ln=True)

pdf.set_fill_color(*C_BG)
pdf.rect(0, 90, 210, 34, "F")
pdf.set_y(97)
pdf.set_font("Helvetica", "", 10)
pdf.set_text_color(*C_DARK)
pdf.cell(0, 6, "Comprehensive technical document covering multi-agent AI pipeline,", align="C", ln=True)
pdf.cell(0, 6, "real-time SSE streaming, full-stack architecture, and database design.", align="C", ln=True)

# Stats row
stats = [("6","App Pages"),("3","AI Agents"),("12","Doc Sections"),("4","DB Tables"),("SSE","Streaming")]
for i, (val, label) in enumerate(stats):
    x = 10 + i * 38
    pdf.set_fill_color(*C_WHITE)
    pdf.set_draw_color(*C_BORDER)
    pdf.set_line_width(0.4)
    pdf.rect(x, 132, 36, 26, "FD")
    pdf.set_xy(x, 137)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*C_PRIMARY)
    pdf.cell(36, 10, val, align="C")
    pdf.set_xy(x, 149)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*C_MUTED)
    pdf.cell(36, 5, label, align="C")

# Metadata
pdf.set_y(172)
meta = [
    ("Platform",    "Next.js 14 App Router + TypeScript"),
    ("AI Provider", "Anthropic Claude (Haiku 4.5 + Sonnet 4.6)"),
    ("Database",    "Supabase (PostgreSQL + Storage)"),
    ("Deployment",  "Vercel Edge Network"),
    ("Version",     "1.0 - Phase 1"),
    ("Date",        TODAY),
    ("Author",      "legendashish  -  https://github.com/legendashish"),
    ("Repository",  "github.com/Ashuu02/Project_tear  -  branch: Ashish"),
]
for i, (k, v) in enumerate(meta):
    pdf.set_x(20)
    pdf.set_fill_color(*(C_BG if i % 2 == 0 else C_WHITE))
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*C_MUTED)
    pdf.cell(42, 6, k, fill=True)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*C_DARK)
    pdf.cell(140, 6, v, fill=True, ln=True)

pdf.set_fill_color(*C_PRIMARY)
pdf.rect(0, 272, 210, 25, "F")
pdf.set_y(279)
pdf.set_font("Helvetica", "", 8)
pdf.set_text_color(255, 200, 180)
pdf.cell(0, 5, f"Confidential  -  legendashish  -  {TODAY}", align="C")


# ===============================================================
# PAGE 2 - TABLE OF CONTENTS + SYSTEM OVERVIEW
# ===============================================================
pdf.add_page()
pdf.h1("Table of Contents")

toc = [
    ("1", "System Overview",         "High-level description and key capabilities"),
    ("2", "Tech Stack",              "All technologies, frameworks, libraries and versions"),
    ("3", "User Journey",            "End-to-end user flow across all 6 application pages"),
    ("4", "System Architecture",     "Component diagram and module responsibilities"),
    ("5", "Agent Pipeline",          "3-agent AI pipeline with inputs, outputs, models"),
    ("6", "Data Flow & SSE",         "Real-time event streaming architecture and event types"),
    ("7", "API Routes",              "All backend endpoints and their purpose"),
    ("8", "Database Schema",         "Supabase tables, columns, and relationships"),
    ("9", "State Management",        "Zustand store structure and localStorage persistence"),
    ("10","Deployment Architecture", "Vercel + Supabase production configuration"),
]
for num, title, desc in toc:
    pdf.need_page(9)
    pdf.set_x(12)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*C_PRIMARY)
    pdf.cell(10, 8, num + ".", align="R")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*C_DARK)
    pdf.cell(55, 8, title)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*C_MUTED)
    pdf.cell(0, 8, desc, ln=True)

pdf.ln(4)
pdf.h1("1. System Overview", "What Tear is and what it does")

pdf.set_x(12)
pdf.set_font("Helvetica", "", 9)
pdf.set_text_color(*C_DARK)
pdf.multi_cell(186, 5.5,
    "Tear is an AI-powered product research platform. A user enters a product name, answers a "
    "structured Q&A (Tier 1 research dimensions + 10 Tier 2 deep-dive questions), and optionally "
    "provides extra context. A multi-agent AI pipeline then validates the product, crawls the web "
    "across 10 targeted searches, and synthesises a citation-backed 12-section research document "
    "complete with bar charts, pie charts, comparison tables, SWOT analysis, pricing deep-dives, "
    "and strategic outlook. Results stream to the browser in real-time via Server-Sent Events (SSE). "
    "The final research view includes a split panel: citation sources on top and an AI chatbot "
    "at the bottom for follow-up questions."
)
pdf.ln(4)

caps = [
    (C_GREEN,   C_GREEN_BG,  "Real-Time Streaming",    "SSE pushes agent status, crawl items, and preview text live as they happen"),
    (C_BLUE,    C_BLUE_BG,   "Multi-Agent Pipeline",   "3 specialised Claude agents: validation, web research, document synthesis"),
    (C_PRIMARY, C_BG,        "12-Section Research Doc","Exec summary, pricing, GTM, tech, SWOT, financials - all data-backed"),
    (C_PURPLE,  C_PURPLE_BG, "Citation-Backed",        "Every claim traced to a real web source with full citations panel"),
]
for color, bg, title, desc in caps:
    pdf.need_page(16)
    x, y = 12, pdf.get_y()
    pdf.set_fill_color(*bg)
    pdf.set_draw_color(*color)
    pdf.set_line_width(0.6)
    pdf.rect(x, y, 186, 13, "FD")
    pdf.set_fill_color(*color)
    pdf.rect(x, y, 3, 13, "F")
    pdf.set_xy(x + 6, y + 2)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(*color)
    pdf.cell(52, 5, title)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*C_DARK)
    pdf.cell(0, 5, desc, ln=True)
    pdf.ln(2)


# ===============================================================
# TECH STACK
# ===============================================================
pdf.add_page()
pdf.h1("2. Tech Stack", "Complete list of technologies, frameworks, and libraries")

layers = [
    ("FRONTEND", C_BLUE, [
        ("Framework",    "Next.js 14",                  "App Router, RSC, dynamic routes, file-based API routes"),
        ("Language",     "TypeScript 5",                "Strict mode, full type safety across codebase"),
        ("Styling",      "Tailwind CSS 3",              "Utility-first CSS with custom design tokens"),
        ("State",        "Zustand",                     "Client state + localStorage persistence (tear-session key)"),
        ("Charts",       "Recharts",                    "Bar, Line, Pie, Donut charts rendered in research document"),
        ("Animation",    "Framer Motion",               "Page transitions and micro-interactions"),
        ("Fonts",        "Lora + DM Sans",              "Loaded via next/font - Lora for headings, DM Sans for body"),
    ]),
    ("AI / LLM", C_PRIMARY, [
        ("AI SDK",       "Vercel AI SDK v6",            "generateText, streamText, fullStream, textStream, tool use"),
        ("Provider",     "Anthropic Claude API",        "@ai-sdk/anthropic - wraps Anthropic REST API"),
        ("Agent 1",      "claude-haiku-4-5-20251001",   "Question Agent - fast product validation, ~200 max output tokens"),
        ("Agent 2",      "claude-haiku-4-5-20251001",   "Crawler Agent - 10 web searches, 6000 max output tokens"),
        ("Agent 3",      "claude-sonnet-4-6",           "Document Agent - 12-section JSON synthesis, 10000 max tokens"),
        ("Chat",         "claude-sonnet-4-6",           "Research chatbot - context-aware Q&A on the teardown"),
        ("Web Search",   "webSearch_20250305 tool",     "Anthropic native tool, up to 10 uses per crawl, real-time source events"),
    ]),
    ("BACKEND / API", C_GREEN, [
        ("Runtime",      "Node.js (serverless)",        "Next.js API routes compiled to Vercel serverless functions"),
        ("Streaming",    "Server-Sent Events",          "ReadableStream, Content-Type: text/event-stream, X-Accel-Buffering: no"),
        ("File Upload",  "Supabase Storage",            "Multipart form-data -> context-uploads bucket (PDF, DOCX, TXT, 10 MB max)"),
        ("Token Track",  "tokenTracker.ts",             "Upserts session_tokens + inserts token_usage row per agent call"),
        ("JSON Safety",  "sanitize + recover",          "sanitizeJSONString escapes control chars; recoverTruncatedJSON finds last valid section"),
    ]),
    ("DATABASE", C_PURPLE, [
        ("Provider",     "Supabase",                   "Managed PostgreSQL + object storage + PostgREST API"),
        ("Public client","supabase (anon key)",         "NEXT_PUBLIC_SUPABASE_ANON_KEY - used client and server-side"),
        ("Admin client", "supabaseAdmin (service role)","SUPABASE_SERVICE_ROLE_KEY - server-only, bypasses RLS"),
        ("Tables",       "session_tokens, token_usage","uploaded_files, question_bank"),
        ("Storage",      "context-uploads bucket",     "User-uploaded context files served via Supabase Storage CDN"),
    ]),
    ("INFRASTRUCTURE", C_AMBER, [
        ("Hosting",      "Vercel",                     "Serverless functions + Edge Network + automatic GitHub deploys"),
        ("Repo",         "Ashuu02/Project_tear",       "main = production, Ashish = feature branch"),
        ("CI/CD",        "Vercel GitHub integration",  "Auto-deploy preview on push, production deploy on merge to main"),
        ("Env vars",     ".env.local / Vercel dashboard","6 environment variables (see Deployment section)"),
        ("Design system","#C2451E primary, #FDFAF6 bg","Terracotta red + warm off-white + DM Sans / Lora typography"),
    ]),
]

for layer_name, color, rows in layers:
    layer_h = 7 + len(rows) * 6.5 + 3
    pdf.need_page(layer_h)
    y_s = pdf.get_y()
    pdf.set_fill_color(*color)
    pdf.rect(10, y_s, 190, 7, "F")
    pdf.set_xy(13, y_s + 1)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(0, 5, layer_name, ln=True)
    pdf.set_text_color(*C_DARK)
    for j, (label, tech, detail) in enumerate(rows):
        pdf.need_page(7)
        y_r = pdf.get_y()
        pdf.set_fill_color(*(C_BG if j % 2 == 0 else C_WHITE))
        pdf.rect(10, y_r, 190, 6.5, "F")
        pdf.set_xy(10, y_r)
        pdf.set_font("Helvetica", "B", 7.5)
        pdf.set_text_color(*C_MUTED)
        pdf.cell(28, 6.5, label)
        pdf.set_font("Helvetica", "B", 7.5)
        pdf.set_text_color(*color)
        pdf.cell(44, 6.5, tech)
        pdf.set_font("Helvetica", "", 7.5)
        pdf.set_text_color(*C_DARK)
        pdf.cell(118, 6.5, detail, ln=True)
    pdf.ln(3)


# ===============================================================
# USER JOURNEY
# ===============================================================
pdf.add_page()
pdf.h1("3. User Journey", "End-to-end flow across all 6 pages of the application")

steps = [
    ("1", "/",                    "Landing Page",         C_BLUE,   C_BLUE_BG,
     "User arrives at the landing page. Sees headline, example chips (Notion, Figma, Shopify), "
     "and a search input. Types a product name and clicks 'Build my teardown'. "
     "UUID v4 session ID is generated and stored in localStorage via Zustand. Product name saved to session store."),
    ("2", "/intake",              "Tier 1 Q&A",           C_PRIMARY, C_BG,
     "3-step wizard collects high-level research preferences. Step 1: dimensions (multi-select: Business, GTM, "
     "Tech, Financials, Community, UX). Step 2: goal (competitive, investment, due-diligence, understand). "
     "Step 3: depth (quick, standard, deep-dive). Progress bar and animated transitions. Saved to tier1Answers."),
    ("3", "/tier2/[sessionId]",   "Deep-Dive Q&A",        C_PURPLE, C_PURPLE_BG,
     "10 structured questions rendered one at a time with animated slide transitions. Questions adapt based "
     "on Tier 1 answers - product category, maturity, audience, GTM focus, financial metric, growth motion, "
     "competitor scope. Single-select and multi-select option grids. Back/Continue navigation. Saved to tier2Answers."),
    ("4", "/context/[sessionId]", "Optional Context",     C_AMBER,  C_AMBER_BG,
     "User can optionally enrich the research: free-text textarea (paste product brief, press releases, notes), "
     "one-click clipboard paste button, or drag-and-drop file upload (PDF, DOCX, TXT - max 10 MB). "
     "File uploaded to Supabase Storage. Skip button available. Saved to userContext in Zustand."),
    ("5", "/pipeline/[sessionId]","Live Agent Pipeline",  C_GREEN,  C_GREEN_BG,
     "SSE connection to /api/stream/[sessionId]. Left panel: Research Agents feed - individual source domains "
     "appear in real-time as Crawler cites them; Document Agent shows percentage + ETA every 2 seconds with "
     "animated progress bar. Right panel: live preview of Executive Summary as it generates."),
    ("6", "/research/[sessionId]","Research Document",    C_DARK,   C_BG,
     "12-section teardown rendered. Left sidebar: section navigation (01-12). Main content: paragraphs, "
     "key insight callout, stat cards, bullet lists, Recharts charts (bar/pie/donut/line), and data tables. "
     "Right split panel: Citations on top (domain, title, section); AI Chatbot on bottom (context-aware Q&A)."),
]

for num, route, title, color, bg, desc in steps:
    pdf.need_page(37)
    y0 = pdf.get_y()
    pdf.set_fill_color(*bg)
    pdf.set_draw_color(*color)
    pdf.set_line_width(0.6)
    pdf.rect(10, y0, 190, 30, "FD")
    pdf.set_fill_color(*color)
    pdf.rect(10, y0, 3, 30, "F")
    # Number circle
    pdf.set_fill_color(*color)
    pdf.ellipse(15, y0 + 4, 9, 9, "F")
    pdf.set_xy(15, y0 + 5.5)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(9, 5, num, align="C")
    # Route chip
    pdf.set_fill_color(*C_WHITE)
    pdf.set_draw_color(*color)
    pdf.set_line_width(0.3)
    chip_w = min(54, len(route) * 4.5 + 8)
    pdf.rect(27, y0 + 4.5, chip_w, 7, "FD")
    pdf.set_xy(27, y0 + 5.5)
    pdf.set_font("Helvetica", "B", 6.5)
    pdf.set_text_color(*color)
    pdf.cell(chip_w, 5, route, align="C")
    # Title
    pdf.set_xy(27 + chip_w + 3, y0 + 4.5)
    pdf.set_font("Helvetica", "B", 9.5)
    pdf.set_text_color(*color)
    pdf.cell(0, 6, title, ln=True)
    # Description
    pdf.set_x(27)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(*C_DARK)
    pdf.multi_cell(170, 4.3, desc)
    # Arrow between steps
    if num != "6":
        pdf.arrow_down(19, y0 + 30, 5)
    pdf.set_y(y0 + 35)
    pdf.set_text_color(*C_DARK)


# ===============================================================
# SYSTEM ARCHITECTURE
# ===============================================================
pdf.add_page()
pdf.h1("4. System Architecture", "Component diagram - browser, API layer, AI services, and database")

def layer_box(pdf, y, h, title, color, bg):
    pdf.set_fill_color(*bg)
    pdf.set_draw_color(*color)
    pdf.set_line_width(0.5)
    pdf.rect(10, y, 190, h, "FD")
    pdf.set_fill_color(*color)
    pdf.rect(10, y, 190, 7, "F")
    pdf.set_xy(13, y + 1)
    pdf.set_font("Helvetica", "B", 7.5)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(0, 5, title, ln=True)

def comp_box(pdf, x, y, w, h, label, color, bg):
    pdf.set_fill_color(*bg)
    pdf.set_draw_color(*color)
    pdf.set_line_width(0.4)
    pdf.rect(x, y, w, h, "FD")
    lines = label.split("\n")
    total_h = len(lines) * 4.5
    start_y = y + (h - total_h) / 2
    for li, line in enumerate(lines):
        pdf.set_xy(x, start_y + li * 4.5)
        if li == 0:
            pdf.set_font("Helvetica", "B", 6.5)
            pdf.set_text_color(*color)
        else:
            pdf.set_font("Helvetica", "", 6)
            pdf.set_text_color(*C_MUTED)
        pdf.cell(w, 4.5, line, align="C")
    pdf.set_text_color(*C_DARK)

# Browser Layer
by = pdf.get_y()
layer_box(pdf, by, 52, "BROWSER  -  Next.js Client Components", C_BLUE, C_BLUE_BG)
comp_box(pdf, 12, by+9,  44, 16, "Landing Page\n/", C_BLUE, C_WHITE)
comp_box(pdf, 59, by+9,  40, 16, "Intake Wizard\n/intake", C_BLUE, C_WHITE)
comp_box(pdf, 102,by+9,  44, 16, "Tier2 Q&A\n/tier2/[id]", C_BLUE, C_WHITE)
comp_box(pdf, 149,by+9,  49, 16, "Context Upload\n/context/[id]", C_BLUE, C_WHITE)
comp_box(pdf, 12, by+28, 55, 18, "Pipeline Feed\n/pipeline/[id]", C_GREEN, C_GREEN_BG)
comp_box(pdf, 70, by+28, 60, 18, "Research Doc\n/research/[id]", C_GREEN, C_GREEN_BG)
comp_box(pdf, 133,by+28, 65, 18, "Zustand Store\ntear-session (localStorage)", C_AMBER, C_AMBER_BG)

# Connector label
pdf.set_y(by + 54)
pdf.set_font("Helvetica", "", 7)
pdf.set_text_color(*C_MUTED)
pdf.cell(0, 5, "SSE (EventSource)  -  REST (fetch)  -  multipart/form-data", align="C", ln=True)
pdf.arrow_down(105, by + 58, 7)

# API Layer
ay = pdf.get_y()
layer_box(pdf, ay, 40, "NEXT.JS API ROUTES  -  Node.js Serverless Functions (Vercel)", C_PRIMARY, C_BG)
comp_box(pdf, 12,  ay+9,  58, 16, "/api/stream/[id]\nSSE Pipeline", C_PRIMARY, C_WHITE)
comp_box(pdf, 73,  ay+9,  44, 16, "/api/research/chat\nAI Chatbot", C_PRIMARY, C_WHITE)
comp_box(pdf, 120, ay+9,  44, 16, "/api/context/upload\nFile Upload", C_GREEN, C_GREEN_BG)
comp_box(pdf, 167, ay+9,  31, 16, "/api/tokens\nUsage Stats", C_PURPLE, C_PURPLE_BG)
comp_box(pdf, 12,  ay+27, 27, 10, "/api/migrate", C_MUTED, C_LIGHT)
comp_box(pdf, 42,  ay+27, 27, 10, "/api/pptx", C_MUTED, C_LIGHT)

# Connectors down
pdf.set_y(ay + 42)
pdf.set_font("Helvetica", "", 7)
pdf.set_text_color(*C_MUTED)
pdf.cell(0, 5, "Anthropic API calls (HTTPS)  -  Supabase PostgreSQL + Storage", align="C", ln=True)
pdf.arrow_down(55, ay + 46, 7)
pdf.arrow_down(155, ay + 46, 7)

# AI + DB Layer
aly = pdf.get_y()
pdf.need_page(46)
aly = pdf.get_y()
# AI
pdf.set_fill_color(*C_BG)
pdf.set_draw_color(*C_PRIMARY)
pdf.set_line_width(0.5)
pdf.rect(10, aly, 115, 44, "FD")
pdf.set_fill_color(*C_PRIMARY)
pdf.rect(10, aly, 115, 7, "F")
pdf.set_xy(13, aly + 1.5)
pdf.set_font("Helvetica", "B", 7.5)
pdf.set_text_color(*C_WHITE)
pdf.cell(0, 5, "ANTHROPIC CLAUDE API", ln=True)
comp_box(pdf, 12,  aly+9, 34, 22, "Haiku 4.5\nQuestion Agent\n200 tokens", C_PRIMARY, C_WHITE)
comp_box(pdf, 49,  aly+9, 38, 22, "Haiku 4.5\nCrawler Agent\nwebSearch x10", C_PRIMARY, C_WHITE)
comp_box(pdf, 90,  aly+9, 33, 22, "Sonnet 4.6\nDoc Agent\n10K tokens", C_PRIMARY, C_WHITE)
comp_box(pdf, 12,  aly+33, 111, 10, "Sonnet 4.6  -  Research Chatbot", C_PRIMARY, C_WHITE)

# DB
pdf.set_fill_color(*C_PURPLE_BG)
pdf.set_draw_color(*C_PURPLE)
pdf.rect(130, aly, 70, 44, "FD")
pdf.set_fill_color(*C_PURPLE)
pdf.rect(130, aly, 70, 7, "F")
pdf.set_xy(133, aly + 1.5)
pdf.set_font("Helvetica", "B", 7.5)
pdf.set_text_color(*C_WHITE)
pdf.cell(0, 5, "SUPABASE", ln=True)
items = ["PostgreSQL (4 tables)", "Storage - context-uploads", "Anon + Service role clients"]
for k, it in enumerate(items):
    pdf.set_xy(133, aly + 9 + k * 8)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*C_DARK)
    pdf.cell(65, 6, "- " + it, ln=True)

pdf.set_text_color(*C_DARK)
pdf.set_y(aly + 46)


# ===============================================================
# AGENT PIPELINE
# ===============================================================
pdf.add_page()
pdf.h1("5. Agent Pipeline", "3-agent sequence: validation -> web research -> document synthesis")

agents_data = [
    {
        "num": "1", "name": "Question Agent", "model": "claude-haiku-4-5-20251001",
        "color": C_BLUE,
        "input":   "Product name (string from URL query param)",
        "output":  "1-2 sentence product description + value proposition",
        "tokens":  "~80 input  -  200 max output",
        "tools":   "None",
        "purpose": (
            "Quickly confirms the product name is a real software product. Prevents wasting "
            "expensive crawler tokens on typos or non-existent products. The first sentence of "
            "the response (before the first full-stop) is shown in the agent feed row."
        ),
    },
    {
        "num": "2", "name": "Crawler Agent", "model": "claude-haiku-4-5-20251001",
        "color": C_PRIMARY,
        "input":   "10-search prompt built from product name + Tier 1/2 answers + user context",
        "output":  "Structured research report across 10 categories (~6K tokens)",
        "tokens":  "~3,000 input  -  6,000 max output  -  10 web searches",
        "tools":   "webSearch_20250305 (maxUses: 10) - Anthropic native tool",
        "purpose": (
            "Executes 10 targeted mandatory searches: pricing, funding/ARR, user reviews, "
            "competitive landscape, customer profiles, market sizing, team/culture, tech stack, "
            "community sentiment, recent news/roadmap. Adapts with extra dimension-specific searches "
            "based on Tier 1 focus areas. Uses streamText.fullStream - 'source' events fire as each "
            "URL is cited, populating individual crawl rows in the agent feed in real-time."
        ),
    },
    {
        "num": "3", "name": "Document Agent", "model": "claude-sonnet-4-6",
        "color": C_GREEN,
        "input":   "Compressed research (max 12K chars) + compact 12-section JSON schema",
        "output":  "Raw JSON: 12 ResearchSection objects + sources array",
        "tokens":  "~5,000 input  -  10,000 max output  -  ~2-3 min via streamText",
        "tools":   "None",
        "purpose": (
            "Synthesises crawler output into a structured 12-section teardown. Each section has: "
            "content (2-3 paragraphs, 60-80 words each), keyInsight, stats (3-5 real metrics), "
            "bullets (4-5 takeaways), and optionally tables and chartData for Recharts. "
            "Uses streamText.textStream - percentage + ETA update in the feed every 2 seconds. "
            "Output goes through sanitizeJSONString (fixes unescaped newlines) and "
            "recoverTruncatedJSON (rescues output cut off at maxOutputTokens)."
        ),
    },
]

for ag in agents_data:
    pdf.need_page(59)
    y0 = pdf.get_y()
    pdf.set_fill_color((240, 248, 255) if ag["color"] == C_BLUE else
                       C_BG if ag["color"] == C_PRIMARY else C_GREEN_BG)
    pdf.set_draw_color(*ag["color"])
    pdf.set_line_width(0.7)
    pdf.rect(10, y0, 190, 52, "FD")
    pdf.set_fill_color(*ag["color"])
    pdf.rect(10, y0, 190, 11, "F")
    pdf.rect(10, y0, 3, 52, "F")
    # Header
    pdf.set_xy(16, y0 + 2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(65, 6, f"Agent {ag['num']}: {ag['name']}")
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(0, 6, f"Model: {ag['model']}", ln=True)
    # KV rows
    for k, (label, val) in enumerate([
        ("Input",  ag["input"]),
        ("Output", ag["output"]),
        ("Tokens", ag["tokens"]),
        ("Tools",  ag["tools"]),
    ]):
        pdf.set_xy(14, y0 + 13 + k * 6)
        pdf.set_font("Helvetica", "B", 7.5)
        pdf.set_text_color(*ag["color"])
        pdf.cell(22, 5.5, label + ":")
        pdf.set_font("Helvetica", "", 7.5)
        pdf.set_text_color(*C_DARK)
        pdf.cell(0, 5.5, val, ln=True)
    # Purpose
    pdf.set_x(14)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(*C_MUTED)
    pdf.multi_cell(183, 4, ag["purpose"])
    if ag["num"] != "3":
        pdf.arrow_down(105, y0 + 52, 5)
    pdf.set_y(y0 + 57)
    pdf.set_text_color(*C_DARK)

pdf.ln(2)
pdf.need_page(14)
pdf.set_font("Helvetica", "B", 8.5)
pdf.set_text_color(*C_DARK)
pdf.cell(0, 6, "12 Research Sections produced by Document Agent:", ln=True)
secs = [
    "01 Executive Summary","02 Product & UX Analysis","03 Business Model & Revenue",
    "04 Pricing Deep-Dive","05 GTM & Growth Strategy","06 Technical Architecture",
    "07 Market & Competitive","08 Customer Profiles & ICP",
    "09 Community & Ecosystem","10 Financials & Funding",
    "11 SWOT Analysis","12 Strategic Outlook & Risks",
]
for i, s in enumerate(secs):
    if i % 3 == 0:
        pdf.need_page(7)
    pdf.set_x(10 + (i % 3) * 63)
    pdf.set_fill_color(*C_BG)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(*C_DARK)
    pdf.cell(61, 6, s, fill=True, border="B")
    if i % 3 == 2:
        pdf.ln(6)


# ===============================================================
# DATA FLOW & SSE STREAMING
# ===============================================================
pdf.add_page()
pdf.h1("6. Data Flow & SSE Streaming", "Real-time event timeline from browser to agents and back")

events = [
    ("0s",    C_BLUE,    "Browser opens EventSource",        "/api/stream/[sessionId]?product=X&tier1=...&tier2=..."),
    ("~1s",   C_BLUE,    "SSE: agent running",               '{ type:"agent", agent:"Question Agent", status:"running" }'),
    ("~4s",   C_BLUE,    "SSE: agent done",                  '{ type:"agent", status:"done", message:"Instagram is a photo-sharing platform" }'),
    ("~5s",   C_PRIMARY, "SSE: crawler running",             '{ type:"agent", agent:"Crawler Agent", status:"running" }'),
    ("~5s",   C_PRIMARY, "SSE: sources progress",            '{ type:"sources", crawled:0, total:10 }'),
    ("~20s",  C_PRIMARY, "SSE: real-time crawl item",        '{ type:"crawl", url:"crunchbase.com", findings:"Funding data..." }'),
    ("~90s",  C_PRIMARY, "SSE: crawler done",                '{ type:"agent", status:"done", message:"Pulled from 9 sources" }'),
    ("~90s",  C_GREEN,   "SSE: doc agent starts + ETA",      '{ type:"agent", message:"Building report (est. ~1m 50s)...", progress:0 }'),
    ("~92s",  C_GREEN,   "SSE: progress update (every 2s)",  '{ type:"agent", message:"Writing 8% - ~98s remaining", progress:8 }'),
    ("~150s", C_GREEN,   "SSE: live preview text",           '{ type:"preview", text:"Executive Summary paragraph..." }'),
    ("~180s", C_GREEN,   "SSE: doc agent done",              '{ type:"agent", status:"done", message:"12 sections generated", progress:100 }'),
    ("~180s", C_GREEN,   "SSE: done - navigate to research", '{ type:"done", document:{ sections:[...12], sources:[...] } }'),
]

for i, (t, color, label, payload) in enumerate(events):
    pdf.need_page(14)
    y_e = pdf.get_y()
    dot_x = 22
    if i < len(events) - 1:
        pdf.set_draw_color(*C_BORDER)
        pdf.set_line_width(0.3)
        pdf.line(dot_x, y_e + 4, dot_x, y_e + 13)
    pdf.set_fill_color(*color)
    pdf.ellipse(dot_x - 2, y_e + 1, 4, 4, "F")
    pdf.set_xy(10, y_e)
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_text_color(*C_MUTED)
    pdf.cell(10, 6, t, align="R")
    pdf.set_xy(27, y_e)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*color)
    pdf.cell(68, 6, label)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*C_MUTED)
    pdf.cell(0, 6, payload, ln=True)
    pdf.set_text_color(*C_DARK)

pdf.ln(5)
pdf.h1("SSE Event Types Reference")

pdf.set_x(10)
pdf.trow(["Event type", "Key fields", "Purpose"], [30, 65, 95], header=True)
sse_rows = [
    ("agent",   "agent, status, message, progress?",      "Agent lifecycle updates - running/done/error + live progress %"),
    ("crawl",   "url (domain), message, findings?",        "One row per cited source domain (fires in real-time via fullStream)"),
    ("sources", "crawled (int), total (int)",              "Updates the source counter shown in TeardownPreview panel"),
    ("preview", "text (string)",                           "First 2 paragraphs of exec summary for right-panel live preview"),
    ("done",    "document (ResearchDoc)",                  "Full 12-section JSON - triggers router.push() to /research"),
    ("error",   "message (string)",                        "Unhandled pipeline error - marks active agent as failed, closes stream"),
]
for j, row in enumerate(sse_rows):
    pdf.set_x(10)
    pdf.trow(list(row), [30, 65, 95], fill=(j % 2 == 0))


# ===============================================================
# API ROUTES + DATABASE SCHEMA
# ===============================================================
pdf.add_page()
pdf.h1("7. API Routes", "All backend endpoints - method, purpose, and key behaviour")

pdf.set_x(10)
pdf.trow(["Route", "Method", "Purpose + Notes"], [65, 18, 107], header=True)
api_rows = [
    ("/api/stream/[sessionId]", "GET",  "SSE pipeline - ReadableStream, runs all 3 agents, emits agent/crawl/sources/preview/done events"),
    ("/api/research/chat",      "POST", "AI chatbot - Sonnet 4.6 with full research doc injected as system context, returns streamed reply"),
    ("/api/context/upload",     "POST", "Multipart upload -> Supabase Storage context-uploads bucket, returns { filePath, fileUrl }"),
    ("/api/tokens/[sessionId]", "GET",  "Returns { totalTokens, inputTokens, outputTokens, breakdown[] } for a session"),
    ("/api/migrate",            "POST", "Creates missing Supabase tables (dev helper - always returns 200, graceful if tables exist)"),
    ("/api/pptx",               "POST", "PPTX slide deck generation via PptxGenJS (Phase 2 - planned)"),
    ("/api/deck",               "GET",  "Returns deck configuration for a session (Phase 2 - planned)"),
    ("/api/agents/*",           "POST", "Individual agent endpoints (orchestrator, crawler, question, document, backend, pptx - Phase 2)"),
]
for j, row in enumerate(api_rows):
    pdf.set_x(10)
    pdf.trow(list(row), [65, 18, 107], fill=(j % 2 == 0))

pdf.ln(6)
pdf.h1("8. Database Schema", "Supabase PostgreSQL - tables, columns, types, and purpose")

db_tables = [
    ("session_tokens", C_PURPLE, "Cumulative token usage per session (one row per session, upserted on each agent call)", [
        ("id",            "uuid",      "Primary key, gen_random_uuid()"),
        ("session_id",    "text",      "Unique identifier per browser session (UUID v4)"),
        ("product_name",  "text",      "Product being researched in this session"),
        ("total_tokens",  "integer",   "Sum of input + output tokens for all agents"),
        ("input_tokens",  "integer",   "Total input tokens across all 3 agents"),
        ("output_tokens", "integer",   "Total output tokens across all 3 agents"),
        ("created_at",    "timestamp", "Row creation time (first agent call)"),
        ("updated_at",    "timestamp", "Last upsert time (after each agent completes)"),
    ]),
    ("token_usage", C_GREEN, "Granular per-agent token log - one row inserted per agent call", [
        ("id",            "uuid",      "Primary key"),
        ("session_id",    "text",      "FK to session_tokens.session_id"),
        ("product_name",  "text",      "Product being researched"),
        ("agent_name",    "text",      "question_agent | crawler_agent | document_agent"),
        ("input_tokens",  "integer",   "Input tokens for this specific agent invocation"),
        ("output_tokens", "integer",   "Output tokens for this specific agent invocation"),
        ("created_at",    "timestamp", "Timestamp when the agent completed"),
    ]),
    ("uploaded_files", C_AMBER, "Metadata for files uploaded to Supabase Storage by users", [
        ("id",            "uuid",      "Primary key"),
        ("session_id",    "text",      "Session that uploaded the file"),
        ("file_name",     "text",      "Original filename from the user's computer"),
        ("file_path",     "text",      "Storage path in context-uploads bucket"),
        ("file_size",     "integer",   "File size in bytes (max 10 MB enforced client-side)"),
        ("mime_type",     "text",      "MIME type (application/pdf, text/plain, etc.)"),
        ("created_at",    "timestamp", "Upload timestamp"),
    ]),
    ("question_bank", C_BLUE, "Tier 2 question definitions (optional - currently hardcoded in tier2Questions.ts)", [
        ("id",            "uuid",      "Primary key"),
        ("question_id",   "text",      "Unique question slug identifier"),
        ("question_text", "text",      "The question displayed to the user"),
        ("type",          "text",      "single (single-select) | multi (multi-select)"),
        ("options",       "jsonb",     "Array: [{ value, label, icon?, description? }]"),
        ("category",      "text",      "Research dimension this question belongs to"),
        ("created_at",    "timestamp", ""),
    ]),
]

for tbl_name, color, desc, cols in db_tables:
    tbl_h = 8 + 7 + len(cols) * 7 + 4
    pdf.need_page(tbl_h)
    y_t = pdf.get_y()
    pdf.set_fill_color(*color)
    pdf.rect(10, y_t, 190, 8, "F")
    pdf.set_xy(13, y_t + 1.5)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(45, 5, tbl_name)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.cell(0, 5, desc, ln=True)
    pdf.set_x(10)
    pdf.trow(["Column", "Type", "Description"], [38, 25, 127], header=True)
    for j, (col, typ, note) in enumerate(cols):
        pdf.set_x(10)
        pdf.trow([col, typ, note], [38, 25, 127], fill=(j % 2 == 0))
    pdf.ln(4)


# ===============================================================
# STATE + DEPLOYMENT
# ===============================================================
pdf.add_page()
pdf.h1("9. State Management", "Zustand store persisted to localStorage under key 'tear-session'")

pdf.set_x(10)
pdf.trow(["Store field", "Type", "Set by", "Read by"], [38, 40, 38, 74], header=True)
store_rows = [
    ("productName",  "string",                     "/  (landing)",          "/intake, /tier2, /context, /pipeline, /research"),
    ("sessionId",    "string (UUID v4)",            "/  (landing)",          "All API calls - path param + query param"),
    ("tier1Answers", "{ dimensions, goal, depth }","  /intake",             "/pipeline -> tier1 query param for SSE"),
    ("tier2Answers", "Record<string, string[]>",   "/tier2/[id]",           "/pipeline -> tier2 query param for SSE"),
    ("userContext",  "{ text?, fileUrl? }",         "/context/[id]",         "/pipeline -> userContext query param for SSE"),
    ("researchDoc",  "ResearchDoc | null",          "/pipeline (SSE done)",  "/research/[id] - renders all 12 sections"),
]
for j, row in enumerate(store_rows):
    pdf.set_x(10)
    pdf.trow(list(row), [38, 40, 38, 74], fill=(j % 2 == 0))

pdf.ln(6)
pdf.h1("10. Deployment Architecture", "Vercel + Supabase production configuration")

pdf.set_x(12)
pdf.set_font("Helvetica", "", 9)
pdf.set_text_color(*C_DARK)
pdf.multi_cell(186, 5.5,
    "The application is deployed on Vercel with automatic deploys from the GitHub repository "
    "(Ashuu02/Project_tear). The main branch is production. The Ashish feature branch deploys "
    "to Vercel preview environments automatically on every push. All environment variables "
    "are configured in the Vercel dashboard and injected at both build time and runtime."
)
pdf.ln(3)

pdf.set_x(10)
pdf.trow(["Environment Variable", "Scope", "Purpose"], [72, 28, 90], header=True)
env_rows = [
    ("ANTHROPIC_API_KEY",             "Server only", "Anthropic API key - required for all 3 agents + chatbot"),
    ("NEXT_PUBLIC_SUPABASE_URL",      "Client+Server","Supabase project URL - safe to expose to browser"),
    ("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Client+Server","Supabase anon key - RLS enforced, safe to expose"),
    ("SUPABASE_SERVICE_ROLE_KEY",     "Server only", "Supabase service role - bypasses RLS, never expose to client"),
    ("NEXT_PUBLIC_APP_URL",           "Client",      "Production URL e.g. https://tear.vercel.app"),
    ("NEXT_PUBLIC_DEMO_MODE",         "Client+Server","true = use mock data, skip real API calls (for demos)"),
]
for j, row in enumerate(env_rows):
    pdf.set_x(10)
    pdf.trow(list(row), [72, 28, 90], fill=(j % 2 == 0))

pdf.ln(6)
pdf.h1("CI/CD & Deploy Flow")

deploy = [
    (C_BLUE,    "1", "git push origin Ashish",          "Push feature commits to GitHub Ashish branch"),
    (C_GREEN,   "2", "Vercel preview deploy triggered",  "Auto-deploy to preview URL for testing"),
    (C_AMBER,   "3", "Pull Request: Ashish -> main",      "Code review via GitHub PR (branch protection on main)"),
    (C_PRIMARY, "4", "PR merged to main",                "Triggers production deploy on Vercel"),
    (C_GREEN,   "5", "Production updated",               "Live at https://your-app.vercel.app"),
]
for color, num, cmd, desc in deploy:
    pdf.need_page(13)
    y_d = pdf.get_y()
    pdf.set_fill_color(*C_BG)
    pdf.set_draw_color(*color)
    pdf.set_line_width(0.5)
    pdf.rect(10, y_d, 190, 10, "FD")
    pdf.set_fill_color(*color)
    pdf.ellipse(12, y_d + 2, 6, 6, "F")
    pdf.set_xy(12, y_d + 3.5)
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(6, 4, num, align="C")
    pdf.set_xy(21, y_d + 2.5)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(*color)
    pdf.cell(72, 5, cmd)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*C_DARK)
    pdf.cell(0, 5, desc, ln=True)
    pdf.ln(2)

pdf.ln(4)
pdf.h1("Key File Structure")
files = [
    ("src/app/api/stream/[sessionId]/route.ts", "SSE pipeline - all 3 agents, JSON recovery, streamText"),
    ("src/app/pipeline/[sessionId]/page.tsx",    "Pipeline page - EventSource, feed state, progress handling"),
    ("src/components/pipeline/AgentFeed.tsx",    "Agent feed UI - progress bar, crawl items, status icons"),
    ("src/components/research/DocumentBody.tsx", "Research renderer - Recharts charts, tables, stat cards"),
    ("src/store/session.ts",                     "Zustand store - productName, sessionId, tier1/2, researchDoc"),
    ("src/types/teardown.ts",                    "TypeScript types - ResearchDoc, ResearchSection, ChartData"),
    ("src/lib/supabase.ts",                      "Supabase clients - lazy init with placeholder fallbacks for build"),
    ("src/lib/tokenTracker.ts",                  "Token usage tracker - upserts session_tokens, inserts token_usage"),
    ("src/data/tier2Questions.ts",               "10 Tier 2 question definitions with options and metadata"),
]
for j, (path, desc) in enumerate(files):
    pdf.need_page(8)
    pdf.set_x(10)
    pdf.set_fill_color(*(C_BG if j % 2 == 0 else C_WHITE))
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_text_color(*C_PRIMARY)
    pdf.cell(100, 6.5, path, fill=True)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*C_DARK)
    pdf.cell(90, 6.5, desc, fill=True, border="B", ln=True)


# OUTPUT
out = os.path.expanduser("~/Downloads/Tear_Architecture.pdf")
pdf.output(out)
print(f"PDF saved to {out}  ({pdf.page} pages)")
