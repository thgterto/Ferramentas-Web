import { z } from 'zod'

const int = (min: number, max: number, label: string) =>
  z.number({ invalid_type_error: `${label}: informe um número` }).int(`${label}: use número inteiro`).min(min, `${label}: mínimo ${min}`).max(max, `${label}: máximo ${max}`)

const pctField = (label: string) =>
  z.number({ invalid_type_error: `${label}: informe um número` }).min(0, `${label}: mínimo 0%`).lt(60, `${label}: deve ser menor que 60%`)

export const step1 = z.object({
  scenarioName: z.string().trim().min(2, 'Nome do cenário: mínimo 2 caracteres').max(200),
  agreementKind: z.enum(['CLT_PADRAO', 'CCT', 'ACT']),
  allows8h: z.boolean(),
  horizonStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial obrigatória'),
  horizonWeeks: int(1, 8, 'Horizonte (semanas)'),
  legalMode: z.enum(['regime', 'data']),
  legalRegimeCode: z.string(),
  legalReferenceDate: z.string(),
  compensation: z.boolean(),
  simulateTransition: z.boolean(),
})

export const step2 = z.object({
  positionName: z.string().trim().min(2, 'Nome do posto: mínimo 2 caracteres'),
  demandMode: z.enum(['fixos', 'curva']),
  postos: int(0, 500, 'Postos'),
  curve: z.array(z.number({ invalid_type_error: 'inteiro ≥ 0' }).int('inteiro ≥ 0').min(0, 'inteiro ≥ 0')).length(168),
})

export const roleRow = z.object({
  code: z.string().trim().regex(/^[A-Z0-9_]{1,24}$/, 'Código: MAIÚSCULAS, dígitos e _'),
  name: z.string().trim().min(1, 'Nome obrigatório'),
  perTeam: int(0, 500, 'Pessoas por turma'),
})

export const step3 = z.object({
  shrinkDay: pctField('Shrinkage diurno'),
  shrinkNight: pctField('Shrinkage noturno'),
  reserve: z.enum(['extras', 'nenhuma']),
  extrasPerTeam: int(0, 50, 'Pessoas extras por turma'),
  roles: z.array(roleRow).max(10),
  subs: z.array(z.object({ from: z.string().min(1, 'Escolha o cargo'), to: z.string().min(1, 'Escolha o cargo') })).max(20),
  minimums: z.array(z.object({ role: z.string().min(1, 'Escolha o cargo'), min: int(1, 50, 'Mínimo') })).max(10),
})

export const step4 = z.object({
  modelCode: z.string().min(1, 'Escolha um modelo de escala ou personalize'),
  teamCount: int(1, 60, 'Nº de turmas'),
  kMode: z.enum(['fixo', 'minimo', 'faixa', 'sugerir']),
  kMin: int(1, 60, 'K mínimo'),
  kMax: int(1, 60, 'K máximo'),
  teamSizes: z.array(z.number().positive('Pessoas por turma > 0')).max(60),
  shiftCodes: z.array(z.string()),
  customized: z.boolean(),
  // padrão do construtor (PatternSpec) — validado pelo backend (/schedule-patterns:validate)
  pattern: z.any().nullable(),
})

export const wizardSchema = step1
  .merge(step2)
  .merge(step3)
  .merge(step4)
  .superRefine((v, ctx) => {
    if (v.legalMode === 'regime' && !v.legalRegimeCode) ctx.addIssue({ code: 'custom', path: ['legalRegimeCode'], message: 'Escolha o regime' })
    if (v.legalMode === 'data' && !/^\d{4}-\d{2}-\d{2}$/.test(v.legalReferenceDate))
      ctx.addIssue({ code: 'custom', path: ['legalReferenceDate'], message: 'Informe a data de referência' })
    if (v.kMode === 'faixa' && v.kMin > v.kMax) ctx.addIssue({ code: 'custom', path: ['kMax'], message: 'K máximo deve ser ≥ K mínimo' })
    if (v.customized && !v.pattern) ctx.addIssue({ code: 'custom', path: ['modelCode'], message: 'Abra o construtor para definir o padrão' })
    if (v.demandMode === 'fixos' && v.postos < 1) ctx.addIssue({ code: 'custom', path: ['postos'], message: 'Informe ao menos 1 posto' })
    if (v.demandMode === 'curva' && !v.curve.some((x) => x > 0)) ctx.addIssue({ code: 'custom', path: ['curve'], message: 'A grade precisa de ao menos uma hora com demanda > 0' })
    const codes = v.roles.map((r) => r.code)
    codes.forEach((c, i) => {
      if (codes.indexOf(c) !== i) ctx.addIssue({ code: 'custom', path: ['roles', i, 'code'], message: 'Código repetido' })
    })
    v.subs.forEach((s, i) => {
      if (s.from && s.from === s.to) ctx.addIssue({ code: 'custom', path: ['subs', i, 'to'], message: 'Um cargo não substitui a si mesmo' })
    })
  })

export type WizardValues = z.infer<typeof wizardSchema>

export const STEP_FIELDS: (keyof WizardValues)[][] = [
  Object.keys(step1.shape) as (keyof WizardValues)[],
  Object.keys(step2.shape) as (keyof WizardValues)[],
  Object.keys(step3.shape) as (keyof WizardValues)[],
  Object.keys(step4.shape) as (keyof WizardValues)[],
  [],
]

export const STEP_TITLES = ['Operação e regras', 'Demanda', 'Shrinkage e reserva', 'Modelo e turmas', 'Revisão e simular']

function nextMonday(from = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7))
  return d.toISOString().slice(0, 10)
}

export function defaultValues(): WizardValues {
  return {
    scenarioName: 'Novo cenário',
    agreementKind: 'CLT_PADRAO',
    allows8h: false,
    horizonStart: nextMonday(),
    horizonWeeks: 8,
    legalMode: 'regime',
    legalRegimeCode: 'CLT_44H_ATUAL',
    legalReferenceDate: '',
    compensation: false,
    simulateTransition: false,
    positionName: 'Operador',
    demandMode: 'fixos',
    postos: 3,
    curve: Array.from({ length: 168 }, () => 3),
    shrinkDay: 0,
    shrinkNight: 0,
    reserve: 'nenhuma',
    extrasPerTeam: 0,
    roles: [],
    subs: [],
    minimums: [],
    modelCode: '',
    teamCount: 1,
    kMode: 'fixo',
    kMin: 1,
    kMax: 12,
    teamSizes: [],
    shiftCodes: [],
    customized: false,
    pattern: null,
  }
}

/** Parse de CSV/TXT de demanda: 168 linhas (formato longo, último campo numérico) ou 7×24. */
export function parseDemandCsv(text: string): { values?: number[]; errors: string[] } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const rows = lines.map((l) => l.split(/[;,\t]/).map((c) => c.trim()))
  const isNum = (c: string) => /^-?\d+([.,]\d+)?$/.test(c)
  const body = rows.length && !rows[0].some(isNum) ? rows.slice(1) : rows
  const errors: string[] = []
  let values: number[] = []
  if (body.length === 168) {
    values = body.map((r, i) => {
      const c = r[r.length - 1]
      if (!isNum(c)) errors.push(`linha ${i + 1}: valor não numérico "${c}"`)
      return Number(c.replace(',', '.'))
    })
  } else if (body.length === 7) {
    body.forEach((r, i) => {
      const cells = r.filter((c, j) => !(j === 0 && !isNum(c)))
      if (cells.length !== 24) errors.push(`linha ${i + 1}: esperado 24 colunas, recebido ${cells.length}`)
      cells.forEach((c) => {
        if (!isNum(c)) errors.push(`linha ${i + 1}: valor não numérico "${c}"`)
        values.push(Number(c.replace(',', '.')))
      })
    })
  } else {
    errors.push(`esperado 168 linhas (formato longo) ou 7×24; recebido ${body.length} linhas`)
  }
  values.forEach((v, i) => {
    if (Number.isFinite(v) && (v < 0 || !Number.isInteger(v))) errors.push(`posição ${i + 1}: use inteiro ≥ 0`)
  })
  return errors.length ? { errors } : { values, errors }
}
