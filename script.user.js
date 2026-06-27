// ==UserScript==
// @name         AnimePahe Bulk Downloader
// @namespace    https://github.com/Abdullahi-090
// @version      1.0.4
// @author       CODEXA
// @description  Batch download anime episodes from animepahe.pw with 720p quality, Japanese audio, and English subtitles. Auto-handles redirects and license key validation.
// @homepage     https://github.com/Abdullahi-090/animepahe-bulk-downloader
// @homepageURL  https://github.com/Abdullahi-090/animepahe-bulk-downloader
// @supportURL   https://github.com/Abdullahi-090/animepahe-bulk-downloader/issues
// @license      Proprietary - Contact developer for licensing
// @updateURL    https://raw.githubusercontent.com/Abdullahi-090/animepahe-bulk-downloader/main/version.json
// @downloadURL  https://raw.githubusercontent.com/Abdullahi-090/animepahe-bulk-downloader/main/script.user.js
// @match        https://animepahe.pw/*
// @match        https://animepahe.com/*
// @match        https://animepahe.org/*
// @match        https://pahe.win/*
// @match        https://kwik.si/f/*
// @match        https://kwik.si/d/*
// @match        https://kwik.cx/f/*
// @match        https://kwik.cx/d/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=animepahe.pw
// @grant        GM_openInTab
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @connect      cdn.jsdelivr.net
// @connect      raw.githubusercontent.com
// ==/UserScript==
(function() {
    'use strict';

    // ============================================================
    // 🔑 EDIT THIS - Set your secret password (must match encryption)
    // ============================================================
    const SECRET_PASSWORD = "MyS3cr3tP@ss";
    // ============================================================
    const GITHUB_RAW = 'https://raw.githubusercontent.com/Abdullahi-090/animepahe-bulk-downloader/main';

    // --- Decrypt function ---
    function decryptKeys(encryptedData) {
        try {
            const passwordKey = SECRET_PASSWORD.split('').map(c => c.charCodeAt(0));
            const salt = 'static-salt-anime'.split('').map(c => c.charCodeAt(0));
            const keyBytes = [];
            for (let i = 0; i < 32; i++) {
                keyBytes.push(passwordKey[i % passwordKey.length] ^ salt[i % salt.length]);
            }
            const decrypted = [];
            for (let i = 0; i < encryptedData.length; i++) {
                decrypted.push(encryptedData.charCodeAt(i) ^ keyBytes[i % keyBytes.length]);
            }
            const decryptedStr = String.fromCharCode.apply(null, decrypted);
            return JSON.parse(decryptedStr);
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    }

    // --- License check ---
    function checkLicense() {
        const storedKey = GM_getValue('license_key', null);
        const storedUser = GM_getValue('user_id', null);
        let userId = storedUser;
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substring(2, 15);
            GM_setValue('user_id', userId);
        }

        if (storedKey) {
            validateKey(storedKey, userId);
        } else {
            const key = prompt('🔑 Enter your license key:');
            if (!key) {
                alert('License key required. Script will not run.');
                return;
            }
            validateKey(key, userId);
        }
    }

    function validateKey(key, userId) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: GITHUB_RAW + '/keys.enc',
            onload: function(response) {
                try {
                    const encryptedData = response.responseText;
                    const keys = decryptKeys(encryptedData);
                    if (!keys) {
                        alert('Failed to validate license. Please try again.');
                        return;
                    }
                    if (keys[key]) {
                        const keyData = keys[key];
                        const expiryDate = new Date(keyData.expiry);
                        const now = new Date();
                        if (expiryDate < now) {
                            alert('❌ License key expired on ' + keyData.expiry);
                            return;
                        }
                        if (keyData.used_by && keyData.used_by !== userId) {
                            alert('❌ This license is already in use by another user.');
                            return;
                        }
                        GM_setValue('license_key', key);
                        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                        alert('✅ License valid! ' + daysLeft + ' days remaining.');
                        // ✅ License valid – run the downloader
                        runDownloader();
                    } else {
                        alert('❌ Invalid license key.');
                    }
                } catch (e) {
                    console.error('Validation error:', e);
                    alert('Failed to validate license. Please try again.');
                }
            },
            onerror: function() {
                alert('Failed to download license data. Check your internet connection.');
            }
        });
    }

    // ============================================================
    // 🚀 YOUR FULL DOWNLOADER CODE
    // ============================================================
    function runDownloader() {
        const url = window.location.href;

        // --- Routing ---
        if (/pahe\.win\/.+/.test(url)) {
            pahe_win();
            return;
        }

        if (/kwik\.(si|cx)\/f\/.+/.test(url) || /kwik\.(si|cx)\/d\/.+/.test(url)) {
            kwik_extract();
            return;
        }

        if (url.includes('/play/')) {
            console.log('Animepahe Batch Downloader: Play page detected, auto-selecting...');
            setTimeout(autoSelectResolution, 1500);
            return;
        }

        if (url.includes('/anime/') && !url.includes('/play/')) {
            console.log('Animepahe Batch Downloader: Setting up batch UI...');
            setupBatchUI();
            return;
        }

        // --- Batch Download UI Setup ---
        function setupBatchUI() {
            const maxAttempts = 20;
            let attempts = 0;

            const interval = setInterval(() => {
                attempts++;

                let main = document.querySelector('.content-wrapper') ||
                           document.querySelector('.container') ||
                           document.querySelector('main') ||
                           document.querySelector('.anime-detail') ||
                           document.body;

                if (document.getElementById('batch-download-menu')) {
                    clearInterval(interval);
                    return;
                }

                if (main && attempts < maxAttempts) {
                    clearInterval(interval);
                    createBatchMenu(main);
                }

                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    console.warn('Batch Downloader: Could not find main content area.');
                }
            }, 500);
        }

        function createBatchMenu(main) {
            const menu = document.createElement('div');
            menu.id = 'batch-download-menu';
            menu.style.cssText = `
                position: relative;
                background: #1a1a1a;
                color: #fff;
                padding: 15px;
                margin: 15px auto;
                border: 1px solid #333;
                border-radius: 8px;
                font-size: 14px;
                z-index: 9999;
                max-width: 1100px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            `;

            const title = document.createElement('div');
            title.style.cssText = 'font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #ff6b6b;';
            title.innerText = '📥 Batch Download';

            const container = document.createElement('div');
            container.style.cssText = 'display: flex; flex-wrap: wrap; align-items: center; gap: 10px;';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'e.g. 1-24 or 1,3,5,7-12';
            input.style.cssText = `
                flex: 1;
                min-width: 200px;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid #444;
                background: #111;
                color: #fff;
                font-size: 14px;
            `;

            const button = document.createElement('button');
            button.innerText = '✨ Batch Download';
            button.style.cssText = `
                background: #2d8f2d;
                color: #fff;
                border: none;
                padding: 8px 20px;
                cursor: pointer;
                border-radius: 4px;
                font-size: 14px;
                font-weight: bold;
                transition: background 0.2s;
            `;
            button.onmouseover = function() { this.style.background = '#3aad3a'; };
            button.onmouseout = function() { this.style.background = '#2d8f2d'; };

            const qualityLabel = document.createElement('span');
            qualityLabel.style.cssText = 'color: #aaa; font-size: 13px;';
            qualityLabel.innerText = '🎯 720p · Sub (JP audio)';

            button.onclick = function() {
                const pattern = input.value.trim();
                if (!pattern) {
                    alert('Please enter episode numbers or ranges.');
                    return;
                }

                const wanted = parsePattern(pattern);
                const links = [...document.querySelectorAll('a')].filter(a => {
                    return a.href && a.href.includes('/play/') && a.textContent.match(/\b\d+\b/);
                });

                const selected = links.filter(a => {
                    const match = a.textContent.match(/\b(\d+)\b/);
                    return match && wanted.includes(Number(match[1]));
                });

                if (selected.length === 0) {
                    alert(`❌ No matching episodes found for: ${pattern}`);
                    return;
                }

                if (!confirm(`Download ${selected.length} episode(s)?\n\nThis will open each in a new tab and auto-download.\nMake sure to ALLOW POP-UPS.`)) {
                    return;
                }

                selected.forEach((a, i) => {
                    setTimeout(() => {
                        const newWindow = window.open(a.href, '_blank');
                        if (!newWindow) {
                            console.warn('Popup blocked! Please allow popups for animepahe.pw');
                        }
                    }, i * 800);
                });
            };

            const settingsRow = document.createElement('div');
            settingsRow.style.cssText = 'margin-top: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; border-top: 1px solid #333; padding-top: 10px;';

            const toggleLabel = document.createElement('label');
            toggleLabel.style.cssText = 'color: #aaa; font-size: 13px; display: flex; align-items: center; gap: 5px; cursor: pointer;';

            const toggleCheckbox = document.createElement('input');
            toggleCheckbox.type = 'checkbox';
            toggleCheckbox.checked = true;
            toggleCheckbox.style.cssText = 'cursor: pointer;';

            const toggleText = document.createTextNode('Auto-select 720p Sub on play pages');

            toggleLabel.appendChild(toggleCheckbox);
            toggleLabel.appendChild(toggleText);
            settingsRow.appendChild(toggleLabel);

            toggleCheckbox.onchange = function() {
                localStorage.setItem('animepahe_autoselect', JSON.stringify(this.checked));
            };

            try {
                const saved = localStorage.getItem('animepahe_autoselect');
                if (saved !== null) {
                    toggleCheckbox.checked = JSON.parse(saved);
                }
            } catch(e) {}

            const tip = document.createElement('div');
            tip.style.cssText = 'margin-top: 8px; font-size: 12px; color: #888;';
            tip.innerText = '💡 The script will auto-select 720p Sub and handle the kwik download link extraction.';

            container.append(input, button, qualityLabel);
            menu.append(title, container, settingsRow, tip);

            if (main.firstChild) {
                main.insertBefore(menu, main.firstChild);
            } else {
                main.appendChild(menu);
            }
        }

        // --- Auto-select resolution on play pages ---
        function autoSelectResolution() {
            const autoSelect = localStorage.getItem('animepahe_autoselect');
            if (autoSelect === 'false') {
                console.log('Auto-select disabled by user.');
                return;
            }

            console.log('Animepahe Batch Downloader: Auto-selecting 720p Sub...');

            const downloadMenu = document.getElementById('downloadMenu');
            if (downloadMenu && downloadMenu.getAttribute('aria-expanded') === 'false') {
                downloadMenu.click();
            }

            let attempts = 0;
            const maxAttempts = 15;

            const interval = setInterval(() => {
                attempts++;

                const pickDownload = document.getElementById('pickDownload');
                if (!pickDownload) {
                    if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        console.warn('Could not find download links.');
                    }
                    return;
                }

                const links = pickDownload.querySelectorAll('a');

                let targetLink = null;
                for (const link of links) {
                    const text = link.textContent.toLowerCase();
                    if (text.includes('720p') && !text.includes('eng-dub')) {
                        targetLink = link;
                        break;
                    }
                }

                if (!targetLink) {
                    for (const link of links) {
                        const text = link.textContent.toLowerCase();
                        if (text.includes('720p')) {
                            targetLink = link;
                            break;
                        }
                    }
                }

                if (targetLink) {
                    clearInterval(interval);
                    console.log('Found 720p link, clicking...');
                    targetLink.style.backgroundColor = '#505050';
                    targetLink.style.color = 'white';
                    targetLink.click();
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    console.warn('No 720p link found. Try manual selection.');
                }
            }, 500);
        }

        // --- Pahe.win Redirect ---
        function pahe_win() {
            const scripts = document.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                try {
                    const content = scripts[i].textContent || '';
                    const match = content.match(/https?:\/\/kwik\.(?:si|cx)\/[fd]\/[A-Za-z0-9_-]{6,}/i);
                    if (match && match[0]) {
                        window.location.href = match[0];
                        return;
                    }
                } catch (e) {}
            }

            console.log("No redirect link found on pahe.win. Retrying...");
            let attempts = 0;
            const id = setInterval(() => {
                attempts++;
                for (let i = 0; i < scripts.length; i++) {
                    try {
                        const content = scripts[i].textContent || '';
                        const match = content.match(/https?:\/\/kwik\.(?:si|cx)\/[fd]\/[A-Za-z0-9_-]{6,}/i);
                        if (match && match[0]) {
                            clearInterval(id);
                            window.location.href = match[0];
                            return;
                        }
                    } catch (e) {}
                }
                if (attempts > 8) {
                    clearInterval(id);
                    console.warn('pahe.win: giving up after multiple attempts.');
                    setInterval(() => window.location.reload(), 3000);
                }
            }, 700);
        }

        // --- Kwik Extract: Get the real download link ---
        function kwik_extract() {
            console.log('Kwik page detected. Extracting download link...');

            setTimeout(() => {
                const pageSource = document.documentElement.outerHTML;

                const cdnPatterns = [
                    /https?:\/\/[a-zA-Z0-9\-]+\.uwucdn\.top\/mp4\/[^"'\s]+/i,
                    /https?:\/\/[a-zA-Z0-9\-]+\.kwik\.(?:si|cx)\/[^"'\s]+/i,
                    /https?:\/\/[^\s'"]+\.(?:mp4|mkv|avi)[^\s'"]*/i,
                    /https?:\/\/[^\s'"]+\?file=[^"'\s]+/i
                ];

                let foundLink = null;
                for (const pattern of cdnPatterns) {
                    const match = pageSource.match(pattern);
                    if (match) {
                        foundLink = match[0];
                        break;
                    }
                }

                if (!foundLink) {
                    const scripts = document.getElementsByTagName('script');
                    for (const script of scripts) {
                        try {
                            const content = script.textContent || '';
                            const fileMatch = content.match(/file\s*[:=]\s*['"]([^'"]+)['"]/i);
                            if (fileMatch && fileMatch[1]) {
                                const baseMatch = content.match(/https?:\/\/[a-zA-Z0-9\-]+\.uwucdn\.top/i);
                                if (baseMatch) {
                                    foundLink = baseMatch[0] + '/mp4/' + fileMatch[1];
                                    break;
                                }
                            }
                            const fullMatch = content.match(/https?:\/\/[a-zA-Z0-9\-]+\.uwucdn\.top\/mp4\/[^"'\s]+/i);
                            if (fullMatch) {
                                foundLink = fullMatch[0];
                                break;
                            }
                        } catch(e) {}
                    }
                }

                if (!foundLink) {
                    const downloadBtn = document.querySelector('a[href*="download"], button:contains("DOWNLOAD"), div:contains("DOWNLOAD")');
                    if (downloadBtn) {
                        console.log('Found DOWNLOAD button. Extracting onclick...');
                        const onclick = downloadBtn.getAttribute('onclick') || downloadBtn.getAttribute('data-href') || '';
                        const match = onclick.match(/https?:\/\/[^\s'"]+\.(?:mp4|mkv|avi)[^\s'"]*/i);
                        if (match) {
                            foundLink = match[0];
                        }
                    }
                }

                if (!foundLink) {
                    console.log('Trying to click the download button to capture the link...');
                    const downloadBtn = document.querySelector('a:not([href="javascript:void(0)"]), button[onclick*="download"]');
                    if (downloadBtn) {
                        const originalClick = downloadBtn.onclick;
                        downloadBtn.onclick = function(e) {
                            e.preventDefault();
                            const url = e.target.href || e.target.getAttribute('data-url') || '';
                            if (url && (url.includes('uwucdn.top') || url.includes('kwik'))) {
                                foundLink = url;
                                startDownload(foundLink);
                            } else {
                                downloadBtn.click();
                            }
                        };
                        downloadBtn.click();
                        return;
                    }
                }

                if (foundLink) {
                    console.log('✅ Found download link:', foundLink);
                    startDownload(foundLink);
                } else {
                    console.warn('❌ Could not find download link. Please click the DOWNLOAD button manually.');
                    showManualNotification();
                }
            }, 3000);
        }

        function showManualNotification() {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: #1a1a1a; color: #fff; padding: 20px; border: 2px solid #ff6b6b;
                border-radius: 10px; z-index: 999999; text-align: center; max-width: 400px;
                box-shadow: 0 0 50px rgba(0,0,0,0.9);
            `;
            notification.innerHTML = `
                <h3>👇 Click the DOWNLOAD Button</h3>
                <p>Please click the <strong>DOWNLOAD</strong> button below to start the download.</p>
                <button id="close-notification" style="margin-top: 10px; padding: 8px 20px; background: #2d8f2d; color: #fff; border: none; border-radius: 4px; cursor: pointer;">OK</button>
            `;
            document.body.appendChild(notification);
            document.getElementById('close-notification').onclick = function() {
                notification.remove();
            };
        }

        function startDownload(link) {
            console.log('🚀 Starting download:', link);

            try {
                if (typeof GM_download !== 'undefined') {
                    const filename = link.split('/').pop().split('?')[0] || 'download.mp4';
                    GM_download({
                        url: link,
                        name: filename,
                        onload: function() { console.log('✅ Download complete:', filename); },
                        onerror: function(e) { console.error('❌ Download failed:', e); }
                    });
                    return;
                }
            } catch(e) {}

            try {
                const win = window.open(link, '_blank');
                if (!win) {
                    const a = document.createElement('a');
                    a.href = link;
                    a.download = link.split('/').pop().split('?')[0] || 'download.mp4';
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => a.remove(), 1000);
                }
            } catch(e) {
                console.error('❌ Failed to start download:', e);
            }
        }

        function parsePattern(pattern) {
            const parts = pattern.split(',');
            const episodes = new Set();
            for (const part of parts) {
                const trimmed = part.trim();
                if (trimmed.includes('-')) {
                    const rangeParts = trimmed.split('-').map(p => parseInt(p.trim(), 10));
                    if (rangeParts.length === 2 && !isNaN(rangeParts[0]) && !isNaN(rangeParts[1])) {
                        const start = Math.min(rangeParts[0], rangeParts[1]);
                        const end = Math.max(rangeParts[0], rangeParts[1]);
                        for (let i = start; i <= end; i++) {
                            episodes.add(i);
                        }
                    }
                } else {
                    const num = parseInt(trimmed, 10);
                    if (!isNaN(num)) {
                        episodes.add(num);
                    }
                }
            }
            return [...episodes];
        }

        console.log('✅ Animepahe Batch Downloader loaded!');
    }

    // --- Start the license check ---
    checkLicense();
})();
