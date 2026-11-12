"use client";

/**
 * Light/dark switch. The initial theme is set before first paint by the inline
 * script in app/layout.tsx (saved choice, else the device setting), so there
 * is no flash; this button flips it and remembers the choice.
 */
export default function ThemeToggle() {
  const flip = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem("jw_theme", next);
    } catch {
      /* private mode: still switches for this page view */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#fbf8f2" : "#0b0a0c");
  };
  return (
    <button className="icon-btn theme-toggle" onClick={flip} aria-label="Switch between light and dark mode" title="Light / dark">
      <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
      <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
