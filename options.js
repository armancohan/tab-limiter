document.addEventListener('DOMContentLoaded', function () {
    let maxTabsInput = document.getElementById('maxTabs');
    let excludedUrlsTextarea = document.getElementById('excludedUrls');
    let saveButton = document.getElementById('saveButton');
    let status = document.getElementById('status');
    let domainLimitsList = document.getElementById('domainLimitsList');
    let newDomainInput = document.getElementById('newDomain');
    let newLimitInput = document.getElementById('newLimit');
    let addDomainBtn = document.getElementById('addDomainBtn');

    // Current domain limits (loaded from storage)
    let domainLimits = {};

    // Load existing values from storage
    chrome.storage.local.get(['maxTabs', 'excludedUrls', 'domainLimits'], function (result) {
        if (chrome.runtime.lastError) {
            console.error('Error loading settings:', chrome.runtime.lastError);
            return;
        }
        if (result.maxTabs) {
            maxTabsInput.value = result.maxTabs;
        }
        if (result.excludedUrls) {
            excludedUrlsTextarea.value = result.excludedUrls.join('\n');
        }
        if (result.domainLimits) {
            domainLimits = result.domainLimits;
            renderDomainLimits();
        }
    });

    // Render the domain limits list
    function renderDomainLimits() {
        domainLimitsList.innerHTML = '';
        for (const [domain, limit] of Object.entries(domainLimits)) {
            const row = document.createElement('div');
            row.className = 'domain-limit-row';
            row.innerHTML = `
                <input type="text" value="${domain}" readonly>
                <input type="number" value="${limit}" min="1" data-domain="${domain}">
                <button type="button" class="remove-btn" data-domain="${domain}">Remove</button>
            `;
            domainLimitsList.appendChild(row);
        }

        // Add event listeners for limit changes
        domainLimitsList.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('change', function () {
                const domain = this.dataset.domain;
                const newLimit = parseInt(this.value);
                if (!isNaN(newLimit) && newLimit >= 1) {
                    domainLimits[domain] = newLimit;
                }
            });
        });

        // Add event listeners for remove buttons
        domainLimitsList.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const domain = this.dataset.domain;
                delete domainLimits[domain];
                renderDomainLimits();
            });
        });
    }

    // Add new domain limit
    addDomainBtn.addEventListener('click', function () {
        let domain = newDomainInput.value.trim().toLowerCase();
        const limit = parseInt(newLimitInput.value);

        if (!domain) {
            status.textContent = 'Please enter a domain name.';
            status.style.color = 'red';
            return;
        }

        if (isNaN(limit) || limit < 1) {
            status.textContent = 'Please enter a valid limit (1 or more).';
            status.style.color = 'red';
            return;
        }

        // Remove www. prefix if present
        domain = domain.replace(/^www\./, '');

        // Remove protocol if present
        domain = domain.replace(/^https?:\/\//, '');

        // Remove path if present
        domain = domain.split('/')[0];

        if (domainLimits[domain]) {
            status.textContent = `Domain "${domain}" already exists. Update its limit directly.`;
            status.style.color = 'orange';
            return;
        }

        domainLimits[domain] = limit;
        renderDomainLimits();
        newDomainInput.value = '';
        newLimitInput.value = '3';
        status.textContent = `Added limit for ${domain}.`;
        status.style.color = 'green';
    });

    // Save new values to storage
    saveButton.addEventListener('click', function () {
        let maxTabs = parseInt(maxTabsInput.value);
        if (isNaN(maxTabs) || maxTabs < 1) {
            status.textContent = 'Please enter a valid number greater than zero for global max tabs.';
            status.style.color = 'red';
            return;
        }
        let excludedUrls = excludedUrlsTextarea.value
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        chrome.storage.local.set({
            'maxTabs': maxTabs,
            'excludedUrls': excludedUrls,
            'domainLimits': domainLimits
        }, function () {
            if (chrome.runtime.lastError) {
                console.error('Error saving settings:', chrome.runtime.lastError);
                status.textContent = 'Error saving options.';
                status.style.color = 'red';
                return;
            }
            status.textContent = 'Options saved.';
            status.style.color = 'green';
            // Trigger a tab count check after saving
            chrome.runtime.sendMessage({ action: 'checkTabCount' }, function () {
                if (chrome.runtime.lastError) {
                    console.error('Error triggering tab check:', chrome.runtime.lastError);
                }
            });
        });
    });
});
