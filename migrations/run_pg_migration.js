/**
 * PostgreSQL 직접 연결 마이그레이션 스크립트
 * Supabase Pooler를 통한 직접 SQL 실행
 */
const { Client } = require('pg');

// Supabase Direct Connection (Transaction mode via Supavisor)
// Password needs to be the database password from Supabase project settings
const CONNECTION_STRING = process.argv[2];

if (!CONNECTION_STRING) {
    console.log('======================================');
    console.log('❌ 데이터베이스 비밀번호가 필요합니다');
    console.log('======================================\n');
    console.log('사용법:');
    console.log('  node run_pg_migration.js "postgresql://postgres.hgxblbbjlnsfkffwvfao:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"\n');
    console.log('비밀번호 확인 방법:');
    console.log('  1. https://supabase.com/dashboard/project/hgxblbbjlnsfkffwvfao/settings/database 접속');
    console.log('  2. "Connection string" > "URI" 복사');
    console.log('  3. 또는 Database Settings > Database password 확인\n');

    console.log('📋 또는 Supabase SQL Editor에서 직접 실행:');
    console.log('  https://supabase.com/dashboard/project/hgxblbbjlnsfkffwvfao/sql/new');
    console.log('  파일: f:\\cursor\\datapool\\migrations\\001_trend_platform_extension.sql');
    process.exit(1);
}

const statements = [
    {
        label: 'categories 테이블 생성',
        sql: `CREATE TABLE IF NOT EXISTS categories (
      id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      platform      TEXT NOT NULL DEFAULT 'oliveyoung',
      category_code TEXT NOT NULL,
      name_ko       TEXT NOT NULL,
      name_en       TEXT,
      name_vi       TEXT,
      parent_code   TEXT,
      depth         INT NOT NULL DEFAULT 0,
      sort_order    INT NOT NULL DEFAULT 0,
      is_active     BOOLEAN NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(platform, category_code)
    )`
    },
    {
        label: 'profiles 확장 - subscription_tier',
        sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'`
    },
    {
        label: 'profiles 확장 - subscription_expires_at',
        sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ`
    },
    {
        label: 'profiles 확장 - preferred_language',
        sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'vi'`
    },
    {
        label: 'profiles 확장 - preferred_categories',
        sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_categories JSONB DEFAULT '[]'`
    },
    {
        label: 'saved_products 테이블 생성',
        sql: `CREATE TABLE IF NOT EXISTS saved_products (
      id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      product_id  BIGINT NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,
      memo        TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, product_id)
    )`
    },
    {
        label: 'trend_reports 테이블 생성',
        sql: `CREATE TABLE IF NOT EXISTS trend_reports (
      id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
      report_type   TEXT NOT NULL DEFAULT 'weekly',
      title         TEXT NOT NULL,
      description   TEXT,
      report_date   DATE NOT NULL,
      file_url      TEXT,
      metadata_json JSONB DEFAULT '{}',
      is_public     BOOLEAN NOT NULL DEFAULT false,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
    },
    {
        label: '인덱스 - rank_snapshots (product, date)',
        sql: `CREATE INDEX IF NOT EXISTS idx_rank_snapshots_product_date ON rank_snapshots(product_id, snapshot_date DESC)`
    },
    {
        label: '인덱스 - rank_snapshots (date, source)',
        sql: `CREATE INDEX IF NOT EXISTS idx_rank_snapshots_date_source ON rank_snapshots(snapshot_date, source)`
    },
    {
        label: '인덱스 - deals_snapshots (product, date)',
        sql: `CREATE INDEX IF NOT EXISTS idx_deals_snapshots_product_date ON deals_snapshots(product_id, snapshot_date DESC)`
    },
    {
        label: '인덱스 - deals_snapshots (date)',
        sql: `CREATE INDEX IF NOT EXISTS idx_deals_snapshots_date ON deals_snapshots(snapshot_date DESC)`
    },
    {
        label: '인덱스 - daily_rankings_v2 (date, category)',
        sql: `CREATE INDEX IF NOT EXISTS idx_daily_rankings_v2_date_cat ON daily_rankings_v2(date, category_code)`
    },
    {
        label: '인덱스 - daily_rankings_v2 (product)',
        sql: `CREATE INDEX IF NOT EXISTS idx_daily_rankings_v2_product ON daily_rankings_v2(product_id, date DESC)`
    },
    {
        label: '인덱스 - saved_products (user)',
        sql: `CREATE INDEX IF NOT EXISTS idx_saved_products_user ON saved_products(user_id)`
    },
    {
        label: '인덱스 - products_master (source)',
        sql: `CREATE INDEX IF NOT EXISTS idx_products_master_source ON products_master(source)`
    },
    {
        label: '뷰 - v_trending_7d (7일 급상승)',
        sql: `CREATE OR REPLACE VIEW v_trending_7d AS
WITH ranked AS (
  SELECT rs.product_id, rs.rank, rs.snapshot_date, rs.category,
    ROW_NUMBER() OVER (PARTITION BY rs.product_id ORDER BY rs.snapshot_date DESC) AS rn_recent,
    ROW_NUMBER() OVER (PARTITION BY rs.product_id ORDER BY rs.snapshot_date ASC)  AS rn_oldest
  FROM rank_snapshots rs
  WHERE rs.snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
),
today AS (
  SELECT product_id, rank AS current_rank, category FROM ranked WHERE rn_recent = 1
),
week_ago AS (
  SELECT product_id, rank AS previous_rank FROM ranked WHERE rn_oldest = 1
)
SELECT t.product_id, pm.name, pm.brand, pm.image_url, pm.url, pm.price,
  t.current_rank, w.previous_rank,
  (w.previous_rank - t.current_rank) AS rank_change,
  t.category AS category_code
FROM today t
JOIN week_ago w ON t.product_id = w.product_id
JOIN products_master pm ON t.product_id = pm.id
WHERE w.previous_rank > t.current_rank
ORDER BY rank_change DESC`
    },
    {
        label: '뷰 - v_top_deals_today (최대 할인)',
        sql: `CREATE OR REPLACE VIEW v_top_deals_today AS
SELECT ds.product_id, pm.name, pm.brand, pm.image_url, pm.url,
  ds.original_price, ds.deal_price, ds.discount_rate,
  CASE
    WHEN ds.original_price > 0 AND ds.deal_price > 0
    THEN ROUND(((ds.original_price - ds.deal_price) / ds.original_price) * 100, 1)
    ELSE ds.discount_rate
  END AS calculated_discount_pct
FROM deals_snapshots ds
JOIN products_master pm ON ds.product_id = pm.id
WHERE ds.snapshot_date = CURRENT_DATE
ORDER BY calculated_discount_pct DESC NULLS LAST`
    },
    {
        label: '뷰 - v_review_growth (리뷰 급증)',
        sql: `CREATE OR REPLACE VIEW v_review_growth AS
SELECT pm.id AS product_id, pm.name, pm.brand, pm.image_url, pm.url,
  (pm.tags->>'review_count')::INT AS review_count,
  (pm.tags->>'review_rating')::NUMERIC AS review_rating,
  pm.price, pm.updated_at
FROM products_master pm
WHERE pm.tags->>'review_count' IS NOT NULL
  AND (pm.tags->>'review_count')::INT > 100
ORDER BY (pm.tags->>'review_count')::INT DESC`
    },
    {
        label: 'RLS - saved_products 활성화',
        sql: `ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY`
    },
    {
        label: 'RLS 정책 - saved_products SELECT',
        sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_products' AND policyname='Users can view own saved products') THEN CREATE POLICY "Users can view own saved products" ON saved_products FOR SELECT USING (auth.uid() = user_id); END IF; END $$`
    },
    {
        label: 'RLS 정책 - saved_products INSERT',
        sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_products' AND policyname='Users can insert own saved products') THEN CREATE POLICY "Users can insert own saved products" ON saved_products FOR INSERT WITH CHECK (auth.uid() = user_id); END IF; END $$`
    },
    {
        label: 'RLS 정책 - saved_products DELETE',
        sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_products' AND policyname='Users can delete own saved products') THEN CREATE POLICY "Users can delete own saved products" ON saved_products FOR DELETE USING (auth.uid() = user_id); END IF; END $$`
    },
    {
        label: 'RLS - trend_reports 활성화',
        sql: `ALTER TABLE trend_reports ENABLE ROW LEVEL SECURITY`
    },
    {
        label: 'RLS 정책 - trend_reports SELECT',
        sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='trend_reports' AND policyname='Users can view own or public reports') THEN CREATE POLICY "Users can view own or public reports" ON trend_reports FOR SELECT USING (auth.uid() = user_id OR is_public = true); END IF; END $$`
    },
    {
        label: 'RLS - categories 활성화',
        sql: `ALTER TABLE categories ENABLE ROW LEVEL SECURITY`
    },
    {
        label: 'RLS 정책 - categories SELECT',
        sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='Authenticated users can view categories') THEN CREATE POLICY "Authenticated users can view categories" ON categories FOR SELECT USING (auth.role() = 'authenticated'); END IF; END $$`
    },
    {
        label: '올리브영 카테고리 시드 데이터',
        sql: `INSERT INTO categories (platform, category_code, name_ko, name_en, name_vi, depth, sort_order) VALUES
    ('oliveyoung', '100000100010000', '전체', 'All Categories', 'Tất cả', 0, 0),
    ('oliveyoung', '10000010001', '스킨케어', 'Skincare', 'Chăm sóc da', 1, 1),
    ('oliveyoung', '10000010002', '마스크팩', 'Mask Pack', 'Mặt nạ', 1, 2),
    ('oliveyoung', '10000010003', '클렌징', 'Cleansing', 'Tẩy trang', 1, 3),
    ('oliveyoung', '10000010004', '선케어', 'Sun Care', 'Chống nắng', 1, 4),
    ('oliveyoung', '10000010005', '메이크업', 'Makeup', 'Trang điểm', 1, 5),
    ('oliveyoung', '10000010006', '립메이크업', 'Lip Makeup', 'Son môi', 1, 6),
    ('oliveyoung', '10000010007', '남성화장품', 'Men Cosmetics', 'Mỹ phẩm nam', 1, 7),
    ('oliveyoung', '10000010008', '더모코스메틱', 'Dermocosmetics', 'Dược mỹ phẩm', 1, 8),
    ('oliveyoung', '10000010009', '헤어케어', 'Hair Care', 'Chăm sóc tóc', 1, 9),
    ('oliveyoung', '10000010010', '바디케어', 'Body Care', 'Chăm sóc cơ thể', 1, 10),
    ('oliveyoung', '10000010011', '향수/디퓨저', 'Perfume/Diffuser', 'Nước hoa', 1, 11),
    ('oliveyoung', '10000010012', '미용소품', 'Beauty Tools', 'Dụng cụ làm đẹp', 1, 12),
    ('oliveyoung', '10000010013', '건강식품', 'Health Food', 'Thực phẩm sức khỏe', 1, 13)
    ON CONFLICT (platform, category_code) DO NOTHING`
    }
];

async function main() {
    console.log('======================================');
    console.log('트렌드 인텔리전스 DB 마이그레이션');
    console.log('======================================\n');

    const client = new Client({ connectionString: CONNECTION_STRING });

    try {
        console.log('🔌 PostgreSQL 연결 중...');
        await client.connect();
        console.log('✅ 연결 성공!\n');

        let success = 0;
        let skipped = 0;
        let failed = 0;

        for (let i = 0; i < statements.length; i++) {
            const { label, sql } = statements[i];
            try {
                await client.query(sql);
                console.log(`✅ [${i + 1}/${statements.length}] ${label}`);
                success++;
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log(`⏭️  [${i + 1}/${statements.length}] ${label} (이미 존재)`);
                    skipped++;
                } else {
                    console.log(`❌ [${i + 1}/${statements.length}] ${label}`);
                    console.log(`   에러: ${err.message}`);
                    failed++;
                }
            }
        }

        console.log('\n======================================');
        console.log(`📊 결과: ✅ 성공 ${success} | ⏭️ 스킵 ${skipped} | ❌ 실패 ${failed}`);
        console.log('======================================\n');

        // Verification: Check tables exist
        console.log('🔍 검증 중...');
        const verify = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('categories', 'saved_products', 'trend_reports')
      ORDER BY table_name
    `);
        console.log(`\n📋 새 테이블: ${verify.rows.map(r => r.table_name).join(', ')}`);

        const verifyCols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name IN ('subscription_tier', 'subscription_expires_at', 'preferred_language', 'preferred_categories')
      ORDER BY column_name
    `);
        console.log(`📋 profiles 새 컬럼: ${verifyCols.rows.map(r => r.column_name).join(', ')}`);

        const verifyViews = await client.query(`
      SELECT table_name FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name IN ('v_trending_7d', 'v_top_deals_today', 'v_review_growth')
      ORDER BY table_name
    `);
        console.log(`📋 트렌드 뷰: ${verifyViews.rows.map(r => r.table_name).join(', ')}`);

        const verifyCats = await client.query(`SELECT COUNT(*) as cnt FROM categories`);
        console.log(`📋 카테고리 시드 데이터: ${verifyCats.rows[0].cnt}건`);

        const verifyIdx = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
      ORDER BY indexname
    `);
        console.log(`📋 성능 인덱스: ${verifyIdx.rows.length}개\n`);

        console.log('🎉 마이그레이션 완료!');

    } catch (err) {
        console.error('❌ 연결 실패:', err.message);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
