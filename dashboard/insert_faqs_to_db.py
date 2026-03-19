import os
import requests
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

faqs = [
    {
        "question_en": "Do I need to know Korean to use K-Vant?",
        "question_ko": "한국어를 몰라도 K-Vant를 사용할 수 있나요?",
        "answer_en": "Not at all. All ranking data, product names, and AI review analysis are fully translated into English, Thai, Vietnamese, Indonesian, and Filipino.",
        "answer_ko": "전혀 필요하지 않습니다. 모든 랭킹 데이터, 상품명, AI 리뷰 분석은 영어, 태국어, 베트남어, 인도네시아어, 타갈로그어로 완벽하게 자동 번역되어 제공됩니다.",
        "sort_order": 1,
        "is_published": True
    },
    {
        "question_en": "How often is the ranking data updated?",
        "question_ko": "랭킹 데이터는 얼마나 자주 업데이트되나요?",
        "answer_en": "Daily for product rankings. Trending alerts and rank changes update near real-time throughout the day so you always have the freshest picture.",
        "answer_ko": "상품 랭킹은 매일 업데이트됩니다. 급상승 트렌드나 순위 변동 시그널은 하루 중 거의 실시간으로 반영되어 가장 최신 시장 동향을 파악할 수 있습니다.",
        "sort_order": 2,
        "is_published": True
    },
    {
        "question_en": "Which Korean platforms do you cover?",
        "question_ko": "어떤 한국 쇼핑 플랫폼의 데이터를 제공하나요?",
        "answer_en": "Currently Olive Young, Musinsa, Ably, Shinsegae & Naver Shopping — plus our Global K-Beauty Trends and Steady Sellers intelligence layers.",
        "answer_ko": "현재 올리브영, 무신사, 에이블리, SSG, 네이버 쇼핑을 지원하며, 이에 더해 글로벌 K-뷰티 트렌드와 스테디셀러 분석 데이터까지 종합 제공합니다.",
        "sort_order": 3,
        "is_published": True
    },
    {
        "question_en": "Is there a long-term commitment?",
        "question_ko": "장기 구독 약정이 필요한가요?",
        "answer_en": "No. Monthly subscription, cancel anytime from your dashboard. The 14-day free trial requires no credit card at all — just sign up and start exploring.",
        "answer_ko": "아닙니다. 언제든 대시보드에서 원클릭으로 취소할 수 있는 월간 구독 방식입니다. 첫 14일 무료 체험 기간에는 카드 정보 등록조차 필요 없으니 안심하고 둘러보세요.",
        "sort_order": 4,
        "is_published": True
    },
    {
        "question_en": "What's the difference between Free and Pro?",
        "question_ko": "Free 플랜과 Pro 플랜의 차이점이 무엇인가요?",
        "answer_en": "Free gives you top 4 rankings and basic product data for 14 days — no credit card needed. Pro unlocks full rankings, 30-day trend graphs, AI review analysis, and Trending Now signals, all for just $14.99/month.",
        "answer_ko": "Free는 14일간 각 플랫폼별 상위 4위 랭킹과 기본 데이터를 결제수단 없이 열람 가능합니다. Pro($14.99/월)는 전체 랭킹, 30일 가격/순위 트렌드 그래프, AI 리뷰 분석, 실시간 급상승 시그널 도구를 무제한 제공합니다.",
        "sort_order": 5,
        "is_published": True
    },
    {
        "question_en": "Is there an Enterprise or Team plan?",
        "question_ko": "기업용(엔터프라이즈)이나 팀 요금제가 있나요?",
        "answer_en": "Our Enterprise plan is currently in planning and not yet open. Join the waitlist to get early access and founding member pricing. Details will be announced soon.",
        "answer_ko": "엔터프라이즈 요금제는 기획 단계이며 아직 정식 오픈되지 않았습니다. 추후 별도 공지 예정이며, 요청 시 대기자 명단에 등록하시어 창립 멤버 특별가 혜택을 받으실 수 있습니다.",
        "sort_order": 6,
        "is_published": True
    }
]

def main():
    # Delete existing FAQs so we don't have duplicates
    res = requests.get(f"{SUPABASE_URL}/rest/v1/support_faqs?select=id", headers=HEADERS)
    if res.status_code == 200:
        for item in res.json():
            requests.delete(f"{SUPABASE_URL}/rest/v1/support_faqs?id=eq.{item['id']}", headers=HEADERS)
    
    # Insert new FAQs
    res_post = requests.post(f"{SUPABASE_URL}/rest/v1/support_faqs", headers=HEADERS, json=faqs)
    print("Insertion Status:", res_post.status_code)
    if res_post.status_code in [200, 201]:
        print("Success!")
    else:
        print(res_post.text)

if __name__ == "__main__":
    main()
