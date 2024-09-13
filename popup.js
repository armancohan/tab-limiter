document.addEventListener('DOMContentLoaded', function () {
    let maxTabsInput = document.getElementById('maxTabs');
    let saveButton = document.getElementById('saveButton');
    let optionsButton = document.getElementById('optionsButton');
    let tabCountDiv = document.getElementById('tabCount');
    let status = document.getElementById('status');

    // Load existing maxTabs value from storage
    chrome.storage.local.get(['maxTabs'], function (result) {
        if (result.maxTabs) {
            maxTabsInput.value = result.maxTabs;
        }
    });

    // Get current tab count
    chrome.runtime.sendMessage({ action: 'getTabStats' }, function (response) {
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
            status.textContent = 'Settings saved.';
            // Trigger a tab count check after saving
            chrome.runtime.sendMessage({ action: 'checkTabCount' });
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
