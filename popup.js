document.addEventListener('DOMContentLoaded', function () {
    let maxTabsInput = document.getElementById('maxTabs');
    let saveButton = document.getElementById('saveButton');
    let optionsButton = document.getElementById('optionsButton');
    let tabCountDiv = document.getElementById('tabCount');
    let domainLimitsList = document.getElementById('domainLimitsList');
    let status = document.getElementById('status');

    // Load existing maxTabs value and domain limits from storage
    chrome.storage.local.get(['maxTabs', 'domainLimits'], function (result) {
        if (chrome.runtime.lastError) {
            console.error('Error loading settings:', chrome.runtime.lastError);
            return;
        }
        if (result.maxTabs) {
            maxTabsInput.value = result.maxTabs;
        }
        renderDomainLimits(result.domainLimits || {});
    });

    // Render domain limits in the popup
    function renderDomainLimits(domainLimits) {
        const entries = Object.entries(domainLimits);
        if (entries.length === 0) {
            domainLimitsList.innerHTML = '<div class="no-limits">No domain limits set</div>';
            return;
        }

        domainLimitsList.innerHTML = '';
        for (const [domain, limit] of entries) {
            const item = document.createElement('div');
            item.className = 'domain-item';
            item.innerHTML = `
                <span class="domain-name">${domain}</span>
                <span class="domain-count">max ${limit} tab${limit !== 1 ? 's' : ''}</span>
            `;
            domainLimitsList.appendChild(item);
        }
    }

    // Get current tab count
    chrome.runtime.sendMessage({ action: 'getTabStats' }, function (response) {
        if (chrome.runtime.lastError) {
            console.error('Error getting tab stats:', chrome.runtime.lastError);
            tabCountDiv.textContent = 'Unable to get tab count.';
            return;
        }
        if (response && response.tabCount !== undefined) {
            tabCountDiv.textContent = `Total open tabs: ${response.tabCount}`;
        } else {
            tabCountDiv.textContent = 'Unable to get tab count.';
        }
    });

    // Save new maxTabs value to storage
    saveButton.addEventListener('click', function () {
        let maxTabs = parseInt(maxTabsInput.value);
        if (isNaN(maxTabs) || maxTabs < 1) {
            status.textContent = 'Please enter a valid number greater than zero.';
            return;
        }
        chrome.storage.local.set({ 'maxTabs': maxTabs }, function () {
            if (chrome.runtime.lastError) {
                console.error('Error saving settings:', chrome.runtime.lastError);
                status.textContent = 'Error saving settings.';
                return;
            }
            status.textContent = 'Settings saved.';
            // Trigger a tab count check after saving
            chrome.runtime.sendMessage({ action: 'checkTabCount' }, function () {
                if (chrome.runtime.lastError) {
                    console.error('Error triggering tab check:', chrome.runtime.lastError);
                }
            });
        });
    });

    // Open the options page
    optionsButton.addEventListener('click', function () {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });
});
