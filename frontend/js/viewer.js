/**
 * Data Viewer - streamer_data.json 시각화
 */

function renderDataCards(data) {
  const container = document.getElementById('dataCards');

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="empty-msg">No collected data yet. The backend server will push data after collection.</p>';
    return;
  }

  container.innerHTML = data.map(streamer => {
    const avatarContent = streamer.profileImageUrl
      ? `<img src="${escapeHtml(streamer.profileImageUrl)}" alt="">`
      : streamer.channelName.charAt(0).toUpperCase();

    const vodsHtml = (streamer.recentVods || []).slice(0, 5).map(vod => {
      const durationStr = formatDuration(vod.duration);
      return `<div class="vod-item">
        <span class="vod-date">${escapeHtml(vod.date)}</span>
        ${escapeHtml(vod.title)} (${durationStr})
      </div>`;
    }).join('');

    const lastCollected = streamer.lastCollectedAt
      ? new Date(streamer.lastCollectedAt).toLocaleString()
      : '-';

    return `
      <div class="data-card">
        <div class="card-header">
          <div class="avatar">${avatarContent}</div>
          <div>
            <div class="card-name">${escapeHtml(streamer.channelName)}</div>
            <div class="card-id">${escapeHtml(streamer.channelId.substring(0, 16))}...</div>
          </div>
        </div>
        <div class="stats">
          <div class="stat">
            <span class="stat-value">${streamer.vodCount}</span>
            <span class="stat-label">VODs</span>
          </div>
          <div class="stat">
            <span class="stat-value" style="font-size:12px; color:#8b949e;">${lastCollected}</span>
            <span class="stat-label">Last Collected</span>
          </div>
        </div>
        ${vodsHtml ? `<div class="vod-list">${vodsHtml}</div>` : ''}
      </div>
    `;
  }).join('');
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
