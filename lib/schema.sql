-- onlyfeet database schema
-- Copy this entire file into Supabase SQL Editor and run it once.

-- 1. creators table (foot content creators)
CREATE TABLE IF NOT EXISTS creators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#f472b6',
  cover_color  TEXT DEFAULT '#831843',
  bio         TEXT DEFAULT '',
  subscription_price NUMERIC(5,2) DEFAULT 4.99,
  verified    BOOLEAN DEFAULT false,
  subscriber_count INT DEFAULT 0,
  post_count  INT DEFAULT 0,
  short_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. shorts (TikTok-style short videos / galleries for creators)
CREATE TABLE IF NOT EXISTS shorts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID REFERENCES creators(id) ON DELETE CASCADE,
  type        TEXT CHECK (type IN ('video','gallery')) DEFAULT 'video',
  placeholder_color TEXT DEFAULT '#ec4899',
  images      JSONB DEFAULT '[]',           -- array of colors for gallery
  slide_duration NUMERIC(3,1) DEFAULT 3,
  bgm_title   TEXT DEFAULT 'Original Sound',
  bgm_artist  TEXT DEFAULT '',
  access      TEXT CHECK (access IN ('free','partial')) DEFAULT 'free',
  free_preview_sec INT DEFAULT 8,
  caption     TEXT DEFAULT '',
  hashtags    TEXT[] DEFAULT '{}',
  duration_sec INT DEFAULT 15,
  views       INT DEFAULT 0,
  likes       INT DEFAULT 0,
  comments    INT DEFAULT 0,
  shares      INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. posts (grid posts for subscribers)
CREATE TABLE IF NOT EXISTS posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID REFERENCES creators(id) ON DELETE CASCADE,
  type        TEXT CHECK (type IN ('image','video')) DEFAULT 'image',
  placeholder_color TEXT DEFAULT '#fbcfe8',
  caption     TEXT DEFAULT '',
  hashtags    TEXT[] DEFAULT '{}',
  likes       INT DEFAULT 0,
  comments    INT DEFAULT 0,
  is_locked   BOOLEAN DEFAULT false,
  is_ppv      BOOLEAN DEFAULT false,
  ppv_price   NUMERIC(5,2),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. subscriptions (user subscribes to creator)
CREATE TABLE IF NOT EXISTS subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  creator_id  UUID REFERENCES creators(id) ON DELETE CASCADE,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, creator_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_shorts_creator ON shorts(creator_id);
CREATE INDEX IF NOT EXISTS idx_posts_creator ON posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_id);
