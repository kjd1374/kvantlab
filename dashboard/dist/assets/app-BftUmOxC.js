import{g as ge,s as Re,f as Ve,a as Ge,v as We,b as Qe,_ as U,j as Ce,k as Ze,l as ee,m as oe,n as Ne,o as Xe,p as ie,q as et,r as tt,t as nt,w as at,x as me}from"./supabase-BiZ88kko.js";/* empty css              */console.log("supabase.js v33 initialized");const D="https://hgxblbbjlnsfkffwvfao.supabase.co",te="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8",Y={apikey:te,Authorization:`Bearer ${te}`,"Content-Type":"application/json",Prefer:"count=exact"};async function A(e,t=""){try{const n=`${D}/rest/v1/${e}?${t}`,a=P();let o;a?o=await j(n):o=await fetch(n,{headers:Y});const i=await o.json();if(!o.ok)return console.error("Supabase Query Error:",i),{error:i.message||"데이터를 불러오는 중 오류가 발생했습니다.",data:[]};const r=o.headers.get("content-range");return{data:i,count:r?parseInt(r.split("/")[1]):i.length}}catch(n){return{error:n.message||n,data:[]}}}async function ne(e=50,t="oliveyoung"){var i,r,s,c,p,d;const n=["google_trends","naver_datalab"].includes(t);let a;if(n){const g=(r=(i=(await A("daily_rankings_v2",`select=date&source=eq.${t}&order=date.desc&limit=1`)).data)==null?void 0:i[0])==null?void 0:r.date;if(!g)return{data:[],count:0};a=await A("daily_rankings_v2",`select=*,products_master(*)&source=eq.${t}&date=eq.${g}&order=rank.asc&limit=${e}`),a.data&&(a.data=a.data.map(m=>({...m,...m.products_master||{},current_rank:m.rank,rank_change:0})))}else a=await A("v_trending_7d",`select=*&source=eq.${t}&order=rank_change.desc&limit=${e}`);if(!a.data||a.data.length===0){const g=(c=(s=(await A("daily_rankings_v2",`select=date&source=eq.${t}&order=date.desc&limit=1`)).data)==null?void 0:s[0])==null?void 0:c.date;let m=[];if(g){m.push(g);const h=await A("daily_rankings_v2",`select=date&source=eq.${t}&date=lt.${g}&order=date.desc&limit=1`);(d=(p=h.data)==null?void 0:p[0])!=null&&d.date&&m.push(h.data[0].date)}if(m.length>0){const h=m[0],v=m.length>1?m[1]:h,y=await A("daily_rankings_v2",`select=*,products_master(*)&source=eq.${t}&date=eq.${h}&order=rank.asc&limit=${e*2}`);if(m.length>1){const _=await A("daily_rankings_v2",`select=product_id,rank&source=eq.${t}&date=eq.${v}`),I={};(_.data||[]).forEach($=>I[$.product_id]=$.rank),a.data=(y.data||[]).map($=>{const k=I[$.product_id],w=k?k-$.rank:0;return{...$,...$.products_master||{},current_rank:$.rank,rank_change:w}}).filter($=>$.rank_change>0).sort(($,k)=>k.rank_change-$.rank_change).slice(0,e)}else a.data=(y.data||[]).map(_=>({..._,..._.products_master||{},current_rank:_.rank,rank_change:0})).slice(0,e);a.count=a.data.length}}if(!a.data||a.data.length===0)return{data:[],count:0};const o=a.data.map(l=>l.product_id||l.id).filter(l=>l);if(o.length>0){const l=o.map(h=>`"${h}"`).join(","),g=await A("products_master",`select=product_id,ai_summary&product_id=in.(${l})`),m={};(g.data||[]).forEach(h=>{m[h.product_id]=h.ai_summary}),a.data=a.data.map(h=>({...h,ai_summary:h.ai_summary||m[h.product_id||h.id]||null}))}return a}async function ot(e="oliveyoung"){var d,l;if(e!=="oliveyoung")return{data:[],count:0};const n=(l=(d=(await A("daily_specials_v2","select=date&order=date.desc&limit=1")).data)==null?void 0:d[0])==null?void 0:l.date;if(!n)return{data:[],count:0};const o=(await A("daily_specials_v2",`select=product_id,special_price,discount_rate&date=eq.${n}&order=created_at.desc`)).data||[];if(o.length===0)return{data:[],count:0};const r=o.map(g=>g.product_id).map(g=>`"${g}"`).join(","),s=await A("products_master",`select=id,product_id,name,brand,image_url,url,price,review_count,review_rating&product_id=in.(${r})`),c={};(s.data||[]).forEach(g=>{c[g.product_id]=g});const p=o.filter(g=>c[g.product_id]).map(g=>{const m=c[g.product_id],h=g.special_price;let v=m.price&&m.price>h?m.price:null;if(!v&&h&&g.discount_rate){const _=h/(1-g.discount_rate/100);v=Math.round(_/100)*100}const y=v?Math.round((1-h/v)*100):g.discount_rate||null;return{...m,url:m.url,special_price:h,original_price:v,discount_pct:y,discount_rate:g.discount_rate||0}}).sort((g,m)=>(m.discount_pct||0)-(g.discount_pct||0));return{data:p,count:p.length,date:n}}async function it(e,t=30){let n="",a="";if(t!=="all"){const c=new Date,p=new Date(c);p.setDate(c.getDate()-parseInt(t));const d=p.toISOString().split("T")[0];n=`&date=gte.${d}`,a=`&snapshot_date=gte.${d}`}const o=A("daily_rankings_v2",`select=rank,date,created_at&product_id=eq.${e}${n}&order=created_at.asc`),i=A("deals_snapshots",`select=deal_price,original_price,snapshot_date&product_id=eq.${e}${a}&order=snapshot_date.asc`),[r,s]=await Promise.all([o,i]);return{ranks:(r.data||[]).map(c=>({timestamp:c.created_at||`${c.date}T00:00:00.000Z`,rank:c.rank})),prices:(s.data||[]).map(c=>({timestamp:c.created_at||`${c.snapshot_date}T00:00:00.000Z`,price:c.deal_price,original_price:c.original_price}))}}function F(){return JSON.parse(sessionStorage.getItem("sb-profile")||"null")}function st(){const e=new Date().toISOString().split("T")[0],t=JSON.parse(localStorage.getItem("usage-tracker")||"{}");return t.date!==e?0:t.count||0}function rt(){const e=new Date().toISOString().split("T")[0];let t=JSON.parse(localStorage.getItem("usage-tracker")||"{}");return t.date!==e&&(t={date:e,count:0}),t.count=(t.count||0)+1,localStorage.setItem("usage-tracker",JSON.stringify(t)),t.count}function P(){const e=sessionStorage.getItem("sb-token"),t=sessionStorage.getItem("sb-refresh-token"),n=JSON.parse(sessionStorage.getItem("sb-user")||"null");return e?{access_token:e,refresh_token:t,user:n}:null}async function dt(){const e=P();if(!e||!e.refresh_token)return null;try{const t=await fetch(`${D}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:Y,body:JSON.stringify({refresh_token:e.refresh_token})}),n=await t.json();return t.ok&&n.access_token?(sessionStorage.setItem("sb-token",n.access_token),n.refresh_token&&sessionStorage.setItem("sb-refresh-token",n.refresh_token),sessionStorage.setItem("sb-user",JSON.stringify(n.user)),n):null}catch(t){return console.error("Session refresh failed:",t),null}}async function j(e,t={}){let n=P();if(!n)throw new Error("Not authenticated");const a=async i=>await fetch(e,{...t,headers:{...t.headers,apikey:te,Authorization:`Bearer ${i}`,"Content-Type":"application/json"}});let o=await a(n.access_token);if(o.status===401){const i=await o.clone().json().catch(()=>({}));if(i.message==="JWT expired"||i.code==="PGRST301"){console.log("JWT expired, attempting refresh...");const r=await dt();r&&(console.log("Refresh successful, retrying..."),o=await a(r.access_token))}}return o}async function se(){try{const e=P();if(!e)return{data:[],count:0};const n=await(await j(`${D}/rest/v1/saved_products?select=*,products_master(*)&user_id=eq.${e.user.id}`)).json(),a=Array.isArray(n)?n.map(o=>{const i=o.products_master||{};return{...i,...o,platform:i.source||"기타",is_saved:!0}}):[];return{data:a,count:a.length}}catch(e){return{data:[],count:0,error:e.message||e}}}async function ke(e,t=null,n=!1){if(!isNaN(Number(e)))return Number(e);const a=t&&t.product_id?t.product_id:e,i=await(await fetch(`${D}/rest/v1/products_master?product_id=eq.${encodeURIComponent(a)}&select=id`,{headers:Y})).json();if(i&&i.length>0)return i[0].id;if(!n)return null;if(!t||!t.name)throw new Error("해당 상품 정보를 가져올 수 없어 장바구니에 담을 수 없습니다.");const s=await(await fetch(`${D}/rest/v1/products_master`,{method:"POST",headers:{...Y,Prefer:"return=representation"},body:JSON.stringify({product_id:a,name:t.name,brand:t.brand||"",price:t.special_price||t.price||0,image_url:t.image_url||"",url:t.url||"",source:t.source||"oliveyoung",category_code:t.category_code||"all"})})).json();if(s&&s.length>0)return s[0].id;throw new Error("상품 마스터 등록에 실패했습니다.")}async function ct(e,t=null){const n=P();if(!n)throw new Error("Authentication required");const a=await ke(e,t,!0);return await(await j(`${D}/rest/v1/saved_products`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({user_id:n.user.id,product_id:a,memo:(t==null?void 0:t.memo)||""})})).json()}async function He(e){const t=P();if(!t)throw new Error("Authentication required");const n=await ke(e,null,!1);return n?(await j(`${D}/rest/v1/saved_products?product_id=eq.${n}&user_id=eq.${t.user.id}`,{method:"DELETE"})).ok:!0}async function lt(e){const t=P();if(!t)return!1;const n=await ke(e,null,!1);if(!n)return!1;const o=await(await j(`${D}/rest/v1/saved_products?product_id=eq.${n}&user_id=eq.${t.user.id}&select=id`)).json();return o&&o.length>0}async function ut(e,t){return await He(e)}async function pt(){return A("crawl_logs","select=*&order=started_at.desc&limit=50")}async function gt(){return A("categories","select=category_code,name_ko,name_en&is_active=eq.true")}async function mt(){return A("products_master","select=brand&brand=not.in.(%22Naver%20Data%20Lab%22,%22Google%20Trend%22)&limit=1000")}async function yt(){return A("products_master","select=price&limit=1000")}async function ft(e){const t=await fetch(`${D}/functions/v1/generate-embeddings`,{method:"POST",headers:{...Y,Authorization:`Bearer ${te}`},body:JSON.stringify({text:e})});if(!t.ok)throw new Error("Failed to generate embedding");const{embedding:n}=await t.json();return n}async function ht(e,t=20){try{const n=await ft(e),a=await j(`${D}/rest/v1/rpc/match_products`,{method:"POST",body:JSON.stringify({query_embedding:n,match_threshold:.5,match_count:t})});if(!a.ok){const i=await a.json();throw new Error(i.message||"Semantic search failed")}const o=await a.json();return{data:o,count:o.length}}catch(n){throw console.error("Semantic search error:",n),n}}async function vt(e){return(await j(`${D}/rest/v1/user_notifications?id=eq.${e}`,{method:"PATCH",body:JSON.stringify({is_read:!0})})).ok}window.t=window.t||(e=>({"common.admin":"관리자 페이지","mypage.title":"마이페이지","tabs.favorites":"관심 상품","common.logout":"로그아웃","common.login_signup":"1개월 무료로 시작하기 (로그인/가입)","auth.login":"로그인","auth.signup":"회원가입","auth.email":"이메일","auth.password":"비밀번호","auth.logging_in":"로그인 중...","auth.signing_up":"가입 중...","mypage.billing":"결제 / 플랜 관리","sourcing.mypage_tab":"견적 / 소싱 장바구니","support.title":"고객센터","support.inquiry":"1:1 문의","support.faq":"FAQ","support.feedback":"건의 & 요청사항"})[e]||e.split(".").pop());function wt(){const e=document.querySelector(".header-right"),t=ge();if(t&&!window._autoLogoutInitiated){window._autoLogoutInitiated=!0;let a;const o=()=>{clearTimeout(a),a=setTimeout(async()=>{ge()&&(alert(window.t?window.t("auth.auto_logout_msg")||"장시간 활동이 없어 보안을 위해 자동 로그아웃 되었습니다.":"장시간 활동이 없어 보호를 위해 자동 로그아웃 되었습니다."),await Re(),window.location.href="/index.html")},108e5)};["mousedown","keydown","scroll","touchstart"].forEach(i=>{document.addEventListener(i,o,{passive:!0})}),o()}let n=document.querySelector(".header-auth");n||(n=document.createElement("div"),n.className="header-auth",e.appendChild(n)),Le(n,t),Ae(),window.addEventListener("languageChanged",()=>{Le(n,ge());const a=document.getElementById("authModal");a&&(a.remove(),Ae())})}async function Le(e,t){if(t){let n=!1;try{const o=await Ve(t.user.id);o&&(sessionStorage.setItem("sb-profile",JSON.stringify(o)),o.role==="admin"&&(n=!0))}catch(o){console.error("Error fetching role for dropdown:",o)}e.innerHTML=`
      <div class="user-profile">
        <div class="user-avatar">${t.user.email[0].toUpperCase()}</div>
        <div class="user-dropdown">
          <div class="user-email">${t.user.email}</div>
          ${n?`<a href="/admin/index.html" class="dropdown-item" data-i18n="common.admin">${window.t("common.admin")||"관리자 페이지"}</a>`:""}
          <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => document.querySelector('.auth-tab[data-mypage-tab=\\'account\\']').click(), 50);" class="dropdown-item" data-i18n="mypage.title">${window.t("mypage.title")||"마이페이지 (계정 정보)"}</a>
          <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => document.querySelector('.auth-tab[data-mypage-tab=\\'billing\\']').click(), 50);" class="dropdown-item" data-i18n="mypage.billing">${window.t("mypage.billing")||"결제 / 플랜 관리"}</a>
          <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => document.querySelector('.auth-tab[data-mypage-tab=\\'sourcing\\']').click(), 50);" class="dropdown-item" data-i18n="sourcing.mypage_tab">${window.t("sourcing.mypage_tab")||"견적 / 소싱 장바구니"}</a>
          <a href="#" onclick="event.preventDefault(); if(document.querySelector('.tab[data-tab=\\'wishlist\\']')) document.querySelector('.tab[data-tab=\\'wishlist\\']').click();" class="dropdown-item" data-i18n="tabs.favorites">${window.t("tabs.favorites")||"관심 상품 (찜)"}</a>
          
          <div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
            <div style="font-size: 11px; color: #888; padding: 4px 12px; text-transform: uppercase;" data-i18n="support.title">${window.t("support.title")||"고객센터"}</div>
            <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => { document.querySelector('.auth-tab[data-mypage-tab=\\'support\\']').click(); window.toggleSupportView('inquiry'); }, 50);" class="dropdown-item" style="font-size: 13px;" data-i18n="support.inquiry">${window.t("support.inquiry")||"1:1 문의"}</a>
            <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => { document.querySelector('.auth-tab[data-mypage-tab=\\'support\\']').click(); window.toggleSupportView('faq'); }, 50);" class="dropdown-item" style="font-size: 13px;" data-i18n="support.faq">${window.t("support.faq")||"FAQ"}</a>
            <a href="#" onclick="event.preventDefault(); window.openMyPageModal(); setTimeout(() => { document.querySelector('.auth-tab[data-mypage-tab=\\'support\\']').click(); window.toggleSupportView('inquiry'); document.getElementById('inquiryType').value = 'feedback'; }, 50);" class="dropdown-item" style="font-size: 13px;" data-i18n="support.feedback">${window.t("support.feedback")||"건의 & 요청사항"}</a>
          </div>

          <button id="logoutBtn" class="dropdown-item" style="color:#d32f2f; margin-top:4px; border-top:1px solid #eee;">${window.t("common.logout")}</button>
        </div>
      </div>
    `;const a=document.getElementById("logoutBtn");a&&a.addEventListener("click",async()=>{await Re(),window.location.href="/index.html"})}else{e.innerHTML=`
      <button id="loginOpenBtn" class="btn-login" data-i18n="common.login_signup">로그인 / 회원가입</button>
    `;const n=document.getElementById("loginOpenBtn");n&&n.addEventListener("click",()=>{document.getElementById("authModal").classList.add("open")})}window.i18n&&window.i18n.documentUpdate()}function Ae(){if(document.getElementById("authModal"))return;document.body.insertAdjacentHTML("beforeend",`
    <div class="modal-overlay" id="authModal">
      <div class="modal auth-modal">
        <button class="modal-close" id="authModalClose">&times;</button>
        <div class="auth-tabs">
          <button class="auth-tab active" data-mode="login" data-i18n="auth.login">로그인</button>
          <button class="auth-tab" data-mode="signup" data-i18n="auth.signup">회원가입</button>
        </div>
        <form id="authForm" class="auth-form">
          <!-- Email -->
          <div class="form-group">
            <label><span data-i18n="auth.email">이메일</span> <span class="required">*</span></label>
            <div style="display: flex; gap: 8px;">
              <input type="email" id="authEmail" required data-i18n="auth.email_placeholder" placeholder="example@email.com" style="flex:1;">
              <button type="button" id="sendOtpBtn" class="btn-secondary signup-only" data-i18n="auth.send_otp" style="display:none; white-space:nowrap; padding: 0 12px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border); background: var(--bg-hover); color: var(--text-primary);">인증번호 발송</button>
            </div>
            <div id="otpSentMsg" data-i18n="auth.otp_sent" style="display:none; color: var(--accent-green); font-size: 11px; margin-top: 4px;">인증번호가 발송되었습니다.</div>
          </div>

          <!-- OTP -->
          <div class="form-group signup-only" id="otpGroup" style="display:none;">
            <label><span data-i18n="auth.otp_code">이메일 인증번호</span> <span class="required">*</span></label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="authOtp" data-i18n="auth.otp_placeholder" placeholder="인증번호 입력" style="flex:1;" maxlength="8">
              <button type="button" id="verifyOtpBtn" class="btn-secondary" data-i18n="auth.otp_verify" style="white-space:nowrap; padding: 0 12px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border); background: var(--bg-hover); color: var(--text-primary);">확인</button>
            </div>
            <div id="otpTimer" style="font-size: 11px; color: var(--accent-red); margin-top: 4px; display: none;">남은 시간: 03:00</div>
            <div id="otpError" style="font-size: 11px; color: var(--accent-red); margin-top: 4px;"></div>
          </div>

          <!-- Password -->
          <div class="form-group">
            <label><span data-i18n="auth.password">비밀번호</span> <span class="required">*</span></label>
            <input type="password" id="authPassword" required data-i18n="auth.password_placeholder" placeholder="8자 이상 영문/숫자 조합" minlength="8">
          </div>

          <!-- Password Confirm -->
          <div class="form-group signup-only" style="display:none;">
            <label><span data-i18n="auth.password_confirm">비밀번호 확인</span> <span class="required">*</span></label>
            <input type="password" id="authPasswordConfirm" data-i18n="auth.password_confirm_placeholder" placeholder="비밀번호 재입력" minlength="8">
          </div>

          <!-- Name & Company (Row) -->
          <div class="form-row signup-only" style="display:none; gap: 12px;">
            <div class="form-group" style="flex:1;">
              <label><span data-i18n="auth.name">이름</span> <span class="required">*</span></label>
              <input type="text" id="authName" data-i18n="auth.name_placeholder" placeholder="홍길동">
            </div>
            <div class="form-group" style="flex:1;">
              <label><span data-i18n="auth.company">소속 (회사/브랜드명)</span> <span class="required">*</span></label>
              <input type="text" id="authCompany" data-i18n="auth.company_placeholder" placeholder="케이밴트">
            </div>
          </div>

          <!-- Platform & Category (Row) -->
          <div class="form-row signup-only" style="display:none; gap: 12px;">
             <!-- Platform -->
            <div class="form-group" style="flex:1;">
              <label><span data-i18n="auth.platform_label">주요 활용 플랫폼</span> <span class="required">*</span></label>
              <select id="authPlatform" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: #ffffff; color: #111111;">
                <option value="" data-i18n="auth.select">선택해주세요</option>
                <option value="tiktok" data-i18n="auth.pf_tiktok">틱톡</option>
                <option value="facebook" data-i18n="auth.pf_fb_ig">페이스북/인스타</option>
                <option value="shopee" data-i18n="auth.pf_shopee">쇼피/라자다</option>
                <option value="qoo10" data-i18n="auth.pf_qoo10">큐텐</option>
                <option value="amazon" data-i18n="auth.pf_amazon">아마존</option>
                <option value="other" data-i18n="auth.other">기타</option>
              </select>
              <input type="text" id="authPlatformOther" data-i18n="auth.other_platform" placeholder="플랫폼 직접 입력" style="display:none; margin-top: 8px;">
            </div>

            <!-- Category -->
            <div class="form-group" style="flex:1;">
              <label><span data-i18n="auth.category_label">주력 카테고리</span> <span class="required">*</span></label>
              <select id="authCategory" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: #ffffff; color: #111111;">
                <option value="" data-i18n="auth.select">선택해주세요</option>
                <option value="beauty" data-i18n="auth.cat_beauty">뷰티/코스메틱</option>
                <option value="fashion" data-i18n="auth.cat_fashion">패션/어패럴</option>
                <option value="food" data-i18n="auth.cat_food">식품/건기식</option>
                <option value="living" data-i18n="auth.cat_living">리빙/생활용품</option>
                <option value="other" data-i18n="auth.other">기타</option>
              </select>
              <input type="text" id="authCategoryOther" data-i18n="auth.other_category" placeholder="카테고리 직접 입력" style="display:none; margin-top: 8px;">
            </div>
          </div>

          <button type="submit" id="authSubmitBtn" class="btn-submit" data-i18n="auth.login">로그인</button>
          <div id="authError" class="auth-error" style="color: var(--accent-red); margin-top: 10px; font-size: 12px; text-align: center;"></div>
        </form>
      </div>
    </div>
  `),window.i18n&&window.i18n.documentUpdate();const t=document.getElementById("authModal"),n=document.getElementById("authForm"),a=document.querySelectorAll(".auth-tab"),o=document.getElementById("authSubmitBtn"),i=document.getElementById("authError");let r="login",s=!1;a.forEach(d=>{d.addEventListener("click",()=>{r=d.dataset.mode,a.forEach(m=>m.classList.remove("active")),d.classList.add("active");const l=r==="login"?"auth.login":"auth.signup";o.setAttribute("data-i18n",l),o.textContent=window.t(l),i.textContent="",document.querySelectorAll(".signup-only").forEach(m=>{m.style.display=r==="signup"?m.tagName==="DIV"&&m.classList.contains("form-row")?"flex":(m.id==="sendOtpBtn","block"):"none"}),n.reset(),s=!1,document.getElementById("authOtp").disabled=!1,document.getElementById("verifyOtpBtn").textContent=window.t("auth.otp_verify"),document.getElementById("verifyOtpBtn").disabled=!1})}),document.getElementById("authPlatform").addEventListener("change",d=>{const l=document.getElementById("authPlatformOther");l.style.display=d.target.value==="other"?"block":"none",d.target.value!=="other"&&(l.value="")}),document.getElementById("authCategory").addEventListener("change",d=>{const l=document.getElementById("authCategoryOther");l.style.display=d.target.value==="other"?"block":"none",d.target.value!=="other"&&(l.value="")}),document.getElementById("authModalClose").addEventListener("click",()=>{t.classList.remove("open")});let c=null;function p(){let d=180;const l=document.getElementById("otpTimer");l.style.display="block",c&&clearInterval(c),c=setInterval(()=>{d--;const g=Math.floor(d/60).toString().padStart(2,"0"),m=(d%60).toString().padStart(2,"0");l.textContent=`${window.t("auth.otp_time_left")} ${g}:${m}`,d<=0&&(clearInterval(c),l.textContent=window.t("auth.otp_expired"),s=!1,document.getElementById("verifyOtpBtn").disabled=!0)},1e3)}document.getElementById("sendOtpBtn").addEventListener("click",async()=>{const d=document.getElementById("authEmail").value;if(i.textContent="",!d||!d.includes("@")){i.textContent=window.t("auth.invalid_email")||"올바른 이메일 주소를 먼저 입력해주세요.";return}const l=document.getElementById("sendOtpBtn");l.disabled=!0,l.textContent=window.t("auth.sending_otp")||"전송 중...";const g=document.getElementById("otpError");g&&(g.textContent="");const m=await Ge(d);m.error?(g&&(g.textContent=m.error_description||m.error.message||m.error),l.disabled=!1,l.textContent=window.t("auth.resend_otp")||"인증번호 재발송"):(l.textContent=window.t("auth.btn_resend")||"재발송",l.disabled=!1,document.getElementById("otpGroup").style.display="block",document.getElementById("otpSentMsg").style.display="block",p())}),document.getElementById("verifyOtpBtn").addEventListener("click",async()=>{const d=document.getElementById("authEmail").value,l=document.getElementById("authOtp").value,g=document.getElementById("otpError");if(i.textContent="",g&&(g.textContent=""),!l||l.length<4){g&&(g.textContent=window.t("auth.invalid_otp")||"인증번호를 정확히 입력해주세요.");return}const m=document.getElementById("verifyOtpBtn");m.disabled=!0,m.textContent=window.t("auth.verifying")||"확인 중...";const h=await We(d,l);h.error?(g&&(g.textContent=h.error_description||h.error.message||h.error),m.disabled=!1,m.textContent=window.t("auth.otp_verify")):(s=!0,m.textContent=window.t("auth.verified")||"인증 완료",m.style.background="var(--accent-green)",m.style.color="white",m.style.border="none",document.getElementById("authOtp").disabled=!0,c&&clearInterval(c),document.getElementById("otpTimer").style.display="none",document.getElementById("otpSentMsg").style.display="none")}),n.addEventListener("submit",async d=>{d.preventDefault(),i.textContent="";const l=document.getElementById("authEmail").value,g=document.getElementById("authPassword").value;o.disabled=!0,o.textContent=r==="login"?window.t("auth.logging_in"):window.t("auth.signing_up");try{if(r==="login"){const m=await Qe(l,g);if(m.error)throw new Error(m.error_description||m.error);window.location.pathname==="/"||window.location.pathname.endsWith("index.html")?window.location.href="/app.html":window.location.reload()}else{if(!s)throw new Error(window.t("auth.err_req_otp")||"이메일 인증을 먼저 완료해주세요.");const m=document.getElementById("authPasswordConfirm").value;if(g!==m)throw new Error(window.t("auth.err_pwd_mismatch")||"비밀번호가 일치하지 않습니다.");const h=document.getElementById("authName").value.trim(),v=document.getElementById("authCompany").value.trim();if(!h||!v)throw new Error(window.t("auth.err_req_name")||"이름과 소속을 모두 입력해주세요.");const y=document.getElementById("authPlatform").value,_=y==="other"?document.getElementById("authPlatformOther").value.trim():y,I=document.getElementById("authCategory").value,$=I==="other"?document.getElementById("authCategoryOther").value.trim():I;if(!_||!$)throw new Error(window.t("auth.err_req_pf")||"주요 활용 플랫폼과 주력 카테고리를 선택해주세요.");const k=sessionStorage.getItem("sb-user");if(!k)throw new Error(window.t("auth.err_session")||"세션 정보를 찾을 수 없습니다. 다시 시도해주세요.");const w=JSON.parse(k),f=await fetch("/api/auth/complete-signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:w.id,email:l,password:g,name:h,company:v,primary_platform:_,primary_category:$})}),b=await f.json();if(!f.ok||!b.success)throw new Error(b.error||"가입 처리에 실패했습니다.");if(b.session){sessionStorage.setItem("sb-token",b.session.access_token),sessionStorage.setItem("sb-user",JSON.stringify(b.session.user));try{const{fetchUserProfile:x}=await U(async()=>{const{fetchUserProfile:C}=await import("./supabase-BiZ88kko.js").then(M=>M.y);return{fetchUserProfile:C}},[]),E=await x(b.session.user.id);E&&sessionStorage.setItem("sb-profile",JSON.stringify(E))}catch{}}alert(window.t("auth.signup_success")||"회원가입이 완료되었습니다!"),window.location.href="/app.html"}}catch(m){i.textContent=m.message||window.t("auth.err_general")||"가입 처리 중 오류가 발생했습니다."}finally{o.disabled=!1;const m=r==="login"?"auth.login":"auth.signup";o.setAttribute("data-i18n",m),o.textContent=window.t(m)}})}const bt=["ko","en","vi","th","id","ja"],_t="ko",ye={"platforms.oliveyoung":{ko:"올리브영",en:"Olive Young"},"platforms.musinsa":{ko:"무신사",en:"Musinsa"},"platforms.ably":{ko:"에이블리",en:"Ably"},"platforms.ssg":{ko:"신세계",en:"Shinsegae"},"platforms.k_trend":{ko:"코리아 트렌드",en:"Korea Trends"},"platforms.steady_sellers":{ko:"스테디 셀러",en:"Steady Sellers"},"platforms.modernhouse":{ko:"모던하우스",en:"Modern House"},"table.rank":{ko:"순위",en:"Rank"},"table.image":{ko:"이미지",en:"Image"},"table.name":{ko:"상품명",en:"Product Name"},"table.brand":{ko:"브랜드",en:"Brand"},"table.price":{ko:"가격",en:"Price"},"table.review":{ko:"리뷰",en:"Reviews"},"table.rating":{ko:"평점",en:"Rating"},"table.rank_change":{ko:"변동",en:"Change"},"auth.email":{en:"Email",ko:"이메일"},"auth.password":{en:"Password",ko:"비밀번호"},"auth.name":{en:"Name",ko:"이름"},"auth.company":{en:"Company / Brand",ko:"소속 (회사/브랜드명)"},"auth.email_placeholder":{en:"example@email.com",ko:"example@email.com"},"auth.password_placeholder":{en:"8+ chars, letters & numbers",ko:"8자 이상 영문/숫자 조합"},"auth.otp_code":{en:"Email OTP",ko:"이메일 인증번호"},"auth.otp_placeholder":{en:"Enter 6-digit number",ko:"6자리 숫자 입력"},"auth.otp_verify":{en:"Verify",ko:"확인"},"auth.send_otp":{en:"Send OTP",ko:"인증번호 발송"},"auth.password_confirm":{en:"Confirm Password",ko:"비밀번호 확인"},"auth.password_confirm_placeholder":{en:"Re-enter password",ko:"비밀번호 재입력"},"auth.name_placeholder":{en:"John Doe",ko:"홍길동"},"auth.company_placeholder":{en:"K-Vant",ko:"케이밴트"},"auth.platform_label":{en:"Target Platform",ko:"주요 활용 플랫폼"},"auth.category_label":{en:"Main Category",ko:"주력 카테고리"},"auth.select":{en:"Please select",ko:"선택해주세요"},"auth.login":{en:"Login",ko:"로그인"},"auth.signup":{en:"Sign Up",ko:"회원가입"},"auth.other_platform":{en:"Enter platform directly",ko:"플랫폼 직접 입력"},"auth.other_category":{en:"Enter category directly",ko:"카테고리 직접 입력"},"common.login_signup":{en:"Login / Register",ko:"로그인 / 회원가입"},"mypage.btn_renew":{ko:"🔄 구독 갱신 (Renew)",en:"🔄 Renew Subscription"},"mypage.btn_extend":{ko:"⏳ 구독 연장 (Extend)",en:"⏳ Extend Subscription"},"mypage.btn_cancel":{ko:"🚫 구독 해지 (Cancel)",en:"🚫 Cancel Subscription"},"mypage.status_free":{ko:"현재 무료 플랜을 이용 중입니다. (일일 상세 조회 10회 제한)",en:"You are on the Free plan. (Limited to 10 daily detail views)"},"mypage.status_trial":{ko:"🎉 2주간 Pro 체험 기간입니다! ({date}까지)",en:"🎉 2-week Pro trial active! (Until {date})"},"mypage.status_pro_active":{ko:"Pro 플랜 이용 중 (자동 갱신)",en:"Pro plan active (Auto-renewal)"},"mypage.status_pro_cancelled":{ko:"{date}까지 Pro 이용 가능",en:"Pro access until {date}"},"mypage.status_expired":{ko:"구독 만료됨",en:"Subscription expired"},"mypage.status_admin":{ko:"관리자 (무제한)",en:"Admin (Unlimited)"},"mypage.status_auto_renew":{ko:"자동 갱신",en:"Auto-renewal"},"mypage.status_no_renew":{ko:"갱신 안함",en:"No auto-renewal"},"mypage.status_trial_until":{ko:"체험 종료일",en:"Trial ends"},"mypage.tos_agree_bold":{ko:"[필수] 결제 및 환불 규정 동의",en:"[Required] Agree to Terms & No-Refund Policy"},"mypage.tos_agree_desc":{ko:"본 서비스는 디지털 콘텐츠(데이터 리포트) 제공 서비스로서, 결제 완료 및 서비스 권한 부여 이후에는 전자상거래법에 의거하여 환불이 불가함을 확인하고 동의합니다.",en:"This is a digital content service. By proceeding with the payment, you agree to our Terms of Service and acknowledge that all sales are final and non-refundable."},"mypage.tos_alert":{ko:"결제 및 환불 규정에 동의하셔야 결제가 가능합니다.",en:"Please agree to the Terms of Service to proceed with payment."},"tutorial.title":{ko:"🚀 K-Vant 100% 활용 가이드",en:"🚀 K-Vant 100% Usage Guide"},"tutorial.subtitle":{ko:"K-Vant를 활용해 글로벌 매출을 극대화하는 4단계 비법",en:"4-step guide to maximizing global sales with K-Vant"},"tutorial.step1_title":{ko:"Always-Fresh Rankings",en:"Always-Fresh Rankings"},"tutorial.step1_desc":{ko:"Real-time rankings from Olive Young, Musinsa & Naver Shopping — updated daily so you always see what's selling now. More platforms coming soon. Your sourcing intel keeps growing.",en:"Real-time rankings from Olive Young, Musinsa & Naver Shopping — updated daily so you always see what's selling now. More platforms coming soon. Your sourcing intel keeps growing."},"tutorial.step2_title":{ko:"Request Any Product, Instantly",en:"Request Any Product, Instantly"},"tutorial.step2_desc":{ko:"Found something? Hit the cart button to request wholesale pricing directly from Korea — no middleman needed. Don't see it in the rankings? You can still request it manually. If it exists in Korea, we'll find it.",en:"Found something? Hit the cart button to request wholesale pricing directly from Korea — no middleman needed. Don't see it in the rankings? You can still request it manually. If it exists in Korea, we'll find it."},"tutorial.step3_title":{ko:"Trend Analysis You Can Trust",en:"Trend Analysis You Can Trust"},"tutorial.step3_desc":{ko:"K-Vant tracks Korean product trends locally and globally. Our AI analyzes thousands of real buyer reviews — so you know what's selling and why. No guesswork. Just clear data, analyzed for you.",en:"K-Vant tracks Korean product trends locally and globally. Our AI analyzes thousands of real buyer reviews — so you know what's selling and why. No guesswork. Just clear data, analyzed for you."},"tutorial.step4_title":{ko:"Your Edge Starts Now. Free for 14 Days.",en:"Your Edge Starts Now. Free for 14 Days."},"tutorial.step4_desc":{ko:"Your competitors are sourcing blind. You don't have to. Try K-Vant free for 14 days and find what's trending in Korea before it hits your market.",en:"Your competitors are sourcing blind. You don't have to. Try K-Vant free for 14 days and find what's trending in Korea before it hits your market."},"tutorial.start_btn":{ko:"K-Vant 시작하기",en:"Start K-Vant"},"tutorial.next_btn":{ko:"다음 (Next)",en:"Next"},"tutorial.dont_show":{ko:"다시 보지 않기",en:"Don't show again"},"tabs.global_trends":{ko:"🌏 글로벌 트렌드",en:"🌏 Global Trends"},"tabs.naver_best":{ko:"🇰🇷 대한민국 트렌드 🇰🇷",en:"🇰🇷 Korea Best 🇰🇷"},"tabs.apply":{ko:"적용",en:"Apply"},"naver_best.products_title":{ko:"🛍️ 베스트 상품 순위",en:"🛍️ Best Product Rankings"},"naver_best.brands_title":{ko:"🏢 베스트 브랜드 순위",en:"🏢 Best Brand Rankings"},"naver_best.header":{ko:"🇰🇷 네이버 쇼핑 베스트",en:"🇰🇷 Naver Shopping Best"},"naver_best.empty":{ko:"데이터가 없습니다. 잠시 후 다시 시도하세요.",en:"No data available. Please try again later."},"naver_best.count":{ko:"오늘의 베스트셀러",en:"Today's Best Sellers"},"naver_best.daily":{ko:"일간",en:"Daily"},"naver_best.weekly":{ko:"주간",en:"Weekly"},"naver_best.monthly":{ko:"월간",en:"Monthly"},"naver_cat.A":{ko:"전체",en:"All"},"naver_cat.50000000":{ko:"패션의류",en:"Fashion"},"naver_cat.50000001":{ko:"패션잡화",en:"Accessories"},"naver_cat.50000002":{ko:"화장품/미용",en:"Beauty"},"naver_cat.50000003":{ko:"디지털/가전",en:"Digital"},"naver_cat.50000004":{ko:"가구/인테리어",en:"Furniture"},"naver_cat.50000005":{ko:"출산/육아",en:"Baby"},"naver_cat.50000006":{ko:"식품",en:"Food"},"naver_cat.50000007":{ko:"스포츠/레저",en:"Sports"},"naver_cat.50000008":{ko:"생활/건강",en:"Living"}};class kt{constructor(){this.currentLang=localStorage.getItem("app_lang")||_t,this.translations={en:{},ko:{},vi:{},th:{},id:{},ja:{}},this.isLoaded=!1,this.loadedLangs=new Set}async init(){try{await this.loadTranslations("en"),this.currentLang!=="en"&&await this.loadTranslations(this.currentLang),this.isLoaded=!0,this.documentUpdate()}catch(t){console.error("i18n init critical error:",t),this.isLoaded=!0,this.documentUpdate()}return this}async loadTranslations(t){if(!this.loadedLangs.has(t))try{const n=Date.now(),a=await fetch(`./locales/${t}.json?v=${n}`);if(!a.ok)throw new Error(`Failed to load ${t} translations`);const o=await a.json();this.translations[t]=o,this.loadedLangs.add(t)}catch(n){console.error(`i18n load error (${t}):`,n)}}async setLanguage(t){bt.includes(t)&&(this.currentLang=t,localStorage.setItem("app_lang",t),await this.loadTranslations(t),this.documentUpdate(),window.dispatchEvent(new CustomEvent("languageChanged",{detail:{lang:t}})))}t(t){if(!t)return"";const n=t.split("."),a=(i,r)=>{if(!i)return null;let s=i;for(const c of r)if(s&&typeof s=="object"&&c in s)s=s[c];else return null;return s};let o=a(this.translations[this.currentLang],n);return o!==null&&typeof o=="string"||this.currentLang!=="en"&&(o=a(this.translations.en,n),o!==null&&typeof o=="string")?o:ye[t]&&(ye[t][this.currentLang]||ye[t].en)||t}documentUpdate(){document.querySelectorAll("[data-i18n]").forEach(t=>{const n=t.getAttribute("data-i18n");if(!n)return;const a=this.t(n);t.tagName==="INPUT"&&(t.type==="text"||t.type==="search"||t.type==="password"||t.type==="email")||t.tagName==="TEXTAREA"?t.placeholder=a:t.tagName==="OPTGROUP"?t.label=a:t.textContent=a}),document.querySelectorAll("[data-i18n-title]").forEach(t=>{const n=t.getAttribute("data-i18n-title");n&&(t.title=this.t(n))}),document.querySelectorAll("[data-i18n-href]").forEach(t=>{const n=t.getAttribute("data-i18n-href");n&&(t.href=this.t(n))}),document.documentElement.lang=this.currentLang,document.querySelectorAll(".platform-btn").forEach(t=>{const n=t.getAttribute("data-platform");n&&!t.hasAttribute("data-i18n")&&(t.setAttribute("data-i18n",`platforms.${n}`),t.textContent=this.t(`platforms.${n}`))})}}const S=new kt;window.i18n=S;window.t=e=>S.t(e);const re={id:"oliveyoung",name:"Olive Young",tabs:[{id:"all",icon:"📋",label:"tabs.all"},{id:"trending",icon:"🔥",label:"tabs.trending"},{id:"deals",icon:"💰",label:"tabs.deals"},{id:"reviews",icon:"⭐",label:"tabs.reviews"},{id:"wishlist",icon:"❤️",label:"tabs.favorites"}],async getKPIs(e){const[t,n,a,o]=await Promise.all([ee(100,e),Xe(e),Ce(1,e),ie(e)]);return[{id:"trending",icon:"🔥",value:t.count||"0",label:"kpi.trending"},{id:"deals",icon:"💰",value:n||"0",label:"kpi.deals"},{id:"reviews",icon:"⭐",value:a.count||"0",label:"kpi.reviews"},{id:"total",icon:"📦",value:o||"0",label:"kpi.total",format:!0}]},async getCategories(){return await Ne("oliveyoung")},async fetchData(e,t){switch(e){case"all":return await oe({page:t.currentPage,perPage:t.perPage,search:t.searchQuery,categoryCode:t.activeCategory,platform:t.currentPlatform,gender:t.genderFilter});case"trending":return await ee(100,t.currentPlatform);case"deals":return await Ze(t.currentPlatform);case"reviews":return await Ce(100,t.currentPlatform);default:return{data:[],count:0}}},renderCustomHeader(e){return e.activeTab==="deals"?`
            <div style="background: linear-gradient(135deg, #111111, #333333); color: white; padding: 15px 20px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div>
                    <h3 style="margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                        🔥 ${window.t("deals.today_title")||"오늘의 특가 주문 마감까지"}
                    </h3>
                    <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.8;">
                        ${window.t("deals.today_desc")||"KST(한국시간) 매일 저녁 9시에 주문이 마감됩니다."}
                    </p>
                </div>
                <div id="oyDealTimer" style="font-size: 24px; font-weight: 800; font-family: monospace; background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; letter-spacing: 2px; white-space: nowrap;">
                    --:--:--
                </div>
            </div>
            `:""},bindCustomHeaderEvents(e){const t=document.getElementById("oyDealTimer");if(t){window.dealsTimerInterval&&clearInterval(window.dealsTimerInterval);const n=()=>{const a=new Date,o=new Date(a.toLocaleString("en-US",{timeZone:"Asia/Seoul"})),i=new Date(o);if(o.getHours()>=21){t.innerHTML=`<span style="font-size: 14px; font-weight: 500; font-family: Pretendard, -apple-system, sans-serif; opacity: 0.9; white-space: nowrap;">${window.t("deals.closed_message")||"✅ 금일 주문 마감 (내일 특가 준비중)"}</span>`,t.style.letterSpacing="normal";return}t.style.letterSpacing="2px",i.setHours(21,0,0,0);const s=i-o,c=Math.floor(s/36e5),p=Math.floor(s%36e5/6e4),d=Math.floor(s%6e4/1e3);t.textContent=`${String(c).padStart(2,"0")}:${String(p).padStart(2,"0")}:${String(d).padStart(2,"0")}`};n(),window.dealsTimerInterval=setInterval(n,1e3)}else window.dealsTimerInterval&&(clearInterval(window.dealsTimerInterval),window.dealsTimerInterval=null)}},xt={id:"musinsa",name:"Musinsa",tabs:[{id:"all",icon:"📋",label:"tabs.musinsa_ranking"},{id:"trending",icon:"🔥",label:"tabs.trending"},{id:"wishlist",icon:"❤️",label:"tabs.favorites"}],async getKPIs(e){return[{id:"total",icon:"📦",value:await ie(e)||"0",label:"kpi.total_musinsa",format:!0},{id:"brands",icon:"🔖",value:"800+",label:"kpi.musinsa_brands"}]},async getCategories(){const e=await Ne("musinsa");if(!e||!e.data)return{data:[],count:0};let t=e.data.filter(n=>n.depth===1);return t.find(n=>n.category_code==="000")||t.unshift({category_code:"000",name_ko:"전체",name_en:"All",depth:1}),{data:t,count:t.length}},async fetchData(e,t){switch(e){case"all":return await oe({page:t.currentPage,perPage:t.perPage,search:t.searchQuery,categoryCode:t.activeCategory,platform:"musinsa",gender:t.genderFilter});case"trending":return await ee(100,t.currentPlatform);default:return{data:[],count:0}}},renderCustomHeader(e){return""},renderGenderRow(e){return`
      <div class="musinsa-gender-row" style="display:flex; gap:10px; justify-content:center; margin: 10px 0;">
        <button class="chip ${e.genderFilter==="all"?"active":""}" onclick="setGender('all')">All</button>
        <button class="chip ${e.genderFilter==="male"?"active":""}" onclick="setGender('male')">Men</button>
        <button class="chip ${e.genderFilter==="female"?"active":""}" onclick="setGender('female')">Women</button>
      </div>
    `}},$t={id:"ably",name:"Ably",tabs:[{id:"all",icon:"📋",label:"tabs.all"},{id:"trending",icon:"🔥",label:"tabs.trending"},{id:"wishlist",icon:"❤️",label:"tabs.favorites"}],async getKPIs(e){const[t,n]=await Promise.all([ie(e),ee(100,e)]);return[{id:"total",icon:"📦",value:t||"0",label:"kpi.total",format:!0},{id:"trending",icon:"🔥",value:n.count||"0",label:"kpi.trending"}]},async getCategories(){return{data:[{category_code:"ALL",name_ko:"전체",name_en:"All",depth:1},{category_code:"WOMEN",name_ko:"여성패션",name_en:"Women",depth:1},{category_code:"BEAUTY",name_ko:"뷰티",name_en:"Beauty",depth:1},{category_code:"SHOES",name_ko:"신발",name_en:"Shoes",depth:1},{category_code:"BAG",name_ko:"가방",name_en:"Bags",depth:1}],count:5}},async fetchData(e,t){return await oe({page:t.currentPage,perPage:t.perPage,search:t.searchQuery,categoryCode:t.activeCategory,platform:"ably"})},renderCustomHeader(e){return""}},Me={id:"ssg",name:"Shinsegae",tabs:[{id:"all",icon:"📋",label:"tabs.all"},{id:"trending",icon:"🔥",label:"tabs.trending"},{id:"wishlist",icon:"❤️",label:"tabs.favorites"}],async getKPIs(e){return[{id:"total",icon:"📦",value:await ie(e)||"0",label:"kpi.total",format:!0}]},async getCategories(){return{data:[{category_code:"ALL",name_ko:"전체",name_en:"All",depth:1},{category_code:"BEAUTY",name_ko:"뷰티",name_en:"Beauty",depth:1},{category_code:"FASHION",name_ko:"패션",name_en:"Fashion",depth:1},{category_code:"LUXURY",name_ko:"명품",name_en:"Luxury",depth:1},{category_code:"KIDS",name_ko:"유아동",name_en:"Kids",depth:1},{category_code:"SPORTS",name_ko:"스포츠",name_en:"Sports",depth:1},{category_code:"FOOD_LIFE",name_ko:"푸드&리빙",name_en:"Food & Life",depth:1}],count:7}},async fetchData(e,t){return await oe({page:t.currentPage,perPage:t.perPage,search:t.searchQuery,categoryCode:t.activeCategory,platform:"ssg"})},renderCustomHeader(e){return""}},It={COSRX:"COSRX",Laneige:"라네즈",ANUA:"ANUA",Anua:"ANUA","Round Lab":"라운드랩",Torriden:"토리든","Torrid (or Torriden)":"토리든","Beauty of Joseon":"조선미녀",Mediheal:"메디힐","Rom&nd":"롬앤",Amuse:"어뮤즈",Innisfree:"이니스프리",Etude:"에뛰드",Sulwhasoo:"설화수",Amorepacific:"아모레퍼시픽","The Ordinary":"The Ordinary",Skin1004:"SKIN1004","Papa Recipe":"파파레시피","I'm From":"아임프롬",Klairs:"클레어스"},St={id:"k_trend",name:"Korea Trends",tabs:[{id:"global_trends",icon:"🌏",label:"tabs.global_trends"},{id:"naver_best",icon:"🇰🇷",label:"tabs.naver_best"}],_nb:{productCatId:"50000000",productPeriod:"DAILY",brandCatId:"A",brandPeriod:"WEEKLY",activeTab:"prod"},filterState:{country:"ALL",category:"ALL"},async getKPIs(e){return[]},async getCategories(){return{data:[{category_code:"ALL",name_ko:"전체",name_en:"All",depth:1}],count:1}},async fetchData(e,t){if(e==="naver_best"){const[p,d]=await Promise.all([et({limit:50,categoryId:this._nb.productCatId}),tt({categoryId:this._nb.brandCatId,periodType:this._nb.brandPeriod,limit:30})]);return{data:p.data||[],products:p.data||[],brands:d.data||[],_isNaverBest:!0}}let a=(await nt(this.filterState.country,this.filterState.category)).data||[];const o=t.activeCategory||"ALL";o==="Google"?a=a.filter(p=>(p.data_sources||[]).some(d=>d.toLowerCase().includes("google")||d.toLowerCase().includes("blog"))):o==="YouTube"&&(a=a.filter(p=>(p.data_sources||[]).some(d=>d.toLowerCase().includes("youtube"))));const i=await Promise.all(a.map(async p=>{const d=p.brand_name||"",l=It[d]||"";let g=[];if(l)try{g=(await at(l,p.product_name)).data||[]}catch{}const h=(p.data_sources||[]).find(y=>typeof y=="string"&&y.startsWith("IMG::")),v=h?h.substring(5):`https://via.placeholder.com/300?text=${encodeURIComponent(d||"Item")}`;return{...p,imageUrl:v,oyProducts:g,brandKo:l}})),r=new Map;i.forEach(p=>{let d;if(p.oyProducts&&p.oyProducts.length>0&&p.oyProducts[0].product_id)d=`oy_${p.oyProducts[0].product_id}`;else{const l=(p.brandKo||p.brand_name||"").toLowerCase().trim();let g=(p.product_name||"").toLowerCase().trim();l&&g.includes(l)&&(g=g.replace(new RegExp(l,"g"),"").trim()),g=g.replace(/(round lab|cosrx|anua|laneige|moisturizing|toner|sunscreen|essence|pad)/g,"").trim(),g=g.substring(0,10),d=`${l}_${g}`}if(!r.has(d))r.set(d,p);else{const l=r.get(d);l.mention_count=(l.mention_count||0)+(p.mention_count||0),(p.product_name||"").length>(l.product_name||"").length&&(l.product_name=p.product_name)}});const s=Array.from(r.values());let c=s;if(t.searchQuery){const p=t.searchQuery.toLowerCase();c=s.filter(d=>{const l=String(d.product_name||"").toLowerCase(),g=String(d.brand_name||d.brandKo||"").toLowerCase();return l.includes(p)||g.includes(p)})}return{data:c,count:c.length,_isDashboard:!0}},renderTabContent(e,t,n){const a=typeof window.getProfile=="function"?window.getProfile():JSON.parse(sessionStorage.getItem("sb-profile")||"null"),o=typeof window.__isProMember=="function"?window.__isProMember(a):!0;if(t!=null&&t._isNaverBest)return this._renderNaverBest(t.products||[],t.brands||[],o);if(!t||!t._isDashboard)return null;const i=t.data||[];return i.length===0?`<div class="gt-empty"><span>🌏</span><p>${window.t("sections.k_trend_empty")||"선택한 조건에 해당하는 글로벌 트렌드 데이터가 없습니다."}</p></div>`:this._renderDashboard(i,o)},_renderDashboard(e,t){var $,k;const n=e.reduce((w,f)=>w+(f.mention_count||0),0),a=e.reduce((w,f)=>f.mention_count>((w==null?void 0:w.mention_count)||0)?f:w,null),o=(a==null?void 0:a.brand_name)||"—",i={};e.forEach(w=>{const f=w.main_category||"Unknown";i[f]=(i[f]||0)+(w.mention_count||0)});const r=Object.entries(i).sort((w,f)=>f[1]-w[1])[0],s=r?r[0]:"—",c={};e.forEach(w=>{const f=w.brand_name||"Unknown";c[f]=(c[f]||0)+(w.mention_count||0)});const p=Object.entries(c).sort((w,f)=>f[1]-w[1]).slice(0,8),d=(($=p[0])==null?void 0:$[1])||1,l={};e.forEach(w=>{(w.key_benefits||[]).forEach(f=>{f&&f.length>2&&(l[f]=(l[f]||0)+1)})});const g=Object.entries(l).sort((w,f)=>f[1]-w[1]).slice(0,12),m=e.map(w=>{var M;const f=(w.key_benefits||[]).slice(0,3).map(T=>`<span class="gt-tag">#${T}</span>`).join(""),b=(w.oyProducts||[]).slice(0,1).map(T=>`<a href="${T.url||"#"}" target="_blank" class="gt-oy-link" title="${T.name}">${window.t("gt.gt_oy_link")||"🛒 OY에서 확인"}</a>`).join(""),x=((M=w.oyProducts)==null?void 0:M.length)>0?`<span class="gt-match-badge">${window.t("gt.gt_oy_matched")||"✓ OY 연동"}</span>`:"",C=!w.imageUrl||w.imageUrl.includes("placeholder.com")||w.imageUrl.includes("via.placeholder")?`<div class="gt-product-img gt-no-image"><span>${window.t("gt.gt_no_image")||"이미지 없음"}</span></div>`:`<img class="gt-product-img" src="${w.imageUrl}" alt="${w.product_name}" loading="lazy" onerror="this.outerHTML='<div class=&quot;gt-product-img gt-no-image&quot;><span>${window.t("gt.gt_no_image")||"이미지 없음"}</span></div>'">`;return`
                <div class="gt-product-row ${t?"":"locked-card"}">
                    ${C}
                    <div class="gt-product-info">
                        <div class="gt-product-brand" data-pid="${w.product_id}">${!t&&typeof window.__maskText=="function"?window.__maskText(w.brand_name||""):w.brand_name||""} ${x}</div>
                        <div class="gt-product-name" data-pid="${w.product_id}">${!t&&typeof window.__maskText=="function"?window.__maskText(w.product_name||""):w.product_name||""}</div>
                        <div class="gt-product-tags">${f}</div>
                    </div>
                    <div class="gt-product-meta">
                        <div class="gt-mention-count">💬 ${w.mention_count}${window.t("gt.gt_mentions")||"건 언급"}</div>
                        ${t?b:""}
                    </div>
                </div>`}).join(""),h=p.map(([w,f])=>{const b=Math.round(f/d*100);return`
    <div class="gt-bar-row">
                    <span class="gt-bar-label">${w}</span>
                    <div class="gt-bar-track">
                        <div class="gt-bar-fill" style="width:${b}%"></div>
                    </div>
                    <span class="gt-bar-value">${f}</span>
                </div>`}).join(""),v=((k=g[0])==null?void 0:k[1])||1,y=g.map(([w,f])=>`<span class="gt-kw-chip gt-kw-${f>=v*.7?"lg":f>=v*.4?"md":"sm"}"> #${w} <em>${f}</em></span>`).join(""),_=Object.values(i).reduce((w,f)=>w+f,0),I=Object.entries(i).sort((w,f)=>f[1]-w[1]).map(([w,f])=>{const b=Math.round(f/_*100);return`<div class="gt-cat-row"><span class="gt-cat-label">${w}</span><div class="gt-cat-bar-track"><div class="gt-cat-bar-fill" style="width:${b}%"></div></div><span class="gt-cat-pct">${b}%</span></div>`}).join("");return`
    <div class="gt-dashboard">
            <!--KPI Row-->
            <div class="gt-kpi-row">
                <div class="gt-kpi-card">
                    <div class="gt-kpi-icon">📦</div>
                    <div class="gt-kpi-value">${e.length}</div>
                    <div class="gt-kpi-label">${window.t("gt.gt_collected")||"수집 제품"}</div>
                </div>
                <div class="gt-kpi-card">
                    <div class="gt-kpi-icon">💬</div>
                    <div class="gt-kpi-value">${n}</div>
                    <div class="gt-kpi-label">${window.t("gt.gt_total_mentions")||"총 언급 횟수"}</div>
                </div>
                <div class="gt-kpi-card">
                    <div class="gt-kpi-icon">🥇</div>
                    <div class="gt-kpi-value">${o}</div>
                    <div class="gt-kpi-label">${window.t("gt.gt_top_brand")||"TOP 브랜드"}</div>
                </div>
                <div class="gt-kpi-card">
                    <div class="gt-kpi-icon">📁</div>
                    <div class="gt-kpi-value">${s}</div>
                    <div class="gt-kpi-label">${window.t("gt.gt_top_category")||"TOP 카테고리"}</div>
                </div>
            </div>

            <!--Charts Row-->
            <div class="gt-charts-row">
                <div class="gt-chart-card">
                    <h3 class="gt-chart-title">${window.t("gt.gt_brand_chart")||"📊 브랜드별 언급수"}</h3>
                    <div class="gt-bar-chart">${h}</div>
                </div>
                <div class="gt-chart-card">
                    <h3 class="gt-chart-title">${window.t("gt.gt_category_chart")||"📁 카테고리 분포"}</h3>
                    <div class="gt-cat-chart">${I}</div>
                </div>
            </div>

            <!--Keywords -->
            <div class="gt-kw-card">
                <h3 class="gt-chart-title">${window.t("gt.gt_keywords")||"✨ 인기 효능 · 키워드"}</h3>
                <div class="gt-kw-cloud">${y}</div>
            </div>

            <!--Product List-->
    <div class="gt-list-card">
        <h3 class="gt-chart-title">${window.t("gt.gt_product_list")||"🧴 제품 리스트 (언급순)"}</h3>
        <div class="gt-product-list">${m}</div>
    </div>
        </div>`},_renderNaverBest(e,t,n){const a=(v,y)=>{var _;return((_=window.t)==null?void 0:_.call(window,v))||y||v},o=[{id:"A",label:a("naver_cat.A","전체")},{id:"50000000",label:a("naver_cat.50000000","패션의류")},{id:"50000001",label:a("naver_cat.50000001","패션잡화")},{id:"50000002",label:a("naver_cat.50000002","화장품/미용")},{id:"50000003",label:a("naver_cat.50000003","디지털/가전")},{id:"50000005",label:a("naver_cat.50000005","출산/육아")},{id:"50000008",label:a("naver_cat.50000008","생활/건강")}],i=["#FFD700","#C0C0C0","#CD7F32"],s=o.filter(v=>v.id!=="A").map(v=>`<button class="nb-cat-btn${this._nb.productCatId===v.id?" nb-cat-active":""}" data-section="prod" data-cat="${v.id}">${v.label}</button>`).join(""),p=[{key:"DAILY",label:a("naver_best.daily","일간")},{key:"WEEKLY",label:a("naver_best.weekly","주간")}].map(v=>`<button class="nb-period-btn${this._nb.productPeriod===v.key?" nb-period-active":""}" data-section="prod" data-period="${v.key}">${v.label}</button>`).join(""),d=e.length===0?`<p style="color:var(--text-muted);padding:24px;text-align:center;">${a("naver_best.empty","데이터 없음")}</p>`:e.slice(0,50).map((v,y)=>{const _=v.current_rank||y+1,I=_<=3?`<div class="nb-rank-badge" style="background:${i[_-1]};">${_}</div>`:`<div class="nb-rank-badge nb-rank-badge-normal">${_}</div>`,$=v.rank_change?v.rank_change>0?`<span class="nb-chg-up">▲${v.rank_change}</span>`:`<span class="nb-chg-down">▼${Math.abs(v.rank_change)}</span>`:"",k=v.price?`₩${Number(v.price).toLocaleString()} `:"",w=v.image_url?`<img src="${v.image_url}" alt="" class="nb-grid-img" loading="lazy" onerror="this.style.display='none'">`:'<div class="nb-grid-img nb-grid-no-img">🛍️</div>',f=!n,b=f&&typeof window.__maskText=="function"?window.__maskText(v.brand||""):v.brand||"",x=f&&typeof window.__maskText=="function"?window.__maskText(v.name||""):v.name||"";return`<div class="nb-grid-card ${f?"locked-card":""}" onclick="${f?"":`window.open('${v.url||"#"}','_blank')`}">
                    <div style="position:relative">
                        ${f?'<div class="locked-overlay" style="border-radius:12px;"><span>PRO Only</span></div>':""}
                        ${w}${I}
                    </div>
                    <div class="nb-grid-info">
                        <div class="nb-product-brand">${b}${$?" "+$:""}</div>
                        <div class="nb-product-name">${x}</div>
                        <div class="nb-product-price">${f?"₩ -":k}</div>
                    </div>
                </div>`}).join(""),l=o.map(v=>`<button class="nb-cat-btn${this._nb.brandCatId===v.id?" nb-cat-active":""}" data-section="brand" data-cat="${v.id}">${v.label}</button>`).join(""),m=[{key:"WEEKLY",label:a("naver_best.weekly","주간")},{key:"MONTHLY",label:a("naver_best.monthly","월간")}].map(v=>`<button class="nb-period-btn${this._nb.brandPeriod===v.key?" nb-period-active":""}" data-section="brand" data-period="${v.key}">${v.label}</button>`).join(""),h=t.length===0?`<p style="color:var(--text-muted);padding:24px;text-align:center;">${a("naver_best.empty","데이터 없음")}</p>`:t.map((v,y)=>{const _=v.rank||y+1,I=_<=3?`<div class="nb-rank-badge" style="background:${i[_-1]};position:static;width:28px;height:28px;font-size:13px;">${_}</div>`:`<div class="nb-rank-badge nb-rank-badge-normal" style="position:static;width:28px;height:28px;">${_}</div>`,$=v.logo_url?`<img src="${v.logo_url}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">`:'<div style="width:40px;height:40px;border-radius:8px;background:var(--card-bg2);display:flex;align-items:center;justify-content:center;">🏢</div>',k=(v.hashtags||[]).map(f=>`<span class="nb-hash">${f}</span>`).join("");return`<div class="nb-brand-row" ${v.store_url?`onclick="window.open('${v.store_url}','_blank')" style="cursor:pointer;"`:""}>
    ${I}
                    ${$}
<div style="flex:1;min-width:0;">
    <div class="nb-brand-name">${v.brand_name||""}</div>
    <div class="nb-brand-tags">${k}</div>
</div>
                </div>`}).join("");return`
    <div class="nb-dashboard">
            <!--Header Tabs-->
            <div class="nb-main-tabs">
                <button class="nb-main-tab ${this._nb.activeTab==="prod"?"nb-main-tab-active":""}" data-tab="prod">
                    ${a("naver_best.products_title","🛍️ 베스트 상품 순위")}
                </button>
                <button class="nb-main-tab ${this._nb.activeTab==="brand"?"nb-main-tab-active":""}" data-tab="brand">
                    ${a("naver_best.brands_title","🏢 베스트 브랜드 순위")}
                </button>
            </div>

            <!-- ■ SECTION 1: Products-->
            <div class="nb-section" style="display: ${this._nb.activeTab==="prod"?"block":"none"};">
                <div class="nb-section-header">
                    <span class="nb-section-title">${a("naver_best.products_title","🛍️ 베스트 상품 순위")}</span>
                    <div class="nb-period-group">${p}</div>
                </div>
                <div class="nb-cat-row">${s}</div>
                <div class="nb-product-grid">${d}</div>
            </div>

            <!-- ■ SECTION 2: Brands-->
    <div class="nb-section" style="display: ${this._nb.activeTab==="brand"?"block":"none"};">
        <div class="nb-section-header">
            <span class="nb-section-title">${a("naver_best.brands_title","🏢 베스트 브랜드 순위")}</span>
            <div class="nb-period-group">${m}</div>
        </div>
        <div class="nb-cat-row">${l}</div>
        <div class="nb-brand-list">${h}</div>
    </div>
        </div>`},renderCustomHeader(e){return e.activeTab==="naver_best"?"":`
    <div class="k-trend-filters" style="display:flex; gap:10px; padding:10px 20px; border-bottom:1px solid var(--border-color); overflow-x:auto; align-items:center;">
                <select id="kTrendCountry" style="padding:8px; border-radius:8px; border:1px solid #ccc;">
                    <option value="VN" ${this.filterState.country==="VN"?"selected":""} data-i18n="countries.vn">${window.t("countries.vn")||"🇻🇳 베트남 (Vietnam)"}</option>
                    <option value="TH" ${this.filterState.country==="TH"?"selected":""} data-i18n="countries.th">${window.t("countries.th")||"🇹🇭 태국 (Thailand)"}</option>
                    <option value="PH" ${this.filterState.country==="PH"?"selected":""} data-i18n="countries.ph">${window.t("countries.ph")||"🇵🇭 필리핀 (Philippines)"}</option>
                    <option value="MY" ${this.filterState.country==="MY"?"selected":""} data-i18n="countries.my">${window.t("countries.my")||"🇲🇾 말레이시아 (Malaysia)"}</option>
                    <option value="ALL" ${this.filterState.country==="ALL"?"selected":""} data-i18n="countries.all">${window.t("countries.all")||"🌏 글로벌 (Global)"}</option>
                </select>
                <select id="kTrendCategory" style="padding:8px; border-radius:8px; border:1px solid #ccc;">
                    <option value="ALL" ${this.filterState.category==="ALL"?"selected":""} data-i18n="categories.all">${window.t("categories.all")||"전체 카테고리"}</option>
                    <option value="Skincare" ${this.filterState.category==="Skincare"?"selected":""} data-i18n="categories.skincare">${window.t("categories.skincare")||"스킨케어 (Skincare)"}</option>
                    <option value="Makeup" ${this.filterState.category==="Makeup"?"selected":""} data-i18n="categories.makeup">${window.t("categories.makeup")||"메이크업 (Makeup)"}</option>
                </select>
                <button id="kTrendApply" style="padding:8px 16px; background:var(--accent-blue); color:white; border:none; border-radius:8px; cursor:pointer;" data-i18n="tabs.apply">적용</button>
            </div>
    `},bindCustomHeaderEvents(e){var t;(t=document.getElementById("kTrendApply"))==null||t.addEventListener("click",()=>{const n=document.getElementById("kTrendCountry"),a=document.getElementById("kTrendCategory");n&&a&&(this.filterState.country=n.value,this.filterState.category=a.value,e&&e())}),document.addEventListener("click",n=>{const a=n.target.closest(".nb-main-tab");if(a){n.preventDefault(),n.stopPropagation(),this._nb.activeTab=a.dataset.tab,e&&e();return}const o=n.target.closest(".nb-cat-btn");if(o){n.preventDefault(),n.stopPropagation();const r=o.dataset.section,s=o.dataset.cat;r==="prod"?this._nb.productCatId=s:r==="brand"&&(this._nb.brandCatId=s),e&&e();return}const i=n.target.closest(".nb-period-btn");if(i){n.preventDefault(),n.stopPropagation();const r=i.dataset.section,s=i.dataset.period;r==="prod"?this._nb.productPeriod=s:r==="brand"&&(this._nb.brandPeriod=s),e&&e()}})}},Et={id:"steady_sellers",name:"Steady Sellers",tabs:[{id:"all",icon:"🏆",label:"platforms.steady_sellers"}],async getKPIs(e){return[{id:"total",icon:"📦",value:(await me()).count||0,label:"kpi.total_steady"}]},async getCategories(){const t=(await me()).data||[],n=new Set;t.forEach(i=>{i.brand&&n.add(i.brand)});const a=Array.from(n).sort(),o=[{category_code:"ALL",name_ko:"전체 (All)",name_en:"All Brands",depth:1}];return a.forEach(i=>{o.push({category_code:i,category_name:i,name_ko:i,name_en:"",depth:1})}),{data:o,count:o.length}},async fetchData(e,t){let a=(await me()).data||[];t.activeCategory&&t.activeCategory!=="ALL"&&t.activeCategory!=="all"&&(a=a.filter(i=>i.brand===t.activeCategory));const o=a.map(i=>({id:i.id,product_id:i.id,url:"",image_url:i.image_urls&&i.image_urls.length>0?i.image_urls[0]:i.image_url||"",image_urls:i.image_urls||(i.image_url?[i.image_url]:[]),brand:i.brand,name:i.product_name,description:i.description||"",current_rank:i.rank,special_price:i.price,original_price:i.price,source:"steady_sellers"}));return{data:o,count:o.length}},renderCustomHeader(e){return`
            <div class="steady-sellers-compact-header">
                <h2>🏆 ${window.t("platforms.steady_sellers")||"Steady Sellers"}</h2>
            </div>
        `},renderTabContent(e,t,n){const a=t.data||[];if(a.length===0)return`<div style="padding:40px; text-align:center; color:var(--text-muted);">${window.t("common.no_results")}</div>`;const o=a.reduce((s,c)=>{const p=c.brand||"Other Brands";return s[p]||(s[p]=[]),s[p].push(c),s},{}),i=typeof window.getProfile=="function"?window.getProfile():JSON.parse(sessionStorage.getItem("sb-profile")||"null"),r=typeof window.__isProMember=="function"?window.__isProMember(i):!0;return`
            <div class="steady-sellers-container">
                ${Object.entries(o).map(([s,c])=>`
                    <div class="brand-group">
                        <div class="brand-group-header">
                            <h3 class="brand-title product-brand" data-pid="${c[0].id}">${s}</h3>
                            <span class="brand-count">${c.length} Items</span>
                        </div>
                        <div class="brand-products-grid">
                            ${c.map(p=>{const d=!r,l=d&&typeof window.__maskText=="function"?window.__maskText(p.name):p.name;return`
                                <div class="ss-product-card overlay-card ${d?"locked-card":""}" onclick="${d?"":`window.__openProduct(${JSON.stringify(p).replace(/"/g,"&quot;")})`}">
                                    ${d?'<div class="locked-overlay"><span>PRO Only</span></div>':""}
                                    <div class="ss-product-img-wrapper">
                                        <img src="${p.image_url}" alt="${l}" class="ss-product-img" loading="lazy">
                                    </div>
                                    <div class="ss-product-overlay">
                                        <h4 class="ss-product-name product-name" data-pid="${p.id}">${l}</h4>
                                        <div class="ss-product-price">
                                            <span class="currency">₩</span>
                                            <span class="amount">${new Intl.NumberFormat().format(p.special_price)}</span>
                                        </div>
                                    </div>
                                </div>
                            `}).join("")}
                        </div>
                    </div>
                `).join("")}
            </div>
        `}},Bt={fetchQuery:()=>`
      select=*,
      daily_rankings_v2!inner(rank, date, category_code)
      &daily_rankings_v2.date=eq.${new Date().toISOString().split("T")[0]}
      &source=eq.modernhouse_best
      &order=rank.asc.daily_rankings_v2
    `,getAllCategories:()=>[{name:"전체",code:"all"},{name:"패브릭",code:"038"},{name:"주방",code:"039"},{name:"데코/취미",code:"040"},{name:"키즈",code:"042"},{name:"펫",code:"043"},{name:"가전",code:"044"},{name:"욕실/청소",code:"045"},{name:"외부상품",code:"158"}],mapData:e=>e.map(t=>({...t,platform:"modernhouse",rank:t.daily_rankings_v2&&t.daily_rankings_v2.length>0?t.daily_rankings_v2[0].rank:null,price:t.price!==null?t.price:0,product_url:t.url}))},we={oliveyoung:re,musinsa:xt,ably:$t,shinsegae:Me,ssg:Me,k_trend:St,steady_sellers:Et,modernhouse:Bt},u={activeTab:"all",activeCategory:"10000010001",searchQuery:"",currentPage:1,perPage:20,sortBy:"rank",sortDir:"asc",totalProducts:0,notifications:[],unreadCount:0,currentPlatform:"oliveyoung",activeBridge:re,genderFilter:"all",aiSearch:!1,user:null,categories:[],cache:{}};let be=!1;function de(e=!1){if(be)return;const t=new URL(window.location.href);t.searchParams.set("platform",u.currentPlatform),u.activeTab&&t.searchParams.set("tab",u.activeTab),u.activeCategory&&t.searchParams.set("category",u.activeCategory);const n={platform:u.currentPlatform,tab:u.activeTab,category:u.activeCategory};e?history.replaceState(n,"",t.toString()):window.location.href!==t.toString()&&history.pushState(n,"",t.toString())}async function ze(e){if(u.currentPlatform===e)return;u.currentPlatform=e,u.activeBridge=we[e]||re,document.body.dataset.platform=e,document.querySelectorAll(".platform-btn").forEach(i=>{i.classList.toggle("active",i.dataset.platform===e)});const t=document.getElementById("platformControls");t&&(u.activeBridge.renderCustomHeader?(t.innerHTML=u.activeBridge.renderCustomHeader(u),u.activeBridge.bindCustomHeaderEvents&&u.activeBridge.bindCustomHeaderEvents(()=>q(u.activeTab))):t.innerHTML=""),window.attachPlatformListeners&&window.attachPlatformListeners(),u.activeCategory=null,u.searchQuery="";const n=document.getElementById("searchInput");n&&(n.value=""),u.activeBridge.tabs&&u.activeBridge.tabs.length>0?u.activeBridge.tabs.some(i=>i.id===u.activeTab)||(u.activeTab=u.activeBridge.tabs[0].id):u.activeTab="all";const a=document.getElementById("tab-all");a&&a.querySelectorAll(".custom-content-area").forEach(i=>{i.innerHTML="",i.style.display="none"}),je(),document.querySelectorAll(".tab-content").forEach(i=>i.classList.remove("active"));const o=document.getElementById(`tab-${u.activeTab}`);o&&o.classList.add("active"),await Promise.all([$e(),xe(),q(u.activeTab)]),de()}document.addEventListener("DOMContentLoaded",Tt);async function Tt(){try{const e=new URLSearchParams(window.location.search),t=e.get("platform"),n=e.get("tab"),a=e.get("category");t&&we[t]?(u.currentPlatform=t,u.activeBridge=we[t],document.body.dataset.platform=t):(u.currentPlatform="oliveyoung",u.activeBridge=re),n&&u.activeBridge.tabs&&u.activeBridge.tabs.some(o=>o.id===n)&&(u.activeTab=n),a&&(u.activeCategory=a),de(!0),window.addEventListener("popstate",async o=>{const i=new URLSearchParams(window.location.search),r=i.get("platform")||"oliveyoung",s=i.get("tab")||"all",c=i.get("category");if(be=!0,u.currentPlatform!==r)u.activeCategory=c||null,u.activeTab=s,u.currentPlatform=null,await ze(r);else{let p=!1;if(u.activeCategory!==c&&c){u.activeCategory=c,document.querySelectorAll(".chip").forEach(l=>l.classList.remove("active"));const d=document.querySelector(`.chip[data-code="${c}"]`);d&&d.classList.add("active"),p=!0}if(u.activeTab!==s){u.activeTab=s;const d=document.querySelector(".tab-bar");if(d){d.querySelectorAll(".tab").forEach(g=>g.classList.remove("active"));const l=d.querySelector(`.tab[data-tab="${s}"]`);l&&l.classList.add("active")}p=!0}p&&await q(u.activeTab)}be=!1}),await S.init(),je(),Pt(),wt(),await Promise.all([xe(),$e()]),Gt(),window.toggleSupportView=toggleSupportView,window.submitSupportInquiry=submitSupportInquiry}catch(e){console.error("Critical Init Error:",e),alert("초기화 중 오류가 발생했습니다: "+e.message)}}function Pt(){function e(){document.querySelectorAll(".platform-btn").forEach(k=>{k.addEventListener("click",()=>ze(k.dataset.platform))})}e(),window.attachPlatformListeners=e,document.querySelectorAll(".tab").forEach(k=>{k.addEventListener("click",()=>ce(k.dataset.tab))});const t=document.getElementById("searchInput");let n;t&&t.addEventListener("input",k=>{clearTimeout(n),n=setTimeout(()=>{u.searchQuery=k.target.value.trim(),u.currentPage=1,q(u.activeTab)},300)});const a=document.getElementById("modalClose");a&&a.addEventListener("click",he);const o=document.getElementById("modalOverlay");o&&o.addEventListener("click",k=>{k.target===k.currentTarget&&he()}),document.addEventListener("keydown",k=>{k.key==="Escape"&&he()}),Ue(),window.addEventListener("languageChanged",()=>{q(u.activeTab),window.__rerenderModal&&window.__rerenderModal()});const i=document.getElementById("notiBtn"),r=document.getElementById("notiDropdown");i&&r&&i.addEventListener("click",k=>{k.stopPropagation();const w=r.style.display==="none";r.style.display=w?"block":"none"});const s=document.getElementById("aiSearchToggle");s&&s.addEventListener("click",()=>{u.aiSearch=!u.aiSearch,s.classList.toggle("active",u.aiSearch),document.querySelector(".search-box").classList.toggle("ai-active",u.aiSearch),u.searchQuery&&(u.currentPage=1,q(u.activeTab))}),document.addEventListener("click",k=>{const w=document.getElementById("notiDropdown"),f=document.getElementById("notiBtn");w&&f&&!w.contains(k.target)&&!f.contains(k.target)&&(w.style.display="none");const b=document.getElementById("notifDropdown"),x=document.getElementById("notifBell");b&&x&&!b.contains(k.target)&&!x.contains(k.target)&&b.classList.remove("open");const E=document.getElementById("langDropdown"),C=document.getElementById("langBtn");E&&C&&!E.contains(k.target)&&k.target!==C&&E.classList.remove("open")});const c=document.getElementById("notifBell"),p=document.getElementById("notifDropdown");c&&p&&c.addEventListener("click",k=>{k.stopPropagation(),p.classList.toggle("open")});const d=document.getElementById("langBtn"),l=document.getElementById("langDropdown");d&&d.addEventListener("click",k=>{k.stopPropagation(),l.classList.toggle("open")}),document.querySelectorAll(".lang-item").forEach(k=>{k.addEventListener("click",async()=>{const w=k.dataset.lang;await S.setLanguage(w),l&&l.classList.remove("open"),xe(),$e(),q(u.activeTab),renderNotifications()})});const g=document.getElementById("tutorialModalOverlay"),m=document.getElementById("skipTutorialBtn"),h=document.getElementById("tutorialPrevBtn"),v=document.getElementById("tutorialNextBtn"),y=document.getElementById("tutorialPrimaryBtn"),_=document.getElementById("dontShowTutorial"),I=document.getElementById("tutorialCarousel"),$=document.querySelectorAll("#tutorialDots .dot");if(g&&I){let k=function(){I.style.transform=`translateX(-${f*(100/b)}%)`,$.length>0&&$.forEach((x,E)=>{x.style.background=E===f?"#4f46e5":"#cbd5e1"}),h&&(h.style.display=f===0?"none":"flex"),v&&y&&(f===b-1?(v.style.display="none",y.textContent=window.t?window.t("tutorial.start_btn"):"K-Vant 시작하기"):(v.style.display="flex",y.textContent=window.t?window.t("tutorial.next_btn"):"다음 (Next)"))},w=function(){_&&_.checked&&localStorage.setItem("hide_tutorial_v1","true"),g.classList.remove("open")},f=0;const b=4;v&&v.addEventListener("click",()=>{f<b-1&&(f++,k())}),h&&h.addEventListener("click",()=>{f>0&&(f--,k())}),y&&y.addEventListener("click",()=>{f<b-1?(f++,k()):w()}),m&&m.addEventListener("click",w),setTimeout(()=>{localStorage.getItem("hide_tutorial_v1")==="true"||(f=0,k(),g.classList.add("open"))},1e3)}}function ce(e){u.activeTab=e,document.querySelectorAll(".tab").forEach(o=>o.classList.remove("active"));const t=document.querySelector(`.tab[data-tab="${e}"]`);t&&t.classList.add("active"),document.querySelectorAll(".tab-content").forEach(o=>o.classList.remove("active"));const n=document.getElementById(`tab-${e}`);n&&n.classList.add("active");const a=document.getElementById("platformControls");a&&u.activeBridge&&u.activeBridge.renderCustomHeader&&(a.innerHTML=u.activeBridge.renderCustomHeader(u),u.activeBridge.bindCustomHeaderEvents&&u.activeBridge.bindCustomHeaderEvents(()=>q(u.activeTab))),de(),q(e)}function je(){const e=document.querySelector(".tab-bar");if(!e)return;const t=u.activeBridge.tabs;e.innerHTML=t.map((n,a)=>`
    <button class="tab ${u.activeTab===n.id||a===0&&!u.activeTab?"active":""}" data-tab="${n.id}">
      <span>${n.icon}</span> <span data-i18n="${n.label}">${window.t(n.label)}</span>
    </button>
  `).join(""),e.querySelectorAll(".tab").forEach(n=>{n.addEventListener("click",()=>ce(n.dataset.tab))})}async function xe(){try{const e=await u.activeBridge.getKPIs(u.currentPlatform),t=document.getElementById("kpiGrid");if(!t)return;t.innerHTML=e.map(a=>`
      <div class="kpi-card kpi-${a.id}">
        <div class="kpi-icon">${a.icon}</div>
        <div class="kpi-content">
          <div class="kpi-value">${a.format?O(a.value):a.value}</div>
          <div class="kpi-label" data-i18n="${a.label}">${window.t(a.label)}</div>
        </div>
      </div>
    `).join(""),S.documentUpdate();const n=e.find(a=>a.id==="total");if(n){const a=document.getElementById("totalProducts");a&&(a.textContent=O(n.value)),u.totalProducts=n.value}}catch(e){console.error("KPI load error:",e);const t=document.getElementById("kpiGrid");t&&(t.innerHTML='<div class="error-msg">KPI 로딩 실패</div>')}}async function $e(){try{const{data:e}=await u.activeBridge.getCategories();u.categories=e;const t=document.getElementById("categoryChips");if(!t)return;t.innerHTML="";const n=e.filter(i=>i.depth>=0),a=document.getElementById("totalCategories");a&&(a.textContent=n.length),n.forEach((i,r)=>{const s=document.createElement("button");s.className=u.activeCategory===i.category_code?"chip active":"chip",!u.activeCategory&&r===0&&s.classList.add("active"),s.dataset.code=i.category_code;const c=S.currentLang,p=i[`name_${c}`]||i.name_en||i.name_ko||i.category_name;s.textContent=p,s.addEventListener("click",()=>{u.activeCategory=i.category_code,document.querySelectorAll(".chip").forEach(g=>g.classList.remove("active")),s.classList.add("active"),u.searchQuery="";const d=document.getElementById("searchInput");if(d&&(d.value=""),u.currentPage=1,u.activeBridge&&u.activeBridge.renderCustomHeader){const g=document.getElementById("platformControls");g&&(g.innerHTML=u.activeBridge.renderCustomHeader(u),u.activeBridge.bindCustomHeaderEvents&&u.activeBridge.bindCustomHeaderEvents(()=>q(u.activeTab)))}u.activeBridge.tabs.some(g=>g.id===u.activeTab)?(de(),q(u.activeTab)):ce(u.activeBridge.tabs[0].id)}),t.appendChild(s)});const o=document.querySelector(".musinsa-gender-row");if(o&&o.remove(),u.activeBridge&&u.activeBridge.renderGenderRow){const i=document.querySelector("#tab-all .section-header");if(i){i.style.position="relative";const r=document.createElement("div");r.innerHTML=u.activeBridge.renderGenderRow(u);const s=r.firstElementChild;s&&(s.style.position="absolute",s.style.right="0",s.style.top="50%",s.style.transform="translateY(-50%)",s.style.margin="0",i.appendChild(s))}}if(S.currentLang!=="ko"){const i=S.currentLang,r=n.filter(s=>!s[`name_${i}`]&&!localStorage.getItem(`cat_${i}_${s.category_code}`));r.length>0&&Dt(r.map(s=>s.category_name),i,"category").then(s=>{s&&r.forEach((c,p)=>{const d=s[p];if(d){localStorage.setItem(`cat_${i}_${c.category_code}`,d);const l=t.querySelector(`button[data-code="${c.category_code}"]`);l&&(l.textContent=d)}})})}if(n.length>0&&!u.activeCategory){u.activeCategory=n[0].category_code;const i=t.querySelector(".chip");i&&i.classList.add("active")}u.currentPlatform!=="k_trend"&&await q(u.activeTab)}catch(e){console.error("Category load error:",e)}}async function q(e){try{if(u.aiSearch&&u.searchQuery)return await Mt();switch(e){case"wishlist":return await qt();case"logs":return await Nt();case"insights":return await Kt();default:return await Ke(e)}}catch(t){console.error(`Tab ${e} load error:`,t)}}async function Ke(e){var i;if(u.currentPlatform==="k_trend")return await Lt(e);e==="all"&&Ct();const t=document.querySelector(`.tab-content#tab-${e}`)||document.getElementById("tab-all"),n=(t==null?void 0:t.querySelector(".products-grid"))||document.getElementById("allProductsBody");if(!n)return;n.tagName==="TBODY"?n.innerHTML=`<tr><td colspan="8" class="loading-cell">${window.t("common.loading")}</td></tr>`:n.innerHTML='<div class="loading-skeleton"></div>';const a=document.getElementById("rankingTitle"),o=document.getElementById("rankingDesc");if(a)if(a.removeAttribute("data-i18n"),u.searchQuery)a.textContent=`${window.t("sections.all")} - ${u.searchQuery}`;else if(u.currentPlatform==="steady_sellers")a.textContent="주요 스테디 셀러";else{const r=document.querySelector("#categoryChips .chip.active"),s=r?r.textContent:window.t("tabs.all")||"All";a.textContent=`${u.activeBridge.name} - ${s}`}o&&(o.removeAttribute("data-i18n"),u.currentPlatform==="steady_sellers"?o.textContent=window.t("common.desc_steady")||"K-Vant가 엄선한 최고의 상품 컬렉션":o.textContent=(window.t("common.desc_platform")||"{platform} 플랫폼 데이터 분석 결과").replace("{platform}",u.activeBridge.name));try{const r=await u.activeBridge.fetchData(e,u),s=r.data||[],c=r.count||s.length;if(u.activeBridge.renderTabContent){const l=u.activeBridge.renderTabContent(e,r,u);if(l){const g=t==null?void 0:t.querySelector(".table-container");g&&(g.style.display="none");let m=t==null?void 0:t.querySelector(".custom-content-area");m||(m=document.createElement("div"),m.className="custom-content-area",t&&t.appendChild(m)),m.innerHTML=l,m.style.display="block",n&&(n.style.display="none"),S.currentLang!=="ko"&&e!=="crawl_logs"&&s&&s.length>0&&J(s,S.currentLang),S.documentUpdate(),fe(0);return}}else{const l=t==null?void 0:t.querySelector(".table-container");l&&(l.style.display="block"),n&&(n.style.display=n.tagName==="TBODY"?"table-row-group":"grid");const g=t==null?void 0:t.querySelector(".custom-content-area");g&&(g.style.display="none")}if(s.length===0){if(n.tagName==="TBODY"){n.innerHTML=`<tr><td colspan="8" class="empty-cell">${window.t("common.no_results")}</td></tr>`;const l=n.closest("table").querySelector("thead");l&&(l.style.display="none")}else n.innerHTML=V(window.t("common.no_results"));fe(0);return}const p=await se(),d=new Set(((i=p.data)==null?void 0:i.map(l=>l.product_id))||[]);if(n.tagName==="TBODY"){const l=n.closest("table").querySelector("thead");l&&(l.style.display=""),n.innerHTML=s.map((g,m)=>(g.is_saved=d.has(g.product_id||g.id),At(g,m))).join(""),S.currentLang!=="ko"&&J(s,S.currentLang)}else n.innerHTML=s.map(l=>(l.is_saved=d.has(l.product_id||l.id),ue(l,e==="deals"?"deal":"normal"))).join(""),S.currentLang!=="ko"&&J(s,S.currentLang);S.documentUpdate(),fe(c)}catch(r){console.error("Bridge fetch error:",r);const s=(t==null?void 0:t.querySelector(".products-grid"))||document.getElementById("allProductsBody");s&&(s.innerHTML=`<div class="error-state">데이터 로딩 중 오류가 발생했습니다: ${r.message}</div>`)}}function Ct(){const e=document.querySelector("#tab-all .table-container");e&&(e.querySelector("#allProductsTable")||(e.innerHTML=`
      <table class="data-table" id="allProductsTable">
        <thead>
          <tr>
            <th data-i18n="table.rank">순위</th>
            <th data-i18n="table.image">이미지</th>
            <th class="sortable" data-sort="name" data-i18n="table.name">상품명</th>
            <th class="sortable" data-sort="brand" data-i18n="table.brand">브랜드</th>
            <th class="sortable" data-sort="price" data-i18n="table.price">가격</th>
            <th data-i18n="table.review">리뷰</th>
            <th data-i18n="table.rating">평점</th>
            <th data-i18n="table.rank_change">변동</th>
          </tr>
        </thead>
        <tbody id="allProductsBody">
          <tr>
            <td colspan="8" class="loading-cell">데이터 로딩 중...</td>
          </tr>
        </tbody>
      </table>
    `,Ue(),S.documentUpdate()))}function Ue(){document.querySelectorAll(".data-table th.sortable").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.sort;u.sortBy===t?u.sortDir=u.sortDir==="asc"?"desc":"asc":(u.sortBy=t,u.sortDir="asc"),document.querySelectorAll(".data-table th.sortable").forEach(n=>n.classList.remove("asc","desc")),e.classList.add(u.sortDir),u.currentPage=1,q("all")})})}async function Lt(e){var a;const t=document.getElementById(`tab-${e}`),n=document.getElementById(`${e}Grid`);if(!(!t||!n)){document.querySelectorAll(".tab-content").forEach(o=>o.classList.remove("active")),t.classList.add("active"),u.activeTab=e,n.innerHTML='<div class="loading-skeleton"></div>';try{const o=await u.activeBridge.fetchData(e,u),i=o.data||[];if(u.activeBridge.renderTabContent){const c=u.activeBridge.renderTabContent(e,o,u);if(c!=null){n.innerHTML=c,S.currentLang!=="ko"&&Ot(n,S.currentLang);return}}if(i.length===0){n.innerHTML=V(window.t("common.no_results")||"트렌드 데이터가 없습니다.");return}const r=await se(),s=new Set(((a=r.data)==null?void 0:a.map(c=>c.product_id))||[]);n.innerHTML=i.map(c=>(c.is_saved=s.has(c.product_id||c.id),ue(c,"normal",!0))).join(""),S.currentLang!=="ko"&&J(i,S.currentLang)}catch(o){console.error("K-Trend fetch error:",o),n.innerHTML=`<div class="error-state">트렌드 데이터 로딩 실패: ${o.message}</div>`}}}function At(e,t){const n=(u.currentPage-1)*u.perPage+t+1,a=F(),i=!pe(a);let r=B(K(e)),s=B(le(e));i&&(r=G(r),s=G(s));let c='<span style="color:#999;">—</span>';return e.rank_change===null||e.rank_change===void 0?e.prev_rank===null&&(c='<span style="display:inline-block;background:#3b82f6;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;">NEW</span>'):e.rank_change>0?c=`<span style="color:#22c55e;font-weight:600;">▲${e.rank_change}</span>`:e.rank_change<0&&(c=`<span style="color:#ef4444;font-weight:600;">▼${Math.abs(e.rank_change)}</span>`),`
      <tr class="${i?"locked-row":""}" 
        onclick="${i?"":`window.__openProduct(${JSON.stringify(e).replace(/"/g,"&quot;")})`}" 
        style="cursor:${i?"default":"pointer"}">
        <td><span class="rank-num">${n}</span></td>
        <td><img class="thumb" src="${e.image_url||""}" alt="" loading="lazy" onerror="this.style.display='none'" /></td>
        <td style="max-width:280px">
          <div class="product-name" data-pid="${e.product_id||e.id}" style="-webkit-line-clamp:1">${r}</div>
        </td>
        <td><span class="product-brand" data-brand-pid="${e.product_id||e.id}">${s}</span></td>
        <td>${H(e.price||e.price_current)}</td>
        <td>${e.review_count>0?O(e.review_count):"-"}</td>
        <td>${e.review_rating>5?"❤️ "+O(e.review_rating):e.review_rating>0&&!isNaN(e.review_rating)?e.review_rating:"-"}</td>
        <td style="text-align:center;">${c}</td>
      </tr>
    `}async function Mt(){var n;const e=document.querySelector(`.tab-content#tab-${u.activeTab}`),t=(e==null?void 0:e.querySelector(".products-grid"))||document.getElementById("allProductsBody");if(t){t.tagName==="TBODY"?t.innerHTML=`<tr><td colspan="8" class="loading-cell">${window.t("common.loading")}</td></tr>`:t.innerHTML='<div class="loading-skeleton"></div>';try{const{data:a}=await ht(u.searchQuery,40);if(a.length===0){t.tagName==="TBODY"?t.innerHTML=`<tr><td colspan="8" class="empty-cell">${window.t("common.no_results")}</td></tr>`:t.innerHTML=V(window.t("common.no_results"));return}const o=await se(),i=new Set(((n=o.data)==null?void 0:n.map(r=>r.product_id))||[]);t.tagName==="TBODY"?t.innerHTML=a.map((r,s)=>{r.is_saved=i.has(r.id);const c=B(K(r)),p=B(le(r)),d=H(r.price);return`
          <tr onclick="window.__openProduct(${JSON.stringify(r).replace(/"/g,"&quot;")})">
            <td>${s+1}</td>
            <td><img src="${r.image_url}" class="table-img" /></td>
            <td>${c}</td>
            <td>${p}</td>
            <td>${d}</td>
            <td>${r.review_count>0?O(r.review_count):"-"}</td>
            <td>${r.review_rating>5?"❤️ "+O(r.review_rating):r.review_rating>0&&!isNaN(r.review_rating)?r.review_rating:"-"}</td>
            <td style="text-align:center;"><span style="color:#999;">—</span></td>
          </tr>
        `}).join(""):t.innerHTML=a.map(r=>(r.is_saved=i.has(r.id),ue(r))).join("")}catch(a){console.error("Semantic load error:",a),t.innerHTML=`<div class="error-state">AI 검색 중 오류가 발생했습니다: ${a.message}</div>`}}}async function qt(){const e=document.getElementById("wishlistGrid"),t=document.getElementById("sourcingActionBar");if(!e)return;if(e.innerHTML='<div class="loading-skeleton"></div>',t&&(t.style.display="none"),!P()){e.innerHTML=V(window.t("sections.fav_login_required"),window.t("sections.fav_login_desc"));return}try{const a=new Date,o=540,r=new Date(a.getTime()+(a.getTimezoneOffset()+o)*6e4).getHours(),s=await ot("oliveyoung"),c=s.data||[],p=new Set(c.map(y=>y.product_id)),d=s.date||"",l=r>=21;let g=0;const m=[],h=await se();for(const y of(h==null?void 0:h.data)||[]){const _=y.product_id||y.id;if(y.platform==="oliveyoung"&&p.has(_)&&l)try{await ut(_,!1),g++}catch(I){console.error("Failed to auto-remove expired deal:",I)}else m.push(y)}if(g>0&&alert(`올리브영 오늘의 특가 시간이 종료되어 ${g}개의 상품이 관심 상품에서 자동 삭제되었습니다.`),m.length===0){e.innerHTML=V(window.t("sections.fav_empty"),window.t("sections.fav_empty_desc"));const y=document.getElementById("quoteItemCount");y&&(y.innerText="0");return}const v=m.reduce((y,_)=>{const I=_.platform||"기타";return y[I]||(y[I]=[]),y[I].push(_),y},{});if(e.innerHTML=Object.entries(v).map(([y,_])=>{const I=window.i18n&&window.i18n.currentLang==="en";return`
        <div class="wishlist-platform-group" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 12px; color: var(--text); display: flex; align-items: center; gap: 8px;">
            <span style="display:inline-block; width:4px; height:16px; background:var(--accent-blue); border-radius:2px;"></span>
            ${y.charAt(0).toUpperCase()+y.slice(1)} 
            <span style="font-size: 12px; color: var(--text-muted); font-weight: 400;">(${_.length})</span>
          </h3>
          <div class="product-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            ${_.map(k=>ue(k,"normal",!1,!0)).join("")}
          </div>
        </div>
      `}).join(""),S.currentLang!=="ko"&&J(m,S.currentLang),S.documentUpdate(),t){t.style.display="block";const y=document.getElementById("quoteItemCount");y&&(y.innerText=m.length)}}catch(a){console.error("loadWishlist error:",a),e.innerHTML=`<div class="error-state">관심 상품을 불러오는데 실패했습니다: ${a.message}</div>`}}async function Ot(e,t){var c,p;if(t==="ko")return;const n="AIzaSyBzm4JIZ2miwFFzaGxWA2nwAKiasATMAAM",o=e.querySelectorAll(".nb-brand-name, .nb-product-brand, .nb-product-name, .nb-hash");if(o.length===0)return;const i={};o.forEach(d=>{const l=d.textContent.trim();if(!l||l.length<2)return;const g=`nb_${t}_${l}`,m=localStorage.getItem(g);if(m){d.textContent=m;return}i[l]||(i[l]={cacheKey:g,elements:[]}),i[l].elements.push(d)});const r=Object.entries(i);if(r.length===0)return;const s=25;for(let d=0;d<r.length;d+=s){const l=r.slice(d,d+s),g=l.map(([m])=>`q=${encodeURIComponent(m)}`).join("&");try{const m=await fetch(`https://translation.googleapis.com/language/translate/v2?key=${n}`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`target=${t}&source=ko&${g}`});if(!m.ok)continue;const h=await m.json(),v=((p=(c=h==null?void 0:h.data)==null?void 0:c.translations)==null?void 0:p.map(y=>y.translatedText))||[];l.forEach(([y,_],I)=>{const $=v[I]||y;localStorage.setItem(_.cacheKey,$),_.elements.forEach(k=>{k.textContent=$})})}catch(m){console.warn("Naver Best translation error:",m)}}}const ae={};async function J(e,t){var r,s;if(t==="ko")return;const n="AIzaSyBzm4JIZ2miwFFzaGxWA2nwAKiasATMAAM",a=[];if(e.forEach(c=>{const p=c.product_id||c.id,d=`tr_${t}_${p}`,l=`br_en_${p}`,g=c.name_ko||c.name||c.product_name,m=c.brand_ko||c.brand||c.brand_name;!c[`name_${t}`]&&!ae[d]&&!localStorage.getItem(d)&&g&&a.push({type:"name",p:c,text:g,cacheKey:d}),!c.brand_en&&!localStorage.getItem(l)&&m&&a.push({type:"brand",p:c,text:m,cacheKey:l,target:"en"})}),a.length===0)return;const o=25,i=a.reduce((c,p)=>{const d=p.target||t;return c[d]||(c[d]=[]),c[d].push(p),c},{});for(const[c,p]of Object.entries(i))for(let d=0;d<p.length;d+=o){const l=p.slice(d,d+o),g=l.map(m=>`q=${encodeURIComponent(m.text)}`).join("&");try{const m=await fetch(`https://translation.googleapis.com/language/translate/v2?key=${n}`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`target=${c}&source=ko&${g}`});if(!m.ok)continue;const h=await m.json(),v=((s=(r=h==null?void 0:h.data)==null?void 0:r.translations)==null?void 0:s.map(y=>y.translatedText))||[];l.forEach((y,_)=>{let I=v[_]||y.text;y.type==="brand"&&(I=I.replace(/ /g,"")),ae[y.cacheKey]=I,localStorage.setItem(y.cacheKey,I);const $=y.p.product_id||y.p.id,k=y.type==="name"?`.product-name[data-pid="${$}"], .gt-product-name[data-pid="${$}"]`:`.product-brand[data-pid="${$}"], .gt-product-brand[data-pid="${$}"]`;document.querySelectorAll(k).forEach(w=>{w.textContent=I})})}catch(m){console.warn(`Speed Translation error (${c}):`,m)}}}async function Dt(e,t,n="category"){var o,i;if(!e||e.length===0)return;const a="AIzaSyBzm4JIZ2miwFFzaGxWA2nwAKiasATMAAM";try{const r=e.map(p=>`q=${encodeURIComponent(p)}`).join("&"),s=await fetch(`https://translation.googleapis.com/language/translate/v2?key=${a}`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`target=${t}&source=ko&${r}`});if(!s.ok)return null;const c=await s.json();return((i=(o=c==null?void 0:c.data)==null?void 0:o.translations)==null?void 0:i.map(p=>p.translatedText))||null}catch(r){return console.warn(`Keyword translation error (${n}):`,r),null}}function K(e){const t=S.currentLang;if(t==="ko")return e.name_ko||e.name||"";const n=e[`name_${t}`]||e[`${t}_name`];if(n)return n;const a=e.product_id||e.id,o=`tr_${t}_${a}`,i=ae[o]||localStorage.getItem(o);return i?(ae[o]=i,i):e.name_en?e.name_en:e.name_ko||e.name||""}function le(e){if(S.currentLang==="ko")return e.brand_ko||e.brand||"";if(e.brand_en)return e.brand_en;const a=`br_en_${e.product_id||e.id}`,o=localStorage.getItem(a);return o||e.brand_ko||e.brand||""}function ue(e,t="normal",n=!1,a=!1){const o=!!e.is_saved,i=e.product_id||e.id,r=F(),c=!pe(r)&&!n;let p=B(K(e)),d=B(le(e));c&&(p=G(p),d=G(d));const l=e.special_price||e.price||e.price_current||0,g=e.original_price||e.price_original||0,m=g>l,h=e.discount_pct||e.discount_rate||(m?Math.round((1-l/g)*100):0),v=m||t==="deal"&&h>0;let y="";n?y=`<div class="price-current" style="color:var(--accent-blue);font-size:16px;">💬 ${O(l)}건 언급</div>`:v&&h>0?y=`<div class="deal-price-row">
             ${g>0?`<span class="deal-orig-price">${H(g)}</span>`:""}
             <span class="deal-sale-price">${H(l)}</span>
             <span class="deal-pct">${h}%</span>
           </div>`:y=`<div class="price-current">${H(l)}</div>`;const _=["google_trends","naver_datalab"].includes(e.source);let I="";if(_){const w=e.source==="google_trends"?"📈":"🇳";I=`<div class="product-img" style="display:flex;align-items:center;justify-content:center;font-size:40px;background:${e.source==="google_trends"?"#e8f0fe":"#e4f7e4"};min-height:200px;">${w}</div>`}else I=`<img class="product-img" src="${e.image_url||""}" alt="${p}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                 <div class="product-img-fallback" style="display:none;width:80px;height:80px;border-radius:12px;align-items:center;justify-content:center;background:#f5f5f5;color:#ccc;flex-shrink:0;font-size:12px;">No Image</div>`;let $="";n&&e.ai_tags&&Array.isArray(e.ai_tags)&&($=`<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
          ${e.ai_tags.map(w=>`<span style="background:#eef2ff; color:var(--accent-blue); padding:4px 8px; border-radius:4px; font-size:12px; font-weight:500;">#${B(w)}</span>`).join("")}
      </div>`);const k=a?`
    <div class="sourcing-qty-control" onclick="event.stopPropagation();" style="display:flex; align-items:center; justify-content:center; gap:15px; margin-top:10px; padding-top:10px; border-top:1px solid var(--border);">
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <input type="checkbox" class="sourcing-item-checkbox" checked style="width:16px; height:16px; accent-color:var(--accent-blue);">
        <span style="font-size:12px; color:var(--text-muted); font-weight:500;">📦 ${window.t("sourcing.qty_label")}</span>
      </label>
      <div style="display:flex; align-items:center; gap:8px;">
        <button type="button" class="btn-qty" onclick="event.stopPropagation(); window.__updateSourcingQty(this, -5)">-</button>
        <input type="number" class="sourcing-qty-input" data-product-id="${i}" value="10" min="10" step="5" style="width:50px; text-align:center; border:1px solid var(--border); border-radius:4px; font-size:12px; padding:2px; background:var(--background); color:var(--text);" onclick="event.stopPropagation();">
        <button type="button" class="btn-qty" onclick="event.stopPropagation(); window.__updateSourcingQty(this, 5)">+</button>
      </div>
    </div>
  `:"";return`
    <div class="product-card ${_||n?"trend-card":""} ${c?"locked-card":""}" 
      data-name-ko="${B(e.name||e.name_ko||"")}"
      data-name-en="${B(e.name_en||"")}"
      data-brand-ko="${B(e.brand||e.brand_ko||"")}"
      data-brand-en="${B(e.brand_en||"")}"
      onclick="${c?"":`window.__openProduct(${JSON.stringify(e).replace(/"/g,"&quot;")})`}">
      ${c?'<div class="locked-overlay"><span>PRO Only</span></div>':""}
      <div class="product-wishlist-pos">
        <button class="btn-wishlist ${o?"active":""}"
          onclick="event.stopPropagation(); window.__toggleWishlist(this, '${e.id||i}')">
          <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
      </div>
      <div class="product-card-top">
        ${I}
        <div class="product-info">
          <div class="product-brand">${d}</div>
          <div class="product-name">${p}</div>
          <div class="product-price-container">
            ${y}
          </div>
          ${$}
        </div>
      </div>
      <div class="product-card-bottom">
        ${!n&&e.rank_change!==void 0&&e.rank_change!==null?`<span class="badge ${e.rank_change>0?"badge-rank-up":"badge-rank-down"}">${e.rank_change>0?"▲":"▼"} ${Math.abs(e.rank_change)}</span>`:""}
        ${e.review_count>0?`<span class="badge badge-reviews">⭐ ${e.review_rating>0?e.review_rating:"-"} (${n?"-":O(e.review_count)})</span>`:""}
      </div>
      ${k}
    </div>
  `}window.__toggleWishlist=async function(e,t){if(!P()){alert("로그인이 필요한 기능입니다.");const o=document.getElementById("authModal");o&&o.classList.add("open");return}const a=e.classList.contains("active");try{if(a)await He(t),e.classList.remove("active");else{let o=window.currentModalProductData;(!o||o.id!==t&&o.product_id!==t)&&(o=[...window.__cachedProducts||[],...window.__cachedDeals||[],...window.__cachedTrending||[]].find(r=>r.id===t||r.product_id===t)||{product_id:t}),await ct(t,o),e.classList.add("active")}}catch(o){console.error("Wishlist toggle fail:",o),alert("오류가 발생했습니다: "+o.message)}};async function Rt(){return await Ke("all")}async function Nt(){const e=document.getElementById("crawlLogsBody");if(e)try{const{data:t,error:n}=await pt();if(n)throw n;if(!t||t.length===0){e.innerHTML='<tr><td colspan="5" style="text-align:center; padding:40px;">수집 내역이 없습니다.</td></tr>';return}e.innerHTML=t.map(a=>`
      <tr>
        <td>${new Date(a.started_at).toLocaleString()}</td>
        <td>${a.job_name}</td>
        <td>
          <span class="badge ${a.status==="success"?"badge-success":"badge-danger"}">
            ${a.status==="success"?"성공":"실패"}
          </span>
        </td>
        <td>${a.items_count||0}건</td>
        <td title="${a.error_message||""}">${a.error_message||"-"}</td>
      </tr>
    `).join("")}catch(t){console.error("Load logs error:",t),e.innerHTML=`<tr><td colspan="5" style="text-align:center; color:var(--accent-red); padding:40px;">오류: ${t.message}</td></tr>`}}function fe(e){const t=document.getElementById("pagination");if(!t)return;const n=Math.ceil(e/u.perPage);if(n<=1){t.innerHTML="";return}let a="";a+=`<button class="page-btn" ${u.currentPage===1?"disabled":""} data-page="${u.currentPage-1}">← 이전</button>`,Ht(u.currentPage,n).forEach(i=>{i==="..."?a+='<span class="page-info">...</span>':a+=`<button class="page-btn ${i===u.currentPage?"active":""}" data-page="${i}">${i}</button>`}),a+=`<button class="page-btn" ${u.currentPage===n?"disabled":""} data-page="${u.currentPage+1}">다음 →</button>`,a+=`<span class="page-info">${O(e)}건 중 ${(u.currentPage-1)*u.perPage+1}-${Math.min(u.currentPage*u.perPage,e)}</span>`,t.innerHTML=a,t.querySelectorAll(".page-btn").forEach(i=>{i.addEventListener("click",()=>{if(i.disabled)return;u.currentPage=parseInt(i.dataset.page),Rt();const r=document.getElementById("tab-all");r&&window.scrollTo({top:r.offsetTop-80,behavior:"smooth"})})})}function Ht(e,t){if(t<=7)return Array.from({length:t},(a,o)=>o+1);const n=[];if(e<=4){for(let a=1;a<=5;a++)n.push(a);n.push("...",t)}else if(e>=t-3){n.push(1,"...");for(let a=t-4;a<=t;a++)n.push(a)}else n.push(1,"...",e-1,e,e+1,"...",t);return n}function he(){const e=document.getElementById("modalOverlay");e&&e.classList.remove("open"),document.body.style.overflow=""}async function zt(e){var m,h,v,y,_,I;const t=window.i18n&&window.i18n.currentLang?window.i18n.currentLang:"ko",a={ko:"Korean",en:"English",vi:"Vietnamese",th:"Thai",id:"Indonesian",ja:"Japanese"}[t]||"Korean",o=`ai_summary_${e.product_id||e.id}_${t}`,i=localStorage.getItem(o);if(i)try{return JSON.parse(i)}catch{}if(e.ai_summary&&e.ai_summary.pros&&t==="ko")return e.ai_summary;const r="AIzaSyBcc0MZDYF_mqBdlWXE_Vzf5ufxZ0KBstI";let s="";if(e.ai_summary&&e.ai_summary.pros&&t!=="ko")s=`Translate the following JSON object's string arrays ('keywords', 'pros', 'cons') into ${a}. 
Keep the exact same JSON schema and do not change the 'sentiment_pos' integer.
Return ONLY valid JSON.

JSON to translate:
${JSON.stringify(e.ai_summary)}
`;else{const $=e.reviews;if($&&$.length>0)s=`Analyze the following Korean product reviews for "${e.name}".
Return ONLY valid JSON matching this exact schema. All string values (keywords, pros, cons) MUST BE WRITTEN IN ${a}.
{
  "sentiment_pos": (integer 0-100),
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "pros": ["pro1", "pro2", "pro3"],
  "cons": ["con1", "con2", "con3"]
}

CRITICAL INSTRUCTION FOR CONS:
Never use vague or generic statements.
Extract highly specific product flaws mentioned by users.
If the reviews do not contain any specific negative feedback, simply output a statement in ${a} saying no specific cons mentioned.

Reviews:
${$.join(`
`).substring(0,2e3)}`;else{const k=e.brand||"",w=e.review_count>0?`This product has ${e.review_count} reviews with an average rating of ${e.review_rating}/5.`:"";s=`You are analyzing a Korean beauty/fashion product: "${e.name}" by "${k}".
${w}
Based on publicly known information about this product and brand, provide a general analysis.
Return ONLY valid JSON matching this exact schema. All string values MUST BE WRITTEN IN ${a}.
{
  "sentiment_pos": (integer 0-100),
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "pros": ["pro1", "pro2", "pro3"],
  "cons": ["con1", "con2", "con3"]
}

Provide realistic, specific analysis based on the product type and brand reputation. Do NOT make up fake reviews.`}}const c=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${r}`,p=await fetch(c,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:s}]}],generationConfig:{temperature:.1,responseMimeType:"application/json"}})});if(!p.ok){const $=await p.text();throw new Error(`Gemini API Error: ${$}`)}let l=((I=(_=(y=(v=(h=(m=(await p.json()).candidates)==null?void 0:m[0])==null?void 0:h.content)==null?void 0:v.parts)==null?void 0:y[0])==null?void 0:_.text)==null?void 0:I.trim())||"";l.startsWith("```json")?l=l.split("```json")[1].split("```")[0].trim():l.startsWith("```")&&(l=l.split("```")[1].split("```")[0].trim());const g=JSON.parse(l);return localStorage.setItem(o,JSON.stringify(g)),g}let ve=null;function jt(){const e=document.getElementById("modalOverlay"),t=document.getElementById("modalBody");if(!e||!t)return;const n=window.t("membership.limit_reached"),a=window.t("membership.limit_desc"),o=window.t("membership.confirm");t.innerHTML=`
    <div class="membership-alert-modal">
      <div class="alert-icon">🔒</div>
      <h2>${n}</h2>
      <p>${a}</p>
      <div class="alert-actions">
        <button class="btn-confirm" onclick="document.getElementById('modalOverlay').classList.remove('open'); document.body.classList.remove('one-page');">${o}</button>
      </div>
    </div>
  `,e.classList.add("open"),document.body.classList.add("one-page")}window.__openProduct=async function(e){const t=F();if(!pe(t)){if(st()>=10){jt();return}rt()}window.currentModalProductId=e.id||e.product_id,window.currentModalProductData=e;const a=document.getElementById("modalOverlay"),o=document.getElementById("modalBody");if(!a||!o)return;const i=e.special_price||e.price||e.price_current||e.deal_price,r=e.url||e.product_url,s=!!e.special_price;window.currentModalIsSaved=await lt(window.currentModalProductId);const c=window.i18n&&window.i18n.currentLang?window.i18n.currentLang:"ko",p=`ai_summary_${e.product_id||e.id}_${c}`;let d=null;try{const h=localStorage.getItem(p);h&&(d=JSON.parse(h))}catch{}!d&&e.ai_summary&&c==="ko"&&(d=e.ai_summary);let l=!1;const g=()=>{const h=["google_trends","naver_datalab"].includes(e.source),v=d?d.sentiment_pos:e.review_rating?Math.min(Math.round(e.review_rating*20),98):85,y=100-v,_=d?d.keywords:[],I=d?d.pros:[],$=d?d.cons:[],k=d?d.reason:"",w=d?d.insight:"",f=d?d.target:"",b=d?d.slogan:"";o.classList.add("one-page");let x="";const E=e.source||(typeof u<"u"?u.currentPlatform:"oliveyoung")||"oliveyoung",C=window.t("platforms."+E)||E,M=s?window.t("modal.cta_check_price"):"🔗 "+window.t("modal.view_in").replace("{platform}",C);if(E==="steady_sellers"){const T=e.image_urls&&e.image_urls.length>0?e.image_urls:e.image_url?[e.image_url]:[],Ee=T[0]||"",Be=e.description||"",Ye=new Intl.NumberFormat().format(i||0);x=`
        <div class="modal-upper ss-detail-upper">
          <div class="modal-image-col ss-gallery">
            <div class="ss-main-img-wrapper">
              <img id="ssMainImage" class="modal-img-fixed ss-main-img" src="${Ee}" alt="${B(K(e))}">
            </div>
            ${T.length>1?`
              <div class="ss-thumb-row">
                ${T.map((Te,Pe)=>`
                  <img class="ss-thumb ${Pe===0?"ss-thumb-active":""}" src="${Te}" alt="thumb ${Pe+1}"
                    onclick="document.getElementById('ssMainImage').src='${Te}'; document.querySelectorAll('.ss-thumb').forEach(t=>t.classList.remove('ss-thumb-active')); this.classList.add('ss-thumb-active');">
                `).join("")}
              </div>
            `:""}
          </div>
          <div class="modal-info-col ss-info">
            <div class="ss-brand-label">${B(e.brand||"")}</div>
            <h2 class="ss-product-title product-name" data-pid="${e.id}">${B(K(e))}</h2>
            <div class="ss-price-display">
              <span class="ss-price-currency">₩</span>
              <span class="ss-price-amount">${Ye}</span>
            </div>
            ${Be?`
              <div class="ss-description">
                <div class="ss-desc-label">${window.t("modal.product_info")||"Product Info"}</div>
                <p class="ss-desc-text">${B(Be)}</p>
              </div>
            `:""}
            <button class="btn-store-link ss-sourcing-btn" onclick="window.__openSourcingFromSteady && window.__openSourcingFromSteady(${JSON.stringify({name:e.name,brand:e.brand,price:i,image_url:Ee}).replace(/"/g,"&quot;")})">
              📦 ${window.t("sourcing.request_quote")||"Request Sourcing Quote"}
            </button>
          </div>
        </div>
      `}else h?x=`
        <div class="modal-upper">
          <div class="modal-image-col" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #f6d365 0%, #fda085 100%);color:white;font-size:48px;border-radius:12px;">
             ${e.source==="google_trends"?"📈":"🇳"}
          </div>
          <div class="modal-info-col">
            <div class="trend-badge-row">
               <span class="badge badge-rank-up">🔥 급상승 트렌드</span>
               <span class="badge">${e.source==="google_trends"?"Google Trends":"Naver DataLab"}</span>
            </div>
            <h3 class="modal-title" style="margin-top:10px;font-size:2rem;">${B(e.name)}</h3>
            <div class="modal-meta-value" style="margin-top:5px;color:var(--text-secondary)">
               ${new Date().toLocaleDateString()} 기준 트렌드 분석
            </div>
          </div>
        </div>

        <div class="modal-lower">
          <div class="modal-section-title">✨ AI 트렌드 인사이트 (AI)</div>
          <div class="ai-summary trend-mode">
             ${d?`
             <div class="trend-insight-grid">
               <div class="insight-box">
                 <div class="ib-icon">💡</div>
                 <div class="ib-content">
                   <div class="ib-title">급상승 이유</div>
                   <div class="ib-text">${k}</div>
                 </div>
               </div>
               <div class="insight-box">
                 <div class="ib-icon">🎯</div>
                 <div class="ib-content">
                   <div class="ib-title">타겟 오디언스</div>
                   <div class="ib-text">${f}</div>
                 </div>
               </div>
               <div class="insight-box full">
                 <div class="ib-icon">📢</div>
                 <div class="ib-content">
                   <div class="ib-title">마케팅 슬로건</div>
                   <div class="ib-text slogan">"${b}"</div>
                 </div>
               </div>
               <div class="insight-box full">
                 <div class="ib-icon">📊</div>
                 <div class="ib-content">
                   <div class="ib-title">비즈니스 인사이트</div>
                   <div class="ib-text">${w}</div>
                 </div>
               </div>
             </div>
             `:'<div class="loading-skeleton">AI 분석 데이터를 불러오는 중...</div>'}
          </div>
        </div>
        `:x=`
      <!-- UPPER: Left Image + Right Info -->
      <div class="modal-upper optimized-upper">
        <!-- LEFT: Image -->
        <div class="modal-image-col">
          ${e.image_url?`<img class="modal-img-premium" src="${e.image_url}" alt="${B(e.name)}" />`:'<div style="width:100%;height:300px;background:#f8f8fa;border-radius:16px;display:flex;align-items:center;justify-content:center;color:#ccc;">No Image</div>'}
        </div>

        <!-- RIGHT: Info + Charts + CTA -->
        <div class="modal-info-col optimized-info">
          <div class="modal-title-area">
            <div class="modal-brand-premium">${B(le(e))}</div>
            <h3 class="modal-title-premium">${B(K(e))}</h3>
          </div>

          <!-- Glassmorphism Metrics Grid -->
          <div class="modal-metrics-glass">
            <div class="metric-glass-card ${s?"deal-active":""}">
              <div class="metric-label">${s?window.t("modal.special_price"):window.t("modal.price")}</div>
              <div class="metric-value price-val">${H(i)}</div>
              ${e.original_price?`<div class="metric-sub original-price">${H(e.original_price)}</div>`:""}
              ${e.discount_pct?`<div class="metric-badge discount-badge">${e.discount_pct}% OFF</div>`:""}
            </div>
            
            ${e.review_count!==void 0?`
            <div class="metric-glass-card">
              <div class="metric-label">${window.t("modal.reviews")}</div>
              <div class="metric-value" id="modalReviewCount">${e.review_count>0?O(e.review_count):e.review_rating>5?"-":O(e.review_count)}</div>
              ${e.review_rating&&e.review_rating<=5?`<div class="metric-sub" id="modalReviewRating">⭐ ${e.review_rating}</div>`:`<div class="metric-sub" id="modalReviewRating">${e.review_count>0?"⭐ "+e.review_rating:""}</div>`}
            </div>`:""}
            
            ${e.current_rank!==void 0?`
            <div class="metric-glass-card">
              <div class="metric-label" style="font-size:0.8rem;">${window.t("modal.rank_category")}</div>
              <div class="metric-value rank-val" style="font-size:1.4rem;">${window.t("modal.rank_value").replace("{rank}",e.current_rank)}</div>
              ${e.rank_change!==void 0?`
                <div class="metric-sub rank-change ${e.rank_change>0?"up":"down"}">
                  ${e.rank_change>0?"▲":"▼"} ${Math.abs(e.rank_change)}
                </div>`:""}
            </div>`:""}
          </div>

          <!-- Action Buttons (Wishlist & Sourcing) -->
          <div style="display:flex; gap:10px; margin-bottom:15px; width:100%; position:relative; z-index:9999; pointer-events:auto;">
            <button class="btn-store-premium ${window.currentModalIsSaved?"active":""}" style="flex:1; background:#fff; color:var(--accent-blue); border:1px solid var(--accent-blue); padding:12px; border-radius:12px; font-weight:700; cursor:pointer;" onclick="window.__modalToggleWishlist(this, '${e.id||e.product_id}')">
               ${window.currentModalIsSaved?window.t("modal.wishlist_saved"):window.t("modal.wishlist_add")}
            </button>
            <button class="btn-store-premium" style="flex:1; background:#fff; color:#f06595; border:1px solid #f06595; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;" onclick="window.__sourcingRequestFromModal('${e.id||e.product_id}')">
               ${window.t("modal.sourcing_req")}
            </button>
          </div>
          <!-- External Store Link -->
          ${r?`<a class="btn-store-premium" href="${r}" target="_blank" rel="noopener" style="margin-bottom:0px;">${M}</a>`:""}
          <!-- Price & Rank Charts (Simplified) -->
          <div class="chart-section-premium">
            <div class="modal-chart-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <div class="modal-section-title" style="margin-bottom:0; white-space:nowrap;">${window.t("modal.rank_trend")}</div>
                <span id="bestRankBadge" style="display:none; background:rgba(59, 130, 246, 0.1); color:var(--accent-blue); font-size:11px; font-weight:700; padding:3px 10px; border-radius:12px; border:1px solid rgba(59, 130, 246, 0.2); white-space:nowrap;">
                  ${window.t("modal.best_rank")} #-
                </span>
              </div>
              <div id="chartTabsModal" style="display:flex; gap:6px;">
                <button id="chartBtn_all" class="chart-tab-btn active" onclick="window.__setChartTab('all')">${window.t("tabs.all")}</button>
                <button id="chartBtn_7" class="chart-tab-btn" onclick="window.__setChartTab(7)">7${window.t("modal.days_30").replace("30","")}</button>
                <button id="chartBtn_30" class="chart-tab-btn" onclick="window.__setChartTab(30)">30${window.t("modal.days_30").replace("30","")}</button>
              </div>
            </div>
            <div id="chartContainerModal" class="chart-container-modal">
              <canvas id="rankChart"></canvas>
            </div>
            <div id="chartPlaceholderModal" style="display:none; height: 120px; align-items: center; justify-content: center; background: var(--surface-light); border-radius: 12px; color: var(--text-muted); font-size: 14px; font-weight: 500;">
              ${window.t("modal.no_rank_data")}
            </div>
          </div>
        </div>
      </div>

      <!-- LOWER: AI Review Analysis -->
      <div class="modal-lower">
        <div class="modal-section-title">${window.t("modal.ai_insight_title")}</div>
        <div class="ai-summary premium-ai">
          <div class="ai-header">
            <span class="ai-icon">🤖</span>
            <span class="ai-title">${window.t("modal.ai_review_analysis")}</span>
            <span class="ai-badge">${d?"LIVE":"BETA"}</span>
          </div>

          ${!d&&!l?`
          <div class="ai-action-area">
            <button class="btn-ai-generate" onclick="loadAiData()">${window.t("modal.run_analysis")}</button>
          </div>`:""}

          ${l?`
          <div class="ai-loading-area">
            <div class="loading-spinner"></div>
            <p>${window.t("modal.ai_analyzing")}</p>
          </div>`:""}

          ${d?`
          <div class="sentiment-container">
            <div class="sentiment-labels">
              <span class="pos-label">${window.t("modal.sentiment_pos")} ${v}%</span>
              <span class="neg-label">${window.t("modal.sentiment_neg")} ${y}%</span>
            </div>
            <div class="sentiment-bar-premium">
              <div class="sentiment-pos" style="width:${v}%"></div>
              <div class="sentiment-neg" style="width:${y}%"></div>
            </div>
          </div>
          
          <div class="ai-keywords-pills">
            ${_.map(T=>`<span class="pill-keyword">#${T}</span>`).join("")}
          </div>
          
          <div class="ai-proscons-premium">
            <div class="pros-col">
              <div class="list-head pros-head">👍 ${window.t("modal.pros")}</div>
              <ul class="styled-list pros-list">
                ${I.map(T=>`<li><span class="list-icon">✓</span><span>${T}</span></li>`).join("")}
              </ul>
            </div>
            <div class="cons-col">
              <div class="list-head cons-head">👎 ${window.t("modal.cons")}</div>
              <ul class="styled-list cons-list">
                ${$.map(T=>`<li><span class="list-icon">✕</span><span>${T}</span></li>`).join("")}
              </ul>
            </div>
          </div>
          <p class="ai-disclaimer">
            * ${window.t("modal.ai_disclaimer")}
          </p>`:""}
        </div>
      </div>
      `;o.innerHTML=x};window.__rerenderModal=()=>{g(),setTimeout(()=>window.__setChartTab&&window.__setChartTab("all"),100)},g(),a.classList.add("open"),document.body.style.overflow="hidden",setTimeout(()=>{window.__setChartTab("all")},400),window.loadAiData=async()=>{l=!0,g(),setTimeout(()=>window.__setChartTab&&window.__setChartTab("all"),50);try{d=await zt(e)}catch(h){console.error(h),alert("AI 분석 중 오류가 발생했습니다: "+(h.message||"API Key 확인 또는 할당량 초과"))}finally{l=!1,g(),setTimeout(()=>window.__setChartTab&&window.__setChartTab("all"),50)}},e.source==="oliveyoung"&&(e.review_count===0||e.review_count===void 0||e.review_rating>5)&&e.product_id?(async()=>{try{const v=await fetch(`http://localhost:6002/api/product-reviews?goodsNo=${encodeURIComponent(e.product_id)}`);if(v.ok){const y=await v.json();if(y.success){y.reviewCount>0&&(e.review_count=y.reviewCount),y.rating>0&&y.rating<=5&&(e.review_rating=y.rating),y.reviews&&y.reviews.length>0&&(e.reviews=y.reviews);const _=document.getElementById("modalReviewCount"),I=document.getElementById("modalReviewRating");_&&e.review_count>0&&(_.textContent=O(e.review_count)),I&&e.review_rating>0&&e.review_rating<=5&&(I.innerHTML=`⭐ ${e.review_rating}`)}}}catch(h){console.warn("[Review Fetch] Server unavailable:",h.message)}d||window.loadAiData(!1)})():d?setTimeout(()=>window.__setChartTab("all"),100):window.loadAiData(!1),window.switchModalTab=async h=>{}};async function Fe(e,t=30){try{const{ranks:n,prices:a}=await it(e,t),o=document.getElementById("rankChart");if(!o)return;window.__rankChartInstance&&(window.__rankChartInstance.destroy(),window.__rankChartInstance=null),ve&&(ve.destroy(),ve=null);const i=f=>new Date(f).getTime(),r=n.filter(f=>f.timestamp&&!isNaN(i(f.timestamp))),s=a.filter(f=>f.timestamp&&!isNaN(i(f.timestamp)));let c=[...r.map(f=>f.timestamp),...s.map(f=>f.timestamp)];const p=new Map;c.forEach(f=>p.set(i(f),f));const d=Array.from(p.values()).sort((f,b)=>i(f)-i(b)),l=document.getElementById("chartContainerModal"),g=document.getElementById("chartPlaceholderModal");if(d.length<1){l&&(l.style.display="none"),g&&(g.style.display="flex");return}else l&&(l.style.display="block"),g&&(g.style.display="none");const m=d.map(f=>{const b=r.find(x=>i(x.timestamp)===i(f));return b?b.rank:null}),h=d.map(f=>{const b=s.find(x=>i(x.timestamp)===i(f));return b?b.price:null}),v=d.map(f=>{const b=s.find(x=>i(x.timestamp)===i(f));return b?b.original_price:null}),y=m.some(f=>f!==null),_=h.some(f=>f!==null);window.__currentChartRanks=m;const I=[];y&&I.push({label:S.t("charts.rank"),data:m,borderColor:"#4dabf7",backgroundColor:"rgba(77, 171, 247, 0.1)",yAxisID:"y",tension:.4,fill:!0,pointBackgroundColor:"#4dabf7",pointBorderColor:"#fff",pointHoverBackgroundColor:"#fff",pointHoverBorderColor:"#4dabf7"}),_&&I.push({label:S.t("charts.price"),data:h,borderColor:"#ff6b6b",backgroundColor:"rgba(255, 107, 107, 0.1)",yAxisID:"y1",tension:.4,fill:!0,pointBackgroundColor:"#ff6b6b",pointBorderColor:"#fff",pointHoverBackgroundColor:"#fff",pointHoverBorderColor:"#ff6b6b"});const $=d.map(f=>{const b=new Date(f),x=String(b.getMonth()+1).padStart(2,"0"),E=String(b.getDate()).padStart(2,"0"),C=String(b.getHours()).padStart(2,"0"),M=String(b.getMinutes()).padStart(2,"0");return C==="00"&&M==="00"?`${x}/${E}`:`${x}/${E} ${C}:${M}`}),k=d.length<=1?5:3,w=d.length<=1?7:5;y&&(I[0].pointRadius=k),y&&(I[0].pointHoverRadius=w),_&&(I[y?1:0].pointRadius=k),_&&(I[y?1:0].pointHoverRadius=w),window.__rankChartInstance=new Chart(o,{type:"line",data:{labels:$,datasets:I},options:{responsive:!0,maintainAspectRatio:!1,interaction:{mode:"index",intersect:!1},plugins:{legend:{display:!1,position:"top",labels:{usePointStyle:!0,boxWidth:8,font:{family:"'Inter', sans-serif",size:12}}},tooltip:{backgroundColor:"rgba(255, 255, 255, 0.95)",titleColor:"#343a40",bodyColor:"#495057",borderColor:"rgba(0,0,0,0.05)",borderWidth:1,padding:12,boxPadding:6,usePointStyle:!0,titleFont:{family:"'Inter', sans-serif",size:13,weight:"bold"},bodyFont:{family:"'Inter', sans-serif",size:13},callbacks:{label:function(f){let b=f.dataset.label||"";if(b&&(b+=": "),f.dataset.yAxisID==="y")b+=f.parsed.y+"위";else{const x=f.parsed.y;b+=x.toLocaleString()+"원";const E=f.dataIndex,C=v[E];if(C&&C>x){const M=Math.round((C-x)/C*100);b+=` (${M}% 할인)`}}return b}}}},scales:{x:{grid:{display:!1,drawBorder:!1},ticks:{font:{family:"'Inter', sans-serif",size:11},color:"#adb5bd",maxRotation:45,minRotation:0}},y:{type:"linear",display:y,position:"left",reverse:!0,min:1,max:100,title:{display:!0,text:S.t("charts.rank"),font:{family:"'Inter', sans-serif",size:12,weight:"500"},color:"#adb5bd"},grid:{color:"rgba(0,0,0,0.04)",drawBorder:!1},ticks:{stepSize:20,font:{family:"'Inter', sans-serif",size:11},color:"#adb5bd"}},y1:{type:"linear",display:_,position:"right",title:{display:!0,text:S.t("charts.price"),font:{family:"'Inter', sans-serif",size:12,weight:"500"},color:"#adb5bd"},grid:{drawOnChartArea:!1,drawBorder:!1},ticks:{callback:function(f){return f.toLocaleString()+"원"},font:{family:"'Inter', sans-serif",size:11},color:"#adb5bd"}}}}})}catch(n){console.error("Failed to load chart history:",n);const a=document.getElementById("chartContainerModal"),o=document.getElementById("chartPlaceholderModal");a&&(a.style.display="none"),o&&(o.style.display="flex")}}window.loadRankChart=Fe;window.__setChartTab=async function(e){Object.entries({all:"chartBtn_all",7:"chartBtn_7",30:"chartBtn_30"}).forEach(([a,o])=>{const i=document.getElementById(o);if(!i)return;const r=String(a)===String(e);i.classList.toggle("active",r)}),await Fe(window.currentModalProductId,e);const n=document.getElementById("bestRankBadge");if(n&&window.__currentChartRanks&&window.__currentChartRanks.length>0){const a=Math.min(...window.__currentChartRanks.filter(o=>o!==null));isFinite(a)&&(n.textContent=`${window.t("modal.best_rank")} #${a}`,n.style.display="inline-block")}};let L={category:null,brand:null,price:null};async function Kt(){if(u.currentPlatform==="k_trend")return await Ut();try{const[e,t,n]=await Promise.all([gt(),mt(),yt()]);if(Jt(e.data||[]),Yt(t.data||[]),Vt(n.data||[]),u.currentPlatform!=="oliveyoung")await Ft();else{const a=document.getElementById("trendPulseCard");a&&a.remove()}}catch(e){console.error("Insights load error:",e)}}async function Ut(){const e=document.querySelector("#tab-insights .insights-grid");if(e){e.innerHTML=`<div class="ktrend-loading" style="grid-column:1/-1">
    <div class="ktrend-spinner"></div><span>🤖 AI 트렌드 태그 분석 중...</span>
  </div>`;try{const[t,n]=await Promise.all([ne(50,"google_trends"),ne(30,"naver_datalab")]),a=t.data||[],o=n.data||[],i=[...a,...o];if(i.length===0){e.innerHTML=`<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text-muted)">
        <div style="font-size:48px;margin-bottom:12px">📊</div>
        <h3>분석 데이터가 없습니다</h3>
        <p>크롤러와 AI 태거를 실행하면 자동으로 채워집니다.</p>
      </div>`;return}const r={},s={},c={},p={};let d=0;i.forEach(b=>{const x=b.tags||{};Object.keys(x).length>0&&d++,x.ingredient&&(r[x.ingredient]=(r[x.ingredient]||0)+1),x.brand&&(s[x.brand]=(s[x.brand]||0)+1),x.fashion_style&&(c[x.fashion_style]=(c[x.fashion_style]||0)+1),x.trend_type&&(p[x.trend_type]=(p[x.trend_type]||0)+1)});const l=b=>{const x=(b.brand||"").match(/\+?([\d,]+)%/);return x?parseInt(x[1].replace(/,/g,"")):0},g=[...a].sort((b,x)=>l(x)-l(b)).slice(0,15),m=Object.entries(r).sort((b,x)=>x[1]-b[1]).slice(0,10),h=Object.entries(s).sort((b,x)=>x[1]-b[1]).slice(0,10),v=Object.entries(c).sort((b,x)=>x[1]-b[1]),y=d>0,_=y?`<span style="color:var(--accent-green);font-weight:600;font-size:12px">● AI 태그 ${d}건 분석 완료</span>`:'<span style="color:var(--accent-orange);font-weight:600;font-size:12px">⚠ AI 태그 없음 – trend_enricher.py를 먼저 실행해주세요</span>';e.innerHTML=`
      <!-- 카드 1: 출처 도넛 + 태그 상태 -->
      <div class="insight-card">
        <h3>📡 데이터 출처 비중</h3>
        <div class="chart-wrapper"><canvas id="ktrendSourceChart"></canvas></div>
        <div style="margin-top:12px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;">
          <div><span style="color:#1a73e8">● 구글 트렌드 ${a.length}건</span>&nbsp;&nbsp;<span style="color:#03c75a">● 네이버 ${o.length}건</span></div>
          <div>${_}</div>
        </div>
      </div>

      <!-- 카드 2: 트렌드 타입 도넛 -->
      <div class="insight-card">
        <h3>🏷️ 트렌드 유형 분포</h3>
        ${y&&Object.keys(p).length>0?'<div class="chart-wrapper"><canvas id="ktrendTypeChart"></canvas></div>':'<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px">AI 태깅 후 자동 생성됩니다</div>'}
      </div>

      <!-- 카드 3: 화장품 성분 TOP (full-width) -->
      <div class="insight-card full-width">
        <h3>🧪 화장품 성분 트렌드 ${y?'<span style="font-size:12px;font-weight:400;color:var(--text-muted)">(AI 분석)</span>':""}</h3>
        ${m.length>0?'<div class="chart-wrapper" style="height:280px"><canvas id="ktrendIngredientChart"></canvas></div>':`<div style="padding:40px;text-align:center;color:var(--text-muted)">
              <div style="font-size:32px;margin-bottom:8px">🧪</div>
              <p>AI가 아직 성분을 추출하지 않았습니다.</p>
              <code style="font-size:11px;background:#f5f5f7;padding:4px 8px;border-radius:4px">python scripts/trend_enricher.py</code> 를 실행해주세요.
             </div>`}
      </div>

      <!-- 카드 4: 브랜드 언급 TOP (full-width) -->
      <div class="insight-card full-width">
        <h3>🏷️ 브랜드 언급 TOP ${y?'<span style="font-size:12px;font-weight:400;color:var(--text-muted)">(AI 분석)</span>':""}</h3>
        ${h.length>0?'<div class="chart-wrapper" style="height:300px"><canvas id="ktrendBrandChart"></canvas></div>':`<div style="padding:40px;text-align:center;color:var(--text-muted)">
              <div style="font-size:32px;margin-bottom:8px">🏷️</div>
              <p>AI 태깅 후 브랜드가 자동 추출됩니다.</p>
             </div>`}
      </div>

      <!-- 카드 5: 패션 트렌드 키워드 cloud -->
      <div class="insight-card full-width">
        <h3>👗 패션 트렌드 키워드 ${y?'<span style="font-size:12px;font-weight:400;color:var(--text-muted)">(AI 분석)</span>':""}</h3>
        ${v.length>0?`<div class="ktrend-insight-pills">
              ${v.map(([b,x],E)=>`
                <span class="ktrend-insight-pill" style="animation-delay:${E*.04}s;font-size:${13+Math.min(x*2,8)}px">
                  ${B(b)} <span style="opacity:0.5;font-size:11px">(${x})</span>
                </span>
              `).join("")}
             </div>`:`<div style="padding:40px;text-align:center;color:var(--text-muted)">
              <div style="font-size:32px;margin-bottom:8px">👗</div>
              <p>AI 태깅 후 패션 스타일이 자동 추출됩니다.</p>
             </div>`}
      </div>

      <!-- 카드 6: 구글 급상승 TOP15 -->
      <div class="insight-card full-width">
        <h3>🔥 구글 트렌드 급상승 TOP 15 키워드</h3>
        <div class="chart-wrapper" style="height:360px"><canvas id="ktrendBarChart"></canvas></div>
      </div>
    `;const I=document.getElementById("ktrendSourceChart");I&&(L.category&&L.category.destroy(),L.category=new Chart(I,{type:"doughnut",data:{labels:["구글 트렌드","네이버 데이터랩"],datasets:[{data:[a.length,o.length],backgroundColor:["#1a73e8","#03c75a"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{color:"#6e6e73",font:{size:12,family:"Inter"}}}}}}));const $=document.getElementById("ktrendTypeChart");if($&&Object.keys(p).length>0){const b={beauty:"#ff9500",fashion:"#af52de",brand:"#0071e3",other:"#86868b"},x=Object.keys(p);L.brand&&L.brand.destroy(),L.brand=new Chart($,{type:"doughnut",data:{labels:x,datasets:[{data:x.map(E=>p[E]),backgroundColor:x.map(E=>b[E]||"#86868b"),borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{color:"#6e6e73",font:{size:12,family:"Inter"}}}}}})}const k=document.getElementById("ktrendIngredientChart");if(k&&m.length>0){const b=["#ff9500","#ff3b30","#af52de","#0071e3","#34c759","#32ade6","#fbbf24","#e879f9","#10b981","#6366f1"];new Chart(k,{type:"bar",data:{labels:m.map(([x])=>x),datasets:[{data:m.map(([,x])=>x),backgroundColor:m.map((x,E)=>b[E%b.length]),borderRadius:6,label:"언급 횟수"}]},options:{indexAxis:"y",responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{label:x=>` ${x.parsed.x}회 언급`}}},scales:{x:{grid:{color:"rgba(0,0,0,0.03)"},ticks:{font:{size:11,family:"Inter"},color:"#adb5bd"}},y:{grid:{display:!1},ticks:{font:{size:14,family:"Inter",weight:"600"},color:"#1d1d1f"}}}}})}const w=document.getElementById("ktrendBrandChart");w&&h.length>0&&(L.price&&L.price.destroy(),L.price=new Chart(w,{type:"bar",data:{labels:h.map(([b])=>b),datasets:[{data:h.map(([,b])=>b),backgroundColor:"#0071e3",borderRadius:6,label:"언급 횟수"}]},options:{indexAxis:"y",responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{label:b=>` ${b.parsed.x}회 언급`}}},scales:{x:{grid:{color:"rgba(0,0,0,0.03)"},ticks:{font:{size:11,family:"Inter"},color:"#adb5bd"}},y:{grid:{display:!1},ticks:{font:{size:14,family:"Inter",weight:"600"},color:"#1d1d1f"}}}}}));const f=document.getElementById("ktrendBarChart");if(f&&g.length>0){const b=g.map(E=>Math.min(l(E),999999)),x=b.map(E=>E>1e5?"#e53e1a":E>1e4?"#dd6b20":"#0071e3");new Chart(f,{type:"bar",data:{labels:g.map(E=>E.name),datasets:[{label:"급상승 지수",data:b,backgroundColor:x,borderRadius:6}]},options:{indexAxis:"y",responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{label:E=>` +${E.parsed.x.toLocaleString()}%`}}},scales:{x:{grid:{color:"rgba(0,0,0,0.03)"},ticks:{callback:E=>E>=1e4?(E/1e4).toFixed(0)+"만%":E+"%",font:{size:11,family:"Inter"},color:"#adb5bd"}},y:{grid:{display:!1},ticks:{font:{size:13,family:"Inter"},color:"#1d1d1f"}}}}})}}catch(t){console.error("K-Trend Insights error:",t);const n=document.querySelector("#tab-insights .insights-grid");n&&(n.innerHTML=`<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--accent-red)">오류: ${t.message}</div>`)}}}async function Ft(){const e=document.querySelector(".insights-grid");if(!e||document.getElementById("trendPulseCard"))return;const t=document.createElement("div");t.className="insight-card full-width",t.id="trendPulseCard",t.innerHTML=`
    <h3>🚀 실시간 트렌드 펄스 (AI 분석)</h3>
    <div class="trend-pulse-container" id="trendPulseContent">
      <div class="loading-skeleton"></div>
    </div>
  `,e.prepend(t);try{const[n,a]=await Promise.all([ne(20,"google_trends"),ne(20,"naver_datalab")]),o=[...n.data||[],...a.data||[]].sort((r,s)=>(s.rank_change||0)-(r.rank_change||0)).slice(0,15),i=document.getElementById("trendPulseContent");if(o.length===0){i.innerHTML='<div class="empty-state-text">수집된 트렌드 데이터가 없습니다.</div>';return}i.innerHTML=o.map((r,s)=>{const c=r.ai_summary||{},p=c.reason?c.reason.split(".")[0]:"AI 분석 대기 중...",d=r.source==="google_trends"?"🇬":"🇳";return`
        <div class="trend-pill" onclick="window.__openProduct(${JSON.stringify(r).replace(/"/g,"&quot;")})">
          <span class="trend-rank">#${s+1}</span>
          <span class="trend-source">${d}</span>
          <span class="trend-keyword">${r.name}</span>
          <span class="trend-reason">${p}</span>
        </div>
      `}).join("")}catch(n){console.error("Trend Pulse Error:",n),document.getElementById("trendPulseContent").innerHTML='<div class="error-text">트렌드 로딩 실패</div>'}}function Jt(e){const t=document.getElementById("categoryShareChart");if(!t)return;L.category&&L.category.destroy();const n=e.slice(0,6).map(o=>o.name_en||o.name_ko),a=[35,25,15,10,8,7];L.category=new Chart(t,{type:"doughnut",data:{labels:n,datasets:[{data:a,backgroundColor:["#0071e3","#34c759","#ff9500","#ff3b30","#af52de","#86868b"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{color:"#6e6e73",font:{size:12,family:"SF Pro Display"}}}}}})}function Yt(e){const t=document.getElementById("brandPowerChart");if(!t)return;L.brand&&L.brand.destroy();const n={};e.forEach(o=>{o.brand&&(n[o.brand]=(n[o.brand]||0)+1)});const a=Object.entries(n).sort((o,i)=>i[1]-o[1]).slice(0,10);L.brand=new Chart(t,{type:"bar",data:{labels:a.map(o=>o[0]),datasets:[{label:"상품 수",data:a.map(o=>o[1]),backgroundColor:"rgba(0, 113, 227, 0.8)",borderColor:"#0071e3",borderWidth:1,borderRadius:4}]},options:{indexAxis:"y",responsive:!0,maintainAspectRatio:!1,onClick:(o,i)=>{if(i.length>0){const r=i[0].index,s=a[r][0],c=document.getElementById("searchInput");if(c){c.value=s,u.searchQuery=s,u.activeCategory="all",document.querySelectorAll(".chip").forEach(d=>d.classList.remove("active"));const p=document.querySelector('.chip[data-code="all"]')||document.querySelector(".chip:first-child");p&&p.classList.add("active"),u.activeTab="all",ce("all"),window.scrollTo({top:0,behavior:"smooth"})}}},scales:{x:{grid:{color:"rgba(0,0,0,0.05)"},border:{display:!1},ticks:{color:"#86868b"}},y:{grid:{display:!1},border:{display:!1},ticks:{color:"#1d1d1f"}}},plugins:{legend:{display:!1}}}})}function Vt(e){const t=document.getElementById("priceRangeChart");if(!t)return;L.price&&L.price.destroy();const n={"~1만":0,"1만~3만":0,"3만~5만":0,"5만~10만":0,"10만+":0};e.forEach(a=>{const o=a.price;o<1e4?n["~1만"]++:o<3e4?n["1만~3만"]++:o<5e4?n["3만~5만"]++:o<1e5?n["5만~10만"]++:n["10만+"]++}),L.price=new Chart(t,{type:"bar",data:{labels:Object.keys(n),datasets:[{label:"상품 수",data:Object.values(n),backgroundColor:"rgba(16, 185, 129, 0.6)",borderColor:"#10b981",borderWidth:1}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{x:{grid:{display:!1},border:{display:!1},ticks:{color:"#86868b"}},y:{grid:{color:"rgba(0,0,0,0.05)"},border:{display:!1},ticks:{color:"#86868b"}}},plugins:{legend:{display:!1}}}})}function H(e){if(e==null||e==="")return"-";const t=Number(e);return isNaN(t)||!isFinite(t)?"-":`₩${t.toLocaleString("ko-KR")}`}function O(e){if(e==null||e==="")return"-";const t=Number(e);return isNaN(t)||!isFinite(t)?"-":t.toLocaleString("ko-KR")}function B(e){return e?e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function V(e,t=""){return`
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">${e}</div>
      ${t?`<div class="empty-state-text" style="margin-top:4px;font-size:12px">${t}</div>`:""}
    </div>
  `}function pe(e){return e?e.role==="admin"?!0:e.subscription_tier!=="pro"||!e.subscription_expires_at?!1:new Date(e.subscription_expires_at)>new Date:!1}function G(e){if(!e)return"";const t=String(e);return t.length<=1?"*":t.length<=3?t.substring(0,1)+"**":t.substring(0,2)+"****"}window.__isProMember=pe;window.__maskText=G;window.getProfile=F;async function Gt(){P()&&(z(),setInterval(z,6e4))}function Wt(e,t,n){if(n==="ko")return{title:e,message:t};const a={en:{"📦 견적 출발 안내":"📦 Quote Preparation Started","💰 견적 도착 안내":"💰 Quote Ready","✅ 발주/배송 환료":"✅ Order/Delivery Completed","❌ 요청 취소 안내":"❌ Request Canceled","요청하신 소싱 제품의 견적 산출이 시작되었습니다.":"We have started calculating the quote for the requested sourcing products.","요청하신 소싱 건에 대한 총 예상 견적":"A total estimated quote has been calculated for your sourcing request.","요청하신 소싱 건의 발주 및 배송 처리가 완료되었습니다.":"The order and delivery process for your sourcing request has been completed.","요청하신 소싱 건이 취소되었습니다. 관리자 메시지를 확인해주세요.":"Your sourcing request has been canceled. Please check the admin message.","새로운 알림이 없습니다.":"No new notifications."},ja:{"📦 견적 출발 안내":"📦 見積開始の案内","💰 견적 도착 안내":"💰 見積完了の案内","✅ 발주/배송 환료":"✅ 発注/配送完了","❌ 요청 취소 안내":"❌ リクエストキャンセル案内","요청하신 소싱 제품의 견적 산출이 시작되었습니다.":"リクエストされたソーシング製品の見積算出が開始されました。","요청하신 소싱 건에 대한 총 예상 견적":"ソーシング案件の総予想見積もりが算出されました。","요청하신 소싱 건의 발주 및 배송 처리가 완료되었습니다.":"ソーシング案件の発注および配送処理が完了しました。","요청하신 소싱 건이 취소되었습니다. 관리자 메시지를 확인해주세요.":"ソーシング案件がキャンセルされました。管理者メッセージを確認してください。","새로운 알림이 없습니다.":"新しい通知はありません。"},th:{"📦 견적 출발 안내":"📦 แจ้งเริ่มดำเนินการประเมินราคา","💰 견적 도착 안내":"💰 แจ้งการประเมินราคาเสร็จสิ้น","✅ 발주/배송 환료":"✅ สั่งซื้อ/จัดส่งเสร็จสมบูรณ์","❌ 요청 취소 안내":"❌ แจ้งยกเลิกคำขอ","새로운 알림이 없습니다.":"ไม่มีการแจ้งเตือนใหม่"},vi:{"📦 견적 출발 안내":"📦 Thông báo bắt đầu báo giá","💰 견적 도착 안내":"💰 Thông báo báo giá đã sẵn sàng","✅ 발주/배송 환료":"✅ Đơn hàng/Giao hàng hoàn tất","❌ 요청 취소 안내":"❌ Thông báo hủy yêu cầu","새로운 알림이 없습니다.":"Không có thông báo mới"}},o=a[n]||a.en;let i=o[e]||e,r=t;if(t.includes("총 예상 견적")){const s=t.match(/\(([^)]+)\)/),c=s?s[1]:"";n==="en"?r=`A total estimated quote of ${c} has been calculated for your sourcing request.`:n==="ja"?r=`ソーシング案件の総予想見積もり(${c})が算出されました。`:o["요청하신 소싱 건에 대한 총 예상 견적"]&&(r=o["요청하신 소싱 건에 대한 총 예상 견적"]+(c?` (${c})`:""))}else r=o[t]||t;return{title:i,message:r}}async function z(){const e=P();if(e)try{const t=await fetch(`/api/notifications?user_id=${e.user.id}`);if(!t.ok)return;const n=await t.json();if(n.success&&n.notifications){const a=document.getElementById("notifBadge"),o=document.getElementById("notifList");if(!a||!o)return;const i=n.notifications,r=i.filter(s=>!s.is_read).length;if(r>0?(a.style.display="block",a.innerText=r>99?"99+":r):a.style.display="none",i.length>0){const s=window.i18n&&window.i18n.currentLang||"ko",c=r>0,p=document.querySelector(".notif-actions");p&&(p.innerHTML=`
            ${c?`<button class="notif-mark-read-btn" onclick="window.__markAllRead()">${s==="en"?"Mark all read":"모두 읽음"}</button>`:""}
            <button class="notif-clear-btn" onclick="window.__clearAllNotifs()">${s==="en"?"Clear all":"모두 지우기"}</button>
          `),o.innerHTML=i.map(d=>{const{title:l,message:g}=Wt(d.title,d.message,s),m=s==="en"?"en-US":s==="ko"?"ko-KR":s;return`
            <div class="notif-item ${d.is_read?"read":"unread"}" data-nid="${d.id}" onclick="handleNotiClick('${d.id}', '${d.link||""}')">
              <div class="notif-item-header">
                <div class="notif-title">${B(l)}</div>
                <button class="notif-delete-btn" onclick="event.stopPropagation(); window.__deleteNotif('${d.id}')" title="${s==="en"?"Delete":"삭제"}">✕</button>
              </div>
              <div class="notif-message">${B(g)}</div>
              <div class="notif-time">${new Date(d.created_at).toLocaleString(m)}</div>
            </div>
          `}).join("")}else{a.style.display="none";const s=window.t&&window.t("notifications.empty")||"새로운 알림이 없습니다.";o.innerHTML=`<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:40px 16px;">${s}</div>`;const c=document.querySelector(".notif-actions");c&&(c.innerHTML="")}}}catch(t){console.error("Failed to fetch notifications:",t)}}window.renderNotifications=z;window.handleNotiClick=async function(e,t){try{await fetch(`/api/notifications/${e}/read`,{method:"PUT"});const n=document.querySelector(`.notif-item[data-nid="${e}"]`);n&&(n.classList.remove("unread"),n.classList.add("read"))}catch(n){console.error(n)}z(),t==="sourcing"&&typeof window.openMyPageModal=="function"&&(window.openMyPageModal(),setTimeout(()=>{const n=document.querySelector('.auth-tab[data-mypage-tab="sourcing"]');n&&n.click()},100))};window.__deleteNotif=async function(e){try{await fetch(`/api/notifications/${e}`,{method:"DELETE"});const t=document.querySelector(`.notif-item[data-nid="${e}"]`);t&&t.remove(),z()}catch(t){console.error("Delete notification error:",t)}};window.__markAllRead=async function(){const e=P();if(e)try{await fetch(`/api/notifications/mark-all-read?user_id=${e.user.id}`,{method:"PUT"}),z()}catch(t){console.error("Mark all read error:",t)}};window.__clearAllNotifs=async function(){const e=P();if(e)try{await fetch(`/api/notifications/clear?user_id=${e.user.id}`,{method:"DELETE"}),z()}catch(t){console.error("Clear notifications error:",t)}};window.handleNotifClick=async function(e,t){if(e){await vt(e);const n=u.notifications.find(a=>a.id===e);n&&(n.is_read=!0),renderNotifications()}t&&window.__openProduct(t)};window.setGender=e=>{u.genderFilter=e,u.currentPage=1;const t=document.querySelector(".musinsa-gender-row");if(t&&u.activeBridge&&u.activeBridge.renderGenderRow){const n=document.createElement("div");n.innerHTML=u.activeBridge.renderGenderRow(u),t.replaceWith(n.firstElementChild)}q(u.activeTab)};window.openMyPageModal=async function(){const e=P();if(!e)return;const t=document.getElementById("myPageModalOverlay");if(!t)return;const n=await F()||{},a=document.getElementById("myPageEmail"),o=document.getElementById("myPageRole"),i=document.getElementById("myPagePhone"),r=document.getElementById("myPageCountry"),s=document.getElementById("myPageCity"),c=document.getElementById("myPageZip"),p=document.getElementById("myPageAddress1"),d=document.getElementById("myPageAddress2");a&&e&&(a.value=e.user.email||""),o&&(o.value=(n==null?void 0:n.role)||"user"),i&&(i.value=(n==null?void 0:n.phone)||""),r&&(r.value=(n==null?void 0:n.country)||""),s&&(s.value=(n==null?void 0:n.city)||""),c&&(c.value=(n==null?void 0:n.zip_code)||""),p&&(p.value=(n==null?void 0:n.address1)||""),d&&(d.value=(n==null?void 0:n.address2)||"");const l=document.getElementById("myPagePlanBadge"),g=document.getElementById("myPagePlanDesc"),m=document.getElementById("myPageSubscribedAt"),h=document.getElementById("myPageExpiresAt"),v=document.getElementById("cancelSubscriptionBtn"),y=document.getElementById("renewSubscriptionBtn"),_=document.getElementById("extendSubscriptionBtn"),I=(n.subscription_tier||"free").toLowerCase(),$=n.subscription_expires_at?new Date(n.subscription_expires_at):null,k=$?$<new Date:!1,w=I==="pro"&&k?"free":I,f=new Date,b=$?Math.ceil(($-f)/(1e3*60*60*24)):null;l&&(l.textContent=w==="pro"?"Pro":"Free",l.className=`plan-badge ${w==="pro"?"pro":""}`);const x=T=>T?new Date(T).toLocaleDateString(S.currentLang==="ko"?"ko-KR":"en-US"):"-";m&&(m.textContent=x(n.created_at)),y&&(y.style.display="none"),_&&(_.style.display="none"),v&&(v.style.display="none");const E=n.created_at?new Date(n.created_at):null,C=E?Math.ceil((f-E)/(1e3*60*60*24)):null,M=w==="pro"&&!n.subscription_id&&C!==null&&C<=14;if(g)if(n.role==="admin")g.textContent=window.t("mypage.status_admin");else if(I==="pro"&&k){const T=x($);g.textContent=`${window.t("mypage.status_expired")} (${T})`,y&&(y.style.display="block")}else if(M){const T=x($);g.textContent=window.t("mypage.status_trial").replace("{date}",T),y&&(y.style.display="block")}else if(w==="pro")if(n.subscription_id)g.textContent=window.t("mypage.status_pro_active"),v&&(v.style.display="block"),b!==null&&b<=7&&_&&(_.style.display="block");else{const T=x($);g.textContent=window.t("mypage.status_pro_cancelled").replace("{date}",T),b!==null&&b<=7&&_&&(_.style.display="block")}else g.textContent=window.t("mypage.status_free"),y&&(y.style.display="block");if(h)if(n.role==="admin")h.textContent=window.t("mypage.status_admin");else if($){const T=x($);k?(h.textContent=`${window.t("mypage.status_expired")} (${T})`,h.style.color="var(--accent-red, #e03131)"):M?(h.textContent=`${T}`,h.style.color="var(--accent-blue)"):n.subscription_id?(h.textContent=`${T} (${window.t("mypage.status_auto_renew")})`,h.style.color="var(--accent-blue)"):(h.textContent=`${T} (${window.t("mypage.status_no_renew")})`,h.style.color="var(--text-secondary)"),!k&&b!==null&&b<=7&&(h.textContent+=` ⚠️ D-${b}`,h.style.color="#e67e22")}else h.textContent="무제한";Je("account"),t.classList.add("open"),document.body.classList.add("one-page")};var Oe;(Oe=document.getElementById("btnSaveProfile"))==null||Oe.addEventListener("click",async()=>{var p,d,l,g,m,h;const e=P();if(!e)return;const t=((p=document.getElementById("myPagePhone"))==null?void 0:p.value)||"",n=((d=document.getElementById("myPageCountry"))==null?void 0:d.value)||"",a=((l=document.getElementById("myPageCity"))==null?void 0:l.value)||"",o=((g=document.getElementById("myPageZip"))==null?void 0:g.value)||"",i=((m=document.getElementById("myPageAddress1"))==null?void 0:m.value)||"",r=((h=document.getElementById("myPageAddress2"))==null?void 0:h.value)||"",s=document.getElementById("btnSaveProfile"),c=s.innerText;s.innerText=window.t("common.saving")||"저장 중...",s.disabled=!0;try{const{updateUserProfile:v}=await U(async()=>{const{updateUserProfile:_}=await import("./supabase-BiZ88kko.js").then(I=>I.y);return{updateUserProfile:_}},[]),{error:y}=await v(e.user.id,{phone:t,country:n,city:a,zip_code:o,address1:i,address2:r});if(y)throw new Error(y.message||window.t("common.save_failed")||"저장 실패");alert(window.t("mypage.save_success")||"계정 정보가 성공적으로 저장되었습니다.")}catch(v){alert((window.t("common.error")||"오류: ")+v.message)}finally{s.innerText=c,s.disabled=!1}});var De;(De=document.getElementById("btnDeleteAccount"))==null||De.addEventListener("click",async()=>{const e=(S==null?void 0:S.currentLang)||"ko";if(!confirm(e==="ko"?`정말 회원 탈퇴를 진행하시겠습니까?

• 모든 데이터(프로필, 관심상품, 견적내역 등)가 영구 삭제됩니다.
• 활성 구독이 있다면 자동으로 해지됩니다.
• 이 작업은 되돌릴 수 없습니다.`:`Are you sure you want to delete your account?

• All data (profile, wishlists, quotes, etc.) will be permanently deleted.
• Active subscriptions will be automatically cancelled.
• This action cannot be undone.`)||!confirm(e==="ko"?"마지막 확인: 정말로 탈퇴하시겠습니까?":"Final confirmation: Are you sure?"))return;const a=P();if(!a)return;const o=document.getElementById("btnDeleteAccount"),i=o.innerText;o.innerText=e==="ko"?"처리 중...":"Processing...",o.disabled=!0;try{const s=await(await fetch("/api/user/delete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:a.user.id})})).json();if(s.success)alert(e==="ko"?"탈퇴 처리가 완료되었습니다. 이용해 주셔서 감사합니다.":"Account deleted successfully. Thank you for using our service."),localStorage.clear(),window.location.href="/";else throw new Error(s.error||"탈퇴 처리 실패")}catch(r){alert((e==="ko"?"오류: ":"Error: ")+r.message),o.innerText=i,o.disabled=!1}});function Je(e){const t=document.getElementById("myPageAccountTab"),n=document.getElementById("myPageBillingTab"),a=document.getElementById("myPageSourcingTab"),o=document.getElementById("myPageSupportTab");if(document.querySelectorAll("#myPageModal .auth-tab").forEach(r=>{r.dataset.mypageTab===e?r.classList.add("active"):r.classList.remove("active")}),t&&(t.style.display=e==="account"?"block":"none"),n&&(n.style.display=e==="billing"?"block":"none"),a&&(a.style.display=e==="sourcing"?"block":"none"),o&&(o.style.display=e==="support"?"block":"none"),e==="sourcing"?(window.loadSourcingHistory(),window.loadSearchRequests()):e==="support"&&window.loadFaqs(),e==="billing"){const r=F()||{},s=(r.subscription_tier||"free").toLowerCase(),c=r.subscription_expires_at?new Date(r.subscription_expires_at):null,p=c?c<new Date:!1;(s==="pro"&&p?"free":s)!=="pro"&&setTimeout(()=>W(),100)}}document.addEventListener("DOMContentLoaded",()=>{const e=document.getElementById("myPageModalClose");e&&e.addEventListener("click",()=>{document.getElementById("myPageModalOverlay").classList.remove("open"),document.body.classList.remove("one-page")}),document.querySelectorAll("#myPageModal .auth-tab").forEach(i=>{i.addEventListener("click",r=>{const s=r.target.dataset.mypageTab;s&&Je(s)})}),document.addEventListener("click",i=>{const r=i.target.closest(".dropdown-item");if(r){if(r.id==="myPageBtn")window.openMyPageModal();else if(r.id==="wishlistNavBtn"){const s=document.querySelector('.tab[data-tab="wishlist"]');s&&(s.click(),window.scrollTo({top:document.querySelector(".tab-bar").offsetTop-80,behavior:"smooth"}))}}});const n=document.getElementById("cancelSubscriptionBtn");n&&n.addEventListener("click",async()=>{const i=S.currentLang||"ko";if(!confirm(i==="ko"?`정말로 구독을 해지하시겠습니까?
이번 결제 주기(만료일)까지만 Pro 혜택이 유지되며 이후에는 더 이상 자동 연장 결제되지 않습니다.`:`Are you sure you want to cancel your subscription?
Pro benefits will remain until the end of the current billing cycle, and you will not be charged again.`))return;const s=P();if(!s)return alert("로그인이 필요합니다. / Login required.");n.disabled=!0,n.textContent="처리 중... / Processing...",n.style.opacity="0.5";try{const p=await(await fetch("/api/paypal/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:s.user.id})})).json();p.success?(alert(i==="ko"?"구독 해지가 완료되었습니다. 만료일까지 Pro 혜택이 유지됩니다.":"Subscription cancelled. Pro benefits remain until expiry date."),window.location.reload()):alert(p.error||"해지 실패. 관리자에게 문의하세요. / Cancellation failed.")}catch(c){alert("오류가 발생했습니다. / An error occurred."),console.error(c)}finally{n.disabled=!1,n.textContent=window.t("mypage.btn_cancel")||"🚫 구독 해지 (Cancel)",n.style.opacity="1"}});const a=document.getElementById("tosCheckbox"),o=document.getElementById("paypalBlocker");a&&o&&a.addEventListener("change",i=>{if(i.target.checked)o.style.display="none";else{const r=document.getElementById("paypal-button-container");r&&r.style.display!=="none"&&(o.style.display="block")}})});let Q=!1;function W(){const e=document.getElementById("paypal-button-container");if(console.log("[PayPal Debug] renderPayPalButtons called. Container:",e?"Found":"NOT Found"),!e)return;if(Q&&e.children.length===0&&(console.log("[PayPal Debug] Container was emptied, resetting rendered flag."),Q=!1),Q&&e.children.length>0){console.log("[PayPal Debug] Already rendered and container not empty, skipping.");return}const t="P-4V196281CB810293WNGSW32I".trim(),n="AXGOwD9JXnOE5Y2aLifrFqo7Mzz-zGBnFO5j7kzygueYu1zoVrmZJW0Ewq7dSrcdhl3fklvXNYAx9MKU".trim();if(console.log("[PayPal Debug] Starting render with PlanID:",t,"ClientID:",n),!t||!n){console.error("[PayPal Debug] PayPal Plan ID or Client ID is missing"),alert("결제 설정이 누락되었습니다. 관리자에게 문의해주세요.");return}if(typeof paypal>"u"){if(document.getElementById("paypal-sdk-script"))console.warn("[PayPal Debug] PayPal SDK script exists but paypal is undefined. Waiting..."),setTimeout(W,500);else{console.log("[PayPal Debug] Injecting PayPal SDK script dynamically...");const i=document.createElement("script");i.id="paypal-sdk-script",i.src=`https://www.paypal.com/sdk/js?client-id=${n}&vault=true&intent=subscription&currency=USD`,i.setAttribute("data-sdk-integration-source","button-factory"),i.onload=()=>{console.log("[PayPal Debug] PayPal SDK loaded directly, re-calling render..."),W()},i.onerror=()=>{console.error("[PayPal Debug] Failed to load PayPal SDK"),alert("결제 모듈을 불러오는데 실패했습니다.")},document.head.appendChild(i)}return}e.innerHTML="";const a=paypal.Buttons({style:{shape:"rect",color:"gold",layout:"vertical",label:"subscribe"},createSubscription:function(o,i){return console.log("[PayPal Debug] Creating subscription with Plan ID:",t),i.subscription.create({plan_id:t,application_context:{brand_name:"Kvantlab",shipping_preference:"NO_SHIPPING",user_action:"SUBSCRIBE_NOW"}})},onApprove:async function(o,i){console.log("[PayPal Debug] PayPal subscription approved:",o.subscriptionID);const r=P();if(!r){alert("로그인이 필요합니다.");return}try{const c=await(await fetch("/api/subscription/activate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:r.user.id,subscriptionId:o.subscriptionID})})).json();c.success?(alert(S.currentLang==="ko"?"🎉 Pro 구독이 활성화되었습니다!":"🎉 Pro subscription activated!"),window.location.reload()):alert(c.error||"구독 활성화 실패")}catch(s){console.error("[PayPal Debug] Subscription activation error:",s),alert("오류가 발생했습니다. / An error occurred.")}},onError:function(o){console.error("[PayPal Debug] onError triggered:",o),console.error("[PayPal Debug] Error details:",JSON.stringify(o,Object.getOwnPropertyNames(o)));const i=(o==null?void 0:o.message)||JSON.stringify(o)||"Unknown PayPal Error";alert(`PayPal 결제 중 오류가 발생했습니다!
Plan ID: `+t+`
에러 내용: `+i+`

참고: 시크릿 모드/사파리인 경우 작동하지 않을 수 있습니다. 일반 브라우저에서 다시 시도해주세요.`)},onCancel:function(){console.log("[PayPal Debug] PayPal subscription cancelled by user")}});a.isEligible()?(console.log("[PayPal Debug] Buttons are eligible, rendering now..."),a.render("#paypal-button-container").catch(o=>{console.error("[PayPal Debug] Render failed:",o)}),Q=!0):(console.error("[PayPal Debug] Buttons are NOT eligible for this account/configuration."),e.innerHTML='<div style="color:#e03131; font-size:13px; text-align:center; padding:10px;">결제 버튼을 불러올 수 없습니다. (Ineligible)</div>')}const Z=document.getElementById("renewSubscriptionBtn");Z&&Z.addEventListener("click",()=>{const e=document.getElementById("paypal-button-container"),t=document.getElementById("tos-container");if(!e)return;if(e.style.display!=="none")e.style.display="none",t&&(t.style.display="none"),Z.textContent=window.t("mypage.btn_renew")||"🔄 구독 갱신 (Renew)";else{t&&(t.style.display="block"),e.style.display="block",e.style.marginBottom="16px";const a=document.getElementById("tosCheckbox"),o=document.getElementById("paypalBlocker");o&&a&&(o.style.display=a.checked?"none":"block"),W(),e.scrollIntoView({behavior:"smooth",block:"center"}),Z.textContent=S.currentLang==="ko"?"✕ 결제창 닫기":"✕ Close Payment"}});const X=document.getElementById("extendSubscriptionBtn");X&&X.addEventListener("click",()=>{const e=document.getElementById("paypal-button-container"),t=document.getElementById("tos-container");if(!e)return;if(e.style.display!=="none")e.style.display="none",t&&(t.style.display="none"),X.textContent=window.t("mypage.btn_extend")||"⏳ 구독 연장 (Extend)";else{t&&(t.style.display="block"),e.style.display="block",e.style.marginBottom="16px";const a=document.getElementById("tosCheckbox"),o=document.getElementById("paypalBlocker");o&&a&&(o.style.display=a.checked?"none":"block"),W(),e.scrollIntoView({behavior:"smooth",block:"center"}),X.textContent=S.currentLang==="ko"?"✕ 결제창 닫기":"✕ Close Payment"}});window.openQuoteModal=function(e=null){let t=[];if(e&&Array.isArray(e)&&e.length>0?t=e:document.querySelectorAll("#wishlistGrid .sourcing-qty-input").forEach(r=>{var d,l,g;const s=r.closest(".product-card"),c=s?s.querySelector(".sourcing-item-checkbox"):null;if(c&&!c.checked)return;const p=parseInt(r.value)||0;if(p>0){const m=S.currentLang;let h="Unknown",v="";if(s){const I=s.getAttribute("data-name-ko"),$=s.getAttribute("data-name-en"),k=s.getAttribute("data-brand-ko"),w=s.getAttribute("data-brand-en"),f=((d=s.querySelector(".product-name"))==null?void 0:d.innerText)||"",b=((l=s.querySelector(".product-brand"))==null?void 0:l.innerText)||"";m==="ko"?(h=I||f||"Unknown",v=k||b||""):(h=$&&$.trim()||f||I||"Unknown",v=w&&w.trim()||b||k||"")}const y=r.getAttribute("data-product-id"),_=s&&((g=s.querySelector("img"))==null?void 0:g.src)||"";t.push({product_id:y,name:h,brand:v,qty:p,quantity:p,image:_})}}),t.length===0){alert(window.t("sourcing.alert_empty_cart")||"장바구니가 비어 있습니다.");return}let n="";t.forEach(i=>{n+=`
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.05);">
        <div style="flex:1; padding-right:10px; overflow:hidden;">
          <div style="font-size:12px; font-weight:700; color:var(--accent-blue); margin-bottom:2px;">${i.brand}</div>
          <div style="font-size:14px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${i.name}</div>
        </div>
        <div style="font-weight:700; font-size:14px; color:var(--text); background:#fff; padding:6px 12px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); white-space:nowrap;">
          ${i.qty}개
        </div>
      </div>
    `});const a=document.getElementById("quoteProductList");a&&(a.innerHTML=n,a.lastElementChild&&(a.lastElementChild.style.borderBottom="none")),window.__currentQuoteItems=t;const o=document.getElementById("quoteModalOverlay");o&&o.classList.add("open"),typeof _e=="function"&&_e()};window.closeQuoteModal=function(){const e=document.getElementById("quoteModalOverlay");e&&e.classList.remove("open")};window.__updateSourcingQty=function(e,t){const n=e.parentNode.querySelector(".sourcing-qty-input");if(n){let a=parseInt(n.value)||0;a+=t,a<10&&(a=10),n.value=a}};let N=[];window.__addSnsInput=function(){const e=document.getElementById("quoteSnsLinksContainer");if(!e||e.querySelectorAll(".sns-link-row").length>=5)return;const n=window.t("sourcing.modal_sns_placeholder")||"📌 SNS 링크 / 상품 URL",a=document.createElement("div");a.className="sns-link-row",a.style.cssText="display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px;",a.innerHTML=`
    <div style="display: flex; gap: 6px; align-items: center;">
      <input type="url" class="form-input quote-sns-input" placeholder="${n}"
        style="flex:1; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px;"
        oninput="window.__validateSnsInput(this)">
      <button type="button" onclick="window.__removeSnsInput(this)"
        style="padding: 8px 11px; border-radius: 8px; border: 1px solid #e03131; background: transparent; color: #e03131; font-size: 16px; cursor: pointer; font-weight: 700; line-height: 1;">−</button>
    </div>
    <div class="sns-error" style="display:none; font-size:11px; color:#e03131; padding-left:2px;">올바른 URL 형식을 입력해주세요. (예: https://www.instagram.com/...)</div>`,e.appendChild(a)};window.__removeSnsInput=function(e){const t=e.closest(".sns-link-row");t&&t.remove()};window.__validateSnsInput=function(e){const t=e.value.trim(),n=e.closest(".sns-link-row"),a=n?n.querySelector(".sns-error"):null;if(!t)return e.style.borderColor="var(--border)",a&&(a.style.display="none"),!0;let o=!1;try{const i=new URL(t);o=i.protocol==="http:"||i.protocol==="https:"}catch{o=!1}return o?(e.style.borderColor="var(--accent-green, #34c759)",a&&(a.style.display="none")):(e.style.borderColor="#e03131",a&&(a.style.display="block")),o};window.__previewQuoteImages=function(e){const n=[],a=[];Array.from(e).forEach(i=>{i.type.startsWith("image/")?i.size>5*1024*1024?a.push(`${i.name} (파일 크기가 5MB를 초과합니다)`):n.push(i):a.push(`${i.name} (이미지 파일만 업로드 가능합니다)`)}),a.length>0&&alert(`⚠️ 업로드 불가 파일:
`+a.join(`
`));const o=n.slice(0,5-N.length);N.push(...o),N.length>5&&(N=N.slice(0,5)),Ie()};window.__handleQuoteImageDrop=function(e){const t=e.dataTransfer.files;window.__previewQuoteImages(t);const n=document.getElementById("quoteImageDropZone");n&&(n.style.borderColor="var(--border)")};window.__removeQuoteImage=function(e){N.splice(e,1),Ie()};function Ie(){const e=document.getElementById("quoteImagePreviews");e&&(e.innerHTML=N.map((t,n)=>`<div style="position:relative; width:64px; height:64px;">
      <img src="${URL.createObjectURL(t)}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
      <button onclick="window.__removeQuoteImage(${n})" style="position:absolute; top:-5px; right:-5px; width:18px; height:18px; border-radius:50%; background:#e03131; color:white; font-size:10px; border:none; cursor:pointer; line-height:18px; text-align:center;">×</button>
    </div>`).join(""))}function _e(){document.querySelectorAll("[id-i18n-placeholder]").forEach(e=>{const t=e.getAttribute("id-i18n-placeholder"),n=window.t(t);n&&(e.placeholder=n)})}const qe=window.applyTranslations;typeof qe=="function"&&(window.applyTranslations=function(...e){qe(...e),_e()});window.submitQuoteRequest=async function(){const e=document.getElementById("btnSubmitQuote"),t=document.getElementById("quoteMessage");let n=t?t.value.trim():"";const a=[];let o=!1;if(document.querySelectorAll(".quote-sns-input").forEach(i=>{const r=i.value.trim();r&&(window.__validateSnsInput(i)?a.push(r):o=!0)}),o){alert("⚠️ 올바른 URL 형식이 아닌 링크가 있습니다. 확인 후 다시 시도해주세요.");return}e&&(e.disabled=!0,e.innerText=window.t("sourcing.btn_submitting"));try{const i=P();if(!i)throw new Error(window.t("sourcing.alert_login"));const r=[],s=window.__currentQuoteItems||[];if(s.forEach(l=>{l.qty&&!l.quantity&&(l.quantity=l.qty)}),s.length===0)throw new Error(window.t("sourcing.alert_empty_cart"));const p=await(await fetch("/api/sourcing/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:i.user.id,user_email:i.user.email,items:s,user_message:n,sns_links:a,image_urls:r})})).json();if(!p.success)throw new Error(p.error||window.t("sourcing.alert_fail"));alert(window.t("sourcing.alert_success")),closeQuoteModal(),t&&(t.value="");const d=document.getElementById("quoteSnsLinksContainer");d&&(d.innerHTML=`<div class="sns-link-row" style="display: flex; gap: 6px; align-items: center;">
        <input type="url" class="form-input quote-sns-input" placeholder="${window.t("sourcing.modal_sns_placeholder")||""}"
          style="flex:1; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px;">
        <button type="button" onclick="window.__addSnsInput()" style="padding: 8px 11px; border-radius: 8px; border: 1px solid var(--accent-blue); background: transparent; color: var(--accent-blue); font-size: 16px; cursor: pointer; font-weight: 700; line-height: 1;">+</button>
      </div>`),N=[],Ie()}catch(i){console.error("Quote Submit Error:",i),alert("❌ Error: "+i.message)}finally{e&&(e.disabled=!1,e.innerText=window.t("sourcing.btn_submit"))}};let R=[];window.__previewSearchImages=function(e){const t=Array.from(e).slice(0,5-R.length);R.push(...t),R.length>5&&(R=R.slice(0,5)),Se()};window.__handleImageDrop=function(e){const t=e.dataTransfer.files;window.__previewSearchImages(t);const n=document.getElementById("searchImageUploadLabel");n&&(n.style.borderColor="var(--border)")};function Se(){const e=document.getElementById("searchImagePreviews");e&&(e.innerHTML=R.map((t,n)=>`<div style="position:relative; width:64px; height:64px;">
      <img src="${URL.createObjectURL(t)}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
      <button onclick="window.__removeSearchImage(${n})" style="position:absolute; top:-5px; right:-5px; width:18px; height:18px; border-radius:50%; background:#e03131; color:white; font-size:10px; border:none; cursor:pointer; line-height:18px; text-align:center;">×</button>
    </div>`).join(""))}window.__removeSearchImage=function(e){R.splice(e,1),Se()};window.submitSearchRequest=async function(){var o,i;const e=document.getElementById("btnSubmitSearchRequest"),t=(o=document.getElementById("searchSnsLink"))==null?void 0:o.value.trim(),n=(i=document.getElementById("searchNote"))==null?void 0:i.value.trim(),a=P();if(!a){alert(window.t("sourcing.alert_login"));return}if(!t&&R.length===0&&!n){alert(S.currentLang==="ko"?"SNS 링크, 이미지 또는 설명 중 하나 이상을 입력해주세요.":"Please provide at least one of: SNS link, image, or description.");return}e&&(e.disabled=!0,e.innerText=window.t("sourcing.search_btn_submitting"));try{const{createClient:r}=await U(async()=>{const{createClient:l}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");return{createClient:l}},[]),s=r(window.__SUPABASE_URL__,window.__SUPABASE_ANON_KEY__),c=[];for(const l of R){const g=l.name.split(".").pop(),m=`${a.user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${g}`,{data:h,error:v}=await s.storage.from("search-request-images").upload(m,l,{upsert:!0});if(v)throw v;const{data:{publicUrl:y}}=s.storage.from("search-request-images").getPublicUrl(m);c.push(y)}const d=await(await fetch("/api/search-request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:a.user.id,user_email:a.user.email,sns_link:t,image_urls:c,note:n})})).json();if(!d.success)throw new Error(d.error);alert(window.t("sourcing.search_success")),document.getElementById("searchSnsLink").value="",document.getElementById("searchNote").value="",R=[],Se(),window.loadSearchRequests()}catch(r){console.error("Search request error:",r),alert("Error: "+r.message)}finally{e&&(e.disabled=!1,e.innerText=window.t("sourcing.search_btn_submit"))}};window.loadSearchRequests=async function(){const e=document.getElementById("searchRequestList");if(!e)return;e.innerHTML='<div class="loading-skeleton"></div>';const t=P();if(t)try{const a=await(await fetch(`/api/search-request/history/${t.user.id}`)).json();if(!a.success)throw new Error(a.error);if(!a.requests||a.requests.length===0){e.innerHTML=`<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">${window.t("sourcing.search_history_empty")}</div>`;return}e.innerHTML=a.requests.map(o=>{const i=new Date(o.created_at).toLocaleString(S.currentLang==="ko"?"ko-KR":"en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});let r="#e2e3e5",s="#383d41",c=o.status;o.status==="pending"?(r="#fff3cd",s="#856404",c=window.t("sourcing.search_status_pending")):o.status==="found"?(r="#d4edda",s="#155724",c=window.t("sourcing.search_status_found")):o.status==="not_found"&&(r="#f8d7da",s="#721c24",c=window.t("sourcing.search_status_not_found"));const p=o.image_urls&&o.image_urls.length>0?`<div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">${o.image_urls.map(l=>`<a href="${l}" target="_blank"><img src="${l}" style="width:54px; height:54px; object-fit:cover; border-radius:7px; border:1px solid #eee;"></a>`).join("")}</div>`:"",d=o.admin_reply?`<div style="margin-top:8px; padding:8px 12px; background:#f0f7ff; border-radius:8px; border-left:3px solid var(--accent-blue); font-size:12px; color:#333; line-height:1.5;">
            <span style="font-weight:600; font-size:11px; color:var(--accent-blue); display:block; margin-bottom:3px;">${window.t("sourcing.admin_reply_title")}</span>
            ${B(o.admin_reply)}
          </div>`:"";return`<div style="border:1px solid #e8e8ed; border-radius:12px; padding:14px; background:var(--card-bg);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:11px; color:#aaa;">${i}</span>
          <span style="background:${r}; color:${s}; padding:2px 9px; border-radius:20px; font-size:11px; font-weight:600;">${c}</span>
        </div>
        ${o.sns_link?`<div style="font-size:12px; color:var(--accent-blue); margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🔗 ${B(o.sns_link)}</div>`:""}
        ${o.note?`<div style="font-size:12px; color:var(--text); margin-bottom:4px;">${B(o.note)}</div>`:""}
        ${p}
        ${d}
      </div>`}).join("")}catch(n){e.innerHTML=`<div style="text-align:center; padding:15px; color:#e03131; font-size:13px;">${n.message}</div>`}};window.loadSourcingHistory=async function(){const e=document.getElementById("sourcingHistoryList");if(!e)return;e.innerHTML='<div class="loading-skeleton"></div>';const t=P();if(t)try{const a=await(await fetch(`/api/sourcing/history/${t.user.id}`)).json();if(!a.success)throw new Error(a.error);if(!a.requests||a.requests.length===0){e.innerHTML=`<div style="text-align:center; padding:30px; color:var(--text-muted);">${window.t("sourcing.history_empty")}</div>`;return}e.innerHTML=a.requests.map(o=>{const i=new Date(o.created_at).toLocaleString(S.currentLang==="ko"?"ko-KR":"en-US",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}),r=o.items&&Array.isArray(o.items)?o.items.length:0,s=o.estimated_cost||0,c=btoa(o.created_at||Math.random()).replace(/[^a-z0-9]/gi,"").slice(0,8);let p="#e2e3e5",d=o.status,l="#383d41";o.status==="pending"?(p="#fff3cd",l="#856404",d=window.t("sourcing.status_pending")):o.status==="quoted"?(p="#d4edda",l="#155724",d=window.t("sourcing.status_quoted")):o.status==="canceled"&&(p="#f8d7da",l="#721c24",d=window.t("sourcing.status_canceled"));const g=`<span style="background:${p}; color:${l}; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600; white-space:nowrap;">${d}</span>`,m=o.items&&Array.isArray(o.items)?o.items.slice(0,3).map(_=>`<span style="font-size:12px; background:#f0f0f5; padding:2px 8px; border-radius:12px; color:#555;">${_.name&&_.name.length>20?_.name.slice(0,20)+"…":_.name||"Item"}</span>`).join("")+(o.items.length>3?`<span style="font-size:12px; color:var(--text-muted);">+${o.items.length-3}</span>`:""):"";let h="";if(o.estimated_cost){const _=o.shipping_fee||0,I=o.service_fee||0,$=(o.items||[]).map(k=>{const w=k.unit_price||0;return`<div style="display:flex; justify-content:space-between; font-size:12px; padding:3px 0; border-bottom:1px solid #f0f0f0; color:#444;">
            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:8px;">${k.name||""} (×${k.quantity||0})</span>
            <span style="flex-shrink:0;">${w>0?`₩${w.toLocaleString()}`:"-"}</span>
          </div>`}).join("");h=`
          <div>
            <button onclick="document.getElementById('bd-${c}').style.display=document.getElementById('bd-${c}').style.display==='none'?'block':'none'"
              style="font-size:12px; color:#888; background:none; border:none; cursor:pointer; padding:4px 0; margin:8px 0 0;">
              ▾ ${window.t("sourcing.view_details")}
            </button>
            <div id="bd-${c}" style="display:none; margin-top:6px; padding:10px; background:#fafafa; border-radius:8px; border:1px solid #eee;">
              ${$}
              <div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0; color:#666;">
                <span>${window.t("sourcing.shipping_fee")}</span><span>${_>0?`₩${_.toLocaleString()}`:"-"}</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0; color:#666;">
                <span>${window.t("sourcing.service_fee")}</span><span>${I>0?`₩${I.toLocaleString()}`:"-"}</span>
              </div>
            </div>
          </div>`}let v="";o.admin_reply&&(v=`<div style="margin-top:8px; padding:8px 12px; background:#f8f9fa; border-radius:6px; border-left:3px solid #0071e3; font-size:12px; color:#444; line-height:1.5;">
          <span style="font-weight:600; font-size:11px; color:#0071e3; display:block; margin-bottom:3px;">${window.t("sourcing.admin_reply_title")}</span>
          ${B(o.admin_reply)}</div>`);const y=o.status==="quoted"&&s>0?`<button onclick="alert('결제 기능은 곧 오픈됩니다! 총액: ₩${s.toLocaleString()}')"
             style="width:100%; margin-top:12px; padding:12px; border-radius:10px; border:none; background:#0071e3; color:white; font-size:14px; font-weight:700; cursor:pointer; letter-spacing:-0.3px;">
             💳 결제하기 · ₩${s.toLocaleString()}
           </button>`:"";return`
        <div style="border:1px solid #e8e8ed; border-radius:12px; padding:16px; background:white; box-shadow:0 1px 4px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div>
              <div style="font-size:11px; color:#aaa; margin-bottom:2px;">${i}</div>
              <div style="font-weight:700; font-size:14px; color:#1d1d1f;">${window.t("sourcing.total_items").replace("{count}",r)}</div>
            </div>
            ${g}
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:${o.user_message?"10px":"0"};">${m}</div>
          ${o.user_message?`<div style="font-size:12px; color:#888; padding:6px 10px; background:#f5f5f7; border-radius:6px; margin-top:6px;">💬 ${B(o.user_message)}</div>`:""}
          ${h}
          ${v}
          ${y}
        </div>
      `}).join("")}catch(n){console.error(n),e.innerHTML=`<div style="color:var(--text); font-size:13px; text-align:center; padding:20px;">${window.t("sourcing.history_error")}<br>(${n.message})</div>`}};window.__modalToggleWishlist=async function(e,t){await window.__toggleWishlist(e,t),window.currentModalIsSaved=e.classList.contains("active"),window.currentModalIsSaved?e.innerHTML=window.t("modal.wishlist_saved"):e.innerHTML=window.t("modal.wishlist_add")};window.__sourcingRequestFromModal=async function(e){try{if(!window.currentModalIsSaved&&e){const c=document.querySelector("#modalOverlay .btn-store-premium");c&&(await window.__toggleWishlist(c,e),c.classList.contains("active")&&(c.innerHTML=window.t("modal.wishlist_saved"),window.currentModalIsSaved=!0))}}catch(c){console.warn("Could not auto-add to wishlist:",c)}const t=document.getElementById("modalOverlay"),n=t?t.querySelector(".modal-title-premium, .modal-title"):null,a=t?t.querySelector(".modal-brand-premium, .modal-brand"):null,o=t?t.querySelector(".modal-img-premium, .modal-main-image"):null,i=n?n.innerText:"Unknown",r=a?a.innerText:"",s=o?o.src:"";t&&t.classList.remove("open"),window.openQuoteModal([{product_id:e,name:i,brand:r,qty:10,quantity:10,image:s}])};window.toggleSupportView=function(e){const t=document.getElementById("supportFaqView"),n=document.getElementById("supportInquiryView"),a=document.getElementById("btnSupportFaq"),o=document.getElementById("btnSupportInquiry");e==="faq"?(t.style.display="block",n.style.display="none",a.classList.add("active"),o.classList.remove("active"),window.loadFaqs()):e==="inquiry"&&(t.style.display="none",n.style.display="block",a.classList.remove("active"),o.classList.add("active"),window.loadUserInquiries())};window.loadFaqs=async function(){const e=document.getElementById("faqList");if(e){e.innerHTML='<div class="loading-skeleton"></div>';try{const{fetchFaqs:t}=await U(async()=>{const{fetchFaqs:o}=await import("./supabase-BiZ88kko.js").then(i=>i.y);return{fetchFaqs:o}},[]),{data:n}=await t();if(!n||n.length===0){e.innerHTML='<div style="text-align:center; padding:30px; color:var(--text-muted);">No FAQs found.</div>';return}const a=S.currentLang||"ko";e.innerHTML=n.map((o,i)=>{const r=a==="ko"?o.question_ko:o.question_en||o.question_ko,s=a==="ko"?o.answer_ko:o.answer_en||o.answer_ko;return`
        <div style="border:1px solid #eee; border-radius:8px; overflow:hidden; background:white;">
          <button onclick="const a = document.getElementById('faq-ans-${i}'); a.style.display = a.style.display==='none' ? 'block' : 'none';"
                  style="width:100%; text-align:left; padding:15px; background:#f9f9fb; border:none; font-weight:600; font-size:14px; cursor:pointer; display:flex; justify-content:space-between;">
            <span>Q. ${B(r)}</span>
            <span style="color:#aaa;">+</span>
          </button>
          <div id="faq-ans-${i}" style="display:none; padding:15px; border-top:1px solid #efefef; font-size:13px; color:#444; line-height:1.6; background:white;">
            A. ${B(s).replace(/\\n/g,"<br>")}
          </div>
        </div>
      `}).join("")}catch(t){e.innerHTML=`<div style="text-align:center; padding:15px; color:#e03131;">Load failed: ${t.message}</div>`}}};window.loadUserInquiries=async function(){const e=document.getElementById("inquiryList");if(e){e.innerHTML='<div class="loading-skeleton"></div>';try{const{fetchUserInquiries:t}=await U(async()=>{const{fetchUserInquiries:a}=await import("./supabase-BiZ88kko.js").then(o=>o.y);return{fetchUserInquiries:a}},[]),{data:n}=await t();if(!n||n.length===0){e.innerHTML=`<div style="text-align:center; padding:20px; font-size:13px; color:#888;">${window.t("support.no_inquiries")||"No inquiries found."}</div>`;return}e.innerHTML=n.map(a=>{const o=new Date(a.created_at).toLocaleDateString(S.currentLang==="ko"?"ko-KR":"en-US");let i="#e2e3e5",r="#383d41",s=a.status;a.status==="pending"?(i="#fff3cd",r="#856404",s=window.t("support.status_pending")||"Pending"):a.status==="answered"?(i="#d4edda",r="#155724",s=window.t("support.status_answered")||"Answered"):a.status==="closed"&&(i="#d1ecf1",r="#0c5460",s=window.t("support.status_closed")||"Closed");let c=`
        <div style="border:1px solid #e8e8ed; border-radius:8px; padding:15px; background:white; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="font-size:12px; color:#aaa;">[${a.type}] ${o}</div>
            <span style="background:${i}; color:${r}; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;">${s}</span>
          </div>
          <div style="font-weight:600; font-size:14px; margin-bottom:5px;">${B(a.title)}</div>
          <div style="font-size:12px; color:#666; margin-bottom:10px; line-height:1.5;">${B(a.message||a.content||"").replace(/\\n/g,"<br>")}</div>
        `;return a.admin_reply&&(c+=`
          <div style="margin-top:10px; padding:10px; background:#f0f7ff; border-radius:6px; border-left:3px solid var(--accent-blue); font-size:12px; color:#333;">
            <div style="font-weight:700; color:var(--accent-blue); margin-bottom:4px; font-size:11px;">💬 ${window.t("support.admin_reply_label")||"Admin Reply"}</div>
            ${B(a.admin_reply).replace(/\\n/g,"<br>")}
          </div>
        `),c+="</div>",c}).join("")}catch(t){e.innerHTML=`<div style="text-align:center; padding:15px; color:#e03131;">Load failed: ${t.message}</div>`}}};window.submitSupportInquiry=async function(){const e=document.getElementById("inquiryType").value,t=document.getElementById("inquiryTitle").value.trim(),n=document.getElementById("inquiryContent").value.trim();if(!t||!n){alert(S.currentLang==="ko"?"제목과 내용을 모두 입력해주세요.":"Please enter both title and content.");return}const a=document.getElementById("btnSubmitInquiry");if(!a)return;const o=a.innerText;a.innerText=S.currentLang==="ko"?"등록 중...":"Submitting...",a.disabled=!0;try{const{submitInquiry:i}=await U(async()=>{const{submitInquiry:s}=await import("./supabase-BiZ88kko.js").then(c=>c.y);return{submitInquiry:s}},[]),{error:r}=await i(e,t,n);if(r)throw new Error(r.message);alert(S.currentLang==="ko"?"성공적으로 등록되었습니다.":"Submitted successfully."),document.getElementById("inquiryTitle").value="",document.getElementById("inquiryContent").value="",window.loadUserInquiries()}catch(i){alert("Error: "+i.message)}finally{a.innerText=o,a.disabled=!1}};
