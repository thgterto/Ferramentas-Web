/**
 * Graficário — tipo de gráfico `gantt`: Gantt (cronograma).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'gantt', name: 'Gantt (cronograma)', group: 'Projetos', shape: 'wide',
    family: 'tasks',
    roles: ['Tarefa', 'Início (data)', 'Fim (data)', 'Fase / grupo (opc.)', 'Progresso 0–1 (opc.)'],
    hint: 'Cronograma de tarefas. Fases ganham cores; o progresso aparece como preenchimento parcial.',
    hl: 'series', annot: false,
    settings: [{ k: 'today', l: 'Data de hoje (linha)', t: 'text', d: '', ph: 'aaaa-mm-dd' }],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const rows = t.rows.map((r) => ({ task: String(r[0] || ''), s: GG.data.toDate(r[1]), e: GG.data.toDate(r[2]), g: r[3] ? String(r[3]) : 'Tarefas', p: N(r[4]) })).filter((x) => x.s && x.e);
      const groups = [];
      rows.forEach((r) => { if (groups.indexOf(r.g) < 0) groups.push(r.g); });
      const tasks = rows.map((r) => r.task);
      const legend = groups.length > 1 ? B.legend(ctx, groups) : undefined;
      const today = GG.data.toDate(S.today);
      ctx.layout.right = Math.max(ctx.layout.right, 30);
      ctx.layout.top += 20;
      const series = groups.map((g, gi) => {
        const col = ctx.pick(g, gi);
        return {
          type: 'custom', name: g, color: col, renderItem: ctx.fn('rGantt', { colors: [col], ink: T.ink, surface: T.surface }),
          encode: { x: [1, 2], y: 0 },
          data: rows.map((r, i) => (r.g === g ? { name: r.task, value: [i, r.s.getTime(), r.e.getTime() + (r.e > r.s ? 864e5 : 0), 0, r.p === null ? undefined : (r.p > 1 ? r.p / 100 : r.p)] } : null)).filter(Boolean),
          tooltip: { formatter: ctx.fn('tipGantt', { c: ctx.c, tasks, groups: [g] }) }
        };
      });
      if (today) {
        series[0].markLine = { silent: true, symbol: 'none', label: { formatter: 'Hoje', color: T.ink, fontSize: 11, position: 'end' }, lineStyle: { color: GG.tokens.STATUS.critical, width: 1.5, type: 'solid' }, data: [{ xAxis: today.getTime() }] };
      }
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          xAxis: { type: 'time', position: 'top', axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: true, lineStyle: { color: T.grid } },
            axisLabel: { color: T.muted, fontSize: 11, hideOverlap: true, formatter: { year: '{yyyy}', month: '{MMM}', day: '{d}/{M}' } } },
          yAxis: B.catAxis(ctx, tasks, { inverse: true, axisLine: { show: false }, axisLabel: { color: T.ink2, fontSize: 12, width: Math.max(110, ctx.W * 0.26), overflow: 'truncate' } }),
          series
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
