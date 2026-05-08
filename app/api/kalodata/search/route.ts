import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

function passesFilter(p: any): boolean {
  const ALLOWED_CATS = ['gia dụng', 'thể thao', 'tiện ích', 'sắp xếp']

  const BLOCKED_CATS = [
    'hóa chất', 'tinh dầu', 'nước hoa', 'mỹ phẩm',
    'thời trang', 'quần áo', 'trang phục', 'giày dép',
    'túi xách', 'phụ kiện thời trang', 'hóa phẩm', 'tẩy rửa',
  ]

  // Block by product name regardless of category
  const BLOCKED_NAMES = [
    // Chất tẩy rửa
    'bột giặt', 'nước giặt', 'nước rửa chén', 'nước lau', 'tẩy rửa',
    'chất tẩy', 'tẩy trắng', 'xà phòng', 'xà bông', 'nước xả vải',
    'nước tẩy', 'kem giặt', 'viên giặt', 'gel giặt',
    // Quần áo, thời trang
    'áo thun', 'áo sơ mi', 'áo polo', 'áo khoác', 'áo len',
    'quần jean', 'quần short', 'quần tây', 'quần kaki',
    'váy đầm', 'đầm maxi', 'chân váy', 'set đồ',
    'giày thể thao', 'giày cao gót', 'sandal', 'dép lào', 'sneaker',
    // Mỹ phẩm, dưỡng da
    'kem dưỡng', 'serum', 'son môi', 'phấn nền', 'mascara',
    'kem chống nắng', 'sữa rửa mặt', 'tẩy tế bào', 'mặt nạ dưỡng',
  ]

  const cat  = (p.category_name || p.category || '').toLowerCase()
  const name = (p.name || '').toLowerCase()

  const inAllowed   = ALLOWED_CATS.some(c => cat.includes(c))
  const catBlocked  = BLOCKED_CATS.some(c => cat.includes(c))
  const nameBlocked = BLOCKED_NAMES.some(k => name.includes(k))

  const price = p.market_price || p.price || 0
  return inAllowed && !catBlocked && !nameBlocked && price >= 5000 && price <= 150000
}

// Composite score: ưu tiên DS cao + tăng trưởng cao
function score(p: any) {
  return (p.sales30d || 0) * (1 + (p.growth || 0) / 100)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const page = body.page || 1
  const pageSize = 20

  const apiKey = process.env.KALODATA_SECRET_KEY
  if (!apiKey) {
    const all = getMockProducts()
    const start = (page - 1) * pageSize
    return NextResponse.json({
      products: all.slice(start, start + pageSize),
      total: all.length,
      page,
      mock: true,
    })
  }

  try {
    const res = await fetch('https://openapi.kalodata.com/openapi/v1/product/rank', {
      method: 'POST',
      headers: { 'secret-key': apiKey, 'content-type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({
        region: 'VN', language: 'vi-VN', currency: 'VND',
        date_range: body.dateRange || 'last30Day',
        sort: { field: 'sold_count', type: 'DESC' },
        page_number: page,
        page_size: pageSize,
      }),
    })
    const data = await res.json()
    const products = (data.data || []).filter(passesFilter)
    return NextResponse.json({ products, total: data.total || products.length, page })
  } catch {
    const all = getMockProducts()
    return NextResponse.json({ products: all.slice(0, pageSize), total: all.length, page, mock: true })
  }
}

// Ảnh sản phẩm — dùng Unsplash IDs đã kiểm tra (fallback 📦 nếu lỗi)
const U = 'https://images.unsplash.com'
const IMGS: Record<string, string> = {
  storage:   `${U}/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop`,
  kitchen:   `${U}/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop`,
  bottle:    `${U}/photo-1602143407151-7111542de6e8?w=200&h=200&fit=crop`,
  phone:     `${U}/photo-1512941937669-90a1b58e7e9c?w=200&h=200&fit=crop`,
  clean:     `${U}/photo-1563453392212-326f5e854473?w=200&h=200&fit=crop`,
  bike:      `${U}/photo-1576435728678-68d0fbf94e91?w=200&h=200&fit=crop`,
  health:    `${U}/photo-1584634731339-252c581abfc5?w=200&h=200&fit=crop`,
  bathroom:  `${U}/photo-1552321554-5fefe8c9ef14?w=200&h=200&fit=crop`,
  cable:     `${U}/photo-1586810724476-c294fb7ac01b?w=200&h=200&fit=crop`,
  fan:       `${U}/photo-1558618047-3c8c76ca0063?w=200&h=200&fit=crop`,
  food:      `${U}/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop`,
  pet:       `${U}/photo-1512425439-2d0a24c84fca?w=200&h=200&fit=crop`,
  tool:      `${U}/photo-1581093458791-9d00e3a5db0b?w=200&h=200&fit=crop`,
  desk:      `${U}/photo-1484154218962-a197022b5858?w=200&h=200&fit=crop`,
}

// Link TikTok tìm kiếm sản phẩm (sẽ là link trực tiếp khi dùng Kalodata thật)
function tiktok(q: string) {
  return `https://www.tiktok.com/search?q=${encodeURIComponent(q)}&type=item`
}
// Link Kalodata tìm kiếm
function kalo(q: string) {
  return `https://kalodata.com/vn/product/search?keyword=${encodeURIComponent(q)}&region=VN`
}

function getMockProducts() {
  const raw = [
    { id:'k1',  name:'Dây buộc đồ đa năng silicon reusable set 10 cái',    imageUrl:IMGS.cable,    market_price:15000,  sales30d:125000, growth:315.2, sellerCount:892,  category:'Tiện ích',    description:'Chất liệu: Silicon cao cấp. Kích thước: 30×1.5cm. Cân nặng: 30g.',           shopName:'EcoLife Store' },
    { id:'k2',  name:'Hộp đựng khẩu trang chống bụi nắp flip',             imageUrl:IMGS.health,   market_price:12000,  sales30d:89000,  growth:201.8, sellerCount:543,  category:'Tiện ích',    description:'Chất liệu: Nhựa PP cao cấp. Kích thước: 20×10×8cm.',                         shopName:'HealthBox VN' },
    { id:'k3',  name:'Giá đỡ điện thoại xe máy silicon chống rung',         imageUrl:IMGS.phone,    market_price:55000,  sales30d:67000,  growth:156.3, sellerCount:312,  category:'Tiện ích',    description:'Chất liệu: Nhựa PC + Silicone. Kích thước: 10×7×4cm.',                       shopName:'MotoGear VN' },
    { id:'k4',  name:'Giá để giày 5 tầng gấp gọn đa năng',                 imageUrl:IMGS.storage,  market_price:89000,  sales30d:45230,  growth:127.4, sellerCount:278,  category:'Sắp xếp nhà', description:'Chất liệu: Thép sơn tĩnh điện. Kích thước: 60×30×120cm. Cân nặng: 3.2kg.',  shopName:'HomeStyle VN' },
    { id:'k5',  name:'Kệ treo tường nhà tắm không khoan 3 tầng',            imageUrl:IMGS.bathroom, market_price:95000,  sales30d:28500,  growth:88.3,  sellerCount:198,  category:'Sắp xếp nhà', description:'Chất liệu: Thép không gỉ 304. Kích thước: 40×12×50cm.',                      shopName:'HomePro VN' },
    { id:'k6',  name:'Hộp đựng thực phẩm thuỷ tinh borosilicate nắp tre',  imageUrl:IMGS.kitchen,  market_price:65000,  sales30d:38100,  growth:89.7,  sellerCount:421,  category:'Gia dụng',    description:'Chất liệu: Thuỷ tinh borosilicate. Kích thước: 15×10×8cm. Cân nặng: 450g.',  shopName:'GreenKitchen' },
    { id:'k7',  name:'Chổi quét nhà silicon lông mịn gấp gọn 110cm',       imageUrl:IMGS.clean,    market_price:55000,  sales30d:31000,  growth:72.1,  sellerCount:267,  category:'Gia dụng',    description:'Chất liệu: Silicon + Cán nhôm. Chiều dài: 110cm. Cân nặng: 400g.',            shopName:'CleanHome VN' },
    { id:'k8',  name:'Bộ vá xe đạp mini 16 món xách tay',                  imageUrl:IMGS.bike,     market_price:45000,  sales30d:22000,  growth:44.5,  sellerCount:145,  category:'Thể thao',    description:'Chất liệu: Kim loại cao cấp + Nhựa ABS. Kích thước: 12×8×3cm.',              shopName:'BikeKit Store' },
    { id:'k9',  name:'Bình nước giữ nhiệt inox 316 500ml nắp hút',         imageUrl:IMGS.bottle,   market_price:89000,  sales30d:52000,  growth:184.6, sellerCount:634,  category:'Gia dụng',    description:'Chất liệu: Inox 316 food-grade. Dung tích 500ml. Giữ lạnh 24h, nóng 12h.',   shopName:'ThermoVN Store' },
    { id:'k10', name:'Quạt mini tích điện USB cầm tay 3 tốc độ',            imageUrl:IMGS.fan,      market_price:45000,  sales30d:78000,  growth:223.5, sellerCount:567,  category:'Gia dụng',    description:'Chất liệu: Nhựa ABS + Motor DC. Pin 2000mAh. Nhỏ gọn, tiện mang theo.',       shopName:'CoolFan VN' },
    { id:'k11', name:'Hộp đựng cơm 3 ngăn inox giữ nhiệt có túi',          imageUrl:IMGS.food,     market_price:75000,  sales30d:41000,  growth:138.9, sellerCount:389,  category:'Gia dụng',    description:'Chất liệu: Inox 304 + PP. Dung tích: 1.2L. Giữ nóng 4 giờ.',                 shopName:'LunchBox VN' },
    { id:'k12', name:'Móc dán tường không khoan chịu lực 5kg set 6 cái',    imageUrl:IMGS.bathroom, market_price:25000,  sales30d:96000,  growth:267.3, sellerCount:723,  category:'Sắp xếp nhà', description:'Chất liệu: Nhựa ABS + keo 3M. Kích thước: 5×3cm. Chịu lực: 5kg/móc.',       shopName:'StickHook VN' },
    { id:'k13', name:'Cuộn dây quản lý cáp tự cuộn silicon 1.8m',           imageUrl:IMGS.cable,    market_price:18000,  sales30d:112000, growth:289.4, sellerCount:845,  category:'Tiện ích',    description:'Chất liệu: Silicon dẻo. Dài 1.8m co giãn. Quản lý gọn dây sạc, tai nghe.',   shopName:'CableOrg Store' },
    { id:'k14', name:'Giá đỡ sách đa năng điều chỉnh chiều rộng',           imageUrl:IMGS.desk,     market_price:55000,  sales30d:33000,  growth:95.2,  sellerCount:234,  category:'Sắp xếp nhà', description:'Chất liệu: Thép sơn tĩnh điện. Điều chỉnh 15–35cm. Dùng cho sách, hồ sơ.',  shopName:'DeskPro VN' },
    { id:'k15', name:'Lược chải lông thú cưng tự vệ sinh silicon',          imageUrl:IMGS.pet,      market_price:35000,  sales30d:58000,  growth:176.8, sellerCount:412,  category:'Tiện ích',    description:'Chất liệu: Nhựa ABS + Lông silicon mềm. Nút tự làm sạch lông thú.',          shopName:'PetCare VN' },
    { id:'k16', name:'Hộp đựng trang sức gương 3 tầng xoay 360°',          imageUrl:IMGS.storage,  market_price:85000,  sales30d:27000,  growth:112.4, sellerCount:189,  category:'Sắp xếp nhà', description:'Chất liệu: Nhựa acrylic trong suốt + Kính. Kích thước: 15×15×25cm.',        shopName:'Jewelry Box VN' },
    { id:'k17', name:'Túi đựng giày chống bụi không dệt set 5 cái',         imageUrl:IMGS.storage,  market_price:22000,  sales30d:71000,  growth:198.7, sellerCount:556,  category:'Sắp xếp nhà', description:'Chất liệu: Vải không dệt 80gsm. Kích thước: 35×50cm. Thoáng khí, chống bụi.', shopName:'StoreBag VN' },
    { id:'k18', name:'Bộ dụng cụ làm bếp silicon chịu nhiệt 6 món',        imageUrl:IMGS.kitchen,  market_price:120000, sales30d:19500,  growth:67.3,  sellerCount:167,  category:'Gia dụng',    description:'Chất liệu: Silicon food-grade chịu nhiệt 230°C. Gồm: spatula, muỗng, kẹp...', shopName:'KitchenPro VN' },
    { id:'k19', name:'Đèn ngủ LED cảm ứng sạc USB đổi màu',                imageUrl:IMGS.fan,      market_price:35000,  sales30d:63000,  growth:245.1, sellerCount:478,  category:'Tiện ích',    description:'Chất liệu: Nhựa ABS. 16 màu RGB. Pin 500mAh. Cảm ứng chạm bật/tắt.',         shopName:'LightGlow VN' },
    { id:'k20', name:'Bộ dây chun tập thể dục resistance band 5 cấp',       imageUrl:IMGS.bike,     market_price:65000,  sales30d:44000,  growth:153.2, sellerCount:323,  category:'Thể thao',    description:'Chất liệu: Latex thiên nhiên. 5 mức lực: 5–25kg. Dài 200cm.',                shopName:'FitBand Store' },
  ]

  // Thêm shopUrl + kaloUrl rồi sắp xếp: DS*tăng_trưởng giảm dần
  return raw
    .map(p => ({
      ...p,
      shopUrl: tiktok(p.name),
      kaloUrl: kalo(p.name),
    }))
    .sort((a, b) => score(b) - score(a))
}
