import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  const { email, password, username, displayName } = await req.json();
  if (!email || !password || !username) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

  // 用 Admin API 直接创建用户(email_confirm=true 跳过邮件)
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: displayName || username },
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 });
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authUser.user.id;

  // 创建 profile
  const colors = ['#f472b6','#a78bfa','#60a5fa','#34d399','#fbbf24'];
  await supabaseAdmin.from('profiles').insert({
    id: userId, username, display_name: displayName || username,
    avatar_color: colors[Math.floor(Math.random() * colors.length)],
  });

  // 创建 creator
  await supabaseAdmin.from('creators').insert({
    owner_id: userId, username, display_name: displayName || username,
    avatar_color: colors[Math.floor(Math.random() * colors.length)],
    cover_color: '#831843', bio: '', subscription_price: 0,
    subscriber_count: 0, post_count: 0, short_count: 0,
    tiers: [
      { name: '免费', price: 0, badge: '', perks: ['看动态', '看免费作品'] },
      { name: '基础', price: 9.99, badge: '💎', perks: ['解锁基础视频', '专属动态'] },
      { name: '高级', price: 19.99, badge: '✨', perks: ['解锁付费内容', '私信', '专属徽章'] },
    ],
    paid_enabled: false,
  });

  return NextResponse.json({ userId, username });
}
