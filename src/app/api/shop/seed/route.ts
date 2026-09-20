// src/app/api/shop/seed/route.ts
// Internal API to seed products (admin use only)
import { NextRequest, NextResponse } from 'next/server';
import { createProduct } from '@/lib/shop-db';

const SEED_SECRET = process.env.SEED_SECRET || 'seed-7zi-2024';

// 50 pre-built products across multiple categories
const PRODUCTS = [
  { sku:'7ZI-ELEC-001', name_en:'Wireless Bluetooth Earbuds Pro', name_cn:'无线蓝牙耳机专业版', description_en:'Premium wireless earbuds with active noise cancellation, 24-hour battery life, and premium sound quality. IPX5 waterproof, perfect for sports and commuting.', price:39.99, category:'Electronics', stock:500 },
  { sku:'7ZI-ELEC-002', name_en:'Smart LED Desk Lamp', name_cn:'智能LED台灯', description_en:'Adjustable color temperature and brightness, USB charging port, touch control, eye-protection technology. Perfect for study and work.', price:29.99, category:'Electronics', stock:300 },
  { sku:'7ZI-ELEC-003', name_en:'Portable Power Bank 20000mAh', name_cn:'移动电源20000毫安', description_en:'High-capacity portable charger with dual USB-A and USB-C ports, 22.5W fast charging, LED display. Charges your phone 5-6 times.', price:34.99, category:'Electronics', stock:400 },
  { sku:'7ZI-ELEC-004', name_en:'Mechanical Gaming Keyboard', name_cn:'机械游戏键盘', description_en:'TKL layout mechanical keyboard with RGB backlight, blue switches, anti-ghosting, aluminum frame. For gaming and typing enthusiasts.', price:69.99, category:'Electronics', stock:200 },
  { sku:'7ZI-ELEC-005', name_en:'USB-C Hub 7-in-1', name_cn:'USB-C 7合1扩展坞', description_en:'7-in-1 USB-C hub with 4K HDMI, 100W PD, 3 USB 3.0 ports, SD/TF card reader. Compatible with MacBook, iPad, laptops.', price:42.99, category:'Electronics', stock:350 },
  { sku:'7ZI-ELEC-006', name_en:'Smart Fitness Tracker Watch', name_cn:'智能健康运动手表', description_en:'Heart rate monitor, sleep tracking, 14 sport modes, IP68 waterproof, 7-day battery. Syncs with iOS and Android.', price:49.99, category:'Electronics', stock:450 },
  { sku:'7ZI-ELEC-007', name_en:'Mini Wireless Mouse', name_cn:'迷你无线鼠标', description_en:'Compact 2.4G wireless mouse, quiet clicks, 1600 DPI, 18-month battery life, compatible with Windows/Mac/Linux.', price:15.99, category:'Electronics', stock:600 },
  { sku:'7ZI-ELEC-008', name_en:'Webcam 1080P HD with Microphone', name_cn:'1080P高清摄像头', description_en:'Full HD webcam with built-in stereo microphone, auto-focus, wide-angle lens. For video calls, streaming, and conferences.', price:38.99, category:'Electronics', stock:250 },
  { sku:'7ZI-HOME-001', name_en:'Bamboo Kitchen Cutting Board Set', name_cn:'竹木厨房砧板套装', description_en:'3-piece premium bamboo cutting board set with juice grooves, non-slip feet, and hanging holes. Eco-friendly and durable.', price:24.99, category:'Home & Garden', stock:400 },
  { sku:'7ZI-HOME-002', name_en:'Stainless Steel Water Bottle 32oz', name_cn:'不锈钢水壶32盎司', description_en:'Double-wall vacuum insulated water bottle keeps drinks cold 24h or hot 12h. BPA-free, leak-proof lid, wide mouth.', price:22.99, category:'Home & Garden', stock:500 },
  { sku:'7ZI-HOME-003', name_en:'Non-stick Frying Pan Set', name_cn:'不粘锅套装', description_en:'3-piece non-stick cookware set (8", 10", 12"), PFOA-free coating, compatible with all stovetops including induction.', price:54.99, category:'Home & Garden', stock:300 },
  { sku:'7ZI-HOME-004', name_en:'LED String Lights Outdoor 100ft', name_cn:'户外LED灯串100英尺', description_en:'Weatherproof outdoor string lights with 33 Edison bulbs, perfect for patios, gardens, weddings, and parties.', price:26.99, category:'Home & Garden', stock:350 },
  { sku:'7ZI-HOME-005', name_en:'Smart Plant Watering Spike (4-Pack)', name_cn:'自动浇花神器4个装', description_en:'Automatic plant watering spikes, slow-release irrigation for up to 2 weeks. Works with standard plastic bottles.', price:12.99, category:'Home & Garden', stock:600 },
  { sku:'7ZI-HOME-006', name_en:'Aromatherapy Essential Oil Diffuser', name_cn:'精油香薰机加湿器', description_en:'500ml ultrasonic aromatherapy diffuser with 7-color LED, 4 timer settings, auto shut-off. Ultra-quiet operation.', price:32.99, category:'Home & Garden', stock:400 },
  { sku:'7ZI-HOME-007', name_en:'Microfiber Cleaning Cloth Set 12-Pack', name_cn:'超细纤维清洁布12条装', description_en:'12-pack premium microfiber cleaning cloths, ultra-absorbent, lint-free, scratch-free for glass, car, kitchen, bathroom.', price:14.99, category:'Home & Garden', stock:700 },
  { sku:'7ZI-HOME-008', name_en:'Digital Kitchen Scale', name_cn:'厨房电子秤', description_en:'Precise kitchen scale up to 11lb/5kg, 0.1g accuracy, tare function, LCD display, stainless steel platform.', price:18.99, category:'Home & Garden', stock:450 },
  { sku:'7ZI-FASH-001', name_en:'Classic Canvas Tote Bag', name_cn:'经典帆布手提包', description_en:'Heavy-duty cotton canvas tote with reinforced handles, inner zippered pocket, machine washable. Perfect for shopping and daily use.', price:16.99, category:'Fashion', stock:500 },
  { sku:'7ZI-FASH-002', name_en:'Minimalist Leather Wallet', name_cn:'极简真皮钱包', description_en:'Slim bifold genuine leather wallet with 6 card slots, cash pocket, RFID blocking. Available in black and brown.', price:28.99, category:'Fashion', stock:400 },
  { sku:'7ZI-FASH-003', name_en:'Adjustable Baseball Cap', name_cn:'可调节棒球帽', description_en:'Classic unstructured baseball cap with adjustable buckle closure, 100% cotton, breathable, UV protection.', price:13.99, category:'Fashion', stock:600 },
  { sku:'7ZI-FASH-004', name_en:'Silk Sleep Eye Mask', name_cn:'丝绸睡眠眼罩', description_en:'100% natural mulberry silk sleep mask, adjustable elastic strap, blocks light completely. Soft and hypoallergenic.', price:11.99, category:'Fashion', stock:700 },
  { sku:'7ZI-FASH-005', name_en:'Knit Beanie Hat Winter', name_cn:'针织毛线帽子', description_en:'Soft stretchy knit beanie hat, one size fits all, warm acrylic material, classic cuff design. Great for winter.', price:9.99, category:'Fashion', stock:800 },
  { sku:'7ZI-SPRT-001', name_en:'Yoga Mat Premium 6mm', name_cn:'瑜伽垫专业级6mm', description_en:'Non-slip premium yoga mat with alignment lines, 6mm thick for joint support, eco-friendly TPE material, includes carrying strap.', price:35.99, category:'Sports', stock:400 },
  { sku:'7ZI-SPRT-002', name_en:'Resistance Bands Set 5-Pack', name_cn:'弹力带5套装', description_en:'5 resistance levels from light to heavy, latex-free, for strength training, physical therapy, yoga, and stretching.', price:19.99, category:'Sports', stock:500 },
  { sku:'7ZI-SPRT-003', name_en:'Foam Roller for Muscle Recovery', name_cn:'泡沫轴肌肉放松', description_en:'High-density EVA foam roller for deep tissue massage, back pain relief, and muscle recovery. 33cm x 14cm.', price:22.99, category:'Sports', stock:350 },
  { sku:'7ZI-SPRT-004', name_en:'Jump Rope Speed Cable', name_cn:'速度跳绳专业版', description_en:'Professional speed jump rope with steel cable, ball-bearing handles, adjustable length. For CrossFit, boxing, fitness.', price:14.99, category:'Sports', stock:600 },
  { sku:'7ZI-SPRT-005', name_en:'Water Resistant Sports Running Belt', name_cn:'防水运动腰包', description_en:'Lightweight running waist pack with water-resistant fabric, fits phones up to 6.5", headphone port, reflective strip.', price:17.99, category:'Sports', stock:450 },
  { sku:'7ZI-BEAU-001', name_en:'Jade Facial Roller & Gua Sha Set', name_cn:'玉石美容滚轮刮痧套装', description_en:'Natural jade facial roller and gua sha stone set, reduces puffiness, promotes circulation, improves skin tone.', price:19.99, category:'Beauty', stock:500 },
  { sku:'7ZI-BEAU-002', name_en:'Electric Facial Cleansing Brush', name_cn:'电动洁面仪', description_en:'Sonic vibration facial cleansing brush with 3 modes, waterproof, rechargeable, removes 98% more dirt than hands.', price:27.99, category:'Beauty', stock:400 },
  { sku:'7ZI-BEAU-003', name_en:'Nail Care Kit Professional 12-Piece', name_cn:'专业美甲护理套装12件', description_en:'Complete manicure and pedicure set with stainless steel tools, includes clippers, files, cuticle pusher. Comes with travel case.', price:21.99, category:'Beauty', stock:450 },
  { sku:'7ZI-BEAU-004', name_en:'Rose Hip Seed Oil 100% Pure', name_cn:'玫瑰果油100%纯正', description_en:'100% pure cold-pressed rosehip seed oil, rich in vitamins A and C, anti-aging, moisturizing, for face, hair, and nails.', price:16.99, category:'Beauty', stock:600 },
  { sku:'7ZI-BEAU-005', name_en:'Makeup Brush Set 15-Piece', name_cn:'美妆刷套装15支', description_en:'Professional makeup brush set with synthetic bristles, includes foundation, powder, eyeshadow, blending, and contour brushes.', price:24.99, category:'Beauty', stock:500 },
  { sku:'7ZI-TOYS-001', name_en:'Wooden Building Blocks 100-Piece', name_cn:'木制积木100块', description_en:'Natural wood building blocks in various shapes and sizes, non-toxic paint, develops creativity and motor skills. Ages 2+.', price:32.99, category:'Toys', stock:300 },
  { sku:'7ZI-TOYS-002', name_en:'Fidget Cube Stress Relief Toy', name_cn:'解压魔方玩具', description_en:'6-sided fidget cube with buttons, switches, dials, and balls. Helps with focus, anxiety, and stress relief. For all ages.', price:8.99, category:'Toys', stock:800 },
  { sku:'7ZI-OFFI-001', name_en:'Ergonomic Lumbar Support Cushion', name_cn:'人体工学腰靠垫', description_en:'Memory foam lumbar support cushion for office chair, promotes proper posture, relieves lower back pain. Adjustable strap.', price:28.99, category:'Office', stock:400 },
  { sku:'7ZI-OFFI-002', name_en:'Desk Organizer Bamboo 7-Compartment', name_cn:'竹制桌面收纳盒7格', description_en:'Eco-friendly bamboo desk organizer with 7 compartments for pens, paper clips, business cards, and stationery.', price:22.99, category:'Office', stock:350 },
  { sku:'7ZI-OFFI-003', name_en:'Monitor Stand Riser Desk Organizer', name_cn:'显示器增高支架', description_en:'Sturdy monitor stand with storage drawer, elevates screen to ergonomic eye level, reduces neck strain. Supports 33lb.', price:38.99, category:'Office', stock:300 },
  { sku:'7ZI-AUTO-001', name_en:'Car Phone Mount Dashboard Wireless', name_cn:'车载手机支架无线充电', description_en:'15W wireless charging car phone mount, air vent and dashboard compatible, one-touch auto-clamp, 360° rotation.', price:36.99, category:'Automotive', stock:400 },
  { sku:'7ZI-AUTO-002', name_en:'Car Seat Gap Filler Organizer', name_cn:'汽车座椅间隙填充收纳', description_en:'Universal car seat gap filler organizer, prevents items from falling between seats, includes cup holder and USB port.', price:18.99, category:'Automotive', stock:450 },
  { sku:'7ZI-ELEC-009', name_en:'Smart WiFi Plug with Energy Monitor', name_cn:'智能WiFi插座带电量监控', description_en:'Smart plug with energy monitoring, voice control (Alexa/Google), timer and schedule function. No hub required.', price:19.99, category:'Electronics', stock:500 },
  { sku:'7ZI-ELEC-010', name_en:'Phone Screen Magnifier 3D HD', name_cn:'手机屏幕放大镜3D高清', description_en:'12-inch HD phone screen magnifier, 4x zoom, foldable wood stand, reduces eye strain for movies and videos.', price:16.99, category:'Electronics', stock:600 },
  { sku:'7ZI-HOME-009', name_en:'Silicone Baking Mat Set Non-stick 2-Pack', name_cn:'硅胶烘焙垫不粘2件套', description_en:'Professional silicone baking mats, non-stick, heat resistant up to 480°F, reusable, replaces parchment paper.', price:17.99, category:'Home & Garden', stock:500 },
  { sku:'7ZI-HOME-010', name_en:'Over-the-Door Shoe Organizer 24 Pockets', name_cn:'门背鞋架24格', description_en:'Over-the-door shoe organizer with 24 pockets, fits most doors, holds sneakers, sandals, and accessories. Easy install.', price:20.99, category:'Home & Garden', stock:400 },
  { sku:'7ZI-FASH-006', name_en:'Foldable Travel Umbrella Windproof', name_cn:'折叠旅行雨伞防风', description_en:'Compact windproof travel umbrella, auto open/close, 10-rib reinforced canopy, fits in purse or laptop bag.', price:18.99, category:'Fashion', stock:550 },
  { sku:'7ZI-SPRT-006', name_en:'Cooling Towel for Sports 3-Pack', name_cn:'运动冷感毛巾3条装', description_en:'Instant cooling towels for neck, face, and body. Just wet, wring, snap to activate. Stays cool for up to 2 hours.', price:15.99, category:'Sports', stock:600 },
  { sku:'7ZI-BEAU-006', name_en:'Charcoal Teeth Whitening Powder', name_cn:'活性炭洁白牙粉', description_en:'Natural activated charcoal teeth whitening powder, removes stains and tartar, freshens breath. Fluoride-free formula.', price:13.99, category:'Beauty', stock:700 },
  { sku:'7ZI-OFFI-004', name_en:'Cable Management Box with Lid', name_cn:'带盖线缆整理盒', description_en:'Large cable management box hides power strips and cables, keeps desk clean and organized. Fire-retardant ABS material.', price:26.99, category:'Office', stock:400 },
  { sku:'7ZI-ELEC-011', name_en:'Digital Luggage Scale Handheld', name_cn:'手持数字行李秤', description_en:'Handheld digital luggage scale up to 110lb/50kg, tare function, backlit display, auto-off. Essential for travel.', price:12.99, category:'Electronics', stock:700 },
  { sku:'7ZI-HOME-011', name_en:'Vacuum Storage Bags 12-Pack', name_cn:'真空压缩袋12个装', description_en:'Space-saving vacuum storage bags, 12-pack (various sizes), seal and compress clothes, bedding, pillows to save 80% space.', price:19.99, category:'Home & Garden', stock:500 },
  { sku:'7ZI-SPRT-007', name_en:'Balance Board Wobble Board Trainer', name_cn:'平衡板健身训练', description_en:'Non-slip balance board for core training, physical therapy, and posture improvement. Adjustable difficulty, supports 220lb.', price:29.99, category:'Sports', stock:350 },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== SEED_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  
  const results = [];
  for (const p of PRODUCTS) {
    try {
      const product = await createProduct({ ...p, status: 'active' });
      results.push({ sku: product.sku, status: 'created' });
    } catch (e: unknown) {
      results.push({ sku: p.sku, status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  }
  
  const created = results.filter(r => r.status === 'created').length;
  return NextResponse.json({ success: true, created, total: PRODUCTS.length, results });
}
