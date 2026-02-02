// SPC Library & Math Logic
const SPC = {
  consts: {
    2: { A2:1.880, d2:1.128, D3:0, D4:3.267, B3:0, B4:3.267, A3:2.659, c4:0.7979 },
    3: { A2:1.023, d2:1.693, D3:0, D4:2.574, B3:0, B4:2.568, A3:1.954, c4:0.8862 },
    4: { A2:0.729, d2:2.059, D3:0, D4:2.282, B3:0, B4:2.266, A3:1.628, c4:0.9213 },
    5: { A2:0.577, d2:2.326, D3:0, D4:2.114, B3:0, B4:2.089, A3:1.427, c4:0.9400 },
    6: { A2:0.483, d2:2.534, D3:0, D4:2.004, B3:0.030, B4:1.970, A3:1.287, c4:0.9515 },
    7: { A2:0.419, d2:2.704, D3:0.076, D4:1.924, B3:0.118, B4:1.882, A3:1.182, c4:0.9594 },
    8: { A2:0.373, d2:2.847, D3:0.136, D4:1.864, B3:0.185, B4:1.815, A3:1.099, c4:0.9650 },
    9: { A2:0.337, d2:2.970, D3:0.184, D4:1.816, B3:0.239, B4:1.761, A3:1.032, c4:0.9693 },
    10:{ A2:0.308, d2:3.078, D3:0.223, D4:1.777, B3:0.284, B4:1.716, A3:0.975, c4:0.9727 },
    11:{ A2:0.285, d2:3.173, D3:0.256, D4:1.744, B3:0.321, B4:1.679, A3:0.927, c4:0.9754 },
    12:{ A2:0.266, d2:3.258, D3:0.283, D4:1.717, B3:0.354, B4:1.646, A3:0.886, c4:0.9776 },
    13:{ A2:0.249, d2:3.336, D3:0.307, D4:1.693, B3:0.382, B4:1.618, A3:0.850, c4:0.9794 },
    14:{ A2:0.235, d2:3.407, D3:0.328, D4:1.672, B3:0.406, B4:1.594, A3:0.817, c4:0.9810 },
    15:{ A2:0.223, d2:3.472, D3:0.347, D4:1.653, B3:0.428, B4:1.572, A3:0.789, c4:0.9823 }
  },
  getFactors(n) { return this.consts[n] || this.consts[15]; },
  mean: (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0,
  stdDev: (arr, mu) => arr.length > 1 ? Math.sqrt(arr.reduce((a,b)=>a+(b-mu)**2,0)/(arr.length-1)) : 0,

  moments: (arr, mean, std) => {
      if (arr.length < 3) return { skew: 0, kurt: 0 };
      const n = arr.length;
      let sum3 = 0, sum4 = 0;
      for (let i=0; i<n; i++) {
          const z = (arr[i] - mean) / std;
          sum3 += Math.pow(z, 3);
          sum4 += Math.pow(z, 4);
      }
      const skew = (n * sum3) / ((n-1)*(n-2));
      const kurt = (n*(n+1)*sum4) / ((n-1)*(n-2)*(n-3)) - (3*Math.pow(n-1,2)) / ((n-2)*(n-3));
      return { skew, kurt };
  },

  describe: (arr) => {
    if(!arr.length) return {};
    const s = [...arr].sort((a,b)=>a-b);
    const min = s[0];
    const max = s[s.length-1];
    const q1 = s[Math.floor((s.length-1)*0.25)];
    const median = s[Math.floor((s.length-1)*0.5)];
    const q3 = s[Math.floor((s.length-1)*0.75)];
    return { n: arr.length, min, max, range: max - min, q1, median, q3, iqr: q3 - q1 };
  },

  cdf: (x, m, s) => {
    if(s===0) return x<m ? 0 : 1;
    const z = (x-m)/s;
    const t = 1/(1+0.2316419*Math.abs(z));
    const d = 0.3989423 * Math.exp(-z*z/2);
    const p = 1 - d*t*(0.3193815 + t*(-0.3565638 + t*(1.781478 + t*(-1.821256 + t*1.330274))));
    return z<0 ? 1-p : p;
  },

  runTest: (data, median) => {
      const n = data.length;
      if (n < 2) return null;
      let runs = 1, above = data[0] > median;
      for (let i = 1; i < n; i++) {
          if ((data[i] > median) !== above && data[i] !== median) { runs++; above = !above; }
      }
      const m = n/2; const E = 1 + n/2; const Var = (n-1)/4;
      const Z = (runs - E) / Math.sqrt(Var);
      const pCluster = SPC.cdf(Z, 0, 1);
      const pMixture = 1 - pCluster;
      return { runs, E, pCluster, pMixture };
  },

  cusum: (data, mean, stdDev, k=0.5, h=4) => {
      const K = k * stdDev, H = h * stdDev, cp = [0], cm = [0];
      for(let i=0; i<data.length; i++) {
          cp.push(Math.max(0, data[i] - (mean + K) + cp[i]));
          cm.push(Math.max(0, (mean - K) - data[i] + cm[i]));
      }
      return { cp: cp.slice(1), cm: cm.slice(1), h: H };
  },

  ewma: (data, mean, stdDev, lambda=0.2, L=3) => {
      const z = [mean], ucl = [], lcl = [];
      for(let i=0; i<data.length; i++) {
          const nextZ = lambda * data[i] + (1 - lambda) * z[i];
          z.push(nextZ);
          const term = Math.sqrt((lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * (i + 1))));
          ucl.push(mean + L * stdDev * term);
          lcl.push(mean - L * stdDev * term);
      }
      return { z: z.slice(1), ucl, lcl };
  },

  andersonDarling: (data, mean, stdDev) => {
    const n = data.length;
    if (n < 5) return { A2: NaN, pValue: NaN };
    const sorted = [...data].sort((a,b) => a - b);
    const Y = sorted.map(x => stdDev > 0 ? (x - mean) / stdDev : 0);
    const Phi = Y.map(z => {
      const t = 1 / (1 + 0.2316419 * Math.abs(z));
      const d = 0.3989423 * Math.exp(-z * z / 2);
      const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
      return z >= 0 ? 1 - p : p;
    });
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const phi_i = Math.max(1e-10, Math.min(1 - 1e-10, Phi[i]));
      const phi_rev = Math.max(1e-10, Math.min(1 - 1e-10, Phi[n - 1 - i]));
      sum += (2 * (i + 1) - 1) * (Math.log(phi_i) + Math.log(1 - phi_rev));
    }
    const A2 = -n - sum / n;
    const A2star = A2 * (1 + 0.75 / n + 2.25 / (n * n));
    let pValue = NaN;
    if (A2star >= 0.6) pValue = Math.exp(1.2937 - 5.709 * A2star + 0.0186 * A2star * A2star);
    else if (A2star > 0.34) pValue = Math.exp(0.9177 - 4.279 * A2star - 1.38 * A2star * A2star);
    else if (A2star > 0.2) pValue = 1 - Math.exp(-8.318 + 42.796 * A2star - 59.938 * A2star * A2star);
    else pValue = 1 - Math.exp(-13.436 + 101.14 * A2star - 223.73 * A2star * A2star);
    return { A2: A2star, pValue: Math.max(0, Math.min(1, pValue)) };
  },

  diagnose: (data, stats, violations, lsl, usl) => {
      const findings = [];
      const actions = [];
      let status = 'Estável';
      let statusClass = 'success';

      if (violations.length > 0) {
          status = 'Instável';
          statusClass = 'danger';
          findings.push(`Foram detectados ${violations.length} pontos fora de controle estatístico.`);
          actions.push("Interrompa a análise de capacidade. O processo não é previsível no momento.");
          actions.push("Identifique e elimine as causas especiais (pontos marcados em vermelho) antes de calcular Cp/Cpk.");
      }

      if (stats.n > 10) {
          const ad = SPC.andersonDarling(data, stats.mean, stats.sOverall);
          if (ad.pValue < 0.05) {
              findings.push("Os dados não seguem uma distribuição normal (Valor P < 0.05).");
              actions.push("Os índices Cpk/Ppk podem não ser confiáveis. Considere uma Transformação Box-Cox ou análise não-paramétrica.");
          }
      }

      if (!isNaN(lsl) || !isNaN(usl)) {
          const cp = (usl - lsl) / (6 * stats.sWithin);
          const cpk = Math.min((usl - stats.mean)/(3*stats.sWithin), (stats.mean - lsl)/(3*stats.sWithin));

          if (cpk < 1.0) {
              findings.push(`Capacidade Inadequada (Cpk = ${cpk.toFixed(2)}). O processo está gerando defeitos.`);
              if (cp > 1.33) {
                  findings.push("O processo tem potencial (Cp alto), mas está descentralizado.");
                  actions.push("Ajuste a média do processo para o centro da especificação (Ajuste de Offset).");
              } else {
                  findings.push("A variabilidade do processo é excessiva (Cp baixo).");
                  actions.push("Investigue as causas comuns de variação (6M: Máquina, Método, Material, etc.).");
                  actions.push("Realize um DOE (Experimento) para reduzir a variância.");
              }
          } else if (cpk < 1.33) {
              findings.push("Capacidade Marginal (1.0 < Cpk < 1.33). Requer monitoramento rigoroso.");
          } else {
              findings.push("Processo Capaz (Cpk > 1.33). Mantenha o controle atual.");
          }
      }

      if(findings.length === 0) findings.push("O processo aparenta estar estável e dentro dos parâmetros normais.");
      if(actions.length === 0) actions.push("Continue o monitoramento padrão.");

      return { status, statusClass, findings, actions };
  }
};

function parseLocaleNumber(stringVal) {
  if (typeof stringVal === 'number') return stringVal;
  if (!stringVal) return NaN;
  let str = stringVal.toString().trim().replace(/^[^\d\-\.,]+/, '');
  if (str.indexOf(',') > -1 && str.indexOf('.') > -1) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) { str = str.replace(/\./g, '').replace(',', '.'); }
      else { str = str.replace(/,/g, ''); }
  } else if (str.indexOf(',') > -1) { str = str.replace(',', '.'); }
  return parseFloat(str);
}

self.onmessage = function(e) {
  const { cmd, raw, config } = e.data;
  if (cmd !== 'calc') return;

  try {
    const { col, stratCol, iqrFilter, windowSize, windowOffset, n, method, rules } = config;

    // 1. Map and Filter (IQR)
    let mapped = raw.map(r => ({
        val: parseLocaleNumber(r[col]),
        strat: stratCol ? r[stratCol] : 'Todos'
    })).filter(o => !isNaN(o.val));

    let arr = mapped.map(o => o.val);

    if (iqrFilter) {
      const s = [...arr].sort((a,b)=>a-b);
      const q1 = s[Math.floor((s.length-1)*0.25)];
      const q3 = s[Math.floor((s.length-1)*0.75)];
      const iqr = q3 - q1;
      const min = q1 - 1.5*iqr;
      const max = q3 + 1.5*iqr;
      mapped = mapped.filter(o => o.val >= min && o.val <= max);
      arr = mapped.map(o => o.val);
    }

    // 2. Windowing
    let data, strata;
    let winStart = 0;

    if(windowSize > 0 && windowSize < arr.length) {
       const off = windowOffset || 0;
       winStart = off;
       const winEnd = off + windowSize;
       data = arr.slice(winStart, winEnd);
       strata = mapped.slice(winStart, winEnd).map(o => o.strat);
    } else {
       data = arr;
       strata = mapped.map(o => o.strat);
    }

    // 3. Subgroup Calculations
    const f = SPC.getFactors(n);
    const means = [], ranges = [], stds = [];
    const len = data.length;
    for(let i = 0; i < len; i += n) {
      const end = (i + n > len) ? len : i + n;
      const count = end - i;
      if(count < 2) continue;
      let sum = 0, min = data[i], max = data[i];
      for(let j = i; j < end; j++) {
        const val = data[j]; sum += val;
        if(val < min) min = val; if(val > max) max = val;
      }
      const m = sum / count;
      means.push(m); ranges.push(max - min);
      let sqDiffSum = 0;
      for(let j = i; j < end; j++) sqDiffSum += (data[j] - m) ** 2;
      stds.push(Math.sqrt(sqDiffSum / (count - 1)));
    }

    // 4. Overall Stats
    const meanGrand = SPC.mean(data);
    const rBar = SPC.mean(ranges);
    const sBar = SPC.mean(stds);

    const mr = []; for(let i=1; i<data.length; i++) mr.push(Math.abs(data[i]-data[i-1]));
    const mrBar = SPC.mean(mr);

    // 5. Limits
    const limits = {
      ind: { cl: meanGrand, ucl: meanGrand + 2.66*mrBar, lcl: meanGrand - 2.66*mrBar },
      mr:  { cl: mrBar, ucl: 3.267*mrBar, lcl: 0 },
      xbar:{ cl: meanGrand, ucl: meanGrand + f.A2*rBar, lcl: meanGrand - f.A2*rBar },
      xbars:{ cl: meanGrand, ucl: meanGrand + f.A3*sBar, lcl: meanGrand - f.A3*sBar },
      r:   { cl: rBar, ucl: f.D4*rBar, lcl: f.D3*rBar },
      s:   { cl: sBar, ucl: f.B4*sBar, lcl: f.B3*sBar }
    };

    let sWithin, activeXBarLimits;
    if(method === 'sbar') {
        sWithin = sBar / f.c4;
        activeXBarLimits = limits.xbars;
    } else {
        sWithin = rBar / f.d2;
        activeXBarLimits = limits.xbar;
    }
    const sOverall = SPC.stdDev(data, meanGrand);

    // 6. Descriptive & Advanced
    const moments = SPC.moments(data, meanGrand, sOverall);
    const descStats = SPC.describe(data);
    const stats = { mean: meanGrand, sWithin, sOverall, n: data.length, skew: moments.skew, kurt: moments.kurt };

    const advanced = {
        cusum: SPC.cusum(data, meanGrand, sOverall),
        ewma: SPC.ewma(data, meanGrand, sOverall),
        run: SPC.runTest(data, descStats.median)
    };

    // 7. Rule Checking
    const violations = [];
    function add(chart, i, val, rule, type) { violations.push({ chart, i: i+1, val, rule, type }); }

    // Limits used for rules
    const lInd = limits.ind;
    const lBar = activeXBarLimits;

    if (rules.r1) {
      for (let i = 0; i < data.length; i++) { if (data[i] > lInd.ucl || data[i] < lInd.lcl) add('IND', i, data[i], '1 pt > 3σ', 'crit'); }
      for (let i = 0; i < means.length; i++) { if (means[i] > lBar.ucl || means[i] < lBar.lcl) add('XBAR', i, means[i], '1 pt > 3σ', 'crit'); }
    }
    if (rules.r2 && means.length >= 9) {
      const cl = lBar.cl;
      for (let i = 8; i < means.length; i++) {
        const slice = means.slice(i-8, i+1);
        if (slice.every(v => v > cl) || slice.every(v => v < cl)) add('XBAR', i, means[i], '9 ptos mesmo lado', 'warn');
      }
    }
    if (rules.r3 && means.length >= 3) {
      const cl = lBar.cl; const sigma = (lBar.ucl - cl) / 3; const u2 = cl + 2*sigma, l2 = cl - 2*sigma;
      for (let i = 2; i < means.length; i++) {
        const slice = means.slice(i-2, i+1);
        if (slice.filter(v=>v>u2).length >= 2 || slice.filter(v=>v<l2).length >= 2) add('XBAR', i, means[i], '2 de 3 > 2σ', 'warn');
      }
    }
    if (rules.r4 && means.length >= 5) {
      const cl = lBar.cl; const sigma = (lBar.ucl - cl) / 3; const u1 = cl + sigma, l1 = cl - sigma;
      for (let i = 4; i < means.length; i++) {
        const slice = means.slice(i-4, i+1);
        if (slice.filter(v=>v>u1).length >= 4 || slice.filter(v=>v<l1).length >= 4) add('XBAR', i, means[i], '4 de 5 > 1σ', 'warn');
      }
    }
    if (rules.r5 && means.length >= 6) {
      for (let i = 5; i < means.length; i++) {
        const slice = means.slice(i-5, i+1);
        let inc = true, dec = true;
        for (let j = 1; j < slice.length; j++) { if (slice[j] <= slice[j-1]) inc = false; if (slice[j] >= slice[j-1]) dec = false; }
        if (inc || dec) add('XBAR', i, means[i], 'Tendência (6 ptos)', 'warn');
      }
    }

    const { lsl, usl } = config; // config needs to have lsl and usl
    const insights = SPC.diagnose(data, stats, violations, lsl, usl);

    let cpk=NaN, ppk=NaN, ppm=NaN, cp=NaN, pp=NaN, yieldPct=NaN;
    if ((!isNaN(lsl) || !isNaN(usl)) && stats.n > 1) {
        const mean = stats.mean;
        const sWithin = stats.sWithin;
        const sOverall = stats.sOverall;

        if(sWithin > 0) {
          if (isNaN(lsl)) { cpk = (usl - mean)/(3*sWithin); }
          else if (isNaN(usl)) { cpk = (mean - lsl)/(3*sWithin); }
          else { cp = (usl - lsl) / (6 * sWithin); cpk = Math.min((usl - mean)/(3*sWithin), (mean - lsl)/(3*sWithin)); }
        }
        if(sOverall > 0) {
           if (isNaN(lsl)) { ppk = (usl - mean)/(3*sOverall); ppm = (1 - SPC.cdf(usl, mean, sOverall)) * 1e6; }
           else if (isNaN(usl)) { ppk = (mean - lsl)/(3*sOverall); ppm = SPC.cdf(lsl, mean, sOverall) * 1e6; }
           else { pp = (usl - lsl) / (6 * sOverall); ppk = Math.min((usl - mean)/(3*sOverall), (mean - lsl)/(3*sOverall)); ppm = (SPC.cdf(lsl, mean, sOverall) + (1 - SPC.cdf(usl, mean, sOverall))) * 1e6; }
           yieldPct = 100 * (1 - ppm/1e6);
        }
    }

    const kpis = { cp, cpk, pp, ppk, ppm, yieldPct };

    self.postMessage({
        processed: { vals: data, means, ranges, stds },
        limits,
        stats,
        descStats,
        advanced,
        violations,
        strata,
        insights,
        kpis,
        windowInfo: { total: arr.length, displayed: data.length, offset: winStart }
    });

  } catch (error) {
    console.error('Worker Error:', error);
  }
};
