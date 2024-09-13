let maxTabs = 10; // Default maximum number of tabs
let tabTimestamps = {};
let excludedUrls = []; // List of excluded domains or URLs

// Load settings from storage
chrome.storage.local.get(['maxTabs', 'excludedUrls'], function (result) {
    if (result.maxTabs) {
        maxTabs = result.maxTabs;
    }
    if (result.excludedUrls) {
        excludedUrls = result.excludedUrls;
    }
});

// Initialize tabTimestamps for existing tabs
chrome.tabs.query({}).then((tabs) => {
    let timestamp = Date.now();
    tabs.sort((a, b) => a.index - b.index);
    tabs.forEach((tab, idx) => {
        if (!tabTimestamps[tab.id]) {
            // Assign older timestamps to older tabs
            tabTimestamps[tab.id] = timestamp - (tabs.length - idx);
        }
    });
    updateBadgeText(tabs.length);
});

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
    }
});

// Update timestamp when a tab is created
chrome.tabs.onCreated.addListener(function (tab) {
    let timestamp = Date.now();
    tabTimestamps[tab.id] = timestamp;
    updateBadgeText();
    checkTabCount();
});

// Update timestamp when a tab is updated
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        let timestamp = Date.now();
        tabTimestamps[tabId] = timestamp;
        updateBadgeText();
        checkTabCount();
    }
});

// Update timestamp when a tab is activated
chrome.tabs.onActivated.addListener(function (activeInfo) {
    let timestamp = Date.now();
    tabTimestamps[activeInfo.tabId] = timestamp;
    updateBadgeText();
    checkTabCount();
});

// Remove tab from tabTimestamps when closed
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    delete tabTimestamps[tabId];
    updateBadgeText();
    // Removed checkTabCount() call to prevent recursive behavior
});

// Listen for messages from options page or popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'checkTabCount') {
        checkTabCount();
    } else if (request.action === 'getTabStats') {
        chrome.tabs.query({}).then((tabs) => {
            sendResponse({ tabCount: tabs.length });
        });
        return true; // Indicates async response
    }
});

// Function to enforce the tab limit
async function checkTabCount() {
    try {
        let tabs = await chrome.tabs.query({});
        let totalTabs = tabs.length;
        let pinnedTabs = tabs.filter(tab => tab.pinned).length;
        let nonPinnedTabs = tabs.filter(tab => !tab.pinned);
        let nonPinnedTabCount = nonPinnedTabs.length;

        // Filter out tabs in the excluded URLs
        let tabsToConsider = nonPinnedTabs.filter(tab => !isExcluded(tab.url));

        if (tabsToConsider.length > maxTabs) {
            // Get tabs sorted by last accessed time
            let tabTimes = tabsToConsider.map(tab => ({ id: tab.id, time: tabTimestamps[tab.id] || 0 }));
            tabTimes.sort((a, b) => a.time - b.time);

            // Number of tabs to close
            let tabsToCloseCount = tabsToConsider.length - maxTabs;

            // Close the oldest tabs
            let tabsClosed = [];
            for (let i = 0; i < tabsToCloseCount; i++) {
                let tabId = tabTimes[i].id;
                try {
                    await chrome.tabs.remove(tabId);
                    delete tabTimestamps[tabId];
                    tabsClosed.push(tabId);
                } catch (error) {
                    console.error(`Error removing tab ${tabId}:`, error);
                }
            }

            // Display notification
            if (tabsClosed.length > 0) {
                let message = `Closed ${tabsClosed.length} tab(s) to maintain the limit of ${maxTabs}.`;
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Tab Limiter',
                    message: message
                });
            }
        }
        updateBadgeText(totalTabs);
    } catch (error) {
        console.error('Error in checkTabCount:', error);
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
