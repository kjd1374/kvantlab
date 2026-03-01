/**
 * Data Pool Admin Controller
 */
import {
    fetchAnnouncements,
    insertAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
} from '../supabase.js';

async function initAdmin() {
    // Elements
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');

    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusDiv = document.getElementById('reportStatus');

    const userTableBody = document.getElementById('userTableBody');
    const refreshUsersBtn = document.getElementById('refreshUsersBtn');

    const subModal = document.getElementById('subModal');
    const subTierSelect = document.getElementById('subTier');
    const subExpiryInput = document.getElementById('subExpiry');
    const saveSubBtn = document.getElementById('saveSubBtn');
    const closeSubModal = document.getElementById('closeSubModal');

    const logViewer = document.getElementById('logViewer');
    const logTypeSelect = document.getElementById('logType');

    let currentEditingUserId = null;

    // 1. Tab Switching
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.dataset.tab;

            navLinks.forEach(l => {
                l.classList.remove('active');
                l.style.color = '#666';
            });
            link.classList.add('active');
            link.style.color = '#fff';

            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(`${tabId}Section`).style.display = 'block';

            if (tabId === 'users') loadUsers();
            if (tabId === 'logs') loadLogs();
            if (tabId === 'announcements') loadAnnouncements();
            if (tabId === 'sourcing') loadSourcingRequests();
            if (tabId === 'steadysellers') loadSteadySellers();
            if (tabId === 'support') loadSupportInquiries();
            if (tabId === 'searchrequests') window.__adminLoadSearchRequests();
        });
    });

    // 2. Report Generation
    generateBtn.addEventListener('click', async () => {
        generateBtn.disabled = true;
        const originalText = generateBtn.innerText;
        generateBtn.innerText = '⌛ Generating...';
        statusDiv.style.display = 'block';
        statusDiv.innerText = '리포트를 생성 중입니다. 잠시만 기다려주세요 (약 30~60초 소요)...';
        statusDiv.style.color = '#0066ff';

        try {
            const res = await fetch('/api/admin/reports/generate', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                statusDiv.innerText = '✅ 리포트 생성 완료!';
                statusDiv.style.color = '#28a745';
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            statusDiv.innerText = `❌ 생성 실패: ${err.message}`;
            statusDiv.style.color = '#dc3545';
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerText = originalText;
        }
    });

    downloadBtn.addEventListener('click', () => {
        window.location.href = '/api/admin/reports/download';
    });

    // 3. User Management Logic
    async function loadUsers() {
        userTableBody.innerHTML = '<tr><td colspan="5" style="padding: 40px; text-align: center; color: #888;">사용자 목록을 불러오는 중...</td></tr>';
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            userTableBody.innerHTML = data.users.map(user => {
                // Calculate D-Day
                let dDayStr = '-';
                let isExpired = false;
                if (user.subscription_expires_at) {
                    const expiry = new Date(user.subscription_expires_at);
                    const now = new Date();
                    const diffTime = expiry - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                        dDayStr = `만료됨 (D${diffDays})`;
                        isExpired = true;
                    } else {
                        dDayStr = `D-${diffDays}`;
                    }
                }

                return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">
                        <div style="font-weight: 600;">${user.email}</div>
                        <div style="font-size: 11px; color: #999;">ID: ${user.id}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 600;">${user.name || '-'}</div>
                        <div style="font-size: 12px; color: #666;">${user.company || '-'}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-size: 13px;">${user.primary_platform || '-'}</div>
                        <div style="font-size: 11px; color: #888;">${user.primary_category || '-'}</div>
                    </td>
                    <td style="padding: 12px;">
                        <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; background: ${user.role === 'admin' ? '#fff0f0' : '#eef2ff'}; color: ${user.role === 'admin' ? '#e03e3e' : '#4361ee'};">
                            ${user.role.toUpperCase()}
                        </span>
                    </td>
                    <td style="padding: 12px;">
                        <span style="font-weight:700; color:${user.subscription_tier === 'free' ? '#999' : (isExpired ? '#fa5252' : '#28a745')}">
                            ${user.subscription_tier.toUpperCase()} ${dDayStr !== '-' ? `(${dDayStr})` : ''}
                        </span>
                        <div style="color: #666; font-size: 11px; margin-top: 4px;">
                            ${user.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString() : '무제한/없음'}
                        </div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="display: flex; gap: 8px;">
                            <button onclick="window.adminActions.openSubModal('${user.id}', '${user.subscription_tier}', '${user.subscription_expires_at || ''}')" style="background: #e7f5ff; border: 1px solid #a5d8ff; color: #1971c2; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">구독 수정</button>
                            <button onclick="window.adminActions.resetPassword('${user.email}')" style="background: #f1f3f5; border: 1px solid #dee2e6; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">비번 초기화</button>
                            ${user.role !== 'admin' ? `<button onclick="window.adminActions.deleteUser('${user.id}', '${user.email}')" style="background: #fff5f5; border: 1px solid #ffc9c9; color: #fa5252; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">삭제</button>` : ''}
                        </div>
                    </td>
                </tr>
            `}).join('');
        } catch (err) {
            userTableBody.innerHTML = `<tr><td colspan="5" style="padding: 40px; text-align: center; color: #dc3545;">에러: ${err.message}</td></tr>`;
        }
    }

    refreshUsersBtn.addEventListener('click', loadUsers);

    // Modal Logic
    window.adminActions = {
        openSubModal: (userId, tier, expiry) => {
            currentEditingUserId = userId;
            subTierSelect.value = tier;
            if (expiry) {
                subExpiryInput.value = new Date(expiry).toISOString().split('T')[0];
            } else {
                subExpiryInput.value = '';
            }
            subModal.style.display = 'flex';
        },
        resetPassword: async (email) => {
            if (!confirm(`${email} 사용자의 비밀번호 초기화 메일을 발송하시겠습니까?`)) return;
            try {
                const res = await fetch('/api/admin/users/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (data.success) alert('초기화 메일이 성공적으로 발송되었습니다.');
                else throw new Error(data.error);
            } catch (err) {
                alert('초기화 실패: ' + err.message);
            }
        },
        deleteUser: async (id, email) => {
            if (!confirm(`정말로 ${email} 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
            try {
                const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    alert('사용자가 삭제되었습니다.');
                    loadUsers();
                } else throw new Error(data.error);
            } catch (err) {
                alert('삭제 실패: ' + err.message);
            }
        }
    };

    closeSubModal.addEventListener('click', () => subModal.style.display = 'none');

    saveSubBtn.addEventListener('click', async () => {
        if (!currentEditingUserId) return;

        const tier = subTierSelect.value;
        const expiry = subExpiryInput.value;

        saveSubBtn.disabled = true;
        try {
            const res = await fetch(`/api/admin/users/${currentEditingUserId}/subscription`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier, expires_at: expiry || null })
            });
            const data = await res.json();
            if (data.success) {
                alert('구독 정보가 업데이트되었습니다.');
                subModal.style.display = 'none';
                loadUsers();
            } else throw new Error(data.error);
        } catch (err) {
            alert('업데이트 실패: ' + err.message);
        } finally {
            saveSubBtn.disabled = false;
        }
    });

    // 4. Log Management Logic
    async function loadLogs() {
        if (document.getElementById('logsSection').style.display === 'none') return;
        const type = logTypeSelect.value;
        try {
            const res = await fetch(`/api/admin/logs?type=${type}`);
            const data = await res.json();
            if (data.success) {
                logViewer.innerText = data.logs;
                logViewer.scrollTop = logViewer.scrollHeight;
            } else {
                logViewer.innerText = '로그를 불러올 수 없습니다: ' + data.error;
            }
        } catch (err) {
            logViewer.innerText = '서버 연결 오류: ' + err.message;
        }
    }

    logTypeSelect.addEventListener('change', loadLogs);

    // 5. Announcements Management Logic
    const announcementTableBody = document.getElementById('announcementTableBody');
    const createAnnouncementBtn = document.getElementById('createAnnouncementBtn');
    const announcementModal = document.getElementById('announcementModal');
    const closeAnnouncementModal = document.getElementById('closeAnnouncementModal');
    const saveAnnouncementBtn = document.getElementById('saveAnnouncementBtn');

    // Form elements
    const aIdInput = document.getElementById('announcementId');
    const aTitleInput = document.getElementById('aTitle');
    const aContentInput = document.getElementById('aContent');
    const aTypeInput = document.getElementById('aType');
    const aPublishedInput = document.getElementById('aPublished');
    const aTitleEnInput = document.getElementById('aTitleEn');
    const aContentEnInput = document.getElementById('aContentEn');
    const aTitleJaInput = document.getElementById('aTitleJa');
    const aContentJaInput = document.getElementById('aContentJa');
    const aTitleThInput = document.getElementById('aTitleTh');
    const aContentThInput = document.getElementById('aContentTh');
    const aTitleViInput = document.getElementById('aTitleVi');
    const aContentViInput = document.getElementById('aContentVi');
    const aTitleIdInput = document.getElementById('aTitleId');
    const aContentIdInput = document.getElementById('aContentId');

    const aiTranslateBtn = document.getElementById('aiTranslateBtn');
    const aModalTitle = document.getElementById('announcementModalTitle');

    async function loadAnnouncements() {
        if (!announcementTableBody) return;
        announcementTableBody.innerHTML = '<tr><td colspan="5" style="padding: 40px; text-align: center; color: #888;">데이터를 불러오는 중...</td></tr>';
        try {
            const { data, error } = await fetchAnnouncements();
            if (error) throw new Error(error.message || JSON.stringify(error));
            if (!data || data.length === 0) {
                announcementTableBody.innerHTML = '<tr><td colspan="5" style="padding: 40px; text-align: center; color: #888;">등록된 공지사항이 없습니다.</td></tr>';
                return;
            }

            announcementTableBody.innerHTML = data.map(item => {
                const badgeColor = item.type === 'report' ? '#4361ee' : (item.type === 'update' ? '#e03e3e' : '#12b886');
                const badgeBg = item.type === 'report' ? '#eef2ff' : (item.type === 'update' ? '#fff0f0' : '#e6fcf5');
                const badgeText = item.type === 'report' ? 'REPORT' : (item.type === 'update' ? 'UPDATE' : 'NOTICE');
                const dateText = new Date(item.created_at).toLocaleDateString('ko-KR');

                return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">
                        <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; background: ${badgeBg}; color: ${badgeColor}; font-weight:600;">
                            ${badgeText}
                        </span>
                    </td>
                    <td style="padding: 12px; font-weight: 500;">
                        ${item.title}
                    </td>
                    <td style="padding: 12px;">
                        <span style="font-weight:700; color:${item.is_published ? '#28a745' : '#999'}">
                            ${item.is_published ? '공개중' : '비공개'}
                        </span>
                    </td>
                    <td style="padding: 12px; color: #666; font-size: 12px;">
                        ${dateText}
                    </td>
                    <td style="padding: 12px;">
                        <div style="display: flex; gap: 8px;">
                            <button onclick="window.adminActions.editAnnouncement('${item.id}')" style="background: #e7f5ff; border: 1px solid #a5d8ff; color: #1971c2; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">수정</button>
                            <button onclick="window.adminActions.deleteAnnouncement('${item.id}')" style="background: #fff5f5; border: 1px solid #ffc9c9; color: #fa5252; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">삭제</button>
                        </div>
                    </td>
                </tr>
            `}).join('');

            // Store globally for edit modal
            window.__announcementData__ = data;

        } catch (err) {
            announcementTableBody.innerHTML = `<tr><td colspan="5" style="padding: 40px; text-align: center; color: #dc3545;">에러: ${err.message}</td></tr>`;
        }
    }

    // Modal Actions
    window.adminActions.editAnnouncement = (id) => {
        const item = window.__announcementData__?.find(x => x.id === id);
        if (!item) return;

        aModalTitle.innerText = '공지사항 수정';
        aIdInput.value = item.id;
        aTitleInput.value = item.title;
        aContentInput.value = item.content || '';
        aTitleEnInput.value = item.title_en || '';
        aContentEnInput.value = item.content_en || '';
        aTitleJaInput.value = item.title_ja || '';
        aContentJaInput.value = item.content_ja || '';
        aTitleThInput.value = item.title_th || '';
        aContentThInput.value = item.content_th || '';
        aTitleViInput.value = item.title_vi || '';
        aContentViInput.value = item.content_vi || '';
        aTitleIdInput.value = item.title_id || '';
        aContentIdInput.value = item.content_id || '';
        aTypeInput.value = item.type;
        aPublishedInput.checked = item.is_published;

        announcementModal.style.display = 'flex';
    };

    window.adminActions.deleteAnnouncement = async (id) => {
        if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) return;
        try {
            const { error } = await deleteAnnouncement(id);
            if (error) throw new Error(error.message || JSON.stringify(error));
            alert('삭제되었습니다.');
            loadAnnouncements();
        } catch (err) {
            alert('삭제 실패: ' + err.message);
        }
    };

    createAnnouncementBtn?.addEventListener('click', () => {
        aModalTitle.innerText = '새 공지사항 작성';
        aIdInput.value = '';
        aTitleInput.value = '';
        aContentInput.value = '';
        aTitleEnInput.value = '';
        aContentEnInput.value = '';
        aTitleJaInput.value = '';
        aContentJaInput.value = '';
        aTitleThInput.value = '';
        aContentThInput.value = '';
        aTitleViInput.value = '';
        aContentViInput.value = '';
        aTitleIdInput.value = '';
        aContentIdInput.value = '';
        aTypeInput.value = 'notice';
        aPublishedInput.checked = true;
        announcementModal.style.display = 'flex';
    });

    closeAnnouncementModal?.addEventListener('click', () => {
        announcementModal.style.display = 'none';
    });

    saveAnnouncementBtn?.addEventListener('click', async () => {
        const id = aIdInput.value;
        const title = aTitleInput.value.trim();
        const content = aContentInput.value.trim();
        const type = aTypeInput.value;
        const isPublished = aPublishedInput.checked;

        const extraLangs = {
            title_en: aTitleEnInput.value.trim(),
            content_en: aContentEnInput.value.trim(),
            title_ja: aTitleJaInput.value.trim(),
            content_ja: aContentJaInput.value.trim(),
            title_th: aTitleThInput.value.trim(),
            content_th: aContentThInput.value.trim(),
            title_vi: aTitleViInput.value.trim(),
            content_vi: aContentViInput.value.trim(),
            title_id: aTitleIdInput.value.trim(),
            content_id: aContentIdInput.value.trim()
        };

        if (!title) return alert('제목을 입력해주세요.');

        saveAnnouncementBtn.disabled = true;
        try {
            if (id) {
                // Update existing
                const { error } = await updateAnnouncement(id, title, content, type, isPublished, extraLangs);
                if (error) throw new Error(error.message || JSON.stringify(error));
                alert('업데이트 성공');
            } else {
                // Create new
                const { error } = await insertAnnouncement(title, content, type, isPublished, extraLangs);
                if (error) throw new Error(error.message || JSON.stringify(error));
                alert('등록 성공');
            }
            announcementModal.style.display = 'none';
            loadAnnouncements();
        } catch (err) {
            alert('저장 실패: ' + err.message);
        } finally {
            saveAnnouncementBtn.disabled = false;
        }
    });

    // AI Translation Button Event
    aiTranslateBtn?.addEventListener('click', async () => {
        const titleKo = aTitleInput.value.trim();
        const contentKo = aContentInput.value.trim();

        if (!titleKo && !contentKo) {
            return alert('번역할 내용을 먼저 입력해주세요.');
        }

        aiTranslateBtn.disabled = true;
        const originalText = aiTranslateBtn.innerText;
        aiTranslateBtn.innerText = '⌛ 번역 중...';

        try {
            const targetLangs = [
                { code: 'en', titleEl: aTitleEnInput, contentEl: aContentEnInput },
                { code: 'ja', titleEl: aTitleJaInput, contentEl: aContentJaInput },
                { code: 'th', titleEl: aTitleThInput, contentEl: aContentThInput },
                { code: 'vi', titleEl: aTitleViInput, contentEl: aContentViInput },
                { code: 'id', titleEl: aTitleIdInput, contentEl: aContentIdInput },
            ];

            for (const lang of targetLangs) {
                aiTranslateBtn.innerText = `⌛ 번역 중 (${lang.code.toUpperCase()})...`;

                // Translate Title
                if (titleKo) {
                    const resTitle = await fetch('/api/admin/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: titleKo, target_lang: lang.code })
                    });
                    const dataTitle = await resTitle.json();
                    if (dataTitle.success) lang.titleEl.value = dataTitle.translatedText;
                }

                // Translate Content
                if (contentKo) {
                    const resContent = await fetch('/api/admin/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: contentKo, target_lang: lang.code })
                    });
                    const dataContent = await resContent.json();
                    if (dataContent.success) lang.contentEl.value = dataContent.translatedText;
                }
            }
        } catch (err) {
            alert('번역 중 오류가 발생했습니다: ' + err.message);
        } finally {
            aiTranslateBtn.disabled = false;
            aiTranslateBtn.innerText = originalText;
        }
    });

    // 5. Sourcing Management Logic
    async function loadSourcingRequests() {
        const tbody = document.getElementById('sourcingTableBody');
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #888;">요청 내역을 불러오는 중...</td></tr>';

        try {
            const res = await fetch('/api/admin/sourcing');
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            if (!data.requests || data.requests.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #888;">접수된 소싱 요청이 없습니다.</td></tr>';
                return;
            }

            window.__sourcingRequests = data.requests; // Store for modal access

            tbody.innerHTML = data.requests.map(req => {
                const date = new Date(req.created_at).toLocaleString('ko-KR');
                const count = Array.isArray(req.items) ? req.items.length : 0;

                let badge = '';
                if (req.status === 'pending') badge = '<span class="status-badge status-offline" style="background:#fff3cd; color:#856404;">Pending</span>';
                else if (req.status === 'quoted') badge = '<span class="status-badge" style="background:#d4edda; color:#155724;">Quoted</span>';
                else if (req.status === 'completed') badge = '<span class="status-badge status-online">Completed</span>';
                else badge = `<span class="status-badge" style="background:#f8d7da; color:#721c24;">${req.status}</span>`;

                const msgPreview = req.user_message ? (req.user_message.substring(0, 30) + (req.user_message.length > 30 ? '...' : '')) : '-';

                return `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;">
                            <strong style="display:block; font-size:13px;">${req.user_email}</strong>
                            <span style="font-size:11px; color:#999;">${req.user_id.substring(0, 8)}...</span>
                        </td>
                        <td style="padding: 12px; font-weight:600;">${count}건</td>
                        <td style="padding: 12px; font-size:13px; color:#555;">${msgPreview}</td>
                        <td style="padding: 12px;">${badge}</td>
                        <td style="padding: 12px; font-size:12px; color:#666;">${date}</td>
                        <td style="padding: 12px; display:flex; gap:5px;">
                            <button class="btn-primary" style="padding: 6px 10px; font-size:12px;" onclick="openSourcingDetail('${req.id}')">상세 보기</button>
                            <button class="btn-danger" style="padding: 6px 10px; font-size:12px; background:#dc3545; color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="deleteSourcingRequest('${req.id}')">삭제</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 40px; text-align: center; color: #dc3545;">에러가 발생했습니다: ${e.message}</td></tr>`;
        }
    }

    // Delete Operation for Sourcing
    window.deleteSourcingRequest = async function (id) {
        if (!confirm("정말로 이 소싱 요청(견적건)을 삭제하시겠습니까? 관련 데이터가 영구히 삭제됩니다.")) return;

        try {
            const res = await fetch(`/api/admin/sourcing/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            alert('요청 내역이 성공적으로 삭제되었습니다.');
            loadSourcingRequests(); // Reload
            closeMenu(); // Close modal if open
        } catch (err) {
            alert('삭제 실패: ' + err.message);
        }
    };


    window.openSourcingDetail = function (id) {
        const req = (window.__sourcingRequests || []).find(r => r.id === id);
        if (!req) return;

        document.getElementById('sourcingId').value = req.id;
        document.getElementById('sourcingUserEmail').innerText = req.user_email;
        // Parse message: extract image URLs that were embedded as text (🖼️ 첨부 이미지: ...)
        const rawMsg = req.user_message || '없음';
        const imgSectionMatch = rawMsg.match(/🖼️ 첨부 이미지:\n([\s\S]*?)(\n\n|$)/);
        let textPart = rawMsg;
        let imgUrls = [];
        if (imgSectionMatch) {
            imgUrls = imgSectionMatch[1].trim().split('\n').filter(u => u.startsWith('http'));
            textPart = rawMsg.replace(imgSectionMatch[0], '').trim();
        }
        const msgEl = document.getElementById('sourcingUserMessage');
        const imgHtml = imgUrls.length > 0
            ? `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; padding-top:10px; border-top:1px solid #eee;">
                 <div style="width:100%; font-size:12px; font-weight:600; color:#666; margin-bottom:4px;">📷 첨부 이미지 (${imgUrls.length}장)</div>
                 ${imgUrls.map(u => `<a href="${u}" target="_blank" title="클릭하여 원본 보기">
                   <img src="${u}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; border:1px solid #ddd; cursor:pointer;">
                 </a>`).join('')}
               </div>`
            : '';
        msgEl.innerHTML = `<div style="white-space:pre-wrap;">${textPart.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>${imgHtml}`;
        document.getElementById('sourcingStatus').value = req.status || 'pending';
        // Cost breakdown logic
        const shippingFee = req.shipping_fee || 0;
        const serviceFee = req.service_fee || 0;
        document.getElementById('sourcingCost').value = req.estimated_cost || ''; // Will be calculated, kept for backwards compat

        let totalComputed = 0;
        const itemsHtml = Array.isArray(req.items) ? req.items.map((item, idx) => {
            const unitPrice = item.unit_price || 0;
            totalComputed += (unitPrice * item.quantity);
            return `
            <div style="display:flex; flex-direction:column; padding:10px 0; border-bottom:1px solid #eee;">
                <div style="margin-bottom: 5px;">
                    <strong style="margin-right:5px;">${item.brand || 'No Brand'}</strong> 
                    ${item.name}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--admin-primary)">${item.quantity}개</strong>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <label style="font-size:12px; color:#666;">단가(₩):</label>
                        <input type="number" class="calc-unit-price" data-idx="${idx}" data-qty="${item.quantity}" value="${unitPrice}" style="width:80px; padding:4px; font-size:12px; text-align:right;">
                    </div>
                </div>
            </div>`;
        }).join('') : '등록된 상품 정보 오류';
        document.getElementById('sourcingItemsList').innerHTML = itemsHtml;
        document.getElementById('sourcingItemsList').dataset.itemsJson = JSON.stringify(req.items || []);

        document.getElementById('shippingFee').value = shippingFee;
        document.getElementById('serviceFee').value = serviceFee;

        const calcTotalCost = () => {
            let sum = 0;
            document.querySelectorAll('.calc-unit-price').forEach(input => {
                const qty = parseInt(input.dataset.qty) || 0;
                const up = parseInt(input.value) || 0;
                sum += (up * qty);
            });
            const sFee = parseInt(document.getElementById('shippingFee').value) || 0;
            const svFee = parseInt(document.getElementById('serviceFee').value) || 0;
            const finalTotal = sum + sFee + svFee;

            document.getElementById('sourcingCost').value = finalTotal;
            document.getElementById('totalCostDisplay').innerText = finalTotal.toLocaleString();
        };

        // Trigger initial calculation
        calcTotalCost();

        // Bind listeners
        document.querySelectorAll('.calc-unit-price').forEach(el => el.addEventListener('input', calcTotalCost));
        document.getElementById('shippingFee').addEventListener('input', calcTotalCost);
        document.getElementById('serviceFee').addEventListener('input', calcTotalCost);

        document.getElementById('sourcingModal').classList.add('open');
        document.getElementById('sourcingModal').style.display = 'flex';
    };

    const closeMenu = () => {
        const overlay = document.getElementById('sourcingModal');
        overlay.classList.remove('open');
        overlay.style.display = 'none';
    };

    const closeBtn = document.getElementById('closeSourcingModal');
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    const cancelBtn = document.getElementById('cancelSourcingBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeMenu);

    const refreshBtn = document.getElementById('refreshSourcingBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadSourcingRequests);

    const saveSourcingBtn = document.getElementById('saveSourcingBtn');
    if (saveSourcingBtn) saveSourcingBtn.addEventListener('click', async () => {
        const btn = document.getElementById('saveSourcingBtn');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = '저장 중...';

        const id = document.getElementById('sourcingId').value;
        const status = document.getElementById('sourcingStatus').value;
        const admin_reply = document.getElementById('sourcingAdminReply').value;

        // Grab updated item prices
        const itemsDataRaw = document.getElementById('sourcingItemsList').dataset.itemsJson;
        let finalItems = [];
        try { finalItems = JSON.parse(itemsDataRaw); } catch (e) { }

        let sum = 0;
        document.querySelectorAll('.calc-unit-price').forEach(input => {
            const idx = parseInt(input.dataset.idx);
            const qty = parseInt(input.dataset.qty) || 0;
            const up = parseInt(input.value) || 0;
            if (finalItems[idx]) {
                finalItems[idx].unit_price = up;
            }
            sum += (up * qty);
        });

        const shipping_fee = parseInt(document.getElementById('shippingFee').value) || 0;
        const service_fee = parseInt(document.getElementById('serviceFee').value) || 0;
        const estimated_cost = sum + shipping_fee + service_fee;

        try {
            const res = await fetch(`/api/admin/sourcing/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    estimated_cost: estimated_cost,
                    shipping_fee: shipping_fee,
                    service_fee: service_fee,
                    items: finalItems,
                    admin_reply
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            alert('✅ 소싱 요청이 성공적으로 업데이트되었습니다.');
            closeMenu();
            loadSourcingRequests();
        } catch (e) {
            alert('❌ 저장 실패: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    });

    // 6. Steady Sellers Management Logic
    const ssTableBody = document.getElementById('steadySellerTableBody');
    const createSsBtn = document.getElementById('createSteadySellerBtn');
    const ssModal = document.getElementById('steadySellerModal');
    const closeSsModal = document.getElementById('closeSsModal');
    const saveSsBtn = document.getElementById('saveSsBtn');

    // Form elements
    const ssIdInput = document.getElementById('ssId');
    const ssNameInput = document.getElementById('ssName');
    const ssBrandInput = document.getElementById('ssBrand');
    const ssRankInput = document.getElementById('ssRank');
    const ssPriceInput = document.getElementById('ssPrice');
    const ssImageUrlInput = document.getElementById('ssImageUrl');
    const ssLinkInput = document.getElementById('ssLink');
    const ssActiveInput = document.getElementById('ssActive');
    const ssModalTitle = document.getElementById('ssModalTitle');

    async function loadSteadySellers() {
        if (!ssTableBody) return;
        ssTableBody.innerHTML = '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #888;">데이터를 불러오는 중...</td></tr>';

        try {
            const res = await fetch('/api/admin/steady-sellers');
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            if (!data.steady_sellers || data.steady_sellers.length === 0) {
                ssTableBody.innerHTML = '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #888;">등록된 상품이 없습니다.</td></tr>';
                return;
            }

            window.__steadySellers = data.steady_sellers;

            ssTableBody.innerHTML = data.steady_sellers.map(item => {
                return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; font-weight: 600;">${item.rank}</td>
                    <td style="padding: 12px;">
                        <img src="${item.image_url}" alt="Product" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px; border: 1px solid #eee;">
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 600; font-size: 13px; color: #333;">${item.brand}</div>
                        <div style="font-size: 14px; margin-top: 4px;">${item.product_name}</div>
                    </td>
                    <td style="padding: 12px; font-weight: 600;">₩${item.price.toLocaleString()}</td>
                    <td style="padding: 12px;">
                        <span style="font-weight:700; color:${item.is_active ? '#28a745' : '#999'}">
                            ${item.is_active ? '노출중' : '숨김'}
                        </span>
                    </td>
                    <td style="padding: 12px;">
                        <div style="display: flex; gap: 8px;">
                            <button onclick="window.adminActions.editSteadySeller('${item.id}')" style="background: #e7f5ff; border: 1px solid #a5d8ff; color: #1971c2; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">수정</button>
                            <button onclick="window.adminActions.deleteSteadySeller('${item.id}')" style="background: #fff5f5; border: 1px solid #ffc9c9; color: #fa5252; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">삭제</button>
                        </div>
                    </td>
                </tr>
            `}).join('');
        } catch (err) {
            ssTableBody.innerHTML = `<tr><td colspan="6" style="padding: 40px; text-align: center; color: #dc3545;">에러: ${err.message}</td></tr>`;
        }
    }

    // Modal Actions
    if (!window.adminActions) window.adminActions = {};

    window.adminActions.editSteadySeller = (id) => {
        const item = window.__steadySellers?.find(x => x.id === id);
        if (!item) return;

        ssModalTitle.innerText = '스테디 셀러 수정';
        ssIdInput.value = item.id;
        ssNameInput.value = item.product_name;
        ssBrandInput.value = item.brand;
        ssRankInput.value = item.rank;
        ssPriceInput.value = item.price;
        ssImageUrlInput.value = item.image_url;
        ssLinkInput.value = item.link;
        ssActiveInput.checked = item.is_active;

        ssModal.style.display = 'flex';
    };

    window.adminActions.deleteSteadySeller = async (id) => {
        if (!confirm('정말로 이 상품을 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/admin/steady-sellers/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            alert('삭제되었습니다.');
            loadSteadySellers();
        } catch (err) {
            alert('삭제 실패: ' + err.message);
        }
    };

    createSsBtn?.addEventListener('click', () => {
        ssModalTitle.innerText = '새 스테디 셀러 등록';
        ssIdInput.value = '';
        ssNameInput.value = '';
        ssBrandInput.value = '';
        ssRankInput.value = '999';
        ssPriceInput.value = '0';
        ssImageUrlInput.value = '';
        ssLinkInput.value = '';
        ssActiveInput.checked = true;
        ssModal.style.display = 'flex';
    });

    closeSsModal?.addEventListener('click', () => {
        ssModal.style.display = 'none';
    });

    saveSsBtn?.addEventListener('click', async () => {
        const id = ssIdInput.value;
        const payload = {
            product_name: ssNameInput.value.trim(),
            brand: ssBrandInput.value.trim(),
            rank: parseInt(ssRankInput.value) || 999,
            price: parseInt(ssPriceInput.value) || 0,
            image_url: ssImageUrlInput.value.trim(),
            link: ssLinkInput.value.trim(),
            is_active: ssActiveInput.checked
        };

        if (!payload.product_name || !payload.brand) return alert('상품명과 브랜드를 필수 입력사항입니다.');

        saveSsBtn.disabled = true;
        try {
            const endpoint = id ? `/api/admin/steady-sellers/${id}` : '/api/admin/steady-sellers';
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            alert(id ? '업데이트 성공' : '등록 성공');
            ssModal.style.display = 'none';
            loadSteadySellers();
        } catch (err) {
            alert('저장 실패: ' + err.message);
        } finally {
            saveSsBtn.disabled = false;
        }
    });

    // ─── 7. Customer Support Logic ─────────────────
    const viewInquiriesBtn = document.getElementById('viewInquiriesBtn');
    const viewFaqsBtn = document.getElementById('viewFaqsBtn');
    const inquiriesContainer = document.getElementById('inquiriesContainer');
    const faqsContainer = document.getElementById('faqsContainer');

    viewInquiriesBtn?.addEventListener('click', () => {
        inquiriesContainer.style.display = 'block';
        faqsContainer.style.display = 'none';
        viewInquiriesBtn.style.background = 'var(--admin-primary)';
        viewFaqsBtn.style.background = '#6c757d';
        loadSupportInquiries();
    });

    viewFaqsBtn?.addEventListener('click', () => {
        inquiriesContainer.style.display = 'none';
        faqsContainer.style.display = 'block';
        viewInquiriesBtn.style.background = '#6c757d';
        viewFaqsBtn.style.background = 'var(--admin-primary)';
        loadAdminFaqs();
    });

    const supportInquiriesBody = document.getElementById('supportInquiriesBody');
    async function loadSupportInquiries() {
        if (!supportInquiriesBody) return;
        supportInquiriesBody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #888;">데이터를 불러오는 중...</td></tr>';
        try {
            const { fetchAllInquiries } = await import('../supabase.js');
            const { data } = await fetchAllInquiries();
            if (!data || data.length === 0) {
                supportInquiriesBody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #888;">접수된 문의가 없습니다.</td></tr>';
                return;
            }
            window.__supportInquiries = data;
            supportInquiriesBody.innerHTML = data.map(inq => {
                const date = new Date(inq.created_at).toLocaleString();
                let statusColor = '#e2e3e5'; let statusTxt = '#383d41'; let statusLabel = inq.status;
                if (inq.status === 'pending') { statusColor = '#fff3cd'; statusTxt = '#856404'; statusLabel = '답변대기'; }
                else if (inq.status === 'answered') { statusColor = '#d4edda'; statusTxt = '#155724'; statusLabel = '답변완료'; }
                else if (inq.status === 'closed') { statusColor = '#d1ecf1'; statusTxt = '#0c5460'; statusLabel = '종료됨'; }

                return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; font-weight: 600;">${inq.type === 'inquiry' ? '문의' : '건의'}</td>
                    <td style="padding: 12px;">
                        <span style="background:${statusColor}; color:${statusTxt}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:600;">${statusLabel}</span>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 600; font-size: 13px;">${inq.title}</div>
                        <div style="font-size: 11px; color: #888; margin-top: 4px; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${inq.message}</div>
                    </td>
                    <td style="padding: 12px; font-size: 12px;">${inq.user_email}</td>
                    <td style="padding: 12px; font-size: 12px; color: #666;">${date}</td>
                    <td style="padding: 12px;">
                        <button onclick="window.adminActions.replyInquiry('${inq.id}')" style="background: #e7f5ff; border: 1px solid #a5d8ff; color: #1971c2; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">답변/관리</button>
                    </td>
                </tr>
                `;
            }).join('');
        } catch (err) {
            supportInquiriesBody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #dc3545;">에러: ${err.message}</td></tr>`;
        }
    }

    const faqListAdmin = document.getElementById('faqListAdmin');
    async function loadAdminFaqs() {
        if (!faqListAdmin) return;
        faqListAdmin.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">데이터를 불러오는 중...</div>';
        try {
            const { fetchAllFaqs } = await import('../supabase.js');
            const { data } = await fetchAllFaqs();
            if (!data || data.length === 0) {
                faqListAdmin.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">등록된 FAQ가 없습니다.</div>';
                return;
            }
            window.__adminFaqs = data;
            faqListAdmin.innerHTML = data.map(faq => `
                <div style="padding: 15px; border: 1px solid #eee; border-radius: 8px; background: white; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; font-size: 14px; margin-bottom: 5px;">[순위: ${faq.sort_order}] ${faq.question_ko}</div>
                        <div style="font-size: 12px; color: #666;">상태: ${faq.is_published ? '<span style="color:#28a745;">공개됨</span>' : '<span style="color:#999;">비공개</span>'}</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.adminActions.editFaq('${faq.id}')" style="background: #e7f5ff; border: 1px solid #a5d8ff; color: #1971c2; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">수정</button>
                        <button onclick="window.adminActions.deleteFaq('${faq.id}')" style="background: #fff5f5; border: 1px solid #ffc9c9; color: #fa5252; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">삭제</button>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            faqListAdmin.innerHTML = `<div style="padding: 20px; text-align: center; color: #dc3545;">에러: ${err.message}</div>`;
        }
    }

    // Modal Definitions
    const inquiryReplyModal = document.getElementById('inquiryReplyModal');
    const inquiryReplyId = document.getElementById('inquiryReplyId');
    const inquiryReplyTitle = document.getElementById('inquiryReplyTitle');
    const inquiryReplyMessage = document.getElementById('inquiryReplyMessage');
    const inquiryReplyText = document.getElementById('inquiryReplyText');
    const inquiryReplyStatus = document.getElementById('inquiryReplyStatus');
    const saveInquiryReplyBtn = document.getElementById('saveInquiryReplyBtn');

    window.adminActions.replyInquiry = (id) => {
        const inq = window.__supportInquiries?.find(x => x.id === id);
        if (!inq) return;
        inquiryReplyId.value = inq.id;
        inquiryReplyTitle.innerText = `[${inq.type === 'inquiry' ? '문의' : '건의'}] ${inq.title}`;
        inquiryReplyMessage.innerText = inq.message;
        inquiryReplyText.value = inq.admin_reply || '';
        inquiryReplyStatus.value = inq.status;
        inquiryReplyModal.style.display = 'flex';
    };

    document.getElementById('closeInquiryReplyBtn')?.addEventListener('click', () => {
        inquiryReplyModal.style.display = 'none';
    });

    saveInquiryReplyBtn?.addEventListener('click', async () => {
        const id = inquiryReplyId.value;
        const text = inquiryReplyText.value.trim();
        const status = inquiryReplyStatus.value;

        saveInquiryReplyBtn.disabled = true;
        saveInquiryReplyBtn.innerText = '저장 중...';
        try {
            const { updateInquiryReply } = await import('../supabase.js');
            const { error } = await updateInquiryReply(id, text, status);
            if (error) throw new Error(error.message);
            alert('답변이 저장되었습니다.');
            inquiryReplyModal.style.display = 'none';
            loadSupportInquiries();
        } catch (err) {
            alert('저장 실패: ' + err.message);
        } finally {
            saveInquiryReplyBtn.disabled = false;
            saveInquiryReplyBtn.innerText = '답변 등록';
        }
    });

    const faqEditModal = document.getElementById('faqEditModal');
    const faqEditId = document.getElementById('faqEditId');
    const faqQKo = document.getElementById('faqQKo');
    const faqAKo = document.getElementById('faqAKo');
    const faqQEn = document.getElementById('faqQEn');
    const faqAEn = document.getElementById('faqAEn');
    const faqSort = document.getElementById('faqSort');
    const faqPublished = document.getElementById('faqPublished');
    const saveFaqBtn = document.getElementById('saveFaqBtn');
    const faqModalTitle = document.getElementById('faqModalTitle');

    document.getElementById('addFaqBtn')?.addEventListener('click', () => {
        faqModalTitle.innerText = '새 FAQ 추가';
        faqEditId.value = '';
        faqQKo.value = ''; faqAKo.value = '';
        faqQEn.value = ''; faqAEn.value = '';
        faqSort.value = '0'; faqPublished.checked = true;
        faqEditModal.style.display = 'flex';
    });

    window.adminActions.editFaq = (id) => {
        const faq = window.__adminFaqs?.find(x => x.id === id);
        if (!faq) return;
        faqModalTitle.innerText = 'FAQ 수정';
        faqEditId.value = faq.id;
        faqQKo.value = faq.question_ko; faqAKo.value = faq.answer_ko;
        faqQEn.value = faq.question_en || ''; faqAEn.value = faq.answer_en || '';
        faqSort.value = faq.sort_order; faqPublished.checked = faq.is_published;
        faqEditModal.style.display = 'flex';
    };

    window.adminActions.deleteFaq = async (id) => {
        if (!confirm('정말로 이 FAQ를 삭제하시겠습니까?')) return;
        try {
            const { manageFaq } = await import('../supabase.js');
            const { error } = await manageFaq('DELETE', { id });
            if (error) throw new Error(error.message);
            alert('삭제되었습니다.');
            loadAdminFaqs();
        } catch (err) {
            alert('삭제 실패: ' + err.message);
        }
    };

    document.getElementById('closeFaqEditBtn')?.addEventListener('click', () => {
        faqEditModal.style.display = 'none';
    });

    saveFaqBtn?.addEventListener('click', async () => {
        const id = faqEditId.value;
        const payload = {
            question_ko: faqQKo.value.trim(),
            answer_ko: faqAKo.value.trim(),
            question_en: faqQEn.value.trim(),
            answer_en: faqAEn.value.trim(),
            sort_order: parseInt(faqSort.value) || 0,
            is_published: faqPublished.checked
        };
        if (!payload.question_ko || !payload.answer_ko) return alert('한글 질문과 답변은 필수입니다.');

        if (id) payload.id = id;

        saveFaqBtn.disabled = true;
        saveFaqBtn.innerText = '저장 중...';
        try {
            const { manageFaq } = await import('../supabase.js');
            const action = id ? 'PATCH' : 'POST';
            const { error } = await manageFaq(action, payload);
            if (error) throw new Error(error.message);
            alert('저장되었습니다.');
            faqEditModal.style.display = 'none';
            loadAdminFaqs();
        } catch (err) {
            alert('저장 실패: ' + err.message);
        } finally {
            saveFaqBtn.disabled = false;
            saveFaqBtn.innerText = '저장하기';
        }
    });

    // Initial load
    // ─── 8. Product Search Requests Admin ─────────────────
    window.__adminLoadSearchRequests = async function () {
        const container = document.getElementById('searchRequestsAdminList');
        if (!container) return;
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: #888;">불러오는 중...</div>';
        try {
            const res = await fetch('/api/admin/search-requests');
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            if (!data.requests || data.requests.length === 0) {
                container.innerHTML = '<div style="padding: 40px; text-align: center; color: #888;">접수된 검색 요청이 없습니다.</div>';
                return;
            }

            window.__searchRequests = data.requests;

            container.innerHTML = data.requests.map(req => {
                const date = new Date(req.created_at).toLocaleString('ko-KR');
                let badge = '';
                if (req.status === 'pending') badge = '<span style="background:#fff3cd; color:#856404; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">처리중</span>';
                else if (req.status === 'found') badge = '<span style="background:#d4edda; color:#155724; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">상품발견</span>';
                else badge = '<span style="background:#f8d7da; color:#721c24; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">미발견</span>';

                const imgsHtml = req.image_urls && req.image_urls.length > 0
                    ? `<div style="display:flex; flex-wrap:wrap; gap:6px; margin:8px 0;">${req.image_urls.map(u => `<a href="${u}" target="_blank"><img src="${u}" style="width:60px; height:60px; object-fit:cover; border-radius:6px; border:1px solid #ddd;"></a>`).join('')}</div>`
                    : '';

                const replyPreview = req.admin_reply
                    ? `<div style="margin-top:8px; font-size:12px; color:#0071e3;">💬 ${req.admin_reply.substring(0, 60)}${req.admin_reply.length > 60 ? '...' : ''}</div>`
                    : '';

                return `<div style="border:1px solid #e8e8ed; border-radius:12px; padding:16px; background:white;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div>
                            <strong style="font-size:14px;">${req.user_email || '(이메일 없음)'}</strong>
                            <span style="font-size:12px; color:#aaa; margin-left:8px;">${date}</span>
                        </div>
                        ${badge}
                    </div>
                    ${req.sns_link ? `<div style="font-size:12px; color:#0071e3; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🔗 ${req.sns_link}</div>` : ''}
                    ${req.note ? `<div style="font-size:13px; color:#333; margin-bottom:4px;">${req.note}</div>` : ''}
                    ${imgsHtml}
                    ${replyPreview}
                    <button onclick="window.__adminOpenSearchReply('${req.id}')" class="btn-primary" style="margin-top:10px; padding:6px 14px; font-size:13px;">✏️ 답변하기</button>
                </div>`;
            }).join('');
        } catch (e) {
            container.innerHTML = `<div style="padding: 20px; text-align: center; color: #dc3545;">에러: ${e.message}</div>`;
        }
    };

    window.__adminOpenSearchReply = function (id) {
        const req = (window.__searchRequests || []).find(r => r.id === id);
        if (!req) return;
        document.getElementById('searchReplyId').value = id;
        document.getElementById('searchReplyStatus').value = req.status || 'pending';
        document.getElementById('searchReplyText').value = req.admin_reply || '';
        const preview = `<strong>${req.user_email}</strong><br>${req.sns_link ? '🔗 ' + req.sns_link + '<br>' : ''}${req.note || ''}`;
        document.getElementById('searchReplyPreview').innerHTML = preview;
        document.getElementById('searchReplyModal').style.display = 'flex';
    };

    window.__adminSaveSearchReply = async function () {
        const id = document.getElementById('searchReplyId').value;
        const status = document.getElementById('searchReplyStatus').value;
        const admin_reply = document.getElementById('searchReplyText').value.trim();
        if (!id) return;
        try {
            const res = await fetch(`/api/admin/search-requests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, admin_reply })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            alert('✅ 답변이 저장되었습니다.');
            document.getElementById('searchReplyModal').style.display = 'none';
            window.__adminLoadSearchRequests();
        } catch (e) {
            alert('저장 실패: ' + e.message);
        }
    };

}

document.addEventListener('DOMContentLoaded', initAdmin);
