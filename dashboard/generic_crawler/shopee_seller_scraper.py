import asyncio
import aiohttp
from playwright.async_api import async_playwright
import re

# 구글 앱 스크립트 웹앱 주소
GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwVtmmpkf1XiCKkItOhNeFyjKGRbd9dWT-DJK2PnHNXY_DQL2pEuIjc9Az4hWIn_YpqkA/exec"

# 정규표현식
EMAIL_REGEX = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
IG_REGEX = r'(?:IG|Insta|Instagram)\s*[:\-]?\s*@?([a-zA-Z0-9_.]+)'
FB_REGEX = r'(?:FB|Facebook|fb\.com)\s*[:\-]?\s*(?:https?:\/\/(?:www\.)?facebook\.com\/)?([a-zA-Z0-9_.]+)'
TIKTOK_REGEX = r'(?:TikTok|TT)\s*[:\-]?\s*@?([a-zA-Z0-9_.]+)'

async def fetch_target_list(session):
    """ 앱 스크립트에서 스크래핑 대상(펜딩 상태) 리스트 가져오기 """
    try:
        async with session.get(GAS_WEBAPP_URL) as response:
            data = await response.json()
            if data.get('success'):
                # 상태가 'pending'이거나 아직 크롤링 안 한 항목만 필터링
                targets = [item for item in data.get('list', []) if item.get('url')]
                # 이미 수집완료된 항목을 거를 로직을 넣거나 전체를 다 돌리도록 할 수 있습니다.
                # 편의상 'status'가 'pending'인 데이터만 스크래핑하게 설정
                targets = [item for item in targets if item.get('status') == 'pending']
                return targets
            else:
                print(f"❌ [에러] 데이터를 불러오지 못했습니다: {data.get('error')}")
                return []
    except Exception as e:
        print(f"❌ [HTTP 에러]: {e}")
        return []

async def update_contacts_to_gas(session, item_id, contacts):
    """ 앱 스크립트로 추출 결과 전송 (POST) """
    payload = {
        "action": "update_contacts",
        "id": item_id,
        "contacts": contacts
    }
    try:
        async with session.post(GAS_WEBAPP_URL, json=payload, headers={'Content-Type': 'application/json'}) as response:
            data = await response.json()
            if data.get('success'):
                print(f"  ✅ 구글 시트에 업데이트 완료!")
            else:
                print(f"  ⚠️ 구글 시트 업데이트 실패: {data.get('error')}")
    except Exception as e:
        print(f"  ❌ [HTTP 요청 에러] 구글 시트 저장 실패: {e}")


async def scrape_shopee_shops():
    async with aiohttp.ClientSession() as session:
        print("📥 구글 시트에서 타겟 URL 리스트를 불러옵니다...")
        targets = await fetch_target_list(session)
        
        if not targets:
            print("❌ 스크래핑할 대상이 없습니다. (시트가 비어있거나 전부 처리됨)")
            return
            
        print(f"🚀 총 {len(targets)}개의 상점 URL 스크래핑을 시작합니다...")

        import json
        import os
        
        # 1. 자바스크립트용 타겟 리스트 생성
        js_targets = []
        for item in targets:
            url = item.get('url', '')
            try:
                # url = https://shopee.vn/shop/194097580 or https://shopee.vn/product/123/456
                if '/shop/' in url:
                    shopid = url.split('/shop/')[1].split('/')[0].split('?')[0]
                    js_targets.append({ "id": item['id'], "url": url, "shopid": shopid })
                elif '/product/' in url:
                    shopid = url.split('/product/')[1].split('/')[0].split('?')[0]
                    js_targets.append({ "id": item['id'], "url": url, "shopid": shopid })
                else:
                    username = url.split('.vn/')[1].split('/')[0].split('?')[0]
                    js_targets.append({ "id": item['id'], "url": url, "username": username })
            except Exception:
                continue

        # 2. 콘솔에서 실행할 자바스크립트 코드 생성
        js_code = f"""(async function() {{
    const targets = {json.dumps(js_targets, ensure_ascii=False)};
    let results = [];
    console.log("🚀 쇼피 스크래퍼 시작! (총 매장 수: " + targets.length + ")");
    for (let t of targets) {{
        try {{
            let targetId = t.shopid || t.username;
            console.log(`[${{results.length + 1}}/${{targets.length}}] 추출 중... ${{targetId}}`);
            let apiUrl = t.shopid 
                ? `https://shopee.vn/api/v4/shop/get_shop_base?shopid=${{t.shopid}}` 
                : `https://shopee.vn/api/v4/shop/get_shop_base?username=${{t.username}}`;
            
            let res = await fetch(apiUrl);
            let json = await res.json();
            t.description = json.data?.description || "";
            results.push(t);
            // 봇 탐지 방지 휴식
            await new Promise(r => setTimeout(r, 1500));
        }} catch(e) {{
            console.error(`실패: ${{t.shopid || t.username}}`, e);
        }}
    }}
    console.log("✅ 모든 상점 정보 추출 완료! JSON 파일을 자동으로 다운로드합니다.");
    const blob = new Blob([JSON.stringify(results, null, 2)], {{type: "application/json"}});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shopee_data.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {{ document.body.removeChild(a); window.URL.revokeObjectURL(url); }}, 0);
}})();"""

        with open("generic_crawler/console_bot.js", "w", encoding="utf-8") as f:
            f.write(js_code)
        
        print("\n=======================================================")
        print("⭐️ [1단계 완료] 구글 시트의 76개 타겟이 담긴 봇 스크립트가 생성되었습니다!")
        print("  1. VSCode 탐색기 왼쪽 폴더에서 [ generic_crawler/console_bot.js ] 를 여세요.")
        print("  2. 안의 코드를 전부 복사(Ctrl+A -> Ctrl+C) 하세요.")
        print("  3. 쇼피 화면이 켜진 크롬창에서 F12(개발자 도구)를 누르고, Console 탭에 붙여넣기 후 엔터를 치세요!")
        print("  4. 1~2분 뒤 76개의 상점 소개글이 담긴 'shopee_data.json' 다운로드가 완료됩니다.")
        print("  5. 그 'shopee_data.json' 파일을 이 프로젝트 [ generic_crawler ] 폴더 안에 붙여넣으세요!")
        print("=======================================================")
        
        await asyncio.to_thread(input, "\n>> (수동작업) shopee_data.json 파일을 복사해 넣으셨다면 엔터키를 치세요!!: ")
        
        # 3. 다운로드된 JSON 파싱 및 이메일 추출
        try:
            with open("generic_crawler/shopee_data.json", "r", encoding="utf-8") as f:
                scraped_data = json.load(f)
        except Exception as e:
            print("❌ shopee_data.json 파일을 찾을 수 없습니다! 폴더 안에 넣었는지 확인해주세요.")
            return

        print(f"\n🚀 {len(scraped_data)}개의 상점 소개글을 분석하여 이메일/SNS를 구글 시트에 업데이트합니다...")
        
        for idx, item in enumerate(scraped_data, 1):
            url = item.get('url', '')
            item_id = item.get('id', '')
            description_text = item.get('description', '')
            
            emails = list(set(re.findall(EMAIL_REGEX, description_text)))
            igs = list(set(re.findall(IG_REGEX, description_text, re.IGNORECASE)))
            fbs = list(set(re.findall(FB_REGEX, description_text, re.IGNORECASE)))
            tiktoks = list(set(re.findall(TIKTOK_REGEX, description_text, re.IGNORECASE)))
            
            contacts = {
                "email": ", ".join(emails) if emails else "",
                "facebook": ", ".join(fbs) if fbs else "",
                "instagram": ", ".join(igs) if igs else "",
                "tiktok": ", ".join(tiktoks) if tiktoks else ""
            }
            
            await update_contacts_to_gas(session, item_id, contacts)
            
        print("\n🎉 모든 스크래핑 및 구글 시트 업데이트가 완료되었습니다!")

if __name__ == "__main__":
    asyncio.run(scrape_shopee_shops())
