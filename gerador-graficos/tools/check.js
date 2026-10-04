#!/usr/bin/env node
/**
 * Graficário — verificação sem navegador.
 *
 * Carrega os módulos de js/manifest.js (exceto a camada de interface) num
 * contexto Node, valida o registro de tipos e modelos e constrói o option de
 * todos os modelos nos temas claro e escuro.
 *
 *   node tools/check.js                 valida e constrói tudo
 *   node tools/check.js --snapshot f    grava as saídas em f (JSON)
 *   node tools/check.js --compare f     compara as saídas com f
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const argOf = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

function context() {
  const echarts = { registerLocale() {}, graphic: { clipRectByRect: (a) => a } };
  const sandbox = {
    console, echarts,
    document: { createElement: () => ({ getContext: () => null }) },
    localStorage: { getItem: () => null, setItem() {} }
  };
  sandbox.window = sandbox;
  return vm.createContext(sandbox);
}

function load(ctx, rel) {
  const file = path.join(ROOT, rel);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: rel });
}

const ctx = context();
load(ctx, 'js/manifest.js');
const files = ctx.GG_MANIFEST.filter((f) => !f.startsWith('js/app/'));
files.forEach((f) => load(ctx, f));
const GG = ctx.GG;
GG.RT = ctx.GG_RUNTIME(ctx.echarts);

const problems = GG.presets.validate();
// Todo arquivo de tipo/modelo no disco precisa estar no manifesto (e vice-versa).
['js/builders/types', 'js/builders/lib', 'js/presets/catalog'].forEach((dir) => {
  fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.js')).forEach((f) => {
    if (ctx.GG_MANIFEST.indexOf(dir + '/' + f) < 0) problems.push(dir + '/' + f + ' não está em js/manifest.js');
  });
});
ctx.GG_MANIFEST.forEach((f) => { if (!fs.existsSync(path.join(ROOT, f))) problems.push('arquivo do manifesto não existe: ' + f); });
// Cada tipo precisa de pelo menos um modelo (é o que garante que ele é testado aqui).
GG.builders.ORDER.forEach((id) => { if (!GG.presets.list.some((p) => p.type === id)) problems.push('tipo sem modelo de exemplo: ' + id); });
const out = {};
let built = 0;
GG.presets.list.forEach((p) => {
  ['light', 'dark'].forEach((mode) => {
    try {
      const o = GG.builders.build({ type: p.type, data: GG.presets.dataOf(p), settings: JSON.parse(JSON.stringify(p.settings)), mode, width: 900, height: 560 });
      out[p.id + ':' + mode] = GG.builders.serialize(o);
      built++;
    } catch (e) {
      problems.push('modelo ' + p.id + ' (' + mode + '): ' + e.message);
    }
  });
});

console.log(files.length + ' arquivos, ' + GG.builders.ORDER.length + ' tipos, ' + GG.presets.list.length + ' modelos, ' + built + ' gráficos construídos');

const snap = argOf('--snapshot');
if (snap) fs.writeFileSync(snap, JSON.stringify({ order: GG.builders.ORDER, presets: GG.presets.list.map((p) => p.id), out }));
const cmp = argOf('--compare');
if (cmp) {
  const ref = JSON.parse(fs.readFileSync(cmp, 'utf8'));
  if (JSON.stringify(ref.order) !== JSON.stringify(GG.builders.ORDER)) problems.push('ordem dos tipos mudou');
  if (JSON.stringify(ref.presets) !== JSON.stringify(GG.presets.list.map((p) => p.id))) problems.push('lista/ordem de modelos mudou');
  Object.keys(ref.out).forEach((k) => { if (ref.out[k] !== out[k]) problems.push('saída diferente: ' + k); });
}

if (problems.length) {
  problems.forEach((p) => console.error('✗ ' + p));
  process.exit(1);
}
console.log('✓ tudo certo');
