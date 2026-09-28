// parallel-qa shared Playwright harness.
// Each agent's test script does:  import { runTest } from '<skill>/scripts/pw.mjs'
// and runs with the env from `$QA_OUT/env.sh` plus QA_AGENT=<agent-id>.
// Every run launches its own headless Chrome, so agents never share a browser.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CACHE =
  process.env.QA_PW_CACHE || path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'parallel-qa');
const { chromium } = createRequire(path.join(CACHE, 'package.json'))('playwright-core');

const BASE = process.env.QA_BASE_URL || 'http://localhost:5199';
const OUT = process.env.QA_OUT || path.join(os.tmpdir(), 'parallel-qa');
const AGENT = process.env.QA_AGENT || 'adhoc';
const DEADLINE = Number(process.env.QA_DEADLINE || 0); // epoch seconds; 0 = none
const MAX_RUN_MS = Number(process.env.QA_MAX_RUN_MS || 90_000);

// Runs inside the page before any app code. Wraps fetch for /api/ calls so the
// harness can (1) log every call, (2) inject delays / error statuses, and
// (3) in stable mode, transparently retry the mock's random 500s.
function installFetchHook({ stable }) {
  const orig = window.fetch.bind(window);
  window.__qaRawFetch = orig;
  const abortError = () => new DOMException('The operation was aborted.', 'AbortError');
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes('/api/')) return orig(input, init);
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    // Dev StrictMode runs effects twice: the first request is aborted right away.
    // Yield once so such requests are logged as aborted and never consume an injected fault.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const f = await window.__qaHook(url, Boolean(signal?.aborted));
    if (f?.delayMs) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, f.delayMs);
        signal?.addEventListener('abort', () => (clearTimeout(timer), reject(abortError())), { once: true });
      });
    }
    if (signal?.aborted) throw abortError();
    if (f?.status) {
      return new Response(JSON.stringify({ message: `QA injected ${f.status}` }), {
        status: f.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    let res = await orig(input, init);
    for (let i = 0; stable && res.status === 500 && i < 4; i++) res = await orig(input, init);
    return res;
  };
}

/**
 * runTest(async (t) => { ... }, { stable = true, viewport, colorScheme })
 *
 * t.page / t.context / t.browser     Playwright objects
 * t.open(pathAndQuery = '/')          goto BASE + path, wait until React rendered into #root
 * t.check(name, ok, detail?)          record PASS/FAIL (never throws)
 * t.shot(name, { fullPage })          screenshot -> $QA_OUT/$QA_AGENT/<name>.png, returns path
 * t.fault({ match, status?, delayMs?, times = 1 })
 *                                     next matching /api/ calls get delayed and/or answered with `status`.
 *                                     match: substring ('/api/slides/' = detail, '/api/slides?' = list) or RegExp.
 *                                     times: Infinity for "every call". Works across reloads.
 * t.clearFaults()
 * t.apiCalls                          live array of { t: ms since start, url, aborted } for app /api/ calls.
 *                                     aborted=true: cancelled before it reached the mock (StrictMode double effect,
 *                                     superseded request). Count only !aborted when judging debounce.
 * t.api(path)                         raw GET through the mock (no hook, retries 500) -> { status, body }
 * t.aria(selector = 'body')           ARIA snapshot text: fastest way to learn roles/names for locators
 * t.note(msg)                         free-form line in the summary
 * t.sleep(ms)
 * t.remaining()                       seconds until QA_DEADLINE
 */
export async function runTest(fn, { stable = true, viewport = { width: 1280, height: 800 }, colorScheme } = {}) {
  const startedAt = Date.now();
  const leftMs = DEADLINE ? DEADLINE * 1000 - startedAt : Infinity;
  if (leftMs < 15_000) {
    console.log(`DEADLINE: ${Math.round(leftMs / 1000)}s left, not starting. Finalize your report now.`);
    process.exit(3);
  }
  const budgetMs = Math.min(MAX_RUN_MS, leftMs - 5_000);
  const dir = path.join(OUT, AGENT);
  fs.mkdirSync(dir, { recursive: true });

  const checks = [];
  const notes = [];
  const consoleErrors = [];
  const apiCalls = [];
  const faults = [];
  let browser;
  let finished = false;

  const finish = async (code, reason) => {
    if (finished) return;
    finished = true;
    if (reason) checks.push({ name: 'harness', ok: false, detail: reason });
    const failed = checks.filter((c) => !c.ok).length;
    const lines = [`=== parallel-qa ${AGENT}: ${checks.length - failed}/${checks.length} passed, ${Date.now() - startedAt}ms ===`];
    for (const c of checks) lines.push(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
    for (const n of notes) lines.push(`NOTE  ${n}`);
    const uniqueErrors = [...new Set(consoleErrors)];
    lines.push(`console errors/warnings: ${uniqueErrors.length}`);
    for (const e of uniqueErrors.slice(0, 10)) lines.push(`  ${e}`);
    const aborted = apiCalls.filter((c) => c.aborted).length;
    lines.push(`app /api/ calls: ${apiCalls.length - aborted} sent (+${aborted} aborted before sending)`, `artifacts: ${dir}`);
    if (DEADLINE) lines.push(`time left until deadline: ${Math.round(DEADLINE - Date.now() / 1000)}s`);
    console.log(lines.join('\n'));
    fs.appendFileSync(
      path.join(dir, 'runs.jsonl'),
      JSON.stringify({ at: new Date().toISOString(), checks, notes, consoleErrors: uniqueErrors, apiCalls }) + '\n',
    );
    await browser?.close().catch(() => {});
    process.exit(code ?? (failed ? 1 : 0));
  };
  setTimeout(() => finish(124, `run killed after ${budgetMs}ms (per-run cap / deadline)`), budgetMs).unref();

  browser = await chromium.launch({ channel: process.env.QA_CHANNEL || 'chrome', headless: true });
  const context = await browser.newContext({ viewport, colorScheme, locale: 'ko-KR', timezoneId: process.env.QA_TZ || 'America/New_York' });
  await context.exposeBinding('__qaHook', (_source, url, aborted) => {
    const rel = url.replace(/^https?:\/\/[^/]+/, '');
    apiCalls.push({ t: Date.now() - startedAt, url: rel, aborted });
    if (aborted) return null;
    const f = faults.find((x) => x.times > 0 && (x.match instanceof RegExp ? x.match.test(rel) : rel.includes(x.match)));
    if (!f) return null;
    f.times -= 1;
    return { status: f.status ?? null, delayMs: f.delayMs ?? 0 };
  });
  await context.addInitScript(installFetchHook, { stable });
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 300)}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });

  const t = {
    page,
    context,
    browser,
    apiCalls,
    async open(p = '/') {
      await page.goto(BASE + p);
      await page.waitForFunction(() => (document.getElementById('root')?.childElementCount ?? 0) > 0);
      return page;
    },
    check(name, ok, detail = '') {
      checks.push({ name, ok: Boolean(ok), detail: String(detail) });
    },
    async shot(name, { fullPage = false } = {}) {
      const file = path.join(dir, `${name}.png`);
      await page.screenshot({ path: file, fullPage });
      return file;
    },
    fault({ match, status, delayMs, times = 1 }) {
      // The injected body is only { message }, so a 2xx would crash the app on missing fields (a fake bug).
      // To only slow a call down, omit status: the real mock response follows the delay.
      if (status !== undefined && !(status >= 400 && status <= 599)) {
        throw new Error(`t.fault: status must be an error code (4xx/5xx), got ${status}. Omit status to only delay the real response.`);
      }
      faults.push({ match, status, delayMs, times });
    },
    clearFaults() {
      faults.length = 0;
    },
    api(p) {
      return page.evaluate(async (u) => {
        for (let i = 0; i < 5; i++) {
          const res = await window.__qaRawFetch(u);
          if (res.status !== 500) return { status: res.status, body: await res.json() };
        }
        return { status: 500, body: null };
      }, p);
    },
    aria(selector = 'body') {
      return page.locator(selector).first().ariaSnapshot();
    },
    note(msg) {
      notes.push(String(msg));
    },
    sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    },
    remaining() {
      return DEADLINE ? Math.round(DEADLINE - Date.now() / 1000) : Infinity;
    },
  };

  try {
    await fn(t);
  } catch (e) {
    checks.push({ name: 'uncaught (usually a script/selector problem, check before blaming the app)', ok: false, detail: String(e.message).split('\n')[0] });
    await t.shot('uncaught').catch(() => {});
  }
  await finish();
}
