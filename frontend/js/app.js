/**
 * Main Application Logic
 */

// === Tab Navigation ===
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Tab active state
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Section visibility
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`section-${tab.dataset.tab}`);
    if (target) target.classList.add('active');
  });
});

// === Streamer ID 목록 렌더링 ===
function renderStreamerList(streamers) {
  const container = document.getElementById('streamerList');

  if (!streamers || streamers.length === 0) {
    container.innerHTML = '<p class="empty-msg">No streamers registered. Add a Channel ID above.</p>';
    return;
  }

  container.innerHTML = streamers.map(s => {
    const addedDate = s.addedAt ? new Date(s.addedAt).toLocaleDateString() : '';
    return `
      <div class="streamer-item">
        <div class="info">
          <span class="name">${escapeHtml(s.name || s.channelId)}</span>
          <span class="channel-id">${escapeHtml(s.channelId)}</span>
          ${addedDate ? `<span class="added">Added: ${addedDate}</span>` : ''}
        </div>
        ${isGitHubConfigured() ? `<button class="btn btn-red btn-small" onclick="handleRemoveStreamer('${escapeHtml(s.channelId)}')">Remove</button>` : ''}
      </div>
    `;
  }).join('');
}

// === Add Streamer ===
document.getElementById('btnAddStreamer').addEventListener('click', handleAddStreamer);
document.getElementById('newChannelId').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleAddStreamer();
});

async function handleAddStreamer() {
  const channelIdInput = document.getElementById('newChannelId');
  const channelNameInput = document.getElementById('newChannelName');
  const channelId = channelIdInput.value.trim();
  const channelName = channelNameInput.value.trim();

  if (!channelId) {
    alert('Channel ID is required');
    return;
  }

  if (!isGitHubConfigured()) {
    alert('Please configure GitHub settings first (Settings tab)');
    return;
  }

  try {
    const updated = await addStreamerId(channelId, channelName);
    renderStreamerList(updated);
    channelIdInput.value = '';
    channelNameInput.value = '';
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// === Remove Streamer ===
async function handleRemoveStreamer(channelId) {
  if (!confirm(`Remove streamer ${channelId}?`)) return;

  try {
    const updated = await removeStreamerId(channelId);
    renderStreamerList(updated);
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// === Refresh Data ===
document.getElementById('btnRefreshData').addEventListener('click', loadData);

async function loadData() {
  const data = await loadStreamerData();
  renderDataCards(data);
  if (data.length > 0) {
    const latest = data.reduce((a, b) =>
      new Date(a.lastCollectedAt || 0) > new Date(b.lastCollectedAt || 0) ? a : b
    );
    document.getElementById('dataLastUpdate').textContent =
      `Last update: ${new Date(latest.lastCollectedAt).toLocaleString()}`;
  } else {
    document.getElementById('dataLastUpdate').textContent = '';
  }
}

// === Settings ===
document.getElementById('btnSaveGhSettings').addEventListener('click', () => {
  const owner = document.getElementById('ghOwner').value.trim();
  const repo = document.getElementById('ghRepo').value.trim();
  const token = document.getElementById('ghToken').value.trim();
  const branch = document.getElementById('ghBranch').value.trim() || 'main';

  if (!owner || !repo || !token) {
    showSettingsMsg('error', 'All fields are required');
    return;
  }

  saveGitHubSettings(owner, repo, token, branch);
  showSettingsMsg('success', 'Settings saved to browser');

  // Reload streamer list
  initStreamerList();
});

function showSettingsMsg(type, text) {
  const el = document.getElementById('settingsMsg');
  el.className = `msg ${type}`;
  el.textContent = text;
  setTimeout(() => { el.style.display = 'none'; el.className = 'msg'; }, 4000);
}

function loadGhSettings() {
  const s = getGitHubSettings();
  document.getElementById('ghOwner').value = s.owner;
  document.getElementById('ghRepo').value = s.repo;
  // token은 보안상 비워둠
  document.getElementById('ghBranch').value = s.branch;
}

// === Initialize ===
async function initStreamerList() {
  const streamers = await loadStreamerIds();
  renderStreamerList(streamers);
}

async function init() {
  loadGhSettings();
  await Promise.all([
    initStreamerList(),
    loadData(),
  ]);
}

init();
