let maxTabs = 40; // Default maximum number of tabs
let tabTimestamps = {};
let excludedUrls = []; // List of excluded domains or URLs
let domainLimits = {}; // Per-domain tab limits (e.g., { "x.com": 3, "twitter.com": 3 })
let initialized = false;

// Initialize extension - load settings and tab timestamps from storage
async function initialize() {
    if (initialized) return;

    try {
        // Load all settings from storage first
        const result = await chrome.storage.local.get(['maxTabs', 'excludedUrls', 'tabTimestamps', 'domainLimits']);

        if (result.maxTabs) {
            maxTabs = result.maxTabs;
        }
        if (result.excludedUrls) {
            excludedUrls = result.excludedUrls;
        }
        if (result.tabTimestamps) {
            tabTimestamps = result.tabTimestamps;
        }
        if (result.domainLimits) {
            domainLimits = result.domainLimits;
        }

        // Initialize tabTimestamps for existing tabs that don't have timestamps
        const tabs = await chrome.tabs.query({});
        let timestamp = Date.now();
        tabs.sort((a, b) => a.index - b.index);

        let needsUpdate = false;
        tabs.forEach((tab, idx) => {
            if (!tabTimestamps[tab.id]) {
                // Assign older timestamps to older tabs
                tabTimestamps[tab.id] = timestamp - (tabs.length - idx);
                needsUpdate = true;
            }
        });

        // Clean up timestamps for tabs that no longer exist
        const existingTabIds = new Set(tabs.map(tab => tab.id));
        for (const tabId of Object.keys(tabTimestamps)) {
            if (!existingTabIds.has(parseInt(tabId))) {
                delete tabTimestamps[tabId];
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            await saveTabTimestamps();
        }

        updateBadgeText(tabs.length);
        initialized = true;
    } catch (error) {
        console.error('Error initializing extension:', error);
    }
}

// Save tabTimestamps to storage (persists across service worker restarts)
async function saveTabTimestamps() {
    try {
        await chrome.storage.local.set({ tabTimestamps });
    } catch (error) {
        console.error('Error saving tabTimestamps:', error);
    }
}

// Run initialization
initialize();

// Listen for changes in storage to update settings
chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName === 'local') {
        if (changes.maxTabs) {
            maxTabs = changes.maxTabs.newValue;
            checkTabCount();
        }
        if (changes.excludedUrls) {
            excludedUrls = changes.excludedUrls.newValue;
            checkTabCount();
        }
        if (changes.domainLimits) {
            domainLimits = changes.domainLimits.newValue || {};
            checkTabCount();
        }
        // Update local tabTimestamps if changed externally (shouldn't happen normally)
        if (changes.tabTimestamps && changes.tabTimestamps.newValue) {
            tabTimestamps = changes.tabTimestamps.newValue;
        }
    }
});

// Update timestamp when a tab is created
chrome.tabs.onCreated.addListener(async function (tab) {
    await initialize(); // Ensure initialized before handling events
    let timestamp = Date.now();
    tabTimestamps[tab.id] = timestamp;
    await saveTabTimestamps();
    updateBadgeText();
    checkTabCount();
});

// Update timestamp when a tab is updated
chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        await initialize(); // Ensure initialized before handling events
        let timestamp = Date.now();
        tabTimestamps[tabId] = timestamp;
        await saveTabTimestamps();
        updateBadgeText();
        checkTabCount();
    }
});

// Update timestamp when a tab is activated
chrome.tabs.onActivated.addListener(async function (activeInfo) {
    await initialize(); // Ensure initialized before handling events
    let timestamp = Date.now();
    tabTimestamps[activeInfo.tabId] = timestamp;
    await saveTabTimestamps();
    updateBadgeText();
    checkTabCount();
});

// Remove tab from tabTimestamps when closed
chrome.tabs.onRemoved.addListener(async function (tabId, removeInfo) {
    await initialize(); // Ensure initialized before handling events
    delete tabTimestamps[tabId];
    await saveTabTimestamps();
    updateBadgeText();
});

// Listen for messages from options page or popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'checkTabCount') {
        initialize().then(() => checkTabCount());
        sendResponse({ success: true });
    } else if (request.action === 'getTabStats') {
        chrome.tabs.query({}).then((tabs) => {
            sendResponse({ tabCount: tabs.length });
        }).catch((error) => {
            console.error('Error getting tab stats:', error);
            sendResponse({ error: error.message });
        });
        return true; // Indicates async response
    }
    return false;
});

// Function to enforce the tab limit
async function checkTabCount() {
    try {
        await initialize(); // Ensure initialized before checking

        let tabs = await chrome.tabs.query({});
        let nonPinnedTabs = tabs.filter(tab => !tab.pinned);

        // Filter out tabs in the excluded URLs
        let tabsToConsider = nonPinnedTabs.filter(tab => !isExcluded(tab.url));

        let allTabsClosed = [];

        // First, enforce per-domain limits
        if (Object.keys(domainLimits).length > 0) {
            // Group tabs by domain
            const tabsByDomain = {};
            for (const tab of tabsToConsider) {
                const domain = getDomain(tab.url);
                if (domain) {
                    if (!tabsByDomain[domain]) {
                        tabsByDomain[domain] = [];
                    }
                    tabsByDomain[domain].push(tab);
                }
            }

            // Check each domain with a limit
            for (const [domain, limit] of Object.entries(domainLimits)) {
                const domainTabs = tabsByDomain[domain] || [];

                if (domainTabs.length > limit) {
                    // Sort by last accessed time (oldest first)
                    const tabTimes = domainTabs.map(tab => ({
                        id: tab.id,
                        time: tabTimestamps[tab.id] || 0
                    }));
                    tabTimes.sort((a, b) => a.time - b.time);

                    // Close oldest tabs to bring count down to limit
                    const tabsToCloseCount = domainTabs.length - limit;
                    for (let i = 0; i < tabsToCloseCount; i++) {
                        const tabId = tabTimes[i].id;
                        try {
                            await chrome.tabs.remove(tabId);
                            delete tabTimestamps[tabId];
                            allTabsClosed.push({ id: tabId, domain });
                        } catch (error) {
                            console.error(`Error removing tab ${tabId}:`, error);
                        }
                    }
                }
            }
        }

        // Re-query tabs after domain limit enforcement
        tabs = await chrome.tabs.query({});
        nonPinnedTabs = tabs.filter(tab => !tab.pinned);
        tabsToConsider = nonPinnedTabs.filter(tab => !isExcluded(tab.url));

        // Then, enforce global limit
        if (tabsToConsider.length > maxTabs) {
            // Get tabs sorted by last accessed time
            let tabTimes = tabsToConsider.map(tab => ({ id: tab.id, time: tabTimestamps[tab.id] || 0 }));
            tabTimes.sort((a, b) => a.time - b.time);

            // Number of tabs to close
            let tabsToCloseCount = tabsToConsider.length - maxTabs;

            // Close the oldest tabs
            for (let i = 0; i < tabsToCloseCount; i++) {
                let tabId = tabTimes[i].id;
                try {
                    await chrome.tabs.remove(tabId);
                    delete tabTimestamps[tabId];
                    allTabsClosed.push({ id: tabId, domain: 'global' });
                } catch (error) {
                    console.error(`Error removing tab ${tabId}:`, error);
                }
            }
        }

        // Save updated tabTimestamps and show notification
        if (allTabsClosed.length > 0) {
            await saveTabTimestamps();

            // Create notification message
            const domainCounts = {};
            let globalCount = 0;
            for (const { domain } of allTabsClosed) {
                if (domain === 'global') {
                    globalCount++;
                } else {
                    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
                }
            }

            let messageParts = [];
            for (const [domain, count] of Object.entries(domainCounts)) {
                messageParts.push(`${count} from ${domain}`);
            }
            if (globalCount > 0) {
                messageParts.push(`${globalCount} for global limit`);
            }

            const message = `Closed ${allTabsClosed.length} tab(s): ${messageParts.join(', ')}.`;
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Tab Limiter',
                message: message
            });
        }

        // Update badge with current tab count
        let currentTabs = await chrome.tabs.query({});
        updateBadgeText(currentTabs.length);
    } catch (error) {
        console.error('Error in checkTabCount:', error);
    }
}

// Function to extract domain from a URL
function getDomain(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        // Return hostname without 'www.' prefix for consistent matching
        return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
        return null;
    }
}

// Function to check if a URL is in the excluded list
function isExcluded(url) {
    if (!url) return false;
    try {
        let urlObj = new URL(url);
        for (let pattern of excludedUrls) {
            if (urlObj.href.includes(pattern)) {
                return true;
            }
        }
    } catch (e) {
        console.error('Invalid URL:', url);
    }
    return false;
}

// Function to update the badge text with the number of open tabs
function updateBadgeText(tabCount) {
    if (tabCount !== undefined) {
        chrome.action.setBadgeText({ text: tabCount.toString() });
    } else {
        chrome.tabs.query({}).then((tabs) => {
            chrome.action.setBadgeText({ text: tabs.length.toString() });
        });
    }
}
