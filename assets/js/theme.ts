/**
 * Theme controller for Algora (GitHub issue #222).
 * Modes: system (default) | light | dark — persisted in localStorage.
 */
const STORAGE_KEY = "algora-theme";

export type ThemeMode = "system" | "light" | "dark";

export function getStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

export function resolveDark(mode: ThemeMode = getStoredTheme()): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(mode?: ThemeMode): void {
  const m = mode ?? getStoredTheme();
  const dark = resolveDark(m);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.theme = m;
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function setTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
  window.dispatchEvent(
    new CustomEvent("algora:theme", { detail: { mode, dark: resolveDark(mode) } }),
  );
}

/** Cycle system → light → dark → system for a simple header control. */
export function cycleTheme(): ThemeMode {
  const order: ThemeMode[] = ["system", "light", "dark"];
  const cur = getStoredTheme();
  const next = order[(order.indexOf(cur) + 1) % order.length];
  setTheme(next);
  return next;
}

export function initTheme(): void {
  applyTheme();
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (getStoredTheme() === "system") applyTheme("system");
  };
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onChange);
  } else if (typeof (mq as any).addListener === "function") {
    (mq as any).addListener(onChange);
  }

  document.addEventListener("click", (ev) => {
    const t = ev.target as HTMLElement | null;
    const btn = t?.closest?.("[data-theme-toggle]") as HTMLElement | null;
    if (!btn) return;
    ev.preventDefault();
    cycleTheme();
    syncToggleLabels();
  });

  syncToggleLabels();
  window.addEventListener("algora:theme", () => syncToggleLabels());

  // LiveView morph/patch can replace toggle DOM and reset icon visibility —
  // re-sync after navigation / page loading completes.
  window.addEventListener("phx:page-loading-stop", () => syncToggleLabels());
}

/** Keep sun/moon icons + aria in sync with resolved theme (export for LiveView hooks). */
export function syncToggleLabels(): void {
  const mode = getStoredTheme();
  const dark = resolveDark(mode);
  document.querySelectorAll("[data-theme-toggle]").forEach((el) => {
    el.setAttribute("aria-label", `Theme: ${mode} (click to change)`);
    el.setAttribute("data-theme-mode", mode);
    el.setAttribute("data-theme-resolved", dark ? "dark" : "light");
    const sun = el.querySelector("[data-theme-icon-sun]");
    const moon = el.querySelector("[data-theme-icon-moon]");
    if (sun && moon) {
      (sun as HTMLElement).classList.toggle("hidden", dark);
      (moon as HTMLElement).classList.toggle("hidden", !dark);
    }
  });
}

// Expose for inline onclick / LiveView if needed
declare global {
  interface Window {
    AlgoraTheme?: {
      get: typeof getStoredTheme;
      set: typeof setTheme;
      cycle: typeof cycleTheme;
      apply: typeof applyTheme;
      sync: typeof syncToggleLabels;
    };
  }
}

if (typeof window !== "undefined") {
  window.AlgoraTheme = {
    get: getStoredTheme,
    set: setTheme,
    cycle: cycleTheme,
    apply: applyTheme,
    sync: syncToggleLabels,
  };
}
