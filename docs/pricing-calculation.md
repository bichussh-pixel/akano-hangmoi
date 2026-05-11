# Công thức tính giá nhập (Landed Cost)

## Tổng quan

File: `lib/calc.ts` — `calculateLandedCost(inputs, rates, freightType)`

Tính toán **giá nhập thực tế/chiếc** dựa trên giá xuất xưởng TQ, các loại thuế, cước vận chuyển quốc tế và nội địa.

---

## Inputs (PricingInputs)

| Field | Đơn vị | Bắt buộc | Mô tả |
|-------|---------|----------|-------|
| `factoryCny` | CNY/chiếc | ✅ | Giá xuất xưởng TQ |
| `weightKg` | kg/chiếc | — | Cân nặng (hiện chưa dùng trong công thức chính) |
| `volumeM3` | m³/chiếc | ✅ | Thể tích — dùng tính cước QT |
| `domesticFreightCny` | CNY/chiếc | — | Cước nội địa TQ |
| `inspectionVnd` | VND/chiếc | — | Phí kiểm định (nhập thẳng VND) |
| `inspectionCny` | CNY/chiếc | — | Phí kiểm định (legacy, nhân với fxRate) |
| `quarantineCny` | CNY/chiếc | — | Phí kiểm dịch |
| `qtyPerBox` | chiếc/thùng | ✅ | Số lượng/thùng |

---

## Rates (DailyRates)

Lấy từ bảng `dailyRates/{YYYY-MM-DD}` trên Firebase, do ADMIN/LEADER_PM cập nhật hằng ngày.

| Field | Đơn vị | Mô tả |
|-------|---------|-------|
| `fxRate` | VND/CNY | Tỷ giá |
| `intlFreightNguyenXe` | VND/m³ | Cước Nguyên Xe |
| `intlFreightGhepXe` | VND/m³ | Cước Ghép Xe |
| `intlFreightPerKg` | VND/kg | Legacy (fallback) |
| `exportTaxPct` | % | Thuế xuất khẩu |
| `importTaxPct` | % | Thuế nhập khẩu |

---

## Loại vận chuyển (freightType)

| Giá trị | Mô tả | Rate dùng |
|---------|-------|----------|
| `nguyen_xe` | Thuê nguyên xe container | `intlFreightNguyenXe` |
| `ghep_xe` | Ghép hàng vào xe chung | `intlFreightGhepXe` |
| `default` | Tự động chọn theo dữ liệu | `intlFreightNguyenXe` nếu có, ngược lại fallback |

---

## Công thức

```
factoryVND      = factoryCny × fxRate

exportTaxAmt    = factoryVND × exportTaxPct / 100

intlFreightAmt  = intlFreightPerM3 × volumeM3
                  (intlFreightPerM3 chọn theo freightType)

importTaxBase   = factoryVND + exportTaxAmt + intlFreightAmt
importTaxAmt    = importTaxBase × importTaxPct / 100

domesticVND     = domesticFreightCny × fxRate

inspectionVND   = inspectionVnd + (inspectionCny × fxRate)
quarantineVND   = quarantineCny × fxRate

totalPerUnit    = factoryVND + exportTaxAmt + intlFreightAmt
                + importTaxAmt + domesticVND
                + inspectionVND + quarantineVND

totalPerBox     = totalPerUnit × qtyPerBox
```

---

## Ví dụ tính toán

**Thông số đầu vào:**
- Giá xuất xưởng: 50 CNY/chiếc
- Thể tích: 0.005 m³/chiếc
- Cước nội địa TQ: 2 CNY/chiếc
- Số lượng/thùng: 10 chiếc

**Tỷ giá ngày:**
- fxRate: 3,500 VND/CNY
- Cước Nguyên Xe: 3,000,000 VND/m³
- Thuế xuất: 0%
- Thuế nhập: 8%

**Tính toán:**
```
factoryVND      = 50 × 3,500            = 175,000đ
exportTaxAmt    = 175,000 × 0%          = 0đ
intlFreightAmt  = 3,000,000 × 0.005     = 15,000đ
importTaxBase   = 175,000 + 0 + 15,000  = 190,000đ
importTaxAmt    = 190,000 × 8%          = 15,200đ
domesticVND     = 2 × 3,500             = 7,000đ

totalPerUnit    = 175,000 + 0 + 15,000 + 15,200 + 7,000
               = 212,200đ/chiếc

totalPerBox     = 212,200 × 10          = 2,122,000đ/thùng
```

---

## Gợi ý giá nhập mục tiêu

Khi xem thông tin sản phẩm, hệ thống tự tính **khoảng giá nhập dự kiến** để NVMH tham khảo:

```
min = (marketPrice × 45%) × 0.83 / 1.08
max = (marketPrice × 60%) × 0.83 / 1.08
```

*Ý nghĩa: Giá nhập nên nằm trong khoảng 45–60% giá thị trường, sau khi chiết khấu 17% và cộng VAT 8%.*
