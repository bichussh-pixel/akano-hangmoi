export interface PricingInputs {
  factoryCny: number
  weightKg: number
  domesticFreightCny: number
  inspectionCny: number
  qtyPerBox: number
}
export interface DailyRates {
  fxRate: number
  intlFreightPerKg: number
  exportTaxPct: number
  importTaxPct: number
}
export function calculateLandedCost(inputs: PricingInputs, rates: DailyRates) {
  const { factoryCny, weightKg, domesticFreightCny, inspectionCny, qtyPerBox } = inputs
  const { fxRate, intlFreightPerKg, exportTaxPct, importTaxPct } = rates
  const factoryVND = factoryCny * fxRate
  const exportTaxAmt = factoryVND * exportTaxPct / 100
  const intlFreightAmt = intlFreightPerKg * weightKg
  const importTaxBase = factoryVND + exportTaxAmt + intlFreightAmt
  const importTaxAmt = importTaxBase * importTaxPct / 100
  const domesticVND = domesticFreightCny * fxRate
  const inspectionVND = inspectionCny * fxRate
  const totalPerUnit = factoryVND + exportTaxAmt + intlFreightAmt + importTaxAmt + domesticVND + inspectionVND
  const totalPerBox = totalPerUnit * qtyPerBox
  return {
    totalPerUnit: Math.round(totalPerUnit),
    totalPerBox: Math.round(totalPerBox),
    breakdown: {
      factoryVND: Math.round(factoryVND),
      exportTaxAmt: Math.round(exportTaxAmt),
      intlFreightAmt: Math.round(intlFreightAmt),
      importTaxAmt: Math.round(importTaxAmt),
      domesticVND: Math.round(domesticVND),
      inspectionVND: Math.round(inspectionVND),
    },
  }
}
