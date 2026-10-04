#!/usr/bin/env node
/**
 * Verificação automática das regras de segurança do repositório (ver SECURITY.md).
 *
 * Uso:  node scripts/security-check.mjs
 * Sai com código 1 se alguma regra obrigatória for violada; avisos não bloqueiam.
 * Analisa apenas arquivos versionados (git ls-files).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const failures = [];
const warnings = [];
const fail = (rule, file, msg) => failures.push(`[${rule}] ${file}: ${msg}`);
const warn = (rule, file, msg) => warnings.push(`[${rule}] ${file}: ${msg}`);

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const TEXT = /\.(js|mjs|cjs|ts|tsx|jsx|py|html?|css|json|ya?ml|md|txt|toml|cfg|ini|env|sh)$|(^|\/)(CEP_PRO_BACKUP|Dockerfile)$/i;
const read = (f) => { try { return statSync(f).size < 5e6 ? readFileSync(f, 'utf8') : ''; } catch { return ''; } };
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

// S1 — segredos versionados ---------------------------------------------------------------
const SECRET_PATTERNS = [
  ['chave privada', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['token do GitHub', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ['chave de API (sk-)', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{24,}\b/],
  ['token do Slack', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['chave do Google', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['senha em URL', /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@'"]+:[^\s@/'"]{3,}@[^\s'"]+/i]
];
const FORBIDDEN_FILES = [
  [/(^|\/)\.env(\.[^/]*)?$/, (f) => !/\.env\.example$/.test(f), 'arquivo .env versionado'],
  [/\.(pem|key|p12|pfx)$/i, () => true, 'certificado/chave versionado'],
  [/(^|\/)id_(rsa|ed25519|ecdsa)(\.pub)?$/, () => true, 'chave SSH versionada'],
  [/(^|\/)__pycache__\/|\.py[cod]$/, () => true, 'bytecode Python versionado (gerado localmente)']
];

for (const f of files) {
  for (const [re, cond, msg] of FORBIDDEN_FILES) if (re.test(f) && cond(f)) fail('S1', f, msg);
  if (!TEXT.test(f) || /package-lock\.json$/.test(f)) continue;
  const text = read(f);
  for (const [name, re] of SECRET_PATTERNS) {
    const m = re.exec(text);
    if (m) fail('S1', `${f}:${lineOf(text, m.index)}`, `possível ${name} no código`);
  }
}

// S2 — dependências de CDN fixadas e com integridade --------------------------------------
// Exceções conhecidas, com justificativa. Remover daqui assim que o motivo deixar de existir.
const SRI_EXCEPTIONS = [
  ['https://cdn.tailwindcss.com', 'Play CDN gera CSS em tempo de execução; não existe hash estável (ata.html, sixpack). Migrar para build do Tailwind.'],
  ['https://cdn.plot.ly/', 'legacy/: hash ainda não verificado contra o arquivo publicado; fixado por versão.'],
  ['https://cdn.sheetjs.com/', 'legacy/: hash ainda não verificado contra o arquivo publicado; fixado por versão.']
];
for (const f of files.filter((x) => /\.html?$|(^|\/)CEP_PRO_BACKUP$/.test(x))) {
  const text = read(f);
  const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(text))) {
    const tag = m[0], src = m[1], where = `${f}:${lineOf(text, m.index)}`;
    if (!/^https?:\/\//i.test(src)) continue;
    if (/^http:/i.test(src)) fail('S2', where, `script carregado sem HTTPS: ${src}`);
    if (/@latest\b|\/latest\//i.test(src)) fail('S2', where, `versão não fixada (@latest): ${src}`);
    const exc = SRI_EXCEPTIONS.find(([prefix]) => src.startsWith(prefix));
    if (!/\bintegrity\s*=/.test(tag)) {
      if (exc) warn('S2', where, `sem SRI (exceção registrada: ${exc[1]})`);
      else fail('S2', where, `script de CDN sem atributo integrity (SRI): ${src}`);
    } else if (!/\bcrossorigin\s*=/.test(tag)) fail('S2', where, 'integrity exige crossorigin="anonymous"');
  }
}
for (const f of files.filter((x) => /\.(m?js|html?|tsx?)$/.test(x))) {
  const text = read(f);
  const m = /(?:cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com)[^\s'"`]*@latest/i.exec(text);
  if (m) fail('S2', `${f}:${lineOf(text, m.index)}`, 'URL de CDN com @latest');
}

// S2 — requisitos Python sem versão (aviso) --------------------------------------------------
for (const f of files.filter((x) => /(^|\/)requirements[^/]*\.txt$/.test(x))) {
  const loose = read(f).split('\n').map((l) => l.replace(/#.*/, '').trim())
    .filter((l) => l && !l.startsWith('-') && !/[=<>~!]=|[<>]/.test(l));
  if (loose.length) warn('S2', f, `pacotes sem versão definida: ${loose.join(', ')}`);
}

// S3 — HTML dinâmico e execução de código ------------------------------------------------------
// Código novo (gerador-graficos/, frontend/src): innerHTML só com texto literal; nada de eval.
const STRICT = /^(gerador-graficos\/js\/|frontend\/src\/|scripts\/)/;
for (const f of files.filter((x) => /\.(m?js|tsx?|jsx|html?)$/.test(x))) {
  const text = read(f);
  const lines = text.split('\n');
  lines.forEach((ln, i) => {
    const where = `${f}:${i + 1}`;
    if (/(^|[^.\w])eval\s*\(|\bnew\s+Function\s*\(|document\.write(ln)?\s*\(/.test(ln) && !/security-check:ignore/.test(ln)) {
      (STRICT.test(f) ? fail : warn)('S3', where, 'execução dinâmica de código (eval/new Function/document.write)');
    }
    const sink = /\.(innerHTML|outerHTML)\s*\+?=\s*(.*)$|insertAdjacentHTML\s*\([^,]+,\s*(.*)$/.exec(ln);
    if (!sink) return;
    const rhs = (sink[2] || sink[3] || '').trim();
    // literal = a expressão começa com uma string fixa ('...', "..." ou `...` sem ${}) e termina ali
    const literal = /^(['"])(?:(?!\1)[^\\]|\\.)*\1\s*(;|\)|$)/.test(rhs) || /^`[^`$]*`\s*(;|\)|$)/.test(rhs);
    if (literal || /security-check:ignore/.test(ln)) return;
    (STRICT.test(f) ? fail : warn)('S3', where, 'HTML montado com valores dinâmicos: use textContent/createElement ou escape');
  });
}

// Relatório ---------------------------------------------------------------------------------------
const pad = (s) => '  ' + s;
if (warnings.length) {
  console.log(`Avisos (${warnings.length}) — não bloqueiam, mas estão registrados em SECURITY.md:`);
  warnings.forEach((w) => console.log(pad(w)));
}
if (failures.length) {
  console.error(`\n✗ ${failures.length} violação(ões) das regras de segurança:`);
  failures.forEach((x) => console.error(pad(x)));
  console.error('\nVeja SECURITY.md. Em caso de falso positivo, adicione "security-check:ignore" na linha com uma justificativa.');
  process.exit(1);
}
console.log(`\n✓ Regras de segurança ok (${files.length} arquivos analisados).`);
