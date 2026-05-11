# Công thức tính giá nhập (Landed Cost)

## Tổng quan

File: `lib/calc.ts` — `calculateLandedCost(inputs, rates, freightType)`

Tính toán **giá nhập thực tế/chiếc** dựa trên giá xuất xưởng TQ, các loại thuế, cước vận chuyển quốc tế và nội địa.

---

## Inputs (PricingInputs)

| Field | Đơn vị | Bắt buộc | Mô tả |
|-------|---------|----------|-------|
| `factoryCny` | CNY/chiếc | ✅ | Giá xuất xưởng TQ |
| `weightKg` | kg/chiếc | — | Cân nặng |
| `volumeM3` | m³/chiếc | ✅ | Thể tích — dùng tính cước QT |
| `domesticFreightCny` | CNY/chiếc | — | Cước nội địa TQ |
| `inspectionVnd` | VND/chiếc | — | Phí kiểm định (nhập thẳng VND) |
| `inspectionCny` | CNY/chiếc | — | Phí kiểm định (legacy) |
| `quarantineCny` | CNY/chiếc | — | Phí kiểm dịch |
| `qtyPerBox` | chiếc/thùng | ✅ | Số lượng/thùng |

---

## Rates (DailyRates)

| Field | Đơn vị | Mô tả |
|-------|---------|-------|
| `fxRate` | VND/CNY | Tỷ giá |
| `intlFreightNguyenXe` | VND/m³ | Cước Nguyên Xe |
| `intlFreightGhepXe` | VND/m³ | Cước Ghép Xe |
| `exportTaxPct` | % | Thuế xuất khẩu |
| `importTaxPct` | % | Thuế nhập khẩu |

---

## Loại vận chuyển

| freightType | Mô tả | Rate dùng |
|-------------|-------|----------|
| `nguyen_xe` | Thuê nguyên xe container | `intlFreightNguyenXe` |
| `ghep_xe` | Ghép hàng vào xe chung | `intlFreightGhepXe` |
| `default` | Tự động | `intlFreightNguyenXe` nếu có |

---

## Công thức

```
factoryVND      = factoryCny × fxRate
exportTaxAmt    = factoryVND × exportTaxPct / 100
intlFreightAmt  = intlFreightPerM3 × volumeM3
importTaxBase   = factoryVND + exportTaxAmt + intlFreightAmt
importTaxAmt    = importTaxBase × importTaxPct / 100
domesticVND     = domesticFreightCny × fxRate
inspectionVND   = inspectionVnd + (inspectionCny × fxRate)
quarantineVND   = quarantineCny × fxRate

totalPerUnit    = factoryVND + exportTaxAmt + intlFreightAmt
                + importTaxAmt + domesticVND + inspectionVND + quarantineVND

totalPerBox     = totalPerUnit × qtyPerBox
```

---

## Ví dụ

```
factoryCny = 50 CNY, volumeM3 = 0.005 m³, domesticFreightCny = 2 CNY
fxRate = 3,500, intlFreightNguyenXe = 3,000,000 VND/m³
exportTaxPct = 0%, importTaxPct = 8%, qtyPerBox = 10

factoryVND     = 50 × 3,500         = 175,000đ
exportTaxAmt   = 0
intlFreightAmt = 3,000,000 × 0.005  = 15,000đ
importTaxAmt   = 190,000 × 8%       = 15,200đ
domesticVND    = 2 × 3,500          = 7,000đ

totalPerUnit   = 212,200đ/chiếc
totalPerBox    = 2,122,000đ/thùng
```

---

## Gợi ý giá nhập mục tiêu

```
min = (marketPrice × 45%) × 0.83 / 1.08
max = (marketPrice × 60%) × 0.83 / 1.08
```
