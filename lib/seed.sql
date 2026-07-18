-- Seed data for onlyfeet.
-- Run AFTER executing schema.sql.
-- Copy this into Supabase SQL Editor and run.

INSERT INTO creators (username, display_name, avatar_color, cover_color, bio, subscription_price, verified, subscriber_count, post_count, short_count) VALUES
('luna_footart',  'Luna',       '#f472b6', '#831843', 'Foot art & nail design ✨ NYC · 18+', 9.99,  true, 12400, 234, 18),
('toes_daily',   'Toes Daily',  '#c084fc', '#581c87', 'Daily soft aesthetic · Subscribe for daily drops', 7.99, true, 8100, 412, 31),
('sole_studio',  'Sole Studio', '#60a5fa', '#1e3a5f', 'Premium sets weekly · Studio shoots', 12.99, false, 5600, 89, 12),
('arch_atelier', 'Arch Atelier','#34d399', '#064e3b', 'Footwear · Arch studies · Runway feet', 5.99, false, 3200, 156, 8),
('pedicure_bar', 'Pedi Bar',    '#fbbf24', '#78350f', 'Spa · Nail art · Behind the scenes', 4.99, false, 2100, 78, 5),
('tiptoe_tales', 'Tiptoe Tales','#fb923c', '#7c2d12', 'Stories through feet · Dance · Cinema', 8.99, true, 4800, 124, 14),
('nail_fairy',   'Nail Fairy',  '#f87171', '#7f1d1d', '💅 Nail artist · Weekly tutorials', 6.99, false, 1500, 56, 9),
('foot_zen',     'Foot Zen',    '#a78bfa', '#4c1d95', 'Foot yoga · Wellness · Meditation', 3.99, false, 920, 34, 3);
