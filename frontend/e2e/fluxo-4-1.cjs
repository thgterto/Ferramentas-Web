/* E2E do fluxo 4.1 (A44): planta industrial 6x2 com 4 turmas, 3 postos 24/7.
 *
 * Sobe o backend (SQLite + seeds de demo) e o frontend (Vite), percorre login → operação →
 * wizard 5 passos → resultado (heatmap, reserva, calendário/achados, export CSV) com Playwright.
 *
 * Uso: node e2e/fluxo-4-1.cjs            (variáveis: E2E_SCREENSHOT=arquivo.png, E2E_HEADED=1,
 *      E2E_BASE_URL=http://host:porta para usar servidores já no ar, sem subir nada)
 */
const { spawn, execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const assert = require('node:assert/strict')
const { chromium } = require('playwright')

const ROOT = path.resolve(__dirname, '..', '..')
const BACKEND = path.join(ROOT, 'backend')
const FRONTEND = path.join(ROOT, 'frontend')
const PY = process.env.E2E_PYTHON ?? path.join(BACKEND, '.venv', 'bin', 'python')
const API_PORT = Number(process.env.E2E_API_PORT ?? 8765)
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5179)
const EMAIL = 'gerente@demo.local'
const PASSWORD = 'demo-12345'

const procs = []
function start(cmd, args, opts) {
  const p = spawn(cmd, args, { ...opts, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  p.stdout.on('data', (d) => (log += d))
  p.stderr.on('data', (d) => (log += d))
  p.log = () => log
  procs.push(p)
  return p
}

async function waitFor(url, ms = 60000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url)
      if (r.status < 500) return
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`timeout esperando ${url}`)
}

async function servers() {
  if (process.env.E2E_BASE_URL) return process.env.E2E_BASE_URL
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'escalas-e2e-'))
  const env = { ...process.env, DATABASE_URL: `sqlite:///${path.join(tmp, 'e2e.db')}`, SEED_RESET: '1' }
  execFileSync(PY, ['scripts/dev_seed.py'], { cwd: BACKEND, env, stdio: 'inherit' })
  const api = start(PY, ['-m', 'uvicorn', 'app.main:app', '--port', String(API_PORT)], { cwd: BACKEND, env })
  const web = start('npx', ['vite', '--port', String(WEB_PORT), '--strictPort'], {
    cwd: FRONTEND,
    env: { ...process.env, VITE_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
  })
  try {
    await waitFor(`http://127.0.0.1:${API_PORT}/health`)
    await waitFor(`http://127.0.0.1:${WEB_PORT}/escalas/login`)
  } catch (e) {
    console.error(api.log(), web.log())
    throw e
  }
  return `http://127.0.0.1:${WEB_PORT}`
}

async function main() {
  const base = await servers()
  const browser = await chromium.launch({ headless: !process.env.E2E_HEADED })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, acceptDownloads: true, locale: 'pt-BR' })
  const page = await ctx.newPage()
  page.setDefaultTimeout(30000)
  page.on('pageerror', (e) => console.error('pageerror:', e.message))
  const step = (m) => console.log(`✓ ${m}`)

  // T0 login (erro e sucesso)
  await page.goto(`${base}/escalas`)
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Senha').fill('errada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText('E-mail ou senha inválidos.').waitFor()
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('heading', { name: 'Operações' }).waitFor()
  step('login')

  // T2 → T2.1
  await page.getByLabel('Nome').fill('Planta Industrial')
  await page.getByLabel('Setor').selectOption('industria')
  await page.getByRole('button', { name: 'Criar operação' }).click()
  await page.getByRole('link', { name: 'Planta Industrial' }).click()
  await page.getByRole('link', { name: 'Novo cenário' }).click()
  step('operação criada')

  // Passo 1: 24/7, ACT 8 h, regime 44 h
  await page.getByLabel('Nome do cenário').fill('6x2 4 turmas')
  await page.getByLabel('Regras (CCT/ACT)').selectOption('ACT')
  await page.getByLabel('Data inicial do horizonte').fill('2027-01-04')
  await page.getByLabel(/autoriza 8 h/).check()
  await page.getByRole('combobox', { name: 'Regime' }).selectOption('CLT_44H_ATUAL')
  await page.getByRole('button', { name: 'Avançar' }).click()
  // Passo 2: 3 postos fixos
  await page.getByLabel('Postos simultâneos (todas as horas)').fill('3')
  await page.getByRole('button', { name: 'Avançar' }).click()
  // Passo 3: shrinkage 8% / 12%
  await page.getByLabel('Shrinkage diurno (%)').fill('8')
  await page.getByLabel(/Shrinkage noturno/).fill('12')
  await page.getByRole('button', { name: 'Avançar' }).click()
  // Passo 4: 6x2, 4 turmas, M/T/N
  await page.getByTestId('modelo-6X2').click()
  await page.getByLabel('Nº de turmas (K)').fill('4')
  await page.getByRole('button', { name: 'Avançar' }).click()
  // Passo 5: revisão
  await page.getByText('6X2 · 4 turmas · turnos M/T/N').waitFor()
  await page.getByRole('button', { name: 'Simular cobertura' }).click()
  step('wizard 5 passos')

  // T4 cobertura: 100% (postos)
  await page.getByRole('grid', { name: /Cobertura 7×24/ }).waitFor({ timeout: 30000 })
  await page.getByText(/100,0% das horas-posto cobertas/).waitFor()
  const cells = page.locator('[role="gridcell"][data-kind]')
  assert.equal(await cells.count(), 168)
  assert.equal(await page.locator('[data-kind="exata"]').count(), 168)
  // teclado: foco + seta
  await cells.first().focus()
  await page.keyboard.press('ArrowRight')
  const lbl = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  assert.match(lbl, /^Segunda, 01 horas, exato/)
  step('heatmap 100% coberto, teclado ok')
  if (process.env.E2E_SCREENSHOT) {
    await page.screenshot({ path: process.env.E2E_SCREENSHOT, fullPage: true })
    step(`screenshot ${process.env.E2E_SCREENSHOT}`)
  }

  // Postos + reserva: déficit esperado (shrinkage)
  await page.getByRole('button', { name: 'Postos + reserva' }).click()
  await page.locator('[data-kind="forte"], [data-kind="leve"]').first().waitFor()
  step('visão postos + reserva mostra déficit')

  // Export CSV
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar CSV' }).click()])
  const csv = fs.readFileSync(await dl.path(), 'utf8').replace(/^﻿/, '').trim().split('\n')
  assert.equal(csv.length, 169)
  assert.match(csv[0], /^slot;dia;hora/)
  step('export CSV (169 linhas)')

  // Escala: calendário + achados → foco na data
  await page.getByRole('tab', { name: 'Escala' }).click()
  await page.getByRole('grid', { name: /Calendário das turmas/ }).waitFor()
  assert.equal(await page.locator('td[data-team="A"]').count(), 56)
  const goto = page.getByRole('button', { name: 'Ver no calendário' }).first()
  if (await goto.count()) {
    await goto.click()
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-date'))
    assert.ok(focused, 'foco deve ir para a célula da data do achado')
    step(`achado → foco em ${focused}`)
  } else {
    step('sem achados com data (nada a focar)')
  }

  // v3.5: quadro de turnos do cenário 6x2
  await page.getByRole('tab', { name: 'Quadro de turnos' }).click()
  await page.getByRole('table', { name: /Gantt de turnos/ }).waitFor()
  step('quadro de turnos (Gantt)')
  const SHOTS = process.env.E2E_SHOTS_DIR
  // v3.6 (bug): a noite de domingo (véspera do horizonte) continua na 1ª manhã → "← N 22–06"
  await page.getByText(/← N 22–06/).first().waitFor({ timeout: 15000 })
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'gantt-noite.png'), fullPage: true })
  step('Gantt: noite que vem do dia anterior aparece (← N 22–06)')

  // v3.6: matriz mensal (pessoa × dia) + exportação XLSX/CSV
  await page.getByRole('button', { name: 'Matriz mensal' }).click()
  const mx = page.getByRole('grid', { name: 'Matriz mensal 2027-01' })
  await mx.waitFor({ timeout: 20000 })
  assert.equal(await mx.locator('tbody tr[data-row]').count(), 12)
  assert.equal(await mx.locator('tbody tr[data-row="A-01"] td[role="gridcell"]').count(), 31)
  await page.locator('tr[data-foot="F"]').waitFor()
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'matriz-mensal.png'), fullPage: true })
  const [dlx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar matriz XLSX' }).click()])
  assert.match(dlx.suggestedFilename(), /^matriz-mensal-2027-01\.xlsx$/)
  assert.equal(fs.readFileSync(await dlx.path()).subarray(0, 2).toString(), 'PK')
  const [dlc] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar matriz CSV' }).click()])
  const mcsv = fs.readFileSync(await dlc.path(), 'utf8').replace(/^\uFEFF/, '').trim().split('\n')
  assert.match(mcsv[0], /^pessoa;turma;cargo;01 sex/)
  assert.ok(mcsv.some((l) => l.startsWith('em folga;')))
  step('matriz mensal 12 pessoas × 31 dias, export XLSX + CSV')
  await page.getByRole('button', { name: 'Por turno' }).click()
  await page.getByTestId('visao-por-turno').waitFor()
  await page.getByRole('region', { name: 'Turno N' }).waitFor()
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'visao-por-turno.png'), fullPage: true })
  await page.getByRole('button', { name: 'Pessoa', exact: true }).click()
  await page.getByRole('table', { name: /Calendário de A-01 em 2027-01/ }).waitFor()
  step('visões "Por turno" e "Pessoa"')

  // v3.5: padrão personalizado com K = 5 (construtor) → quadro de turnos
  await page.goto(page.url().replace(/cenarios\/.*$/, 'cenarios/novo?passo=1'))
  await page.getByLabel('Nome do cenário').fill('Custom K5')
  await page.getByLabel('Data inicial do horizonte').fill('2027-01-04')
  await page.getByRole('combobox', { name: 'Regime' }).selectOption('CLT_44H_ATUAL')
  await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByLabel('Nome do posto').fill('Operador K5')
  await page.getByLabel('Postos simultâneos (todas as horas)').fill('3')
  await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByTestId('modelo-4X3').waitFor()
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'catalogo.png'), fullPage: true })
  await page.getByRole('button', { name: 'Começar do zero' }).click()
  await page.getByTestId('construtor').waitFor()
  await page.getByLabel('K (turmas)').fill('5')
  await page.getByText('100,0%').first().waitFor({ timeout: 20000 })
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'construtor.png'), fullPage: true })
  step('construtor: K=5, pré-visualização 100%')
  await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByText(/Personalizado “Padrão personalizado” · 5 turmas/).waitFor()
  await page.getByRole('button', { name: 'Simular cobertura' }).click()
  await page.getByText(/100,0% das horas-posto cobertas/).waitFor({ timeout: 30000 }).catch(async (e) => {
    console.error((await page.locator('main, body').first().innerText()).slice(0, 1500))
    throw e
  })
  await page.getByRole('tab', { name: 'Quadro de turnos' }).click()
  const gantt = page.getByRole('table', { name: /Gantt de turnos/ })
  await gantt.waitFor()
  assert.equal(await gantt.locator('tbody tr').count(), 5)
  await page.getByRole('button', { name: 'Calendário turma × dia' }).click()
  await page.getByRole('button', { name: 'Gantt por dia' }).click()
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'quadro-turnos.png'), fullPage: true })
  step('padrão personalizado K=5 → quadro de turnos com 5 turmas')

  // v3.6: escala com sobreposição de passagem (6x2 06–14:20 / 14–22:20 / 22–06:20)
  await page.goto(page.url().replace(/cenarios\/.*$/, 'cenarios/novo?passo=1'))
  await page.getByLabel('Nome do cenário').fill('6x2 com passagem')
  await page.getByLabel('Regras (CCT/ACT)').selectOption('ACT')
  await page.getByLabel('Data inicial do horizonte').fill('2027-01-04')
  await page.getByLabel(/autoriza 8 h/).check()
  await page.getByRole('combobox', { name: 'Regime' }).selectOption('CLT_44H_ATUAL')
  await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByLabel('Nome do posto').fill('Operador passagem')
  await page.getByLabel('Postos simultâneos (todas as horas)').fill('3')
  await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByTestId('modelo-6X2_PASSAGEM').click()
  await page.getByLabel('Nº de turmas (K)').fill('4')
  await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByRole('button', { name: 'Simular cobertura' }).click()
  await page.getByRole('grid', { name: /Cobertura 7×24/ }).waitFor({ timeout: 30000 })
  await page.getByText(/100,0% das horas-posto cobertas/).waitFor()
  assert.equal(await page.locator('[data-kind="passagem"]').count(), 21)
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'sobreposicao.png'), fullPage: true })
  step('sobreposição: 21 h/semana de passagem planejada (não excesso)')

  await browser.close()
  console.log('E2E fluxo 4.1: OK')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() =>
    procs.forEach((p) => {
      try {
        process.kill(-p.pid, 'SIGTERM') // grupo inteiro (npx → vite)
      } catch {
        /* já encerrado */
      }
    }),
  )
