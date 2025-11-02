const SETTINGS_KEY = 'suspenderSettings';

// Load settings on popup open
document.addEventListener('DOMContentLoaded', async () => {
  const { suspenderSettings } = await chrome.storage.local.get(SETTINGS_KEY);
  
  if (suspenderSettings) {
    document.getElementById('enabledToggle').checked = suspenderSettings.enabled;
    document.getElementById('suspendTime').value = suspenderSettings.suspendTime;
    document.getElementById('whitelist').value = suspenderSettings.whitelist.join('\n');
  }
  
  // Load stats
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    if (response) {
      document.getElementById('totalTabs').textContent = response.totalTabs;
      document.getElementById('suspendedTabs').textContent = response.suspendedTabs;
      document.getElementById('memorySaved').textContent = response.memorySaved;
    }
  });
});

// Save settings
document.getElementById('saveBtn').addEventListener('click', async () => {
  const enabled = document.getElementById('enabledToggle').checked;
  const suspendTime = parseInt(document.getElementById('suspendTime').value);
  const whitelistText = document.getElementById('whitelist').value;
  const whitelist = whitelistText.split('\n').map(s => s.trim()).filter(Boolean);
  
  const settings = { enabled, suspendTime, whitelist };
  
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  
  // Show save confirmation
  const status = document.getElementById('saveStatus');
  status.textContent = '✓ Settings saved!';
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 2000);
});