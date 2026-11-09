export type ComplianceStatus = 'conforme' | 'so_com_act' | 'regime_especial' | 'nao_conforme' | 'baseline'
const KNOWN: ComplianceStatus[] = ['conforme', 'so_com_act', 'regime_especial', 'nao_conforme', 'baseline']

/** Resolve o status exibido: o texto vem da API (`regime_compliance`); 6X1 fora do 44 h = baseline. */
export function statusFor(modelCode: string, regime: string, compliance: Record<string, unknown> | undefined): ComplianceStatus {
  if (modelCode === '6X1_BASE' && regime !== 'CLT_44H_ATUAL') return 'baseline'
  const entry = (compliance?.[regime] ?? compliance?.['*']) as { status?: string } | undefined
  const s = entry?.status
  return s && KNOWN.includes(s as ComplianceStatus) ? (s as ComplianceStatus) : 'conforme'
}
