#!/usr/bin/env python3
"""
K-Vant Foresight V2: Multi-Sector Trend Builder Engine (Gemini-Powered)
Analyzes Beauty / Fashion / Lifestyle sectors independently,
matches products, generates localized pitches, and renders a premium PDF.
"""
import os, sys, json, re, requests, time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from jinja2 import Environment, FileSystemLoader
from playwright.sync_api import sync_playwright
import google.generativeai as genai

dashboard_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(dashboard_dir)
from generic_crawler.config import SUPABASE_URL, HEADERS

load_dotenv(os.path.join(dashboard_dir, ".env"))

# ── Gemini API Setup ────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.5-flash-lite"]

def gemini_call(prompt, temperature=0.3, retries=2):
    """Call Gemini API with automatic model fallback and retry."""
    for model_name in GEMINI_MODELS:
        for attempt in range(retries):
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=temperature,
                        response_mime_type="application/json",
                    )
                )
                text = response.text.strip()
                if text.startswith("```json"):
                    text = text.split("```json")[1].split("```")[0].strip()
                elif text.startswith("```"):
                    text = text.split("```")[1].split("```")[0].strip()
                return json.loads(text)
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower():
                    print(f"  ⏳ Rate limited on {model_name}, waiting 15s...")
                    time.sleep(15)
                    continue
                elif "json" in error_str.lower() or "Expecting" in error_str:
                    print(f"  ⚠️ JSON parse error, retrying...")
                    time.sleep(3)
                    continue
                else:
                    print(f"  ⚠️ {model_name} error: {e}")
                    break
    raise Exception("All Gemini models failed")

# ── Sector Definitions ──────────────────────────────────────────
SECTORS = {
    "beauty": {
        "label": "K-Beauty",
        "emoji": "💄",
        "desc": "스킨케어, 메이크업, 헤어/바디케어",
        "trend_sources": ["naver_datalab", "google_trends"],
        "product_sources": ["oliveyoung", "ssg"],
        "ssg_filter": "BEAUTY",
    },
    "fashion": {
        "label": "K-Fashion",
        "emoji": "👗",
        "desc": "의류, 잡화, 신발, 가방",
        "trend_sources": ["naver_datalab", "google_trends"],
        "product_sources": ["musinsa", "ably"],
        "ssg_filter": "FASHION",
    },
    "lifestyle": {
        "label": "K-Lifestyle",
        "emoji": "🏠",
        "desc": "럭셔리, 키즈, 푸드, 리빙",
        "trend_sources": ["naver_datalab", "google_trends", "naver_best"],
        "product_sources": ["ssg", "naver_best"],
        "ssg_filter": "LUXURY,KIDS,FOOD_LIFE",
    },
}


# ── STEP 1: Get Trend Signals ───────────────────────────────────
def get_trend_signals(sector_key):
    cfg = SECTORS[sector_key]
    src_filter = ",".join(cfg["trend_sources"])
    seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/products_master", headers=HEADERS,
            params={
                "source": f"in.({src_filter})",
                "created_at": f"gte.{seven_days_ago}",
                "order": "created_at.desc", "limit": 50
            })
        res.raise_for_status()
        return res.json()
    except Exception as e:
        print(f"  ❌ Trend fetch error: {e}")
        return []


# ── STEP 1b: Get Top Ranking Products ───────────────────────────
def get_top_products(sector_key=None, platform=None, limit=30):
    all_products = []
    sources = []
    if sector_key:
        sources.extend(SECTORS[sector_key]["product_sources"])
    if platform:
        sources = [platform]

    for src in sources:
        params = {
            "source": f"eq.{src}",
            "order": "created_at.desc",
            "limit": limit,
            "select": "id,name,brand,price,image_url,url,source,category,ai_summary"
        }
        if sector_key and src == "ssg" and SECTORS[sector_key].get("ssg_filter"):
            ssg_cats = SECTORS[sector_key]["ssg_filter"].split(",")
            params["category"] = f"in.({','.join(ssg_cats)})"
        try:
            res = requests.get(f"{SUPABASE_URL}/rest/v1/products_master",
                               headers=HEADERS, params=params)
            res.raise_for_status()
            all_products.extend(res.json())
        except Exception as e:
            print(f"  ⚠️ {src} fetch error: {e}")
    return all_products

# ── NEW: Platform Radar Analysis ─────────────────────────────────
def analyze_platforms():
    print(f"\n{'─'*60}\n📡 Platform Trend Radar Analysis\n{'─'*60}")
    platforms = {"oliveyoung": "K-Beauty (성분/효능 위주)", "musinsa": "K-Fashion (소재/패핏 위주)", "ably": "K-Fashion (트렌드/디테일 위주)"}
    radar_results = []
    
    for pf, desc in platforms.items():
        print(f"  🔍 Analyzing {pf}...")
        prods = get_top_products(platform=pf, limit=50)
        if not prods:
            continue
        
        context = "\n".join([f"- {p.get('brand','')} {p.get('name','')} ({p.get('category','')})" for p in prods[:50]])
        prompt = f"""당신은 B2B 커머스 플랫폼 K-Vant의 최고 데이터 분석가입니다.
아래는 최근 7일간 한국 1위 쇼핑몰 [{pf}]의 랭킹 상품 리스트입니다. ({desc})

이 리스트를 분석해서 지금 이 플랫폼을 지배하는 **단 하나의 가장 강력한 메가 키워드(성분, 소재, 핏 등)**를 찾으세요.

출력 형식 (JSON만):
{{
  "platform": "{pf}",
  "mega_keyword": "핵심 키워드 1개 (예: PDRN, 나일론, 와이드핏)",
  "analysis": "왜 이 키워드가 지배적인지, 관련 상품 점유율은 어떤지 등 동남아 바이어가 솔깃할 만한 B2B 전문 비즈니스 분석 (2문장 이내)"
}}

[상품 리스트]:
{context}
"""
        try:
            res = gemini_call(prompt, 0.3)
            radar_results.append(res)
            print(f"     ✅ {res.get('mega_keyword')}: {res.get('analysis')}")
        except Exception as e:
            print(f"     ❌ Analysis failed: {e}")
            
    return radar_results

def generate_executive_brief(radar_results):
    print(f"\n  ✍️ Generating Executive Sourcing Brief...")
    context = "\n".join([f"[{r['platform']}] {r['mega_keyword']}: {r['analysis']}" for r in radar_results])
    prompt = f"""당신은 동남아 K-뷰티/패션 리셀러(도매 바이어) 컨설턴트입니다.
아래 한국 주요 쇼핑몰의 메가 트렌드 3개를 종합해서, 
**이번 주에 동남아 바이어가 어떤 테마로 상품을 집중 매입(소싱)해야 하는지** 
단 1장의 'Executive Sourcing Brief' (강력한 1줄 헤드라인 + 2줄 부연설명)로 작성하세요.

출력 형식 (JSON만):
{{
  "headline": "이번 주 K-Vant 소싱 전략을 요약하는 강력한 1줄 (예: 건기 대비 스킨케어와 경량 린넨 동시 소싱 타이밍)",
  "description": "구체적으로 왜 이 아이템들을 묶어서 팔아야 마진이 남는지 세일즈 관점의 2줄 설명"
}}

[플랫폼 분석 결과]:
{context}
"""
    try:
        return gemini_call(prompt, 0.5)
    except Exception as e:
        print(f"  ❌ Exec Brief failed: {e}")
        return {"headline": "K-Market Premium Intelligence", "description": "Latest trends applied."}

# ── STEP 2: Extract Sector Trend ────────────────────────────────
def extract_sector_trend(sector_key, trend_signals, shop_products):
    cfg = SECTORS[sector_key]
    print(f"  🤖 Gemini analyzing {cfg['label']} trend...")

    context = ""
    for s in trend_signals[:25]:
        name = s.get("name", "")
        insight = ""
        ai_summary = s.get("ai_summary")
        if isinstance(ai_summary, dict):
            insight = ai_summary.get("insight", "")
        context += f"- [{s.get('source')}] {name} {f': {insight}' if insight else ''}\n"

    context += "\n[쇼핑몰 인기 상품 TOP 15]:\n"
    for p in shop_products[:15]:
        context += f"- [{p.get('source')}] {p.get('brand','')} {p.get('name','')}"
        if p.get('category'):
            context += f" ({p['category']})"
        context += "\n"

    prompt = f"""당신은 한국 뷰티·패션 시장 전문 데이터 애널리스트입니다.

아래는 최근 7일간의 [{cfg['label']}] 섹터 관련 검색 트렌드와 쇼핑몰 인기 상품 데이터입니다.
이 섹터의 범위: {cfg['desc']}

이 데이터를 종합 분석하여, 지금 이 섹터에서 가장 주목할 만한 **핵심 트렌드 1개**를 도출해주세요.

중요 규칙:
1. 트렌드 키워드는 반드시 **쇼핑몰에서 검색 가능한 구체적 명사** (예: PDRN 앰플, 카고팬츠, 선스틱)
2. "친환경", "개인화" 같은 추상적 개념은 절대 안 됨 (동남아 바이어가 키워드만 보고 바로 도매 발주를 넣을 수 있어야 함)

[데이터]:
{context}

출력 형식 (JSON만):
{{
  "trend_keyword": "물건/아이템 형태의 구체적 명사 1개",
  "trend_summary": "왜 이 트렌드가 한국에서 뜨는지 명확한 데이터(랭킹, 검색량 등) 기반 1문장",
  "key_elements": ["연관 구체 해시태그1", "해시태그2", "해시태그3"],
  "b2b_sourcing_reason": "★★동남아 도매 바이어가 왜 이 아이템을 지금 당장 팔아야 돈이 되는지(마진, 현지 계절/문화 부합성 등) 비즈니스 세일즈 관점 2문장★★",
  "moq_suggestion": "테스트 발주 50~100ea 추천 (또는 품목별 적정 권장 수량)"
}}"""

    try:
        result = gemini_call(prompt, 0.4)
        time.sleep(3)  # Rate limit buffer
        return result
    except Exception as e:
        print(f"  ❌ Trend extraction failed: {e}")
        return None


# ── STEP 3: Match Products ──────────────────────────────────────
def match_products(sector_key, trend_data, shop_products):
    cfg = SECTORS[sector_key]
    keyword = trend_data.get("trend_keyword", "")
    elements = trend_data.get("key_elements", [])
    print(f"  🔍 Matching products for '{keyword}'...")

    if not shop_products:
        return []

    product_list = ""
    for p in shop_products[:30]:
        price_str = f"₩{int(p.get('price',0)):,}" if p.get('price') else ""
        product_list += f"- [ID:{p['id']}] {p.get('brand','')} | {p.get('name','')} | {price_str} | {p.get('source','')}\n"

    prompt = f"""당신은 동남아시아(베트남, 태국) B2B 셀러에게 한국 상품을 추천하는 소싱 큐레이터입니다.

[현재 트렌드]: {keyword}
[트렌드 특성]: {', '.join(elements)}

[후보 상품 리스트]:
{product_list}

위 후보 중에서 이 트렌드에 가장 완벽하게 부합하는 상품 최대 **3개**를 선정하세요.
선택 기준 (매우 중요):
1. [최우선] 상품 자체가 트렌드 키워드와 직접적인 관련이 있어야 합니다. 무관한 상품(예: 매트리스 트렌드인데 잠옷이나 프라이팬)은 절대 고르지 마세요. 무관한 상품은 match_score 0점을 부여하세요.
2. 연관된 상품이 3개가 안 된다면 1개나 2개만 반환해도 좋습니다. 억지로 끼워 맞추지 마세요.
3. 가격 경쟁력과 동남아 셀러 소싱 적합성.

출력 (JSON배열만):
[
  {{"id": "상품ID", "match_score": 95, "match_reason": "왜 이 상품이 트렌드에 적합한지 구체적 1줄"}}
]"""

    try:
        scored = gemini_call(prompt, 0.2)
        time.sleep(3)

        if isinstance(scored, dict):
            for v in scored.values():
                if isinstance(v, list):
                    scored = v
                    break
            else:
                scored = [scored]
        if not isinstance(scored, list):
            scored = []

        results = []
        for m in scored:
            if not isinstance(m, dict) or 'id' not in m:
                continue
            # 무관한 상품 컷 오프 (예: 매트리스에 잠옷/후라이팬 방지)
            if int(m.get('match_score', 0)) < 60:
                continue
            orig = next((p for p in shop_products if str(p['id']) == str(m['id'])), None)
            if orig:
                orig.update(m)
                results.append(orig)
        return sorted(results, key=lambda x: x.get('match_score', 0), reverse=True)[:3]
    except Exception as e:
        print(f"  ❌ Matching failed: {e}")
        return []


# ── STEP 4: Marketing Pitch ────────────────────────────────────
def generate_pitch(product, trend_data):
    print(f"  ✍️ Generating pitch for [{product.get('brand','')} {product.get('name','')}]...")

    prompt = f"""당신은 동남아시아 마켓에서 한국 상품을 마케팅하는 전문 카피라이터입니다.

아래 한국 상품을 동남아 B2B 셀러가 자신의 고객(최종 소비자)에게 판매할 때 사용할 수 있는 
프리미엄 마케팅 문구를 3개 언어로 작성해주세요.

[상품]: {product.get('brand','')} - {product.get('name','')}
[가격]: ₩{int(product.get('price',0)):,} 
[트렌드 키워드]: {trend_data.get('trend_keyword','')}
[트렌드 요약]: {trend_data.get('trend_summary','')}

요구사항:
- 각 언어별로 자연스럽고 매력적인 네이티브 수준의 카피 (글로벌 바이어를 위한 영어 포함)
- 🇰🇷 한국어 (ko): 한국에서 인기 있다는 증거를 강조
- 🇺🇸 영어 (en): 동남아 범용 글로벌 소싱 카피 (세련된 톤)
- 🇹🇭 태국어 (th): 실제 태국어로 작성 (한국어 번역 느낌 배제)
- 🇻🇳 베트남어 (vi): 실제 베트남어로 작성 (한국어 번역 느낌 배제)
- 이모지를 적절히 사용하여 시선을 끌 것
- 각 문구는 SNS(Instagram, TikTok, Facebook)에 바로 쓸 수 있는 수준

출력 (JSON배열만):
[
  {{"language_code":"ko","headline":"한국어 헤드라인","key_reasons":["장점1","장점2","장점3"]}},
  {{"language_code":"en","headline":"영어 헤드라인","key_reasons":["장점1","장점2","장점3"]}},
  {{"language_code":"th","headline":"태국어 헤드라인","key_reasons":["장점1","장점2","장점3"]}},
  {{"language_code":"vi","headline":"베트남어 헤드라인","key_reasons":["장점1","장점2","장점3"]}}
]"""

    try:
        data = gemini_call(prompt, 0.4)
        time.sleep(3)
        if isinstance(data, dict):
            for v in data.values():
                if isinstance(v, list):
                    return v
            return [data]
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"  ❌ Pitch gen failed: {e}")
        return []


# ── MAIN PIPELINE ───────────────────────────────────────────────
def main():
    start = datetime.now()
    print(f"\n🚀 K-Vant Foresight V3 (B2B Sourcing Intelligence) — {start.strftime('%Y.%m.%d %H:%M')}")
    print("=" * 60)

    # 1. Platform & Executive Analysis
    radar_results = analyze_platforms()
    exec_brief = generate_executive_brief(radar_results)

    report_sections = []

    for sector_key, cfg in SECTORS.items():
        print(f"\n{'─'*60}")
        print(f"{cfg['emoji']}  [{cfg['label']}] sector pipeline starting...")
        print(f"{'─'*60}")

        # 1. Gather data
        trend_signals = get_trend_signals(sector_key)
        shop_products = get_top_products(sector_key)
        print(f"  📊 {len(trend_signals)} trend signals, {len(shop_products)} shop products")

        if not trend_signals and not shop_products:
            print("  ⚠️ No data — skipping sector")
            continue

        # 2. Extract trend
        trend = extract_sector_trend(sector_key, trend_signals, shop_products)
        if not trend:
            continue
        print(f"  🎯 Trend: {trend.get('trend_keyword')}")
        print(f"     {trend.get('trend_summary','')[:80]}...")

        # 3. Match products
        matched = match_products(sector_key, trend, shop_products)
        print(f"  🛍️ {len(matched)} products matched")

        # 4. Generate pitches for top match
        if matched:
            pitches = generate_pitch(matched[0], trend)
            matched[0]['marketing_pitches'] = pitches
            for pitch in pitches:
                if isinstance(pitch, dict):
                    print(f"     [{pitch.get('language_code','?').upper()}] {pitch.get('headline','')}")

        report_sections.append({
            "sector_key": sector_key,
            "label": cfg["label"],
            "emoji": cfg["emoji"],
            "trend": trend,
            "products": matched,
        })

    # ── Render HTML & PDF ──
    print(f"\n{'='*60}")
    print("🎨 Rendering Premium Report...")

    try:
        env = Environment(loader=FileSystemLoader(os.path.join(dashboard_dir, "report_generator")))
        template = env.get_template("premium_template_v2.html")

        html_content = template.render(
            report_date=datetime.now().strftime("%Y. %m. %d"),
            sections=report_sections,
            radar_results=radar_results,
            exec_brief=exec_brief,
        )

        report_dir = os.path.join(dashboard_dir, "report_generator")
        os.makedirs(report_dir, exist_ok=True)
        html_path = os.path.join(report_dir, f"kvant_foresight_v2_{datetime.now().strftime('%Y%m%d')}.html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"  ✅ HTML → {html_path}")

        pdf_path = html_path.replace(".html", ".pdf")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(f"file://{os.path.abspath(html_path)}", wait_until="networkidle")
            page.pdf(path=pdf_path, format="A4", print_background=True,
                     margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
            browser.close()
        print(f"  ✅ PDF → {pdf_path}")

    except Exception as e:
        print(f"  ❌ Render failed: {e}")

    duration = str(datetime.now() - start).split('.')[0]
    print(f"\n✅ Pipeline complete in {duration}")


if __name__ == "__main__":
    main()
