/**
 * Graficário — dados: parsing (CSV/TSV/colar do Excel), números pt-BR, datas,
 * estatística básica e geradores determinísticos usados pelos modelos.
 */
(function (GG) {
  'use strict';

  // --- Números ------------------------------------------------------------------
  /** Converte "1.234,56", "1,234.56", "R$ 12,5", "35%", "−4" em número. null se não for número. */
  function toNum(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = String(v).trim();
    if (!s || s === '-' || s === '–') return null;
    s = s.replace(/−/g, '-').replace(/[R$€£%\s ]/g, '').replace(/^\+/, '');
    if (!/^-?[\d.,]+(e-?\d+)?$/i.test(s)) return null;
    const hasComma = s.includes(','), hasDot = s.includes('.');
    if (hasComma && hasDot) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (hasComma) {
      // vírgula = decimal (pt-BR); várias vírgulas = milhar (en-US)
      s = s.split(',').length > 2 ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (hasDot) {
      const parts = s.split('.');
      if (parts.length > 2) s = s.replace(/\./g, '');
      else if (parts[1].length === 3 && parts[0].length <= 3 && parts[0] !== '0' && parts[0] !== '-0') s = s.replace('.', ''); // 1.234 = mil duzentos
    }
    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  /** Datas: 2024-03-15, 15/03/2024, 2024-03, 03/2024 → Date (meia-noite local). */
  function toDate(v) {
    if (v instanceof Date) return isNaN(v) ? null : v;
    if (typeof v === 'number') return new Date(v);
    const s = String(v || '').trim();
    let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return new Date(+m[3], +m[2] - 1, +m[1]);
    if ((m = s.match(/^(\d{4})-(\d{1,2})$/))) return new Date(+m[1], +m[2] - 1, 1);
    if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) return new Date(+m[2], +m[1] - 1, 1);
    return null;
  }
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  // --- CSV / TSV ------------------------------------------------------------------
  function detectDelimiter(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
    const cands = ['\t', ';', ',', '|'];
    let best = ',', bestScore = -1;
    cands.forEach((d) => {
      const counts = lines.map((l) => splitLine(l, d).length);
      const min = Math.min(...counts), max = Math.max(...counts);
      const score = min > 1 ? min * 10 - (max - min) : 0;
      if (score > bestScore) { bestScore = score; best = d; }
    });
    return best;
  }
  function splitLine(line, d) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === d) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }
  /** Texto → {columns, rows}. A primeira linha é o cabeçalho. */
  function parseTable(text) {
    text = String(text || '').replace(/^﻿/, '');
    const d = detectDelimiter(text);
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return { columns: [], rows: [] };
    const all = lines.map((l) => splitLine(l, d).map((c) => c.trim()));
    const width = Math.max(...all.map((r) => r.length));
    const columns = all[0].concat(Array(width - all[0].length).fill('')).map((c, i) => c || 'Coluna ' + (i + 1));
    const rows = all.slice(1).map((r) => r.concat(Array(width - r.length).fill('')).map(cellValue));
    return { columns, rows };
  }
  /** Número → texto editável (vírgula decimal, sem milhar), ida-e-volta seguro com toNum. */
  function numText(v) {
    if (typeof v !== 'number') return v === null || v === undefined ? '' : String(v);
    return String(+v.toPrecision(12)).replace('.', ',');
  }
  function cellValue(s) {
    if (s === '') return '';
    const n = toNum(s);
    return n === null || /^0\d/.test(s) || /^\d{4}-\d{2}/.test(s) || /\d\/\d/.test(s) ? s : n;
  }
  function toCSV(table, delim) {
    delim = delim || ';';
    const q = (v) => {
      let s = v === null || v === undefined ? '' : typeof v === 'number' && delim === ';' ? String(v).replace('.', ',') : String(v);
      return /["\n;,\t]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [table.columns.map(q).join(delim)].concat(table.rows.map((r) => r.map(q).join(delim))).join('\n');
  }

  // --- Acesso tabular -------------------------------------------------------------
  const col = (t, i) => t.rows.map((r) => r[i]);
  const numCol = (t, i) => t.rows.map((r) => toNum(r[i]));
  const clone = (t) => ({ columns: t.columns.slice(), rows: t.rows.map((r) => r.slice()) });
  /** Remove linhas totalmente vazias. */
  const clean = (t) => ({ columns: t.columns.slice(), rows: t.rows.filter((r) => r.some((c) => c !== '' && c !== null && c !== undefined)) });

  // --- Estatística ----------------------------------------------------------------
  const sum = (a) => a.reduce((s, x) => s + (x || 0), 0);
  const mean = (a) => (a.length ? sum(a) / a.length : 0);
  const sorted = (a) => a.filter((x) => x !== null && isFinite(x)).slice().sort((x, y) => x - y);
  function quantile(s, q) {
    if (!s.length) return null;
    const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  }
  function sd(a) { const m = mean(a); return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / Math.max(a.length - 1, 1)); }
  function boxStats(values) {
    const s = sorted(values);
    const q1 = quantile(s, 0.25), q2 = quantile(s, 0.5), q3 = quantile(s, 0.75), iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
    const inside = s.filter((x) => x >= lo && x <= hi);
    return { min: inside[0], q1, median: q2, q3, max: inside[inside.length - 1], outliers: s.filter((x) => x < lo || x > hi), n: s.length, mean: mean(s) };
  }
  function linreg(xs, ys) {
    const n = xs.length, mx = mean(xs), my = mean(ys);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    const b = sxx ? sxy / sxx : 0, a = my - b * mx;
    const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
    return { a, b, r, r2: r * r };
  }
  function kde(values, points) {
    const s = sorted(values);
    if (s.length < 2) return [];
    const h = 1.06 * sd(s) * Math.pow(s.length, -0.2) || 1;
    const lo = s[0] - h * 1.5, hi = s[s.length - 1] + h * 1.5, n = points || 48;
    const out = [];
    for (let i = 0; i <= n; i++) {
      const x = lo + (hi - lo) * i / n;
      let d = 0;
      for (const v of s) d += Math.exp(-0.5 * ((x - v) / h) ** 2);
      out.push([x, d / (s.length * h * Math.sqrt(2 * Math.PI))]);
    }
    return out;
  }
  function niceBins(values, count) {
    const s = sorted(values);
    if (!s.length) return [];
    const min = s[0], max = s[s.length - 1];
    const k = count || Math.max(5, Math.min(30, Math.ceil(Math.log2(s.length) + 1)));
    const raw = (max - min) / k || 1;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw) || raw;
    const start = Math.floor(min / step) * step;
    const bins = [];
    for (let x = start; x <= max + 1e-9; x += step) bins.push({ x0: +x.toFixed(10), x1: +(x + step).toFixed(10), n: 0 });
    s.forEach((v) => { const i = Math.min(bins.length - 1, Math.floor((v - start) / step)); bins[i].n++; });
    return bins;
  }

  // --- Geradores determinísticos (para dados de exemplo) ----------------------------
  function rng(seed) {
    let t = (seed >>> 0) || 1;
    return function () { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  }
  const gen = {
    rng,
    normal(r, mu, sigma) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
    /** n amostras normais arredondadas a d casas */
    normals(seed, n, mu, sigma, d) { const r = rng(seed); return Array.from({ length: n }, () => round(gen.normal(r, mu, sigma), d == null ? 1 : d)); },
    lognormals(seed, n, mu, sigma, d) { const r = rng(seed); return Array.from({ length: n }, () => round(Math.exp(gen.normal(r, mu, sigma)), d == null ? 0 : d)); },
    /** passeio aleatório com tendência e sazonalidade opcional */
    walk(seed, n, start, drift, vol, season, d) {
      const r = rng(seed); let v = start; const out = [];
      for (let i = 0; i < n; i++) {
        const s = season ? season.amp * Math.sin((2 * Math.PI * (i + (season.phase || 0))) / season.period) : 0;
        out.push(round(v + s, d == null ? 1 : d));
        v = v + drift + gen.normal(r, 0, vol);
      }
      return out;
    },
    months(n, startYear, startMonth) {
      const M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      let y = startYear || 2024, m = startMonth || 0; const out = [];
      for (let i = 0; i < n; i++) { out.push(M[m] + '/' + String(y).slice(2)); m++; if (m > 11) { m = 0; y++; } }
      return out;
    },
    monthNames: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    days(n, start) { const d0 = toDate(start || '2025-01-01'); return Array.from({ length: n }, (_, i) => iso(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i))); },
    weeks(n, prefix) { return Array.from({ length: n }, (_, i) => (prefix || 'S') + (i + 1)); },
    years(a, b) { const out = []; for (let y = a; y <= b; y++) out.push(String(y)); return out; },
    zip(...cols) { return cols[0].map((_, i) => cols.map((c) => c[i])); },
    round
  };
  function round(x, d) { const p = Math.pow(10, d || 0); return Math.round(x * p) / p; }

  GG.data = { toNum, toDate, iso, parseTable, toCSV, splitLine, col, numCol, clone, clean, numText, cellValue };
  GG.stats = { sum, mean, sorted, quantile, sd, boxStats, linreg, kde, niceBins };
  GG.gen = gen;
})(window.GG = window.GG || {});
