import sys
import os
import json

# Add dashboard root to sys path
dashboard_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(dashboard_dir)

from generic_crawler.local_ai_helper import extract_tags, summarize_article

print("--- [1] Testing extract_tags (JSON) ---")
tags = extract_tags("올리브영 1등 수분크림 추천")
print(json.dumps(tags, indent=2, ensure_ascii=False))

print("\n--- [2] Testing summarize_article (Text) ---")
summary = summarize_article(
    "아모레퍼시픽, AI 맞춤형 뷰티 서비스 강화",
    "아모레퍼시픽이 인공지능 기술을 활용한 맞춤형 메이크업 서비스 '커스텀 매치'를 글로벌 시장에 본격적으로 확대한다고 밝혔다. 이 서비스는 사용자의 피부 톤과 상태를 정밀 분석하여 최적의 파운데이션 색상을 추천하고 즉석에서 조제해주는 것이 특징이다."
)
print(summary)
