-- ====== 评论区 ======
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  short_id UUID REFERENCES shorts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c1" ON comments FOR SELECT USING (true);
CREATE POLICY "c2" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "c3" ON comments FOR DELETE USING (true);

-- ====== 收藏 ======
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  short_id UUID REFERENCES shorts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, short_id)
);
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "b1" ON bookmarks FOR SELECT USING (true);
CREATE POLICY "b2" ON bookmarks FOR INSERT WITH CHECK (true);
CREATE POLICY "b3" ON bookmarks FOR DELETE USING (true);

-- ====== 通知 ======
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  actor_name TEXT,
  actor_avatar TEXT,
  reference_id UUID,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "n1" ON notifications FOR SELECT USING (true);
CREATE POLICY "n2" ON notifications FOR INSERT WITH CHECK (true);
