// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const originalUrl = urlParams.get('url');
const pageTitle = urlParams.get('title');
const favIconUrl = urlParams.get('favIconUrl');

// Display tab info
document.getElementById('pageTitle').textContent = pageTitle || 'Untitled';
document.getElementById('pageUrl').textContent = originalUrl || '';

if (favIconUrl && favIconUrl !== 'null') {
  document.getElementById('favicon').src = favIconUrl;
} else {
  document.getElementById('favicon').style.display = 'none';
}

// Restore tab on button click
document.getElementById('restoreBtn').addEventListener('click', () => {
  if (originalUrl) {
    window.location.href = originalUrl;
  }
});

// Auto-restore on any click (optional)
document.addEventListener('click', (e) => {
  if (e.target.id !== 'restoreBtn') {
    if (originalUrl) {
      window.location.href = originalUrl;
    }
  }
});