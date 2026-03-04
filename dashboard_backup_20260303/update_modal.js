const fs = require('fs');
const path = require('path');

const filePath = path.join('f:/cursor/datapool/dashboard', 'main.js');
let content = fs.readFileSync(filePath, 'utf8');

// Strategy: Find the end of getPageRange and the start of closeModal
// 1. Find "return pages;" inside getPageRange
const returnPagesIdx = content.lastIndexOf('return pages;');
if (returnPagesIdx === -1) {
    console.error('Error: "return pages;" not found');
    process.exit(1);
}

// 2. Find the closing brace "}" after "return pages;"
const startSearchIdx = content.indexOf('}', returnPagesIdx);
if (startSearchIdx === -1) {
    console.error('Error: Closing brace for getPageRange not found');
    process.exit(1);
}
// Start replacing AFTER this brace
const replaceStartIndex = startSearchIdx + 1;

// 3. Find "function closeModal()"
const replaceEndIndex = content.indexOf('function closeModal()');
if (replaceEndIndex === -1) {
    console.error('Error: "function closeModal()" not found');
    process.exit(1);
}

if (replaceStartIndex >= replaceEndIndex) {
    console.error('Error: Start index is after end index. File structure unexpected.');
    process.exit(1);
}

// New Code to insert
const newCode = `

// ─── Modal ──────────────────────────────────
let rankChart = null;

window.__openProduct = async function (product) {
  const modal = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');

  // Resolve price and URL
  const displayPrice = product.special_price || product.price || product.price_current || product.deal_price;
  const productUrl = product.url || product.product_url;
  const isDeal = !!product.special_price;

  // Mock AI Analysis Data
  const sentimentPos = product.review_rating ? Math.min(Math.round(product.review_rating * 20), 98) : 85;
  const sentimentNeg = 100 - sentimentPos;
  
  const keywords = ['촉촉해요', '지속력좋음', '가성비', '자극없음', '재구매', '향이좋아요'];
  const pros = ['발림성이 부드럽고 끈적임이 없어요', '하루 종일 지속되는 강력한 고정력', '가격 대비 용량이 많아 가성비 최고'];
  const cons = ['향이 조금 강하게 느껴질 수 있어요', '케이스가 다소 약한 느낌이 듭니다'];

  body.innerHTML = \`
    \${product.image_url ? \`<img class="modal-img" src="\${product.image_url}" alt="\${escapeHtml(product.name)}" />\` : ''}
    <div class="modal-brand">\${escapeHtml(product.brand || '')}</div>
    <h3 class="modal-title">\${escapeHtml(product.name || '')}</h3>
    
    <div class="modal-tabs">
      <button class="modal-tab active" onclick="switchTab('info')">기본 정보</button>
      <button class="modal-tab" onclick="switchTab('rank')">순위 분석</button>
      <button class="modal-tab" onclick="switchTab('ai')">AI 요약</button>
    </div>

    <!-- Tab: Info -->
    <div id="tab-info" class="modal-tab-content active">
      <div class="modal-meta">
        <div class="modal-meta-item">
          <div class="modal-meta-label">\${isDeal ? '🔥 오늘의 특가' : '가격'}</div>
          <div class="modal-meta-value" \${isDeal ? 'style="color: var(--accent-orange); font-weight:800"' : ''}>\${formatPrice(displayPrice)}</div>
        </div>
        \${product.discount_pct ? \`
        <div class="modal-meta-item">
          <div class="modal-meta-label">할인율</div>
          <div class="modal-meta-value" style="color: var(--accent-red); font-weight:800">\${product.discount_pct}% OFF</div>
        </div>\` : ''}
        \${product.original_price ? \`
        <div class="modal-meta-item">
          <div class="modal-meta-label">원래 가격</div>
          <div class="modal-meta-value" style="text-decoration: line-through; color: var(--text-muted)">\${formatPrice(product.original_price)}</div>
        </div>\` : ''}
        \${product.rank_change !== undefined ? \`
        <div class="modal-meta-item">
          <div class="modal-meta-label">7일 순위 변화</div>
          <div class="modal-meta-value" style="color: var(--accent-green)">▲ \${product.rank_change}단계</div>
        </div>\` : ''}
        \${product.current_rank !== undefined ? \`
        <div class="modal-meta-item">
          <div class="modal-meta-label">현재 순위</div>
          <div class="modal-meta-value">\${product.current_rank}위</div>
        </div>\` : ''}
        \${product.review_count !== undefined ? \`
        <div class="modal-meta-item">
          <div class="modal-meta-label">리뷰 수</div>
          <div class="modal-meta-value">\${formatNumber(product.review_count)}건</div>
        </div>\` : ''}
        \${product.review_rating !== undefined ? \`
        <div class="modal-meta-item">
          <div class="modal-meta-label">평점</div>
          <div class="modal-meta-value">⭐ \${product.review_rating}</div>
        </div>\` : ''}
      </div>
    </div>

    <!-- Tab: Rank Analysis -->
    <div id="tab-rank" class="modal-tab-content">
      <div class="chart-container">
        <canvas id="rankChart"></canvas>
      </div>
      <p style="font-size:12px; color:var(--text-muted); margin-top:8px; text-align:center;">
        * 최근 30일간의 순위 변동 추이입니다. (낮을수록 좋음 - 그래프가 아래에 있을수록 순위가 높음)
      </p>
    </div>

    <!-- Tab: AI Summary -->
    <div id="tab-ai" class="modal-tab-content">
      <div class="ai-summary">
        <div class="ai-header">
          <span style="font-size:20px;">🤖</span>
          <span style="font-weight:700; font-size:14px;">AI 리뷰 분석</span>
          <span class="ai-badge">BETA</span>
        </div>
        
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; color:var(--text-secondary);">
          <span>긍정 \${sentimentPos}%</span>
          <span>부정 \${sentimentNeg}%</span>
        </div>
        <div class="sentiment-bar">
          <div class="sentiment-pos" style="width: \${sentimentPos}%"></div>
          <div class="sentiment-neg" style="width: \${sentimentNeg}%"></div>
        </div>

        <div class="ai-keywords">
          \${keywords.map(k => \`<span class="ai-keyword">#\${k}</span>\`).join('')}
        </div>

        <div class="ai-proscons">
          <div>
            <div class="ai-list-title" style="color:var(--accent-green)">👍 장점</div>
            <ul class="ai-list">
              \${pros.map(p => \`<li>\${p}</li>\`).join('')}
            </ul>
          </div>
          <div>
            <div class="ai-list-title" style="color:var(--accent-red)">👎 단점</div>
            <ul class="ai-list">
              \${cons.map(c => \`<li>\${c}</li>\`).join('')}
            </ul>
          </div>
        </div>
        <p style="font-size:11px; color:var(--text-muted); margin-top:16px; border-top:1px solid var(--border); padding-top:12px;">
          * 이 요약은 \${formatNumber(product.review_count || 0)}개의 리뷰를 바탕으로 AI가 생성한 가상의 분석 결과입니다.
        </p>
      </div>
    </div>

    \${productUrl ? \`<a class="modal-link" href="\${productUrl}" target="_blank" rel="noopener">\${isDeal ? '🛒 올리브영에서 최신 가격 확인 →' : '올리브영에서 보기 →'}</a>\` : ''}
  \`;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Tab Switching Logic
  window.switchTab = async (tabName) => {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
    
    const tabs = ['info', 'rank', 'ai'];
    const idx = tabs.indexOf(tabName);
    if(idx >= 0) {
      document.querySelectorAll('.modal-tab')[idx].classList.add('active');
    }
    
    document.getElementById(\`tab-\${tabName}\`).classList.add('active');

    if (tabName === 'rank') {
      await loadRankChart(product.product_id);
    }
  };
};

// Helper: Load Chart
async function loadRankChart(productId) {
  const ctx = document.getElementById('rankChart');
  if (!ctx) return;

  if (rankChart) {
    rankChart.destroy();
    rankChart = null;
  }
  
  try {
    const { data } = await fetchRankHistory(productId, 30);
    // Draw empty chart if no data, or return
    if (!data || data.length === 0) {
       // Optional: Show "No Data" message
       return;
    }

    const labels = data.map(d => d.date.substring(5)); // MM-DD
    const ranks = data.map(d => d.rank);

    rankChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '일별 순위',
          data: ranks,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#3b82f6',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            reverse: true, // Rank 1 is top
            beginAtZero: false,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', stepSize: 1, precision: 0 }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return \` \${context.formattedValue}위\`;
              }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });

  } catch (err) {
    console.error('Failed to load rank history:', err);
  }
}

`;

const before = content.substring(0, replaceStartIndex);
const after = content.substring(replaceEndIndex);

fs.writeFileSync(filePath, before + newCode + after, 'utf8');
console.log('Successfully updated main.js with robust markers.');
