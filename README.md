# onlyfeet — Frontend (MVP UI)

消费者端前端,核心特性:**双模式 feed** — 用户可切换抖音竖屏滑模式 vs OnlyFans 时间线模式。

## 当前状态
- ✅ Next.js 14 + TypeScript + Tailwind
- ✅ 模式切换(Top Nav + Bottom Nav 双入口)
- ✅ 抖音模式:全屏竖屏滑 + 右侧操作栏 + 渐变蒙层
- ✅ OnlyFans 模式:瀑布流网格 + 筛选条 + Hover 详情
- ✅ 偏好持久化(localStorage)
- ✅ Mock 数据(6 个创作者 + 30 个帖子)
- ⏳ 后端接入(Supabase + Stripe)— 见 `../02-tech-stack.md`

## 跑起来

```bash
npm install
npm run dev
# → http://localhost:3000
```

## 关键文件

```
app/
├── layout.tsx          # Root layout: 提供 FeedMode context
├── page.tsx            # 首页:FeedSwitcher + CreatorSidebar
└── globals.css

components/
├── feed-mode-context.tsx   # 模式 state + localStorage 持久化
├── feed-switcher.tsx       # 根据模式渲染 ReelsFeed 或 TimelineFeed
├── reels-feed.tsx          # 抖音模式:全屏竖屏滑
├── timeline-feed.tsx       # OnlyFans 模式:瀑布流
├── top-nav.tsx             # 顶部 nav + 桌面端模式切换
├── bottom-nav.tsx          # 移动端底部 nav + 模式切换
└── creator-sidebar.tsx     # 桌面端右侧创作者推荐栏

lib/
├── mock-data.ts        # 创作者 + 帖子 mock 数据
└── utils.ts            # cn() + formatCount()
```

## 模式切换原理

1. `FeedModeProvider` 维护 `mode` state,初始从 localStorage 读取
2. `useFeedMode()` hook 让任何子组件读到/切换 mode
3. `FeedSwitcher` 根据 mode 渲染对应组件
4. 切换后写入 localStorage,刷新保持

## 下一步

- [ ] 接入 Supabase 替换 mock 数据
- [ ] 真实视频自动播放(目前用图片占位)
- [ ] 创作者主页 `/creator/[id]`
- [ ] 订阅流程接 Stripe Checkout
- [ ] DM / 通知中心
- [ ] 创作者 dashboard(单独路由)

## 已知限制

- MVP 不接任何敏感内容(图片池全部 Unsplash 美足/美甲/时尚,**全部合规**)
- 真实视频接入需要:(1)HLS 流媒体 (2)视频压缩 (3)CDN 边缘缓存 — 见 `../02-tech-stack.md`
- 模式切换有微 hydration 闪烁(技术上可消除,优先级低)