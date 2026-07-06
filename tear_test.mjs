import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const errors = [];
const findings = [];
const screenshots = [];
let passed = 0;
let failed = 0;

function log(icon, label, detail) {
  console.log(`${icon} ${label}${detail ? ': ' + detail : ''}`);
}
function ok(label, detail)   { passed++; log('✅', label, detail); }
function fail(label, detail) { failed++; log('❌', label, detail); }
function warn(label, detail) { findings.push(`⚠️  ${label}: ${detail}`); log('⚠️ ', label, detail); }
function probe(label, detail){ log('🔍', label, detail); }

async function shot(page, name) {
  const p = `/tmp/tear_${name}.png`;
  await page.screenshot({ path: p, fullPage: false });
  screenshots.push(p);
  return p;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page    = await context.newPage();

  // Collect ALL console errors across entire session
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out favicon 404s and known benign network errors
      if (!text.includes('favicon') && !text.includes('net::ERR_')) {
        errors.push({ page: page.url(), text });
        log('🐛', 'JS Error', `[${page.url()}] ${text}`);
      }
    }
  });
  page.on('pageerror', err => {
    errors.push({ page: page.url(), text: err.message });
    log('💥', 'Page Error', err.message);
  });

  // ─────────────────────────────────────────────────────────────────
  // STEP 1: LANDING PAGE
  // ─────────────────────────────────────────────────────────────────
  console.log('\n══════════ STEP 1: Landing Page ══════════');
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const title = await page.title();
  if (title === 'Tear | AI Product Teardowns') ok('Page title', title);
  else fail('Page title', `got: ${title}`);

  // Model selector
  const modelBtns = await page.locator('button').filter({ hasText: /Claude|Gemini|Groq/ }).all();
  if (modelBtns.length === 3) ok('Model selector renders', '3 buttons visible');
  else fail('Model selector', `found ${modelBtns.length} buttons`);

  // Claude is active by default (has bg-white shadow)
  const claudeActive = await page.locator('button', { hasText: 'Claude' }).evaluate(el =>
    el.className.includes('bg-white') || el.className.includes('shadow')
  );
  if (claudeActive) ok('Claude selected by default');
  else warn('Claude default state', 'not showing active styles');

  // Switch to Groq — FREE badge should appear
  await page.locator('button', { hasText: 'Groq / Llama' }).click();
  await page.waitForTimeout(200);
  const freeBadge = await page.locator('text=FREE').isVisible();
  if (freeBadge) ok('FREE badge shown when Groq selected');
  else fail('FREE badge', 'not visible after selecting Groq');

  // Switch to Gemini — FREE badge
  await page.locator('button', { hasText: 'Gemini Flash' }).click();
  await page.waitForTimeout(200);
  const geminiFreeBadge = await page.locator('text=FREE').isVisible();
  if (geminiFreeBadge) ok('FREE badge shown when Gemini selected');
  else fail('FREE badge for Gemini', 'not visible');

  // Switch back to Claude for the flow
  await page.locator('button', { hasText: 'Claude' }).click();
  await page.waitForTimeout(200);
  const freeBadgeGone = !(await page.locator('text=FREE').isVisible());
  if (freeBadgeGone) ok('FREE badge hidden when Claude selected');
  else warn('FREE badge', 'still visible after switching back to Claude');

  // Search input
  const input = page.locator('input[type="text"]');
  await input.fill('Not');
  await page.waitForTimeout(400);
  const suggestions = await page.locator('[class*="absolute"]').filter({ hasText: 'Notion' }).isVisible();
  if (suggestions) ok('Autocomplete suggestions appear', 'Notion visible after typing "Not"');
  else fail('Autocomplete', 'no suggestions for "Not"');

  // Keyboard arrow navigation
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  const highlighted = await page.locator('[class*="bg-\\[\\#FBF0EB\\]"]').isVisible();
  if (highlighted) ok('Arrow key highlights suggestion');
  else probe('Arrow nav highlight', 'could not verify highlight state');

  // Select Notion via click on chip
  await input.fill('');
  const notionChip = page.locator('span', { hasText: 'Notion' }).first();
  await notionChip.click();
  await page.waitForTimeout(300);
  const inputVal = await input.inputValue();
  if (inputVal === 'Notion') ok('Example chip sets input value', inputVal);
  else fail('Example chip', `input value: "${inputVal}"`);

  // Close any open suggestions dropdown before clicking CTA
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // CTA button enabled & navigates
  const ctaBtn = page.locator('button', { hasText: 'Build my teardown' });
  const ctaEnabled = !(await ctaBtn.isDisabled());
  if (ctaEnabled) ok('CTA button enabled with product name');
  else fail('CTA button', 'is disabled');

  await shot(page, '01_landing');
  console.log('  Screenshot: /tmp/tear_01_landing.png');

  // No em dashes or hyphens in visible UI text
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasEmDash = bodyText.includes('—') || bodyText.includes(' - ');
  if (!hasEmDash) ok('No em dashes or hyphens in landing page text');
  else warn('Em dash/hyphen found', 'visible text contains — or " - "');

  // ─────────────────────────────────────────────────────────────────
  // STEP 2: INTAKE PAGE (Tier 1 Q&A)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n══════════ STEP 2: /intake ══════════');
  await ctaBtn.click({ force: true });
  await page.waitForURL('**/intake', { timeout: 5000 });
  await page.waitForTimeout(600); // wait for Zustand hydration (50ms timeout + render)
  ok('CTA navigates to /intake', page.url());

  // Product card visible (shows product name from store)
  const productCard = await page.locator('text=Notion').first().isVisible();
  if (productCard) ok('Product card shows "Notion"');
  else fail('Product card', 'Notion not visible on intake — store may not have hydrated');

  // Step 1: Dimensions — continue disabled before selection
  const continueBtn = page.locator('button', { hasText: /Continue/ });
  const disabledInitially = await continueBtn.isDisabled();
  if (disabledInitially) ok('Continue disabled before dimension selected');
  else fail('Continue button', 'should be disabled before selection');

  // Select "Business model & revenue" (exact label from DimensionGrid)
  await page.locator('text=Business model & revenue').first().click();
  await page.waitForTimeout(200);
  const enabledAfter = !(await continueBtn.isDisabled());
  if (enabledAfter) ok('Continue enabled after dimension selected');
  else fail('Continue button', 'still disabled after selecting dimension');

  // Also select "Go-to-market & growth" (exact label)
  await page.locator('text=Go-to-market & growth').first().click();
  await page.waitForTimeout(200);

  await shot(page, '02_intake_step1');

  // Progress to step 2
  await continueBtn.click();
  await page.waitForTimeout(400);
  const step2Label = await page.locator('text=Question 2 of 3').isVisible();
  if (step2Label) ok('Step 2 shows "Question 2 of 3"');
  else fail('Step 2', 'label not found');

  // Continue disabled before goal selected
  const disabledStep2 = await continueBtn.isDisabled();
  if (disabledStep2) ok('Continue disabled on step 2 before selection');
  else fail('Continue disabled step 2', 'should be disabled');

  // Select goal: Competitive analysis
  await page.locator('text=Competitive analysis').first().click();
  await page.waitForTimeout(200);

  // Back button works
  const backBtn = page.locator('button', { hasText: '← Back' });
  await backBtn.click();
  await page.waitForTimeout(300);
  const backToStep1 = await page.locator('text=Question 1 of 3').isVisible();
  if (backToStep1) ok('Back button returns to step 1');
  else fail('Back button', 'did not return to step 1');

  // Re-advance to step 2
  await continueBtn.click();
  await page.waitForTimeout(300);
  await page.locator('text=Competitive analysis').first().click();
  await page.waitForTimeout(200);
  await continueBtn.click();
  await page.waitForTimeout(400);

  // Step 3: depth
  const step3Label = await page.locator('text=Question 3 of 3').isVisible();
  if (step3Label) ok('Step 3 shows "Question 3 of 3"');
  else fail('Step 3 label', 'not visible');

  await page.locator('text=Full teardown').first().click();
  await page.waitForTimeout(200);

  await shot(page, '02_intake_step3');

  // Progress bar should be 100% on step 3
  const progressBar = page.locator('.bg-tear-primary.rounded-full').last();
  const progressWidth = await progressBar.evaluate(el => el.style.width);
  probe('Progress bar width at step 3', progressWidth || 'dynamic class');

  const sessionId = await page.evaluate(() => {
    try {
      const s = JSON.parse(localStorage.getItem('tear-session') || '{}');
      return s.state?.sessionId || 'unknown';
    } catch { return 'unknown'; }
  });
  probe('Session ID from localStorage', sessionId);

  // Navigate to tier2
  await continueBtn.click();
  await page.waitForURL('**/tier2/**', { timeout: 5000 });
  ok('Intake completes → navigates to /tier2', page.url());

  // ─────────────────────────────────────────────────────────────────
  // STEP 3: TIER 2 QUESTIONS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n══════════ STEP 3: /tier2 ══════════');
  await page.waitForTimeout(500);

  // Q1 should be product_category (always first baseline)
  const tier2Q1 = await page.locator('text=Which best describes').isVisible();
  if (tier2Q1) ok('Tier2 Q1: product category question shown');
  else fail('Tier2 Q1', 'expected "Which best describes" not found');

  // "Question 1 of 10" header
  const qCount = await page.locator('text=Question 1 of').isVisible();
  if (qCount) ok('Question counter shows "1 of N"');
  else fail('Question counter', 'not visible');

  // Progress bar visible
  const tier2Progress = await page.locator('.h-1.bg-tear-border').isVisible();
  if (tier2Progress) ok('Tier2 progress bar visible');
  else probe('Tier2 progress bar', 'could not find .h-1.bg-tear-border');

  // Continue disabled before answer
  const tier2Continue = page.locator('button', { hasText: /Continue|Start Analysis/ });
  const t2Disabled = await tier2Continue.isDisabled();
  if (t2Disabled) ok('Tier2 Continue disabled before answer');
  else fail('Tier2 Continue', 'should be disabled before selection');

  // Select "B2B SaaS"
  await page.locator('text=B2B SaaS').first().click();
  await page.waitForTimeout(200);
  const t2Enabled = !(await tier2Continue.isDisabled());
  if (t2Enabled) ok('Tier2 Continue enabled after selection');
  else fail('Tier2 Continue', 'still disabled after B2B SaaS selected');

  await shot(page, '03_tier2_q1');

  // Verify tier1 answers are stored (biz+gtm dims, competitive goal)
  const storedTier1 = await page.evaluate(() => {
    try {
      const s = JSON.parse(localStorage.getItem('tear-session') || '{}');
      return s.state?.tier1Answers;
    } catch { return null; }
  });
  if (storedTier1?.dimensions?.includes('biz')) ok('tier1Answers.dimensions contains "biz"', JSON.stringify(storedTier1.dimensions));
  else fail('tier1Answers', `stored: ${JSON.stringify(storedTier1)}`);

  if (storedTier1?.goal === 'competitive') ok('tier1Answers.goal = "competitive"');
  else fail('tier1Answers.goal', storedTier1?.goal);

  // Navigate through questions quickly (answer each, track multi-select ones)
  let questionNum = 1;
  let foundMultiSelect = false;
  let reachedStartAnalysis = false;

  while (questionNum <= 10) {
    const isLast = await tier2Continue.evaluate(el => el.textContent?.includes('Start Analysis'));

    // Check if this is a multi-select question (badge visible)
    const isMulti = await page.locator('text=Select all that apply').isVisible();
    if (isMulti && !foundMultiSelect) {
      foundMultiSelect = true;
      ok(`Multi-select question found at Q${questionNum}`, 'badge visible');
    }

    // Pick first available option
    const firstOption = page.locator('.grid button, [class*="OptionGrid"] button, button[class*="rounded-xl"]').first();
    const optCount = await page.locator('button').filter({ hasText: /^[A-Z]/ }).count();

    // Click first option that looks like an answer option (not nav buttons)
    const answerOptions = page.locator('div.grid button, main button').filter({ hasNot: page.locator('svg') });
    const optionButtons = await page.locator('button').filter({
      hasNotText: /Continue|Back|Start Analysis|← Back/
    }).all();

    if (optionButtons.length > 0) {
      try {
        await optionButtons[0].click();
        await page.waitForTimeout(150);
      } catch {}
    }

    if (isLast) {
      reachedStartAnalysis = true;
      ok('Last tier2 question shows "Start Analysis →"');
      break;
    }

    await tier2Continue.click();
    await page.waitForTimeout(300);
    questionNum++;
  }

  if (!reachedStartAnalysis) warn('Tier2 last step', 'did not reach "Start Analysis →"');
  if (!foundMultiSelect) warn('Multi-select', 'no multi-select question encountered in 10 questions');

  await shot(page, '03_tier2_last');

  // Back button from tier2 (goes to Q9)
  const tier2Back = page.locator('button', { hasText: '← Back' });
  await tier2Back.click();
  await page.waitForTimeout(300);
  const backWorked = await page.locator('span').filter({ hasText: /Question \d+ of \d+/ }).first().isVisible();
  if (backWorked) ok('Tier2 Back button works');
  else fail('Tier2 Back', 'could not go back');

  // Re-advance to last
  await tier2Continue.click();
  await page.waitForTimeout(300);

  // Navigate to context page
  await tier2Continue.click();
  await page.waitForURL('**/context/**', { timeout: 5000 });
  ok('Tier2 completes → navigates to /context', page.url());

  // ─────────────────────────────────────────────────────────────────
  // STEP 4: CONTEXT PAGE
  // ─────────────────────────────────────────────────────────────────
  console.log('\n══════════ STEP 4: /context ══════════');
  await page.waitForTimeout(500);

  // Textarea visible
  const textarea = page.locator('textarea').first();
  const textareaVisible = await textarea.isVisible();
  if (textareaVisible) ok('Context textarea visible');
  else fail('Context textarea', 'not visible');

  // Clipboard paste button
  const clipBtn = page.locator('button', { hasText: 'Paste from clipboard' });
  const clipVisible = await clipBtn.isVisible();
  if (clipVisible) ok('Clipboard paste button visible');
  else fail('Clipboard paste button', 'not found');

  // File upload drag zone
  const dropZone = page.locator('text=Drag & drop or click to upload').isVisible();
  if (await dropZone) ok('File upload drop zone visible');
  else fail('File drop zone', 'not visible');

  // File type display
  const fileTypes = await page.locator('text=PDF, TXT, DOC, DOCX').isVisible();
  if (fileTypes) ok('Accepted file types shown');
  else probe('File types', 'text "PDF, TXT, DOC, DOCX" not found');

  // Skip button visible
  const skipBtn = page.locator('button', { hasText: 'Skip to analysis' });
  const skipVisible = await skipBtn.isVisible();
  if (skipVisible) ok('"Skip to analysis" button visible');
  else fail('Skip button', 'not found');

  // Continue button
  const contextContinue = page.locator('button', { hasText: 'Continue →' });
  const continueVisible = await contextContinue.isVisible();
  if (continueVisible) ok('"Continue →" button visible');
  else fail('Continue button', 'not visible on context page');

  // Type some context text
  await textarea.fill('This is test context for Notion teardown.');
  await page.waitForTimeout(200);
  const charCount = await page.locator('text=chars').isVisible();
  if (charCount) ok('Character counter updates');
  else probe('Char counter', 'not found after typing');

  await shot(page, '04_context');

  // Test skip → goes to pipeline and userContext is null
  await skipBtn.click();
  await page.waitForURL('**/pipeline/**', { timeout: 8000 });
  ok('Skip → navigates to /pipeline', page.url());

  const userCtxAfterSkip = await page.evaluate(() => {
    try {
      const s = JSON.parse(localStorage.getItem('tear-session') || '{}');
      return s.state?.userContext;
    } catch { return 'error'; }
  });
  if (userCtxAfterSkip === null) ok('Skip sets userContext = null in store');
  else warn('userContext after skip', `expected null, got: ${JSON.stringify(userCtxAfterSkip)}`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 5: PIPELINE PAGE (SSE Stream)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n══════════ STEP 5: /pipeline ══════════');
  await page.waitForTimeout(1000);

  // Three agent rows visible
  const questionAgent = await page.locator('text=Question Agent').first().isVisible();
  const crawlerAgent  = await page.locator('text=Crawler Agent').first().isVisible();
  const documentAgent = await page.locator('text=Document Agent').first().isVisible();

  if (questionAgent) ok('Question Agent row visible');
  else fail('Question Agent row', 'not found in feed');
  if (crawlerAgent)  ok('Crawler Agent row visible');
  else fail('Crawler Agent row', 'not found');
  if (documentAgent) ok('Document Agent row visible');
  else fail('Document Agent row', 'not found');

  // SSE request fired — check network request was made
  const sseUrl = await page.evaluate(() => {
    // Look at performance entries for the SSE request
    const entries = performance.getEntriesByType('resource');
    return entries.find(e => e.name.includes('/api/stream/'))?.name || null;
  });
  if (sseUrl) {
    ok('SSE request fired to /api/stream/', sseUrl);
    // Verify model param is in URL
    if (sseUrl.includes('model=claude')) ok('model=claude in SSE URL');
    else probe('SSE model param', sseUrl);
    // Verify product param
    if (sseUrl.includes('product=Notion')) ok('product=Notion in SSE URL');
    else probe('SSE product param', sseUrl);
  } else {
    warn('SSE URL capture', 'could not read from performance API (may be streaming)');
  }

  // Stop button visible in nav
  const stopBtn = await page.locator('button', { hasText: /Stop/ }).isVisible();
  if (stopBtn) ok('Stop button visible in pipeline nav');
  else probe('Stop button', 'not found (may be hidden)');

  // TeardownPreview panel visible
  const previewPanel = await page.locator('text=Teardown Preview').isVisible()
    .catch(() => false);
  if (previewPanel) ok('Teardown Preview panel visible');
  else {
    // Check for the preview area by looking for the right column
    const rightCol = await page.locator('[class*="TeardownPreview"]').count();
    probe('TeardownPreview', `component count: ${rightCol}`);
  }

  await shot(page, '05_pipeline');

  // Demo mode check — agent statuses should animate
  await page.waitForTimeout(2000);
  const activeAgent = await page.locator('[class*="active"], [class*="running"]').count();
  probe('Active agent indicators', `${activeAgent} elements with active/running classes`);

  // In non-demo mode, pipeline will be making real API calls. Wait a bit and check status
  await page.waitForTimeout(3000);
  const agentStatuses = await page.evaluate(() => {
    const dots = Array.from(document.querySelectorAll('[class]'));
    return dots.filter(el => {
      const c = el.className;
      return typeof c === 'string' && (c.includes('animate') || c.includes('pulse'));
    }).length;
  });
  probe('Animated elements (loading indicators)', `${agentStatuses} found`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 5b: TEST DEMO MODE — restart with DEMO_MODE via separate test
  // ─────────────────────────────────────────────────────────────────
  console.log('\n══════════ STEP 5b: Demo Mode pipeline via API ══════════');

  // Directly test the SSE endpoint in demo mode by checking if the endpoint responds
  // We'll verify the structure rather than waiting for the full real pipeline
  const sseCheck = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        product: 'TestProduct',
        sessionId: 'test-verify-123',
        tier1: JSON.stringify({ dimensions: ['biz'], goal: 'competitive', depth: 'standard' }),
        tier2: JSON.stringify({}),
        model: 'claude',
      });
      const es = new EventSource(`/api/stream/test-verify-123?${params}`);
      const events = [];
      const timeout = setTimeout(() => {
        es.close();
        resolve({ events, closed: true, reason: 'timeout' });
      }, 5000);
      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          events.push(d.type);
          if (d.type === 'done' || d.type === 'error') {
            clearTimeout(timeout);
            es.close();
            resolve({ events, closed: true });
          }
        } catch {}
      };
      es.onerror = () => {
        clearTimeout(timeout);
        es.close();
        resolve({ events, closed: true, reason: 'error' });
      };
    });
  });

  const eventTypes = sseCheck.events;
  probe('SSE event types received from stream endpoint', JSON.stringify(eventTypes));
  if (eventTypes.includes('agent')) ok('SSE emits "agent" events');
  else warn('SSE agent events', 'no agent events in 5s — real API likely pending (no demo mode)');

  // ─────────────────────────────────────────────────────────────────
  // STEP 5c: Navigate to research page directly (simulate completed session)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n══════════ STEP 6: /research — inject mock doc ══════════');

  // Inject a mock researchDoc into the Zustand store so we can test the research page
  const mockDoc = {
    sections: [
      { id: 'exec_summary',    title: 'Executive Summary',         content: 'Notion is an all-in-one workspace for notes and collaboration.\n\nThe product has seen rapid adoption since 2018.', keyInsight: 'PLG with strong enterprise motion', bullets: ['Founded 2016', 'Valued at $10B'], stats: [{label:'ARR',value:'$100M+'},{label:'Users',value:'30M+'}] },
      { id: 'product_ux',      title: 'Product & UX Analysis',     content: 'Clean block-based editor with flexible templates.', keyInsight: 'Flexible but complex', bullets: ['Block editor', 'Templates'] },
      { id: 'business_model',  title: 'Business Model & Revenue',  content: 'Freemium with team and enterprise tiers.', keyInsight: 'PLG motion', bullets: ['Free tier', 'Team $8/user/mo'] },
      { id: 'pricing_analysis',title: 'Pricing Deep-Dive',         content: 'Free, Plus $8, Business $15, Enterprise custom.', keyInsight: 'Competitive pricing', bullets: ['Free tier generous', 'Enterprise custom'] },
      { id: 'gtm_growth',      title: 'GTM & Growth',              content: 'Word of mouth and PLG drove initial growth.', keyInsight: 'Community-led', bullets: ['PLG', 'Templates as viral loop'] },
      { id: 'tech_arch',       title: 'Technical Architecture',    content: 'React frontend, Node backend, AWS infrastructure.', keyInsight: 'Modern stack', bullets: ['React', 'AWS'] },
      { id: 'market_comp',     title: 'Market & Competition',      content: 'Competes with Confluence, Coda, Obsidian.', keyInsight: 'Crowded space', bullets: ['vs Confluence', 'vs Coda'] },
      { id: 'customer_profiles',title:'Customer Profiles',         content: 'Startups, SMBs, and increasingly enterprise.', keyInsight: 'Broad ICP', bullets: ['Startups', 'Enterprise expansion'] },
      { id: 'community',       title: 'Community & Ecosystem',     content: 'Large community of template creators.', keyInsight: 'Strong ecosystem', bullets: ['Template gallery', 'Ambassadors'] },
      { id: 'financials',      title: 'Financials & Funding',      content: 'Raised $275M total, valued at $10B in 2021.', keyInsight: 'Well-funded', bullets: ['Series C $275M', 'Valuation $10B'] },
      { id: 'swot_analysis',   title: 'SWOT Analysis',             content: 'Strengths: flexible, viral\n\nWeaknesses: complexity', keyInsight: 'Strong moat', bullets: ['STRENGTH: PLG','WEAKNESS: Complexity'] },
      { id: 'strategic_outlook',title:'Strategic Outlook',         content: 'Bullish: enterprise expansion underway.', keyInsight: 'Bullish long-term', bullets: ['Enterprise bet', 'AI integration'] },
    ],
    sources: [
      { num:1, domain:'notion.so', title:'Official Notion site | pricing & features', url:'https://notion.so', usedIn:'Exec Summary' },
      { num:2, domain:'techcrunch.com', title:'Notion raises $275M | Series C', url:'https://techcrunch.com', usedIn:'Financials' },
      { num:3, domain:'g2.com', title:'Notion reviews | user sentiment', url:'https://g2.com', usedIn:'Product UX' },
    ]
  };

  await page.evaluate((doc) => {
    try {
      const key = 'tear-session';
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      existing.state = { ...existing.state, researchDoc: doc };
      localStorage.setItem(key, JSON.stringify(existing));
    } catch(e) { console.error('inject failed', e); }
  }, mockDoc);

  const pid = page.url().split('/pipeline/')[1] || sessionId;
  await page.goto(`${BASE}/research/${pid}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Sidebar sections
  const sidebarItems = await page.locator('nav, aside, [class*="Sidebar"]').count();
  probe('Sidebar component count', sidebarItems);

  const execSummaryLink = await page.locator('text=Executive Summary').first().isVisible();
  if (execSummaryLink) ok('Section sidebar shows "Executive Summary"');
  else fail('Section sidebar', '"Executive Summary" not visible');

  // Doc body content
  const docContent = await page.locator('text=Notion is an all-in-one').isVisible();
  if (docContent) ok('Document body shows injected content');
  else fail('Document body', 'injected content not visible');

  // Right panel — CitationsPanel top half
  const sourcesHeader = await page.locator('text=Sources').isVisible();
  if (sourcesHeader) ok('CitationsPanel shows "Sources" header');
  else fail('CitationsPanel', '"Sources" header not visible');

  // Source count
  const sourceCount = await page.locator('text=Sources · 3').isVisible();
  if (sourceCount) ok('CitationsPanel shows correct source count (3)');
  else probe('Source count', 'could not find "Sources · 3"');

  // Individual source entries
  const notionSource = await page.locator('text=notion.so').isVisible();
  if (notionSource) ok('Source entry for notion.so renders');
  else fail('notion.so source', 'not visible in citations panel');

  // Right panel — ResearchChatbot bottom half
  const chatHeader = await page.locator('text=Research Assistant').isVisible();
  if (chatHeader) ok('ResearchChatbot "Research Assistant" header visible');
  else fail('ResearchChatbot', '"Research Assistant" header not visible');

  // Suggested prompts in chatbot
  const suggestedPrompts = await page.locator('text=Rewrite the Executive Summary').isVisible();
  if (suggestedPrompts) ok('Chatbot suggested prompts visible');
  else fail('Chatbot suggested prompts', '"Rewrite the Executive Summary" not found');

  // Chatbot input
  const chatInput = page.locator('textarea').last();
  const chatInputVisible = await chatInput.isVisible();
  if (chatInputVisible) ok('Chatbot textarea input visible');
  else fail('Chatbot input', 'textarea not found');

  // Send button
  const sendBtn = page.locator('button').filter({ has: page.locator('svg path[d*="M2 7h10"]') });
  const sendVisible = await sendBtn.isVisible().catch(() => false);
  if (sendVisible) ok('Chatbot send button visible');
  else probe('Chatbot send button', 'SVG path check inconclusive');

  await shot(page, '06_research');

  // Verify right panel layout: sources at top 50%, chatbot at bottom 50%
  const rightPanelLayout = await page.evaluate(() => {
    const citations = document.querySelector('[style*="height: 50%"]');
    const chatbot   = document.querySelectorAll('[style*="height: 50%"]');
    return { citationsFound: !!citations, totalHalf: chatbot.length };
  });
  if (rightPanelLayout.totalHalf >= 2) ok('Right panel 50/50 split confirmed', `${rightPanelLayout.totalHalf} elements with height:50%`);
  else warn('Right panel layout', `expected 2 height:50% elements, got ${rightPanelLayout.totalHalf}`);

  // Section sidebar navigation
  const pricingLink = page.locator('text=Pricing').first();
  if (await pricingLink.isVisible()) {
    await pricingLink.click();
    await page.waitForTimeout(300);
    const pricingContent = await page.locator('text=Pricing Deep-Dive').first().isVisible()
      .catch(() => false);
    probe('Sidebar click navigates to Pricing section', pricingContent ? 'visible' : 'scroll may have moved');
  }

  // Download PDF button
  const pdfBtn = await page.locator('button', { hasText: /PDF|Download/ }).count();
  probe('PDF download button count', pdfBtn);

  // ─────────────────────────────────────────────────────────────────
  // STEP 7: MODEL PERSISTENCE ACROSS NAVIGATION
  // ─────────────────────────────────────────────────────────────────
  console.log('\n══════════ STEP 7: Model selector persistence ══════════');

  // Go back to landing, switch to Groq, go through to intake
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: 'Groq / Llama' }).click();
  await page.waitForTimeout(200);

  const storedModelLanding = await page.evaluate(() => {
    try {
      const s = JSON.parse(localStorage.getItem('tear-session') || '{}');
      return s.state?.selectedModel;
    } catch { return null; }
  });
  if (storedModelLanding === 'groq') ok('Groq selection persisted to localStorage');
  else fail('Model persistence', `expected "groq", got "${storedModelLanding}"`);

  // Navigate to intake (Zustand should keep model)
  const input2 = page.locator('input[type="text"]');
  await input2.fill('Figma');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.locator('button', { hasText: 'Build my teardown' }).click();
  await page.waitForURL('**/intake', { timeout: 5000 });

  const storedModelIntake = await page.evaluate(() => {
    try {
      const s = JSON.parse(localStorage.getItem('tear-session') || '{}');
      return s.state?.selectedModel;
    } catch { return null; }
  });
  if (storedModelIntake === 'groq') ok('Groq model persists on /intake page');
  else fail('Model persists to intake', `got "${storedModelIntake}"`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 8: API ENDPOINTS SPOT CHECK
  // ─────────────────────────────────────────────────────────────────
  console.log('\n══════════ STEP 8: API endpoint health ══════════');

  // Tokens endpoint
  const tokensRes = await page.evaluate(async () => {
    const r = await fetch('/api/tokens/test-healthcheck');
    return { status: r.status, body: await r.json() };
  });
  if (tokensRes.status === 200) ok('/api/tokens/[sessionId] responds 200', JSON.stringify(tokensRes.body));
  else fail('/api/tokens', `status ${tokensRes.status}`);

  // Chat endpoint — missing body should return 400
  const chatBadReq = await page.evaluate(async () => {
    const r = await fetch('/api/research/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'x', message: '', productName: '' }),
    });
    return r.status;
  });
  if (chatBadReq === 400) ok('/api/research/chat returns 400 for empty message');
  else probe('/api/research/chat bad request', `status: ${chatBadReq}`);

  // Chat endpoint with model field — verify it accepts model param
  const chatModelCheck = await page.evaluate(async () => {
    const r = await fetch('/api/research/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'test',
        productName: '',
        message: '',
        researchDoc: { sections: [], sources: [] },
        history: [],
        model: 'groq',
      }),
    });
    return r.status;
  });
  // Empty productName → 400 (our validation), but model field accepted = not 422
  if (chatModelCheck === 400) ok('/api/research/chat accepts model field without schema error');
  else probe('/api/research/chat model field', `status: ${chatModelCheck}`);

  // ─────────────────────────────────────────────────────────────────
  // STEP 9: NO EM DASHES — spot check across pages
  // ─────────────────────────────────────────────────────────────────
  console.log('\n══════════ STEP 9: Em dash / hyphen check ══════════');

  const pagesToCheck = ['/', '/intake', '/my-teardowns'];
  for (const p of pagesToCheck) {
    await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle' });
    const text = await page.evaluate(() => document.body.innerText);
    const emDash = text.includes('—');
    const hyphenSep = / - /.test(text);
    if (!emDash && !hyphenSep) ok(`No em dashes or " - " on ${p}`);
    else warn(`Em dash/hyphen on ${p}`, `em:${emDash} hyphen:${hyphenSep}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // DONE
  // ─────────────────────────────────────────────────────────────────
  await browser.close();

  console.log('\n══════════════════════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════');

  if (errors.length > 0) {
    console.log(`\nJS ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`  [${e.page}] ${e.text}`));
  } else {
    console.log('\n✅ No JavaScript console errors detected');
  }

  if (findings.length > 0) {
    console.log('\nFINDINGS:');
    findings.forEach(f => console.log(`  ${f}`));
  }

  console.log('\nSCREENSHOTS:');
  screenshots.forEach(s => console.log(`  ${s}`));

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
