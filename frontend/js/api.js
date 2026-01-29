const GH_API = 'https://api.github.com';

// === GitHub 설정 (localStorage) ===

function getGitHubSettings() {
  return {
    owner: localStorage.getItem('gh_owner') || '',
    repo: localStorage.getItem('gh_repo') || '',
    token: localStorage.getItem('gh_token') || '',
    branch: localStorage.getItem('gh_branch') || 'main',
  };
}

function saveGitHubSettings(owner, repo, token, branch) {
  localStorage.setItem('gh_owner', owner);
  localStorage.setItem('gh_repo', repo);
  localStorage.setItem('gh_token', token);
  localStorage.setItem('gh_branch', branch || 'main');
}

function isGitHubConfigured() {
  const s = getGitHubSettings();
  return !!(s.owner && s.repo && s.token);
}

// === 읽기: 정적 JSON 파일 로드 (GitHub Pages에서 서빙) ===

async function loadStreamerIds() {
  try {
    const res = await fetch('./streamer_ids.json?' + Date.now());
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Streamer_Data 디렉토리에서 모든 스트리머 데이터 로드
 * streamer_ids.json의 ID 목록을 기반으로 각 Streamer_Data/{id}/data.json 로드
 */
async function loadStreamerData() {
  try {
    const ids = await loadStreamerIds();
    if (ids.length === 0) return [];

    const results = [];
    for (const entry of ids) {
      try {
        const res = await fetch(`./Streamer_Data/${entry.channelId}/data.json?` + Date.now());
        if (res.ok) {
          const data = await res.json();
          results.push(data);
        }
      } catch {
        // 개별 스트리머 데이터 로드 실패는 무시
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * GitHub API를 통해 Streamer_Data 디렉토리 탐색 후 데이터 로드
 */
async function loadStreamerDataFromGitHub() {
  const s = getGitHubSettings();
  if (!s.token) return loadStreamerData();

  try {
    // frontend/Streamer_Data 디렉토리 내용 조회
    const dirUrl = `${GH_API}/repos/${s.owner}/${s.repo}/contents/frontend/Streamer_Data?ref=${s.branch}`;
    const dirRes = await fetch(dirUrl, {
      headers: { 'Authorization': `token ${s.token}` },
    });

    if (!dirRes.ok) return [];
    const dirs = await dirRes.json();

    const results = [];
    for (const dir of dirs) {
      if (dir.type === 'dir') {
        try {
          const dataUrl = `${GH_API}/repos/${s.owner}/${s.repo}/contents/frontend/Streamer_Data/${dir.name}/data.json?ref=${s.branch}`;
          const dataRes = await fetch(dataUrl, {
            headers: { 'Authorization': `token ${s.token}` },
          });
          if (dataRes.ok) {
            const fileData = await dataRes.json();
            const decoded = decodeURIComponent(escape(atob(fileData.content)));
            results.push(JSON.parse(decoded));
          }
        } catch { /* 개별 실패 무시 */ }
      }
    }

    return results;
  } catch {
    return loadStreamerData();
  }
}

// === 쓰기: GitHub Contents API ===

async function getFileSha(filePath) {
  const s = getGitHubSettings();
  const url = `${GH_API}/repos/${s.owner}/${s.repo}/contents/${filePath}?ref=${s.branch}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `token ${s.token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha;
}

async function updateFile(filePath, content, message) {
  const s = getGitHubSettings();
  const sha = await getFileSha(filePath);

  const url = `${GH_API}/repos/${s.owner}/${s.repo}/contents/${filePath}`;
  const body = {
    message: message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: s.branch,
  };

  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${s.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `GitHub API error: ${res.status}`);
  }

  return await res.json();
}

// === streamer_ids.json 업데이트 (경로: frontend/streamer_ids.json) ===

async function addStreamerId(channelId, name) {
  const current = await loadStreamerIdsFromGitHub();

  if (current.some(s => s.channelId === channelId)) {
    throw new Error('This Channel ID already exists');
  }

  const entry = {
    channelId: channelId.trim(),
    name: name?.trim() || undefined,
    addedAt: new Date().toISOString(),
  };

  current.push(entry);

  const content = JSON.stringify(current, null, 2);
  await updateFile('frontend/streamer_ids.json', content, `[frontend] Add streamer: ${channelId}`);
  return current;
}

async function removeStreamerId(channelId) {
  const current = await loadStreamerIdsFromGitHub();
  const filtered = current.filter(s => s.channelId !== channelId);

  if (filtered.length === current.length) {
    throw new Error('Channel ID not found');
  }

  const content = JSON.stringify(filtered, null, 2);
  await updateFile('frontend/streamer_ids.json', content, `[frontend] Remove streamer: ${channelId}`);
  return filtered;
}

async function loadStreamerIdsFromGitHub() {
  const s = getGitHubSettings();
  if (!s.token) return loadStreamerIds();

  try {
    const url = `${GH_API}/repos/${s.owner}/${s.repo}/contents/frontend/streamer_ids.json?ref=${s.branch}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `token ${s.token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const decoded = decodeURIComponent(escape(atob(data.content)));
    return JSON.parse(decoded);
  } catch {
    return loadStreamerIds();
  }
}
