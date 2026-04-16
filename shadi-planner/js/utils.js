function formatINR(n) { return '\u20B9' + Math.round(n).toLocaleString('en-IN'); }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function renderSkeletonCards(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton-card">
      <div class="skeleton-line thick w70"></div>
      <div class="skeleton-line w90"></div>
      <div class="skeleton-line w50"></div>
      <div class="skeleton-line w40"></div>
    </div>`;
  }
  return html;
}
