document.addEventListener('DOMContentLoaded', function () {
    let maxTabsInput = document.getElementById('maxTabs');
    let excludedUrlsTextarea = document.getElementById('excludedUrls');
    let saveButton = document.getElementById('saveButton');
    let status = document.getElementById('status');

    // Load existing values from storage
    chrome.storage.local.get(['maxTabs', 'excludedUrls'], function (result) {
        if (result.maxTabs) {
            maxTabsInput.value = result.maxTabs;
        }
        if (result.excludedUrls) {
            excludedUrlsTextarea.value = result.excludedUrls.join('\n');
        }
    });

    // Save new values to storage
    saveButton.addEventListener('click', function () {
        let maxTabs = parseInt(maxTabsInput.value);
        if (isNaN(maxTabs) || maxTabs < 1) {
            status.textContent = 'Please enter a valid number greater than zero.';
            return;
        }
        let excludedUrls = excludedUrlsTextarea.value
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        chrome.storage.local.set({ 'maxTabs': maxTabs, 'excludedUrls': excludedUrls }, function () {
            status.textContent = 'Options saved.';
            // Trigger a tab count check after saving
            chrome.runtime.sendMessage({ action: 'checkTabCount' });
        });
    });
});
