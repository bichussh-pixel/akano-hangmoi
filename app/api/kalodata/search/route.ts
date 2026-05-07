import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

function passesFilter(p: any): boolean {
  const allowed = ['gia dụng', 'thể thao', 'tiện ích', 'sắp xếp']
  const blocked = ['hóa chất', 'tinh dầu', 'nước hoa', 'mỹ phẩm']
  const cat = (p.category_name || p.category || '').toLowerCase()
  const inAllowed = allowed.some(c => cat.includes(c))
  const isBlocked = blocked.some(c => cat.includes(c))
  const price = p.market_price || p.price || 0
  return inAllowed && !isBlocked && price >= 5000 && price <= 150000
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const apiKey = process.env.KALODATA_SECRET_KEY
  if (!apiKey) {
    return NextResponse.json({ products: getMockProducts(body), total: 8, mock: true })
  }

  try {
    const res = await fetch('https://openapi.kalodata.com/openapi/v1/product/rank', {
      method: 'POST',
      headers: { 'secret-key': apiKey, 'content-type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({
        region: 'VN', language: 'vi-VN', currency: 'VND',
        date_range: body.dateRange || 'last30Day',
        sort: { field: 'revenue_growth_rate', type: 'DESC' },
        page_number: body.page || 1,
      }),
    })
    const data = await res.json()
    const products = (data.data || []).filter(passesFilter)
    return NextResponse.json({ products, total: products.length })
  } catch {
    return NextResponse.json({ products: getMockProducts(body), total: 8, mock: true })
  }
}

function getMockProducts(_body: any) {
  return [
    { id:'k1', name:'Giá để giày 5 tầng gấp gọn đa năng', img:'🥿', price:89000, market_price:89000, sales30d:45230, growth:127.4, kaloUrl:'https://kalodata.com/product/1', shopUrl:'https://shopee.vn/shop/1', category:'Sắp xếp nhà', description:'Chất liệu: Thép sơn tĩnh điện. Kích thước: 60×30×120cm. Cân nặng: 3.2kg. Công dụng: Để giày gọn gàng.', shopName:'HomeStyle VN', shopSales:'1.2M/tháng' },
    { id:'k2', name:'Dây buộc đồ đa năng silicon reusable set 10 cái', img:'🎀', price:15000, market_price:15000, sales30d:125000, growth:315.2, kaloUrl:'https://kalodata.com/product/2', shopUrl:'https://shopee.vn/shop/2', category:'Tiện ích', description:'Chất liệu: Silicon cao cấp. Kích thước: 30×1.5cm. Cân nặng: 30g. Công dụng: Buộc dây cáp, rau củ.', shopName:'EcoLife Store', shopSales:'890K/tháng' },
    { id:'k3', name:'Hộp đựng thực phẩm thuỷ tinh borosilicate nắp tre', img:'🍱', price:65000, market_price:65000, sales30d:38100, growth:89.7, kaloUrl:'https://kalodata.com/product/3', shopUrl:'https://shopee.vn/shop/3', category:'Gia dụng', description:'Chất liệu: Thuỷ tinh borosilicate. Kích thước: 15×10×8cm. Cân nặng: 450g. Công dụng: Đựng thức ăn.', shopName:'GreenKitchen', shopSales:'650K/tháng' },
    { id:'k4', name:'Giá đỡ điện thoại xe máy silicon chống rung', img:'📱', price:55000, market_price:55000, sales30d:67000, growth:156.3, kaloUrl:'https://kalodata.com/product/4', shopUrl:'https://shopee.vn/shop/4', category:'Tiện ích', description:'Chất liệu: Nhựa PC + Silicone. Kích thước: 10×7×4cm. Công dụng: Gắn điện thoại xe máy.', shopName:'MotoGear VN', shopSales:'2.1M/tháng' },
    { id:'k5', name:'Chổi quét nhà silicon lông mịn gấp gọn 110cm', img:'🧹', price:55000, market_price:55000, sales30d:31000, growth:72.1, kaloUrl:'https://kalodata.com/product/5', shopUrl:'https://shopee.vn/shop/5', category:'Gia dụng', description:'Chất liệu: Silicon + Cán nhôm. Chiều dài: 110cm. Cân nặng: 400g. Công dụng: Quét nhà không tiếng ồn.', shopName:'CleanHome VN', shopSales:'780K/tháng' },
    { id:'k6', name:'Bộ vá xe đạp mini 16 món xách tay', img:'🔧', price:45000, market_price:45000, sales30d:22000, growth:44.5, kaloUrl:'https://kalodata.com/product/6', shopUrl:'https://shopee.vn/shop/6', category:'Thể thao', description:'Chất liệu: Kim loại cao cấp + Nhựa ABS. Kích thước: 12×8×3cm. Công dụng: Vá xe đạp tại chỗ.', shopName:'BikeKit Store', shopSales:'340K/tháng' },
    { id:'k7', name:'Hộp đựng khẩu trang chống bụi nắp flip', img:'😷', price:12000, market_price:12000, sales30d:89000, growth:201.8, kaloUrl:'https://kalodata.com/product/7', shopUrl:'https://shopee.vn/shop/7', category:'Tiện ích', description:'Chất liệu: Nhựa PP cao cấp. Kích thước: 20×10×8cm. Công dụng: Đựng khẩu trang.', shopName:'HealthBox VN', shopSales:'1.5M/tháng' },
    { id:'k8', name:'Kệ treo tường nhà tắm không khoan 3 tầng', img:'🚿', price:95000, market_price:95000, sales30d:28500, growth:88.3, kaloUrl:'https://kalodata.com/product/8', shopUrl:'https://shopee.vn/shop/8', category:'Sắp xếp nhà', description:'Chất liệu: Thép không gỉ 304. Kích thước: 40×12×50cm. Công dụng: Kệ đựng đồ nhà tắm.', shopName:'HomePro VN', shopSales:'920K/tháng' },
  ]
}
