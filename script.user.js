// ==UserScript==
// @name         AnimePahe Bulk Downloader
// @version      1.0.0
// @updateURL    https://raw.githubusercontent.com/Abdullahi-090/animepahe-bulk-downloader/main/version.json
// @downloadURL  https://raw.githubusercontent.com/Abdullahi-090/animepahe-bulk-downloader/main/script.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    // 🔑 EDIT THIS LINE - Set your secret password
    // ============================================================
    const SECRET_PASSWORD = "MyS3cr3tP@ss";
    // ============================================================

    const GITHUB_RAW = 'https://raw.githubusercontent.com/Abdullahi-090/animepahe-bulk-downloader/main';

    // --- Decrypt function ---
    function decryptKeys(encryptedData) {
        try {
            // Simple XOR decryption
            const passwordKey = SECRET_PASSWORD.split('').map(c => c.charCodeAt(0));
            const salt = 'static-salt-anime'.split('').map(c => c.charCodeAt(0));
            
            // Create key from password + salt
            const keyBytes = [];
            for (let i = 0; i < 32; i++) {
                keyBytes.push(passwordKey[i % passwordKey.length] ^ salt[i % salt.length]);
            }
            
            // Decrypt with XOR
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

    // --- Check license key ---
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
                        
                        main();
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

    // --- Main script logic (YOUR DOWNLOADER CODE) ---
    function main() {
        console.log('✅ License valid. Running AnimePahe Bulk Downloader...');
        
        // ============================================================
        // 🚀 PASTE YOUR FULL ANIME DOWNLOADER CODE HERE
        // ============================================================
        // This is where your batch downloader code goes.
        // For now, we'll put a placeholder message.
        // ============================================================
        alert('✅ AnimePahe Bulk Downloader is running!\n\nReplace this alert with your actual downloader code.');
        // ============================================================
    }

    // --- Start ---
    checkLicense();
})();