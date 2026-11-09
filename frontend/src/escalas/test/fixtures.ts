import type { CoverageSlot, FindingOut, LegalRegimeOut, ScheduleModelOut, AssignmentOut } from '../api/client'

export function slots(fn: (i: number) => Partial<CoverageSlot> = () => ({})): CoverageSlot[] {
  return Array.from({ length: 168 }, (_, i) => ({
    slot_index: i,
    weekday: Math.floor(i / 24) + 1,
    start: `${String(i % 24).padStart(2, '0')}:00`,
    required_net: '3.000000',
    required_gross: '3.000000',
    scheduled_worst: '3.000000',
    scheduled_mean: '3.000000',
    expected_worst: '3.000000',
    break_gap: '0.000000',
    deficit_occurrences: 0,
    gap: '0.000000',
    status: 'exata',
    ...fn(i),
  }))
}

const reg = (code: string, name: string, h: string, status = 'vigente'): LegalRegimeOut => ({
  code, version: 1, name, status, valid_from: null, valid_to: null, anchor: null, anchor_offset_from: null, anchor_offset_to: null,
  weekly_hours_max: h, daily_hours_max: '8.000000', min_rest_days_per_week: '1.000000', rest_days_criterion: 'x', allows_6x1: code === 'CLT_44H_ATUAL',
  allows_compensation_agreement: true, special_regimes: {}, legal_reference: 'CF art. 7º', assumption_note: null, resolved_valid_from: null, resolved_valid_to: null,
})
export const REGIMES: LegalRegimeOut[] = [reg('CLT_44H_ATUAL', 'CLT 44 h', '44.000000'), reg('TRANSICAO_42H', '42 h', '42.000000', 'premissa'), reg('PEC_40H', '40 h', '40.000000', 'premissa')]

const model = (code: string, name: string, k: string, st: Record<string, string>, extra: Partial<ScheduleModelOut> = {}): ScheduleModelOut => ({
  code, name, work_days: 6, off_days: 2, cycle_length_days: 8, typical_teams: [4], calendar_cycle_days: 56, daily_hours: '8.000000', avg_weekly_hours: '42.000000',
  is_continuous_24x7: true, is_rotating: true, requires_agreement: false, catalog_group: 'continuo', shifts_per_day: 3, teams_24x7: k, exact_24x7: true,
  exact_alternative: null, legal_status: 'ok', phase: 'mvp', regime_compliance: Object.fromEntries(Object.entries(st).map(([r, s]) => [r, { status: s }])) as unknown as ScheduleModelOut['regime_compliance'], ...extra,
})
export const MODELS: ScheduleModelOut[] = [
  model('6X2', '6x2', '4.000000', { CLT_44H_ATUAL: 'conforme', TRANSICAO_42H: 'conforme', PEC_40H: 'nao_conforme' }),
  model('4X2', '4x2', '4.500000', { CLT_44H_ATUAL: 'conforme', TRANSICAO_42H: 'conforme', PEC_40H: 'conforme' }),
  model('6X1_BASE', '6x1 (baseline)', '3.500000', { CLT_44H_ATUAL: 'nao_conforme', TRANSICAO_42H: 'nao_conforme', PEC_40H: 'nao_conforme' }),
  model('2X2_12H', '2x2 12 h', '4.000000', { CLT_44H_ATUAL: 'so_com_act', TRANSICAO_42H: 'so_com_act', PEC_40H: 'nao_conforme' }, { shifts_per_day: 2 }),
]

export function assignments(teams = ['A', 'B', 'C', 'D'], days = 56, start = '2027-01-04'): AssignmentOut[] {
  const out: AssignmentOut[] = []
  teams.forEach((t, ti) => {
    for (let d = 0; d < days; d++) {
      const dt = new Date(`${start}T12:00:00Z`)
      dt.setUTCDate(dt.getUTCDate() + d)
      const iso = dt.toISOString().slice(0, 10)
      const pos = (d + ti * 2) % 8
      const off = pos >= 6
      const code = ['M', 'M', 'T', 'T', 'N', 'N'][pos] ?? null
      out.push({ team: t, work_date: iso, shift_code: off ? null : code, is_day_off: off, starts_at: null, ends_at: null, clock_minutes: off ? 0 : 480 })
    }
  })
  return out
}

export const FINDINGS: FindingOut[] = [
  { id: 'f1', rule_code: 'CLT_JORNADA_DIARIA', severity: 'alerta', legal_reference: 'CLT art. 58', team: 'C', employee_id: null, occurs_on: '2027-01-20', message: 'Jornada noturna computada de 9,14 h', details: {}, waived: false },
  { id: 'f2', rule_code: 'COB_TURMAS_INSUFICIENTES', severity: 'erro', legal_reference: 'FR-08', team: null, employee_id: null, occurs_on: null, message: '4 turmas < 4,5 necessárias', details: {}, waived: false },
  { id: 'f3', rule_code: 'INFO_REGIME_PREMISSA', severity: 'info', legal_reference: '01 §8.1', team: null, employee_id: null, occurs_on: null, message: 'Premissa', details: {}, waived: false },
]
