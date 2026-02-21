/**
 * Supabase DB 마이그레이션 실행 스크립트
 * 
 * Supabase Management API를 통해 SQL 실행
 * https://supabase.com/docs/reference/api/v1
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';

// Split into individual statements to run them one at a time via rpc
const statements = [
  // 1. categories 테이블
  `CREATE TABLE IF NOT EXISTS categories (
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
  )`,

  // 2. profiles 확장
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'vi'`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_categories JSONB DEFAULT '[]'`,

  // 3. saved_products 테이블
  `CREATE TABLE IF NOT EXISTS saved_products (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id  BIGINT NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,
    memo        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, product_id)
  )`,

  // 4. trend_reports 테이블
  `CREATE TABLE IF NOT EXISTS trend_reports (
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
  )`,

  // 5. 인덱스들
  `CREATE INDEX IF NOT EXISTS idx_rank_snapshots_product_date ON rank_snapshots(product_id, snapshot_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_rank_snapshots_date_source ON rank_snapshots(snapshot_date, source)`,
  `CREATE INDEX IF NOT EXISTS idx_deals_snapshots_product_date ON deals_snapshots(product_id, snapshot_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_deals_snapshots_date ON deals_snapshots(snapshot_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_daily_rankings_v2_date_cat ON daily_rankings_v2(date, category_code)`,
  `CREATE INDEX IF NOT EXISTS idx_daily_rankings_v2_product ON daily_rankings_v2(product_id, date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_saved_products_user ON saved_products(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_master_source ON products_master(source)`,

  // 6. 뷰 - 7일 급상승
  `CREATE OR REPLACE VIEW v_trending_7d AS
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
ORDER BY rank_change DESC`,

  // 6-2. 오늘 최대 할인
  `CREATE OR REPLACE VIEW v_top_deals_today AS
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
ORDER BY calculated_discount_pct DESC NULLS LAST`,

  // 6-3. 리뷰 성장
  `CREATE OR REPLACE VIEW v_review_growth AS
SELECT pm.id AS product_id, pm.name, pm.brand, pm.image_url, pm.url,
  (pm.tags->>'review_count')::INT AS review_count,
  (pm.tags->>'review_rating')::NUMERIC AS review_rating,
  pm.price, pm.updated_at
FROM products_master pm
WHERE pm.tags->>'review_count' IS NOT NULL
  AND (pm.tags->>'review_count')::INT > 100
ORDER BY (pm.tags->>'review_count')::INT DESC`,

  // 7. RLS 정책
  `ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_products' AND policyname = 'Users can view own saved products') THEN
      CREATE POLICY "Users can view own saved products" ON saved_products FOR SELECT USING (auth.uid() = user_id);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_products' AND policyname = 'Users can insert own saved products') THEN
      CREATE POLICY "Users can insert own saved products" ON saved_products FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_products' AND policyname = 'Users can delete own saved products') THEN
      CREATE POLICY "Users can delete own saved products" ON saved_products FOR DELETE USING (auth.uid() = user_id);
    END IF;
  END $$`,

  `ALTER TABLE trend_reports ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trend_reports' AND policyname = 'Users can view own or public reports') THEN
      CREATE POLICY "Users can view own or public reports" ON trend_reports FOR SELECT USING (auth.uid() = user_id OR is_public = true);
    END IF;
  END $$`,

  `ALTER TABLE categories ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Authenticated users can view categories') THEN
      CREATE POLICY "Authenticated users can view categories" ON categories FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
  END $$`,

  // 8. 시드 데이터
  `INSERT INTO categories (platform, category_code, name_ko, name_en, name_vi, depth, sort_order) VALUES
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
];

// Use fetch (available in Node 22) to call Supabase pg_net or run SQL
// We'll use the undocumented but working endpoint for running SQL
async function runSQL(sql) {
  const url = new URL('/rest/v1/rpc/exec_sql', SUPABASE_URL);
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Alternative: use pg directly if available
async function runWithPg() {
  try {
    // Try to use postgres library
    const { Client } = require('pg');
    const client = new Client({
      connectionString: `postgresql://postgres.hgxblbbjlnsfkffwvfao:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`
    });
    await client.connect();
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await client.query(statements[i]);
        console.log(`✅ [${i+1}/${statements.length}] 성공`);
      } catch (err) {
        console.log(`⚠️  [${i+1}/${statements.length}] ${err.message}`);
      }
    }
    
    await client.end();
    return true;
  } catch (e) {
    return false;
  }
}

// Use fetch to execute via Supabase REST + service_role (DDL via postgrest not possible)
// Instead, create an RPC function first, then call it
async function createAndRunMigration() {
  // Step 1: Create a temporary migration function
  const migrationFnSQL = `
    CREATE OR REPLACE FUNCTION _run_migration(sql_text TEXT)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
      EXECUTE sql_text;
    END;
    $func$;
  `;

  // Try running via the rpc endpoint first
  try {
    // First create the helper function
    const createFnData = JSON.stringify({ query: migrationFnSQL });
    
    // Use the postgREST RPC to call it
    console.log('🔧 마이그레이션 헬퍼 함수 생성 시도...');
    
    // Actually, let's try a simpler approach - use the Supabase SQL API
    // The management API endpoint for running SQL
    const projectRef = 'hgxblbbjlnsfkffwvfao';
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const label = stmt.substring(0, 60).replace(/\n/g, ' ').trim();
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_run_migration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ sql_text: stmt })
        });
        
        if (response.ok) {
          console.log(`✅ [${i+1}/${statements.length}] ${label}...`);
        } else {
          const errBody = await response.text();
          console.log(`⚠️  [${i+1}/${statements.length}] ${label}... => ${errBody.substring(0, 150)}`);
        }
      } catch (err) {
        console.log(`❌ [${i+1}/${statements.length}] ${label}... => ${err.message}`);
      }
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
  }
}

// First try to create the migration helper function
async function setup() {
  console.log('======================================');
  console.log('트렌드 인텔리전스 DB 마이그레이션');
  console.log('======================================\n');

  // Create the helper function first
  const helperSQL = `CREATE OR REPLACE FUNCTION _run_migration(sql_text TEXT) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE sql_text; END; $$`;
  
  try {
    // We need to create the function via some mechanism first
    // Let's check if pg is available
    try {
      require.resolve('pg');
      console.log('pg 모듈 발견, PostgreSQL 직접 연결 시도...');
      const success = await runWithPg();
      if (success) return;
    } catch(e) {
      // pg not available
    }
    
    // Check if the _run_migration function already exists
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_run_migration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ sql_text: 'SELECT 1' })
    });
    
    if (checkRes.ok || checkRes.status === 204) {
      console.log('✅ _run_migration 함수 사용 가능, 마이그레이션 시작...\n');
      await createAndRunMigration();
    } else {
      const errText = await checkRes.text();
      if (errText.includes('Could not find the function') || errText.includes('404')) {
        console.log('❌ _run_migration 함수가 없습니다.');
        console.log('');
        console.log('📋 Supabase 대시보드에서 아래 단계를 수행해주세요:');
        console.log('');
        console.log('1. https://supabase.com/dashboard/project/hgxblbbjlnsfkffwvfao/sql/new 접속');
        console.log('2. 아래 SQL 먼저 실행:');
        console.log('');
        console.log(helperSQL);
        console.log('');
        console.log('3. 그런 다음 이 스크립트를 다시 실행하세요.');
        console.log('');
        console.log('또는, 전체 마이그레이션 SQL을 직접 실행:');
        console.log(`f:\\cursor\\datapool\\migrations\\001_trend_platform_extension.sql`);
      } else {
        console.log('응답:', errText.substring(0, 300));
      }
    }
  } catch(err) {
    console.error('설정 실패:', err.message);
  }
}

setup().catch(console.error);
