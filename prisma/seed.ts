import { PrismaClient, Role, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  reviewInviteEmailHtml,
  reviewInviteEmailSubject,
} from "../lib/email-template";

const prisma = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const categories = [
  { name: "家居生活", nameEn: "Home Living", slug: "home-living", order: 1 },
  { name: "香氛蜡烛", nameEn: "Candles & Scents", slug: "candles", order: 2 },
  { name: "文创好物", nameEn: "Stationery", slug: "stationery", order: 3 },
  { name: "服饰配饰", nameEn: "Fashion", slug: "fashion", order: 4 },
  { name: "餐厨器物", nameEn: "Kitchen", slug: "kitchen", order: 5 },
  { name: "数码影音", nameEn: "Tech & Audio", slug: "tech-audio", order: 6 },
  { name: "美妆护肤", nameEn: "Beauty", slug: "beauty", order: 7 },
  { name: "绿植盆栽", nameEn: "Plants", slug: "plants", order: 8 },
];

type SeedProduct = {
  title: string;
  titleEn: string;
  slug: string;
  description: string;
  descriptionEn: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  featured?: boolean;
  category: string;
  images: string[];
  variants?: { name: string; nameEn: string; value: string; valueEn: string }[];
};

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const products: SeedProduct[] = [
  {
    title: "手工大豆蜡香薰蜡烛",
    titleEn: "Hand-Poured Soy Candle",
    slug: "hand-poured-soy-candle",
    description:
      "采用天然大豆蜡与进口精油手工浇注，燃烧时长约 45 小时。无烟、无黑焦，为房间带来温润持久的香气。",
    descriptionEn:
      "Hand-poured with natural soy wax and premium essential oils. Approx. 45 hours of clean, smoke-free burn time.",
    price: 89,
    compareAtPrice: 129,
    stock: 60,
    featured: true,
    category: "candles",
    images: [img("photo-1602874801007-bd458bb1b8b6"), img("photo-1602143407151-7111542de6e8")],
    variants: [
      { name: "香型", nameEn: "Scent", value: "白茶", valueEn: "White Tea" },
      { name: "香型", nameEn: "Scent", value: "雪松", valueEn: "Cedar" },
      { name: "香型", nameEn: "Scent", value: "无花果", valueEn: "Fig" },
    ],
  },
  {
    title: "原木床头台灯",
    titleEn: "Walnut Table Lamp",
    slug: "walnut-table-lamp",
    description:
      "北美黑胡桃木灯体，黄铜细节，2700K 暖光可三档调光。为卧室与阅读角注入温润的光。",
    descriptionEn:
      "North American walnut body with brass accents. 2700K warm light with 3 brightness levels.",
    price: 329,
    compareAtPrice: 399,
    stock: 24,
    featured: true,
    category: "home-living",
    images: [img("photo-1507473885765-e6ed057f782c"), img("photo-1505693416388-ac5ce068fe85")],
  },
  {
    title: "北欧棉麻抱枕",
    titleEn: "Linen Throw Pillow",
    slug: "linen-throw-pillow",
    description: "亚麻混纺面料，隐形拉链，可拆洗。中性色系，轻松融入各种家居风格。",
    descriptionEn: "Linen-blend fabric with hidden zipper, removable cover. Neutral tones for any interior.",
    price: 129,
    stock: 40,
    category: "home-living",
    images: [img("photo-1584100936595-c0654b55a2e2"), img("photo-1555041469-a586c61ea9bc")],
  },
  {
    title: "手作陶瓷马克杯",
    titleEn: "Handmade Ceramic Mug",
    slug: "handmade-ceramic-mug",
    description: "陶土手作，釉色温润，每只杯子的纹理都独一无二。容量 350ml。",
    descriptionEn: "Handmade stoneware with a unique glaze on every piece. 350ml capacity.",
    price: 79,
    compareAtPrice: 99,
    stock: 80,
    category: "kitchen",
    images: [img("photo-1514228742587-6b1558fcca3d"), img("photo-1525974160448-038dacadcc71")],
  },
  {
    title: "复古机械腕表",
    titleEn: "Retro Mechanical Watch",
    slug: "retro-mechanical-watch",
    description: "自动上链机械机芯，蓝宝石镜面，真皮表带。日误差 ±15 秒，经典永不过时。",
    descriptionEn: "Self-winding mechanical movement, sapphire crystal, genuine leather strap.",
    price: 899,
    compareAtPrice: 1199,
    stock: 3,
    featured: true,
    category: "fashion",
    images: [img("photo-1524592094714-0f0654e20314"), img("photo-1546868871-7041f2a55e12")],
  },
  {
    title: "头戴式降噪耳机",
    titleEn: "ANC Over-Ear Headphones",
    slug: "anc-over-ear-headphones",
    description: "40mm 动圈单元，主动降噪 -35dB，40 小时续航。人体工学耳罩，久戴不累。",
    descriptionEn: "40mm drivers, -35dB active noise cancellation, 40-hour battery life.",
    price: 699,
    compareAtPrice: 899,
    stock: 30,
    featured: true,
    category: "tech-audio",
    images: [img("photo-1505740420928-5e560c06d30e"), img("photo-1484704849700-f032a568e944")],
  },
  {
    title: "极简帆布托特包",
    titleEn: "Canvas Tote Bag",
    slug: "canvas-tote-bag",
    description: "16 安加厚帆布，可容纳 15 英寸笔记本。通勤、出行、买菜都能装的百搭包。",
    descriptionEn: "16oz heavyweight canvas, fits a 15-inch laptop. The everyday essential tote.",
    price: 159,
    compareAtPrice: 199,
    stock: 55,
    category: "fashion",
    images: [img("photo-1544816155-12df9643f363"), img("photo-1590874103328-eac38a683ce7")],
  },
  {
    title: "手工玻璃扩香瓶",
    titleEn: "Glass Reed Diffuser",
    slug: "glass-reed-diffuser",
    description: "手工吹制玻璃瓶 + 天然藤条，扩香持续约 3 个月。无需明火，安全持久。",
    descriptionEn: "Hand-blown glass with natural rattan reeds. Lasts approx. 3 months, no flame needed.",
    price: 199,
    compareAtPrice: 249,
    stock: 35,
    category: "candles",
    images: [img("photo-1608571423902-eed4a5ad8108"), img("photo-1544787219-7f47ccb76574")],
  },
  {
    title: "龟背竹盆栽",
    titleEn: "Monstera Deliciosa",
    slug: "monstera-deliciosa",
    description: "高约 60cm，配水泥花盆。喜散光，耐阴好养，是客厅的绿意担当。",
    descriptionEn: "Approx. 60cm tall in a concrete pot. Easy-care, thrives in indirect light.",
    price: 129,
    stock: 20,
    category: "plants",
    images: [img("photo-1614594975525-e45190c55d0b"), img("photo-1485955900006-10f4d324d411")],
  },
  {
    title: "羊毛混纺围巾",
    titleEn: "Wool Blend Scarf",
    slug: "wool-blend-scarf",
    description: "70% 羊毛混纺，柔软亲肤不扎人。双面同色，随意围出慵懒感。",
    descriptionEn: "70% wool blend, soft and gentle on skin. Reversible in tone-on-tone colors.",
    price: 259,
    compareAtPrice: 329,
    stock: 28,
    category: "fashion",
    images: [img("photo-1520903920243-00d872a2d1c9"), img("photo-1601924994987-69e26d50dc26")],
    variants: [
      { name: "颜色", nameEn: "Color", value: "燕麦色", valueEn: "Oat" },
      { name: "颜色", nameEn: "Color", value: "炭灰色", valueEn: "Charcoal" },
    ],
  },
  {
    title: "日式手冲咖啡壶",
    titleEn: "Pour-Over Coffee Kettle",
    slug: "pour-over-coffee-kettle",
    description: "304 不锈钢细口壶，鹅颈设计控水精准。电磁炉、明火通用。",
    descriptionEn: "304 stainless steel gooseneck kettle for precise pour-over control.",
    price: 249,
    compareAtPrice: 299,
    stock: 22,
    category: "kitchen",
    images: [img("photo-1495474472287-4d71bcdd2085"), img("photo-1510591509098-f4fdc6d0ff04")],
  },
  {
    title: "意大利植鞣皮革笔记本",
    titleEn: "Leather Notebook",
    slug: "leather-notebook",
    description: "头层植鞣牛皮封面，100g 米白道林纸内芯 192 页。用久了会养出好看的包浆。",
    descriptionEn: "Full-grain vegetable-tanned leather cover, 192 pages of 100gsm cream paper.",
    price: 149,
    compareAtPrice: 189,
    stock: 45,
    category: "stationery",
    images: [img("photo-1544816155-12df9643f363"), img("photo-1531346878377-a5be20888e57")],
  },
  {
    title: "超声波香薰加湿器",
    titleEn: "Ultrasonic Aroma Diffuser",
    slug: "ultrasonic-aroma-diffuser",
    description: "300ml 容量，静音运行，带暖光夜灯。睡前十分钟，满屋温柔。",
    descriptionEn: "300ml capacity, whisper-quiet operation with a warm night light.",
    price: 179,
    compareAtPrice: 229,
    stock: 32,
    category: "candles",
    images: [img("photo-1602928321676-a5b751fd2e18"), img("photo-1513694203232-719a280e022f")],
  },
  {
    title: "麂皮绒休闲板鞋",
    titleEn: "Suede Sneakers",
    slug: "suede-sneakers",
    description: "反绒麂皮 + 橡胶大底，复古百搭。尺码 38-43，标准码。",
    descriptionEn: "Suede upper with rubber outsole. True to size, EU 38-43.",
    price: 459,
    compareAtPrice: 599,
    stock: 40,
    category: "fashion",
    images: [img("photo-1542291026-7eec264c27ff"), img("photo-1491553895911-0055eca6402d")],
    variants: [
      { name: "尺码", nameEn: "Size", value: "38", valueEn: "EU 38" },
      { name: "尺码", nameEn: "Size", value: "39", valueEn: "EU 39" },
      { name: "尺码", nameEn: "Size", value: "40", valueEn: "EU 40" },
      { name: "尺码", nameEn: "Size", value: "41", valueEn: "EU 41" },
      { name: "尺码", nameEn: "Size", value: "42", valueEn: "EU 42" },
    ],
  },
  {
    title: "白瓷手工花瓶",
    titleEn: "Porcelain Vase",
    slug: "porcelain-vase",
    description: "哑光白釉，手工拉坯成型。插一两枝花，或静静放着，都很好看。",
    descriptionEn: "Matte white glaze, wheel-thrown. Beautiful with a stem or standing alone.",
    price: 139,
    compareAtPrice: 169,
    stock: 26,
    category: "home-living",
    images: [img("photo-1578500494198-246f612d3b3d"), img("photo-1610701596007-11502861dcfa")],
  },
  {
    title: "木质翻页日历",
    titleEn: "Wooden Flip Calendar",
    slug: "wooden-flip-calendar",
    description: "榉木底座，每日一翻，桌面上的仪式感。含 365 张日卡。",
    descriptionEn: "Beechwood base, flip a card each day. 365 daily cards included.",
    price: 99,
    stock: 50,
    category: "stationery",
    images: [img("photo-1526045478516-99145907023c"), img("photo-1507679799987-c73779587ccf")],
  },
  {
    title: "重磅纯棉基础款 T 恤",
    titleEn: "Heavyweight Cotton Tee",
    slug: "heavyweight-cotton-tee",
    description: "260g 重磅精梳棉，领口螺纹加固，不易变形。越洗越软。",
    descriptionEn: "260gsm combed cotton, reinforced collar. Gets softer with every wash.",
    price: 119,
    compareAtPrice: 149,
    stock: 120,
    category: "fashion",
    images: [img("photo-1521572163474-6864f9cf17ab"), img("photo-1503341504253-dff4815485f1")],
    variants: [
      { name: "颜色", nameEn: "Color", value: "白色", valueEn: "White" },
      { name: "颜色", nameEn: "Color", value: "黑色", valueEn: "Black" },
      { name: "颜色", nameEn: "Color", value: "燕麦色", valueEn: "Oat" },
      { name: "尺码", nameEn: "Size", value: "S", valueEn: "S" },
      { name: "尺码", nameEn: "Size", value: "M", valueEn: "M" },
      { name: "尺码", nameEn: "Size", value: "L", valueEn: "L" },
    ],
  },
  {
    title: "胡桃木蓝牙音箱",
    titleEn: "Walnut Bluetooth Speaker",
    slug: "walnut-bluetooth-speaker",
    description: "实木腔体，360° 环绕声场，蓝牙 5.3。既是音箱，也是桌面摆件。",
    descriptionEn: "Solid walnut cabinet, 360° sound, Bluetooth 5.3. A speaker that's also decor.",
    price: 399,
    compareAtPrice: 499,
    stock: 8,
    featured: true,
    category: "tech-audio",
    images: [img("photo-1589003077984-894e133dabab"), img("photo-1608043152269-423dbba4e7e1")],
  },
  {
    title: "精油香皂礼盒",
    titleEn: "Essential Oil Soap Set",
    slug: "essential-oil-soap-set",
    description: "冷制工艺，含橄榄油与乳木果油。三款香型：薰衣草、佛手柑、玫瑰。",
    descriptionEn: "Cold-process soaps with olive and shea butter. Lavender, bergamot & rose.",
    price: 109,
    compareAtPrice: 139,
    stock: 60,
    category: "beauty",
    images: [img("photo-1607006318574-a9cce8867f8a"), img("photo-1596462502278-27bfdc403348")],
  },
  {
    title: "极简皮革腕表",
    titleEn: "Minimalist Leather Watch",
    slug: "minimalist-leather-watch",
    description: "日本石英机芯，38mm 表盘，意大利植鞣表带。表带可快拆更换。",
    descriptionEn: "Japanese quartz movement, 38mm dial, quick-release Italian leather strap.",
    price: 329,
    compareAtPrice: 429,
    stock: 20,
    category: "fashion",
    images: [img("photo-1523170335258-f5ed11844a49"), img("photo-1523275335684-37898b6baf30")],
    variants: [
      { name: "表带", nameEn: "Strap", value: "皮革", valueEn: "Leather" },
      { name: "表带", nameEn: "Strap", value: "米兰尼斯", valueEn: "Milanese" },
    ],
  },
  {
    title: "高硼硅玻璃茶具套装",
    titleEn: "Glass Teapot Set",
    slug: "glass-teapot-set",
    description: "耐热高硼硅玻璃，1 壶 2 杯。泡花茶、果茶时茶色尽收眼底。",
    descriptionEn: "Heat-resistant borosilicate glass, 1 pot + 2 cups. Watch your tea bloom.",
    price: 219,
    compareAtPrice: 269,
    stock: 25,
    category: "kitchen",
    images: [img("photo-1576092768241-dec231879fc3"), img("photo-1597318181409-cf64d0b5d8a2")],
  },
  {
    title: "香薰蜡烛礼盒（三件套）",
    titleEn: "Candle Gift Box (Set of 3)",
    slug: "candle-gift-box",
    description: "三款经典香型组合：白茶、雪松、海盐。附礼盒与手提袋，送礼体面。",
    descriptionEn: "Three classic scents: White Tea, Cedar & Sea Salt. Gift box included.",
    price: 259,
    compareAtPrice: 319,
    stock: 30,
    featured: true,
    category: "candles",
    images: [img("photo-1603006905003-be475563bc59"), img("photo-1602523961358-f9f03dd8ad44")],
  },
  {
    title: "琴叶榕盆栽",
    titleEn: "Fiddle Leaf Fig",
    slug: "fiddle-leaf-fig",
    description: "高约 80cm，大叶琴叶榕，客厅点睛之笔。附养护手册。",
    descriptionEn: "Approx. 80cm tall. The statement plant for any living room. Care guide included.",
    price: 159,
    compareAtPrice: 189,
    stock: 0,
    category: "plants",
    images: [img("photo-1603729019044-7c1e6f8bd5c7"), img("photo-1416879595882-3373a0480b5b")],
  },
  {
    title: "羊毛毡收纳篮",
    titleEn: "Felt Storage Basket",
    slug: "felt-storage-basket",
    description: "加厚羊毛毡，可折叠收纳。放杂志、玩具、毛毯都合适，三个尺寸可选。",
    descriptionEn: "Thick felt, foldable. Perfect for magazines, toys or throws. Three sizes.",
    price: 89,
    stock: 45,
    category: "home-living",
    images: [img("photo-1600880292203-757bb62b4baf"), img("photo-1583947581279-4eecf0a802c3")],
  },
];

async function main() {
  console.log("🌱 清空旧数据...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log("🌱 创建分类...");
  const catMap = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.category.create({ data: c });
    catMap.set(cat.slug, cat.id);
  }

  console.log("🌱 创建用户...");
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: process.env.ADMIN_EMAIL || "admin@lumen.demo",
      passwordHash: adminPassword,
      name: "管理员",
      role: Role.ADMIN,
    },
  });

  const custPassword = await bcrypt.hash("customer123", 10);
  const customers = [
    { email: "lin@example.com", name: "林小满" },
    { email: "chen@example.com", name: "陈一诺" },
    { email: "zhao@example.com", name: "赵清和" },
  ];
  const custMap = new Map<string, string>();
  for (const c of customers) {
    const user = await prisma.user.create({
      data: { ...c, passwordHash: custPassword, role: Role.CUSTOMER },
    });
    custMap.set(user.email, user.id);
  }

  console.log("🌱 创建商品与变体...");
  const productIds: Record<string, string> = {};
  for (const p of products) {
    const created = await prisma.product.create({
      data: {
        title: p.title,
        titleEn: p.titleEn,
        slug: p.slug,
        description: p.description,
        descriptionEn: p.descriptionEn,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        stock: p.stock,
        featured: p.featured ?? false,
        images: JSON.stringify(p.images),
        categoryId: catMap.get(p.category),
        createdAt: daysAgo(Math.floor(Math.random() * 90)),
        variants: p.variants
          ? {
              create: p.variants.map((v) => ({
                name: v.name,
                nameEn: v.nameEn,
                value: v.value,
                valueEn: v.valueEn,
              })),
            }
          : undefined,
      },
    });
    productIds[p.slug] = created.id;
  }

  console.log("🌱 创建订单...");
  const orderSeed = [
    {
      days: 1,
      customer: customers[0],
      status: OrderStatus.PAID,
      method: "模拟支付 · 微信",
      items: [
        { slug: "hand-poured-soy-candle", qty: 2 },
        { slug: "linen-throw-pillow", qty: 1 },
      ],
    },
    {
      days: 2,
      customer: customers[1],
      status: OrderStatus.SHIPPED,
      method: "模拟支付 · 支付宝",
      items: [
        { slug: "walnut-table-lamp", qty: 1 },
        { slug: "porcelain-vase", qty: 1 },
      ],
    },
    {
      days: 4,
      customer: customers[2],
      status: OrderStatus.SHIPPED,
      method: "模拟支付 · 银行卡",
      items: [{ slug: "retro-mechanical-watch", qty: 1 }],
    },
    {
      days: 7,
      customer: customers[0],
      status: OrderStatus.COMPLETED,
      method: "模拟支付 · 微信",
      items: [
        { slug: "canvas-tote-bag", qty: 1 },
        { slug: "leather-notebook", qty: 2 },
      ],
    },
    {
      days: 12,
      customer: customers[1],
      status: OrderStatus.COMPLETED,
      method: "模拟支付 · 支付宝",
      items: [{ slug: "anc-over-ear-headphones", qty: 1 }],
    },
    {
      days: 16,
      customer: customers[2],
      status: OrderStatus.PAID,
      method: "模拟支付 · 微信",
      items: [
        { slug: "candle-gift-box", qty: 1 },
        { slug: "essential-oil-soap-set", qty: 1 },
      ],
    },
    {
      days: 21,
      customer: customers[0],
      status: OrderStatus.PENDING,
      method: "模拟支付 · 银行卡",
      items: [{ slug: "glass-teapot-set", qty: 1 }],
    },
    {
      days: 27,
      customer: customers[1],
      status: OrderStatus.CANCELLED,
      method: "模拟支付 · 支付宝",
      items: [{ slug: "fiddle-leaf-fig", qty: 1 }],
    },
  ];

  const shippingByMethod: Record<string, number> = {
    "标准配送": 12,
    "次日达": 25,
    "门店自提": 0,
  };

  /** 生成模拟物流单号（与 lib/utils randomTrackingNumber 一致） */
  function trackingFor(i: number): string {
    return `LM${String(Date.now() - i * 86400000).slice(0, 10)}${1000 + i}`;
  }

  const H = 3600_000; // 1 小时毫秒
  const D = 24 * H;

  /** 根据订单状态生成完整的时间线事件（含物流节点） */
  function buildOrderEvents(order: { status: OrderStatus; createdAt: Date }): { status: OrderStatus; note: string | null; createdAt: Date }[] {
    const base = new Date(order.createdAt);
    const events: { status: OrderStatus; note: string | null; createdAt: Date }[] = [
      { status: "PENDING", note: null, createdAt: base },
    ];
    // 待支付：仅下单事件
    if (order.status === "PENDING") return events;
    // 已取消：下单 → 取消
    if (order.status === "CANCELLED") {
      events.push({
        status: "CANCELLED",
        note: "logCancelled",
        createdAt: new Date(base.getTime() + 2 * H),
      });
      return events;
    }
    events.push({
      status: "PAID",
      note: "logPaid",
      createdAt: new Date(base.getTime() + 5 * 60_000),
    });
    // 已支付：下单 → 支付
    if (order.status === "PAID") return events;

    const shippedAt = new Date(base.getTime() + 1 * D);
    events.push({ status: "SHIPPED", note: "logShipped", createdAt: shippedAt });
    // 物流轨迹节点
    events.push({
      status: "SHIPPED",
      note: "logPickedUp",
      createdAt: new Date(shippedAt.getTime() + 4 * H),
    });
    events.push({
      status: "SHIPPED",
      note: "logInTransit",
      createdAt: new Date(shippedAt.getTime() + 12 * H),
    });
    events.push({
      status: "SHIPPED",
      note: "logArrivedCity",
      createdAt: new Date(shippedAt.getTime() + 2 * D),
    });
    events.push({
      status: "SHIPPED",
      note: "logOutForDelivery",
      createdAt: new Date(shippedAt.getTime() + 2 * D + 8 * H),
    });
    // 已发货：到派送为止
    if (order.status === "SHIPPED") return events;

    events.push({
      status: "COMPLETED",
      note: "logDelivered",
      createdAt: new Date(shippedAt.getTime() + 3 * D),
    });
    return events;
  }

  for (let i = 0; i < orderSeed.length; i++) {
    const s = orderSeed[i];
    const items = s.items.map((it) => {
      const p = products.find((x) => x.slug === it.slug)!;
      return {
        productId: productIds[it.slug],
        title: p.title,
        price: p.price,
        quantity: it.qty,
      };
    });
    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const shippingFee = shippingByMethod["标准配送"];
    const number = `LN${String(1000 + i)}`;
    const user = await prisma.user.findUnique({ where: { email: s.customer.email } });
    const createdAt = daysAgo(s.days);
    const order = await prisma.order.create({
      data: {
        orderNumber: number,
        userId: user?.id,
        customerName: s.customer.name,
        customerEmail: s.customer.email,
        phone: "1380000" + String(1000 + i),
        address: "幸福路 88 号 3 栋 502",
        city: "杭州",
        province: "浙江省",
        postalCode: "310000",
        shippingMethod: "标准配送",
        shippingFee,
        subtotal,
        total: subtotal + shippingFee,
        status: s.status,
        paymentMethod: s.method,
        // 已发货/已完成订单才有物流单号
        trackingNumber:
          s.status === "SHIPPED" || s.status === "COMPLETED"
            ? trackingFor(i)
            : null,
        createdAt,
        items: { create: items },
        events: {
          create: buildOrderEvents({
            status: s.status,
            createdAt,
          }).map((e) => ({
            status: e.status,
            note: e.note,
            createdAt: e.createdAt,
          })),
        },
      },
    });
  }

  console.log("🌱 创建评价邀请邮件记录（模拟发送）...");
  // LN1003（林小满 · 已完成 7 天 · 托特包已评、笔记本未评）→ 预生成一封邀请邮件
  const inviteOrder = await prisma.order.findUnique({
    where: { orderNumber: "LN1003" },
  });
  if (inviteOrder) {
    const reviewUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100"
    }/zh/order/${inviteOrder.id}`;
    await prisma.emailLog.create({
      data: {
        orderId: inviteOrder.id,
        toEmail: inviteOrder.customerEmail,
        subject: reviewInviteEmailSubject(inviteOrder.orderNumber),
        body: reviewInviteEmailHtml({
          orderNumber: inviteOrder.orderNumber,
          pendingCount: 1,
          reviewUrl,
        }),
      },
    });
  }

  console.log("🌱 创建评论...");
  const reviewSeed: { slug: string; email: string; rating: number; comment: string; days: number }[] = [
    { slug: "hand-poured-soy-candle", email: customers[0].email, rating: 5, comment: "白茶味很清雅，点燃后整个房间都是淡淡的香气，燃烧也很均匀，回购！", days: 3 },
    { slug: "hand-poured-soy-candle", email: customers[1].email, rating: 4, comment: "包装很精致，送人很合适。味道偏淡，但很耐闻。", days: 5 },
    { slug: "walnut-table-lamp", email: customers[2].email, rating: 5, comment: "木纹和照片一样好看，三档灯光很实用，晚上看书刚好。", days: 2 },
    { slug: "linen-throw-pillow", email: customers[0].email, rating: 4, comment: "质感不错，颜色百搭，就是枕芯稍微有点软。", days: 6 },
    { slug: "retro-mechanical-watch", email: customers[1].email, rating: 5, comment: "走时精准，表盘复古感十足，表带皮质很软，物超所值。", days: 1 },
    { slug: "anc-over-ear-headphones", email: customers[2].email, rating: 5, comment: "降噪效果惊艳，地铁通勤神器，续航也完全够用。", days: 9 },
    { slug: "canvas-tote-bag", email: customers[0].email, rating: 5, comment: "布料厚实，容量很大，每天通勤都在背。", days: 4 },
    { slug: "leather-notebook", email: customers[1].email, rating: 4, comment: "皮质细腻，纸张顺滑不洇墨，就是价格小贵。", days: 8 },
    { slug: "porcelain-vase", email: customers[2].email, rating: 5, comment: "插了几支尤加利叶，整个角落都高级了。", days: 11 },
    { slug: "walnut-bluetooth-speaker", email: customers[0].email, rating: 5, comment: "声音很温润，颜值在线，朋友来家里都问链接。", days: 13 },
  ];
  for (const r of reviewSeed) {
    const userId = custMap.get(r.email)!;
    await prisma.review.create({
      data: {
        productId: productIds[r.slug],
        userId,
        rating: r.rating,
        comment: r.comment,
        createdAt: daysAgo(r.days),
      },
    });
  }

  console.log("🌱 创建收藏...");
  await prisma.wishlistItem.createMany({
    data: [
      { userId: custMap.get(customers[0].email)!, productId: productIds["walnut-table-lamp"] },
      { userId: custMap.get(customers[0].email)!, productId: productIds["retro-mechanical-watch"] },
      { userId: custMap.get(customers[1].email)!, productId: productIds["candle-gift-box"] },
    ],
  });

  console.log("✅ Seed 完成");
  console.log(`   管理员: ${process.env.ADMIN_EMAIL || "admin@lumen.demo"} / ${process.env.ADMIN_PASSWORD || "admin123"}`);
  console.log(`   演示顾客: lin@example.com / chen@example.com / zhao@example.com（密码均为 customer123）`);
  console.log(`   商品 ${products.length} 个 · 分类 ${categories.length} 个 · 订单 ${orderSeed.length} 个 · 评论 ${reviewSeed.length} 条`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
