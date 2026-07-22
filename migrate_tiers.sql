ALTER TABLE creators ADD COLUMN IF NOT EXISTS tiers JSONB DEFAULT '[]'::jsonb;

UPDATE creators SET tiers = '[
  {"name":"免费","price":0,"badge":"","perks":["看动态","看免费作品"]},
  {"name":"基础","price":9.99,"badge":"💎","perks":["解锁基础视频","专属动态","留言权限"]},
  {"name":"高级","price":19.99,"badge":"✨","perks":["解锁付费内容","私信","专属徽章","提前看新内容"]}
]'::jsonb WHERE tiers IS NULL OR tiers = '[]'::jsonb;
