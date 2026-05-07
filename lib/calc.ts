export interface PricingInputs {
  factoryCny: number
  weightKg: number
  volumeM3: number               // số khối — dùng để tính cước quốc tế
  domesticFreightCny: number
  inspectionCny: number
  qtyPerBox: number
}
export interface DailyRates {
  fxRate: number
  intlFreightPerKg: number       // legacy (không dùng nếu có giá VND/m³)
  intlFreightNguyenXe?: number   // Cước Nguyên Xe (VND/m³)
  intlFreightGhepXe?: number     // Cước Ghép Xe (VND/m³)
  exportTaxPct: number
  importTaxPct: number
}
export function calculateLandedCost(
  inputs: PricingInputs,
  rates: DailyRates,
  freightType: 'nguyen_xe' | 'ghep_xe' | 'default' = 'default'
) {
  const { factoryCny, volumeM3, domesticFreightCny, inspectionCny, qtyPerBox } = inputs
  const { fxRate, exportTaxPct, importTaxPct } = rates

  // Pick freight rate (VND/m³) based on selected type
  let intlFreightPerM3 = rates.intlFreightPerKg  // legacy fallback
  if (freightType === 'nguyen_xe' && rates.intlFreightNguyenXe != null) {
    intlFreightPerM3 = rates.intlFreightNguyenXe
  } else if (freightType === 'ghep_xe' && rates.intlFreightGhepXe != null) {
    intlFreightPerM3 = rates.intlFreightGhepXe
  } else if (rates.intlFreightNguyenXe != null) {
    intlFreightPerM3 = rates.intlFreightNguyenXe
  }

  const factoryVND = factoryCny * fxRate
  const exportTaxAmt = factoryVND * exportTaxPct / 100
  const intlFreightAmt = intlFreightPerM3 * volumeM3   // tính theo m³
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
