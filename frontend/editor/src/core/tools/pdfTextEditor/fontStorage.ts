/**
 * Permanent font installation via the backend.
 *
 * Fonts are saved to customFiles/static/fonts/ on the server and served at
 * /fonts/<filename>.woff2 — they survive browser clears, profile switches, and
 * reinstalls because they live on the server filesystem.
 */

const INSTALL_ENDPOINT = "/api/v1/ui-data/fonts/install";
const INSTALLED_ENDPOINT = "/api/v1/ui-data/fonts/installed";
const INJECTED_STYLE_ID = "stirling-user-fonts";

/** Dispatched on window after a font is installed so renderers can re-resolve. */
export const FONTS_UPDATED_EVENT = "stirling-fonts-updated";

export interface InstalledFont {
  family: string;
  weight: string;
  style: string;
  /** Server URL, already cache-busted with a ?v=<mtime> query. */
  url: string;
}

/**
 * Google Fonts splits a family into several @font-face blocks (cyrillic, greek,
 * latin-ext, latin …), each with its own unicode-range and woff2 file. We must
 * pick the block covering basic Latin (U+0000-00FF) — that holds A-Z/a-z/0-9 and
 * common punctuation. Grabbing the first url() gives a non-Latin subset with no
 * usable glyphs, so the font silently falls back when rendering.
 */
export function pickLatinWoff2Url(css: string): string | null {
  // Split into individual @font-face blocks so url+unicode-range stay paired.
  const blocks = css.split("@font-face");
  let firstUrl: string | null = null;

  for (const block of blocks) {
    const urlMatch = block.match(
      /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/,
    );
    if (!urlMatch) continue;
    if (!firstUrl) firstUrl = urlMatch[1];

    const range = block.match(/unicode-range:\s*([^;]+);/i)?.[1] ?? "";
    // The basic-Latin block always lists U+0000-00FF in its range.
    if (/U\+0000-00FF/i.test(range)) return urlMatch[1];
  }

  // No explicit ranges (e.g. single-subset response) — use the first url().
  return firstUrl;
}

/** POST the font binary to the backend to save it permanently. */
export async function installFontOnServer(
  buffer: ArrayBuffer,
  family: string,
  weight: string,
  style: string,
): Promise<InstalledFont> {
  const blob = new Blob([buffer], { type: "font/woff2" });
  const form = new FormData();
  form.append("file", blob, `${family}-${weight}-${style}.woff2`);
  form.append("family", family);
  form.append("weight", weight);
  form.append("style", style);

  const resp = await fetch(INSTALL_ENDPOINT, { method: "POST", body: form });
  if (!resp.ok) throw new Error(`Font install failed: ${resp.status}`);
  const installed = (await resp.json()) as InstalledFont;
  invalidateFontCache();
  // Note: the FONTS_UPDATED_EVENT is dispatched by the caller AFTER the font is
  // fully loaded (see notifyFontsUpdated), so listeners re-validate against a
  // ready font rather than racing the load.
  return installed;
}

/**
 * Tell all listeners (validation panel, editor canvas) to re-resolve fonts.
 * Waits for the browser font engine to settle first so re-validation measures a
 * fully-loaded font instead of racing the load.
 */
export async function notifyFontsUpdated(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await document.fonts.ready;
  } catch {
    // ignore — dispatch anyway
  }
  window.dispatchEvent(new Event(FONTS_UPDATED_EVENT));
}

let _cachedFonts: InstalledFont[] | null = null;

/** Fetch the list of fonts installed on this server (cached until next install). */
export async function fetchInstalledFonts(bust = false): Promise<InstalledFont[]> {
  if (_cachedFonts && !bust) return _cachedFonts;
  try {
    const resp = await fetch(INSTALLED_ENDPOINT);
    if (!resp.ok) return _cachedFonts ?? [];
    _cachedFonts = (await resp.json()) as InstalledFont[];
  } catch {
    return _cachedFonts ?? [];
  }
  return _cachedFonts;
}

/** Invalidate the font list cache (call after installing a new font). */
export function invalidateFontCache(): void {
  _cachedFonts = null;
}

/**
 * Inject @font-face rules for every server-installed font.
 * Idempotent — replaces the existing <style> tag each call.
 */
export function injectFontFaceRules(fonts: InstalledFont[]): void {
  if (fonts.length === 0) return;

  const css = fonts
    .map(
      ({ family, weight, style, url }) =>
        `@font-face{font-family:'${family}';src:url('${url}')format('woff2');` +
        `font-weight:${weight};font-style:${style};font-display:swap;}`,
    )
    .join("\n");

  let el = document.getElementById(INJECTED_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = INJECTED_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

/**
 * Fetch server-installed fonts, inject @font-face CSS rules, and load each into
 * document.fonts so both HTML and canvas rendering can use them.
 */
export async function restorePersistedFonts(): Promise<void> {
  const fonts = await fetchInstalledFonts();
  if (fonts.length === 0) return;

  injectFontFaceRules(fonts);

  await Promise.all(
    fonts.map(async ({ family, weight, style, url }) => {
      try {
        const face = new FontFace(family, `url(${url})`, { weight, style });
        await face.load();
        document.fonts.add(face);
      } catch {
        // Non-fatal — the @font-face CSS rule is still active.
      }
    }),
  );
}

/** True if a file for this family/weight/style exists on the server. */
export async function isSavedOnServer(
  family: string,
  weight: string,
  style: string,
): Promise<boolean> {
  const fonts = await fetchInstalledFonts();
  return fonts.some(
    (f) => f.family === family && f.weight === weight && f.style === style,
  );
}

/**
 * Honest usability test: does this font ACTUALLY render text, or does the browser
 * silently fall back? document.fonts.check() only confirms a FontFace exists — it
 * lies about glyph coverage. Instead we measure: a proportional font produces a
 * different total width than fixed-width monospace. If they match, the font isn't
 * really being applied (not loaded, or the subset lacks these glyphs).
 */
const USABILITY_SAMPLE = "AVWaviml 1234567890";

export async function canRenderWithFont(
  family: string,
  weight: string,
  style: string,
): Promise<boolean> {
  if (typeof document === "undefined") return false;

  const stylePrefix = style && style !== "normal" ? `${style} ` : "";
  const loadSpec = `${stylePrefix}${weight} 32px "${family}"`;
  try {
    await document.fonts.load(loadSpec, USABILITY_SAMPLE);
  } catch {
    // measure anyway — a system-installed font needs no load
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const widthOf = (familyStack: string): number => {
    ctx.font = `${stylePrefix}${weight} 32px ${familyStack}`;
    return ctx.measureText(USABILITY_SAMPLE).width;
  };

  // monospace is uniform-advance; any real proportional font differs from it.
  const fallbackWidth = widthOf("monospace");
  const testedWidth = widthOf(`"${family}", monospace`);
  return Math.abs(testedWidth - fallbackWidth) > 0.5;
}
