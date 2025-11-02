// Storage keys
const SETTINGS_KEY = 'suspenderSettings';
const TAB_ACTIVITY_KEY = 'tabActivity';

// Default settings
const DEFAULT_SETTINGS = {
  suspendTime: 20, // minutes
  whitelist: ['gmail.com', 'youtube.com', 'spotify.com'],
  enabled: true
};

// Track tab activity
let tabActivity = {};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  // Set default settings
  const { suspenderSettings } = await chrome.storage.local.get(SETTINGS_KEY);
  if (!suspenderSettings) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  }
  
  // Create periodic alarm (check every minute)
  chrome.alarms.create('checkTabs', { periodInMinutes: 1 });
});

// Track when tabs are activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  tabActivity[activeInfo.tabId] = Date.now();
  await chrome.storage.local.set({ [TAB_ACTIVITY_KEY]: tabActivity });
});

// Track when tabs are updated (e.g., URL change, page load)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    tabActivity[tabId] = Date.now();
    await chrome.storage.local.set({ [TAB_ACTIVITY_KEY]: tabActivity });
  }
});

// Remove tab from tracking when closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  delete tabActivity[tabId];
  await chrome.storage.local.set({ [TAB_ACTIVITY_KEY]: tabActivity });
});

// Main suspension logic
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkTabs') {
    const { suspenderSettings } = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = suspenderSettings || DEFAULT_SETTINGS;
    
    if (!settings.enabled) return;
    
    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    const suspendThreshold = settings.suspendTime * 60 * 1000; // Convert to ms
    
    for (const tab of tabs) {
      // Skip conditions
      if (tab.active) continue; // Don't suspend active tab
      if (tab.pinned) continue; // Don't suspend pinned tabs
      if (tab.url.startsWith('chrome://')) continue; // Skip chrome pages
      if (tab.url.startsWith('chrome-extension://')) continue;
      if (isSuspended(tab.url)) continue; // Already suspended
      
      // Check whitelist
      if (isWhitelisted(tab.url, settings.whitelist)) continue;
      
      // Check if tab is playing audio
      if (tab.audible) continue;
      
      // Check inactivity
      const lastActive = tabActivity[tab.id] || tab.lastAccessed || 0;
      const inactiveTime = now - lastActive;
      
      if (inactiveTime > suspendThreshold) {
        await suspendTab(tab);
      }
    }
  }
});

// Check if URL is whitelisted
function isWhitelisted(url, whitelist) {
  try {
    const hostname = new URL(url).hostname;
    return whitelist.some(site => hostname.includes(site));
  } catch {
    return false;
  }
}

// Check if tab is already suspended
function isSuspended(url) {
  return url.includes('suspended.html');
}

// Suspend a tab
async function suspendTab(tab) {
  const suspendedUrl = chrome.runtime.getURL('suspended.html') + 
    `?url=${encodeURIComponent(tab.url)}` +
    `&title=${encodeURIComponent(tab.title)}` +
    `&favIconUrl=${encodeURIComponent(tab.favIconUrl || '')}`;
  
  await chrome.tabs.update(tab.id, { url: suspendedUrl });
  console.log(`Suspended tab: ${tab.title}`);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    chrome.tabs.query({}, (tabs) => {
      const suspendedCount = tabs.filter(t => isSuspended(t.url)).length;
      sendResponse({ 
        totalTabs: tabs.length,
        suspendedTabs: suspendedCount,
        memorySaved: suspendedCount * 50 // Rough estimate: 50MB per tab
      });
    });
    return true; // Required for async response
  }
});