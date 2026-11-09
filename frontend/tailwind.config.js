/** @type {import('tailwindcss').Config} */
// Tokens do simulador de escalas (04-briefing-de-design.md §14). Carregado via @config em src/index.css.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: { DEFAULT: "rgb(var(--surface) / <alpha-value>)", 2: "rgb(var(--surface-2) / <alpha-value>)" },
        border: "rgb(var(--border) / <alpha-value>)",
        ink: { DEFAULT: "rgb(var(--text) / <alpha-value>)", muted: "rgb(var(--text-muted) / <alpha-value>)", subtle: "rgb(var(--text-subtle) / <alpha-value>)" },
        primary: { DEFAULT: "rgb(var(--primary) / <alpha-value>)", hover: "rgb(var(--primary-hover) / <alpha-value>)" },
        cov: {
          deficit: "var(--cov-deficit)", low: "var(--cov-low)", exact: "var(--cov-exact)", over: "var(--cov-over)",
          "low-fill": "var(--cov-low-fill)", "exact-fill": "var(--cov-exact-fill)", "over-fill": "var(--cov-over-fill)",
        },
        sev: {
          erro: "var(--sev-erro)", alerta: "var(--sev-alerta)", info: "var(--sev-info)", ok: "var(--sev-ok)",
          "erro-bg": "var(--sev-erro-bg)", "alerta-bg": "var(--sev-alerta-bg)", "info-bg": "var(--sev-info-bg)", "ok-bg": "var(--sev-ok-bg)",
        },
        turma: { a: "var(--turma-a)", b: "var(--turma-b)", c: "var(--turma-c)", d: "var(--turma-d)", e: "var(--turma-e)", f: "var(--turma-f)" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        micro: ["11px", "14px"], caption: ["12px", "16px"], body: ["14px", "20px"],
        "body-lg": ["16px", "24px"], h2: ["18px", "28px"], h1: ["24px", "32px"], display: ["32px", "40px"],
      },
      borderRadius: { cell: "4px", card: "8px", modal: "12px" },
      spacing: { 18: "4.5rem", sidebar: "240px", "sidebar-sm": "64px" },
      gridTemplateColumns: { heatmap: "64px repeat(24, minmax(28px, 1fr))", week168: "64px repeat(24, minmax(36px, 1fr)) 72px" },
      ringWidth: { focus: "2px" },
    },
  },
  plugins: [],
};
