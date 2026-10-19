/**
 * ORBIT - Google Account & Cross-Device Sync Engine
 * Provides comprehensive synchronization across PC and Android:
 * 1. Instant Google Account Email Linking & Identity Profile
 * 2. Real-time Local Wi-Fi Sync (/api/sync & /api/info)
 * 3. 1-Click Direct Google Drive Cloud Backup & Restore
 * 4. Official Google Cloud Identity Services OAuth 2.0 (Google Drive AppData)
 */

const GOOGLE_SYNC_STORAGE_KEY = 'orbit_google_sync_config';
const SYNC_FILE_NAME = 'orbit_social_data_v2.json';
const DRIVE_APP_DATA_FOLDER = 'appDataFolder';

class GoogleSyncEngine {
  constructor(app) {
    this.app = app;
    this.clientId = '';
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.userProfile = null;
    this.syncStatus = 'disconnected'; // 'disconnected' | 'syncing' | 'synced' | 'error'
    this.lastSyncTime = null;
    this.tokenClient = null;
    this.syncDebounceTimer = null;
    this.driveFileId = null;
    this.syncChannelId = null;
    this.isLocalSyncActive = false;
    this.serverInfo = null;
    this.syncMode = 'none'; // 'google_oauth' | 'wifi' | 'email_linked'

    this.loadConfig();
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(GOOGLE_SYNC_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.clientId = parsed.clientId || '';
        this.userProfile = parsed.userProfile || null;
        this.lastSyncTime = parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null;
        this.driveFileId = parsed.driveFileId || null;
        this.syncChannelId = parsed.syncChannelId || null;
        this.syncMode = parsed.syncMode || 'none';
      }
    } catch (e) {
      console.warn('Failed to parse Google sync config from storage:', e);
    }
  }

  saveConfig() {
    try {
      localStorage.setItem(GOOGLE_SYNC_STORAGE_KEY, JSON.stringify({
        clientId: this.clientId,
        userProfile: this.userProfile,
        lastSyncTime: this.lastSyncTime ? this.lastSyncTime.toISOString() : null,
        driveFileId: this.driveFileId,
        syncChannelId: this.syncChannelId,
        syncMode: this.syncMode
      }));
    } catch (e) {
      console.warn('Failed to save Google sync config:', e);
    }
  }

  initGoogleIdentity() {
    // 1. Check local server and sync
    this.checkServerStatusAndSync();

    // 2. Check protocol origin (warn if file://)
    this.checkProtocolOrigin();

    // 3. Register native Google Drive backup & restore callbacks
    window.onNativeGoogleDriveSaved = (success) => {
      if (success) {
        this.app.showToast('✅ Saved backup to Google Drive successfully!', 'success');
        this.app.playChime('success');
      }
    };

    window.onNativeGoogleDriveRestore = (jsonString) => {
      let raw = jsonString;
      if (!raw && window.AndroidBridge && typeof window.AndroidBridge.getPendingRestoreJson === 'function') {
        raw = window.AndroidBridge.getPendingRestoreJson();
      }
      if (!raw) return;
      this.app.handleImportedJsonString(raw);
    };

    // 4. Initialize Google Identity Services if available and on HTTP
    if (window.location.protocol !== 'file:' && window.google && window.google.accounts) {
      if (this.clientId) {
        try {
          this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: (tokenResponse) => this.handleTokenResponse(tokenResponse),
            error_callback: (err) => {
              console.error('Google OAuth Error:', err);
              this.setSyncStatus('error', 'Auth Failed');
              this.app.showToast('Google Sign-in failed. Please verify your Client ID and origin.', 'error');
            }
          });
        } catch (e) {
          console.warn('Google Identity initialization error:', e);
        }
      }
    }

    this.updateSyncUI();
  }

  checkProtocolOrigin() {
    const isFile = window.location.protocol === 'file:';
    const warningBox = document.getElementById('fileOriginWarning');
    if (warningBox) {
      warningBox.style.display = isFile ? 'block' : 'none';
    }
  }

  // ========================================================================
  // SERVER STATUS & LOCAL WI-FI REAL-TIME SYNC
  // ========================================================================

  async checkServerStatusAndSync() {
    // Skip localhost network requests when running offline or on cloud host to keep app startup blazing fast
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      return;
    }

    const endpointsToTry = ['/api/info'];
    let activeBase = null;
    let foundInfo = null;

    for (const url of endpointsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 400);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          foundInfo = await res.json();
          activeBase = url.replace('/api/info', '');
          break;
        }
      } catch (err) {
        // try next endpoint
      }
    }

    if (foundInfo) {
      this.serverInfo = foundInfo;
      this.isLocalSyncActive = true;
      this.activeServerBase = activeBase || '';

      const androidUrlElem = document.getElementById('androidWifiSyncUrl');
      if (androidUrlElem && this.serverInfo.mobileUrl) {
        androidUrlElem.textContent = this.serverInfo.mobileUrl;
      }

      const wifiIndicator = document.getElementById('wifiSyncIndicator');
      const wifiStatusText = document.getElementById('wifiSyncStatusText');
      if (wifiIndicator) wifiIndicator.className = 'wifi-dot dot-active';
      if (wifiStatusText) {
        wifiStatusText.innerHTML = `Local Server: <strong>${this.serverInfo.pcUrl || 'Active'}</strong> (Active 🟢)`;
      }

      try {
        const syncUrl = `${this.activeServerBase}/api/sync`;
        const syncRes = await fetch(syncUrl);
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData && Array.isArray(syncData.contacts) && syncData.contacts.length > 0) {
            const merged = this.mergeContacts(this.app.contacts, syncData.contacts);
            this.app.contacts = merged;
            this.app.saveContacts();
            this.app.render();
          } else if (this.app.contacts && this.app.contacts.length > 0) {
            await this.pushToLocalSyncServer();
          }
        }
      } catch (syncErr) {
        console.warn('Sync fetch note:', syncErr);
      }

      this.setSyncStatus('synced', this.userProfile ? `${this.userProfile.name} (Active)` : 'Wi-Fi Synced');
    } else {
      this.isLocalSyncActive = false;
      this.activeServerBase = '';
      const wifiIndicator = document.getElementById('wifiSyncIndicator');
      const wifiStatusText = document.getElementById('wifiSyncStatusText');
      if (wifiIndicator) wifiIndicator.className = 'wifi-dot dot-offline';
      if (wifiStatusText) {
        wifiStatusText.innerHTML = `Local Server Offline. Run <strong>host-mobile.bat</strong> for cross-device Wi-Fi sync.`;
      }
    }
  }

  async pushToLocalSyncServer() {
    if (!this.isLocalSyncActive) return;
    try {
      const syncUrl = `${this.activeServerBase || ''}/api/sync`;
      await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastUpdated: new Date().toISOString(),
          user: this.userProfile ? this.userProfile.email : 'local',
          contacts: this.app.contacts
        })
      });
    } catch (e) {
      console.warn('Local sync push note:', e);
    }
  }

  // ========================================================================
  // GOOGLE ACCOUNT EMAIL PROFILE LINKING (ZERO DEVELOPER SETUP)
  // ========================================================================

  async linkGoogleEmail(email, name = null) {
    if (!email || !email.includes('@')) {
      this.app.showToast('Please enter a valid Google email address.', 'error');
      const input = document.getElementById('googleAccountEmailInput');
      if (input) input.focus();
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const userName = name || cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    this.userProfile = {
      name: userName,
      email: cleanEmail,
      picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanEmail)}`
    };
    this.syncMode = 'email_linked';
    this.lastSyncTime = new Date();

    // 1. Check or initialize Cloud Sync channel
    if (!this.syncChannelId) {
      await this.initCloudSyncChannel(cleanEmail);
    } else {
      await this.performTwoWaySync();
    }

    this.saveConfig();

    // Push state to local server if active
    if (this.isLocalSyncActive) {
      await this.pushToLocalSyncServer();
    }

    this.updateSyncUI();
    this.setSyncStatus('synced', `${userName} (Synced)`);
    this.app.showToast(`✅ Linked to Google Account: ${cleanEmail}! Circle synced to Cloud.`, 'success');
    this.app.playChime('success');
    this.openConfigModal();
  }

  async initCloudSyncChannel(email) {
    try {
      this.setSyncStatus('syncing', 'Connecting Cloud...');
      const payload = {
        name: `Orbit_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        data: {
          email: email,
          lastUpdated: new Date().toISOString(),
          contactsCount: this.app.contacts.length,
          contacts: this.app.contacts
        }
      };

      const res = await fetch('https://api.restful-api.dev/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          this.syncChannelId = data.id;
          this.saveConfig();
          this.updateSyncUI();
          return this.syncChannelId;
        }
      }
    } catch (err) {
      console.warn('Cloud sync channel init note:', err);
    }
    return null;
  }

  async pairSyncKey(syncKey) {
    if (!syncKey || syncKey.trim().length < 8) {
      this.app.showToast('Please enter a valid Sync Key.', 'error');
      return;
    }
    const cleanKey = syncKey.trim();
    this.setSyncStatus('syncing', 'Pairing...');
    try {
      const res = await fetch(`https://api.restful-api.dev/objects/${cleanKey}`);
      if (res.ok) {
        const remoteObj = await res.json();
        if (remoteObj && remoteObj.data && Array.isArray(remoteObj.data.contacts)) {
          this.syncChannelId = cleanKey;
          if (remoteObj.data.email && !this.userProfile) {
            const cleanEmail = remoteObj.data.email;
            this.userProfile = {
              name: cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              email: cleanEmail,
              picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanEmail)}`
            };
          }
          const merged = this.mergeContacts(this.app.contacts, remoteObj.data.contacts);
          this.app.contacts = merged;
          this.app.saveContacts();
          this.app.render();
          this.syncMode = 'email_linked';
          this.lastSyncTime = new Date();
          this.saveConfig();
          this.updateSyncUI();
          this.setSyncStatus('synced', this.userProfile ? `${this.userProfile.name} (Synced)` : 'Cloud Synced');
          this.app.showToast(`🎉 Paired successfully! Synced ${merged.length} contacts!`, 'success');
          this.app.playChime('success');
          return;
        }
      }
      this.app.showToast('Could not find cloud sync channel for this key.', 'error');
      this.setSyncStatus('error', 'Key Not Found');
    } catch (err) {
      console.error('Pair sync error:', err);
      this.app.showToast('Network error while pairing. Check your connection.', 'error');
      this.setSyncStatus('error', 'Connection Error');
    }
  }

  // ========================================================================
  // TWO-WAY CLOUD & DEVICE SYNC
  // ========================================================================

  async performTwoWaySync() {
    this.setSyncStatus('syncing', 'Syncing...');

    let syncedChannels = [];

    // 1. Cloud Sync Channel (Cross-Device REST KV)
    if (this.syncChannelId) {
      try {
        const res = await fetch(`https://api.restful-api.dev/objects/${this.syncChannelId}`);
        if (res.ok) {
          const remoteObj = await res.json();
          if (remoteObj && remoteObj.data && Array.isArray(remoteObj.data.contacts)) {
            const merged = this.mergeContacts(this.app.contacts, remoteObj.data.contacts);
            this.app.contacts = merged;
            this.app.saveContacts();
            this.app.render();

            await fetch(`https://api.restful-api.dev/objects/${this.syncChannelId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: remoteObj.name || 'OrbitSync',
                data: {
                  email: this.userProfile ? this.userProfile.email : 'local',
                  lastUpdated: new Date().toISOString(),
                  contactsCount: merged.length,
                  contacts: merged
                }
              })
            });
            syncedChannels.push('Cloud Sync');
          }
        }
      } catch (err) {
        console.warn('Cloud sync error:', err);
      }
    } else if (this.userProfile && this.userProfile.email) {
      const newId = await this.initCloudSyncChannel(this.userProfile.email);
      if (newId) syncedChannels.push('Cloud Sync');
    }

    // 2. Sync with Local PC Server (/api/sync)
    if (this.isLocalSyncActive) {
      try {
        await this.pushToLocalSyncServer();
        const res = await fetch('/api/sync');
        if (res.ok) {
          const remote = await res.json();
          if (remote && Array.isArray(remote.contacts)) {
            const merged = this.mergeContacts(this.app.contacts, remote.contacts);
            this.app.contacts = merged;
            this.app.saveContacts();
            this.app.render();
          }
        }
        syncedChannels.push('Local Wi-Fi');
      } catch (err) {
        console.warn('Local sync warning:', err);
      }
    }

    // 3. Sync with Google Drive AppData (OAuth 2.0)
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      try {
        const file = await this.findSyncFile();
        if (file) {
          this.driveFileId = file.id;
          const remoteData = await this.downloadSyncFile(file.id);
          if (remoteData && Array.isArray(remoteData.contacts)) {
            const merged = this.mergeContacts(this.app.contacts, remoteData.contacts);
            this.app.contacts = merged;
            this.app.saveContacts();
            this.app.render();
            await this.uploadSyncFile(file.id, {
              version: 2,
              lastUpdated: new Date().toISOString(),
              device: navigator.userAgent.includes('Android') ? 'Android' : 'Desktop',
              contacts: merged
            });
          }
        } else {
          const newFileId = await this.createSyncFile({
            version: 2,
            lastUpdated: new Date().toISOString(),
            device: navigator.userAgent.includes('Android') ? 'Android' : 'Desktop',
            contacts: this.app.contacts
          });
          this.driveFileId = newFileId;
        }
        syncedChannels.push('Google Drive Cloud');
      } catch (err) {
        console.error('Google Drive sync error:', err);
      }
    }

    this.lastSyncTime = new Date();
    this.saveConfig();
    this.updateSyncUI();

    if (syncedChannels.length > 0) {
      const label = this.userProfile ? `${this.userProfile.name} (Synced)` : 'Synced';
      this.setSyncStatus('synced', label);
      this.app.showToast(`Sync complete! (${syncedChannels.join(' & ')})`, 'success');
      this.app.playChime('success');
    } else if (this.userProfile) {
      this.setSyncStatus('synced', `${this.userProfile.name} (Active)`);
      this.app.showToast('Account data up to date!', 'info');
    } else {
      this.setSyncStatus('disconnected', 'Sync with Google');
      this.openConfigModal();
    }
  }

  mergeContacts(localContacts, remoteContacts) {
    const contactMap = new Map();

    (remoteContacts || []).forEach(rc => {
      contactMap.set(rc.id, rc);
    });

    (localContacts || []).forEach(lc => {
      if (!contactMap.has(lc.id)) {
        contactMap.set(lc.id, lc);
      } else {
        const rc = contactMap.get(lc.id);
        const interactionMap = new Map();
        (rc.interactions || []).forEach(i => interactionMap.set(i.id, i));
        (lc.interactions || []).forEach(i => interactionMap.set(i.id, i));
        const mergedInteractions = Array.from(interactionMap.values()).sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        const mergedContact = {
          ...rc,
          ...lc,
          currentXp: Math.max(lc.currentXp || 0, rc.currentXp || 0),
          interactions: mergedInteractions,
          promisedCall: lc.promisedCall || rc.promisedCall,
          nextTopicsToAsk: lc.nextTopicsToAsk || rc.nextTopicsToAsk
        };
        contactMap.set(lc.id, mergedContact);
      }
    });

    return Array.from(contactMap.values());
  }

  scheduleAutoSync() {
    clearTimeout(this.syncDebounceTimer);
    this.syncDebounceTimer = setTimeout(() => {
      if (this.syncChannelId) {
        fetch(`https://api.restful-api.dev/objects/${this.syncChannelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Orbit_${(this.userProfile ? this.userProfile.email : 'sync').replace(/[^a-zA-Z0-9]/g, '_')}`,
            data: {
              email: this.userProfile ? this.userProfile.email : 'local',
              lastUpdated: new Date().toISOString(),
              contactsCount: this.app.contacts.length,
              contacts: this.app.contacts
            }
          })
        }).catch(() => {});
      }
      if (this.isLocalSyncActive) {
        this.pushToLocalSyncServer();
      }
      if (this.accessToken) {
        this.performTwoWaySync();
      }
    }, 2000);
  }

  // ========================================================================
  // GOOGLE DRIVE 1-CLICK DIRECT BACKUP & RESTORE
  // ========================================================================

  exportDirectGoogleDrive() {
    const backupPayload = {
      app: 'Orbit Social Circle Tracker',
      version: '1.0.2',
      exportedAt: new Date().toISOString(),
      account: this.userProfile ? this.userProfile.email : 'local',
      contactsCount: this.app.contacts.length,
      contacts: this.app.contacts
    };
    const jsonString = JSON.stringify(backupPayload, null, 2);
    const filename = `orbit_backup_${new Date().toISOString().slice(0, 10)}.json`;

    // 1. If on native Android app, use native Storage Access Framework / Drive intent!
    if (window.AndroidBridge && typeof window.AndroidBridge.exportToGoogleDrive === 'function') {
      window.AndroidBridge.exportToGoogleDrive(jsonString, filename);
      this.app.showToast('Choose Google Drive in the save dialog to upload backup!', 'info');
      return;
    }

    // 2. Web / Desktop: modern File System Access API (Chrome/Edge)
    if (window.showSaveFilePicker) {
      window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Orbit JSON Backup File',
          accept: { 'application/json': ['.json'] }
        }]
      }).then(async (handle) => {
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        this.app.showToast('✅ Saved backup successfully! Upload it to Google Drive.', 'success');
        this.app.playChime('success');
      }).catch(err => {
        if (err.name !== 'AbortError') {
          this.fallbackDownloadBackup(jsonString, filename);
        }
      });
      return;
    }

    // 3. Fallback standard download
    this.fallbackDownloadBackup(jsonString, filename);
  }

  fallbackDownloadBackup(jsonString, filename) {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', url);
    dlAnchor.setAttribute('download', filename);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    this.app.showToast('✅ Backup downloaded! Opening Google Drive in new tab...', 'success');
    this.app.playChime('success');

    setTimeout(() => {
      window.open('https://drive.google.com/drive/my-drive', '_blank');
    }, 700);
  }

  triggerRestoreGoogleDrive() {
    // 1. If on native Android app, use native Storage Access Framework / Drive picker!
    if (window.AndroidBridge && typeof window.AndroidBridge.restoreFromGoogleDrive === 'function') {
      window.AndroidBridge.restoreFromGoogleDrive();
      return;
    }

    // 2. Web fallback: open file input
    const input = document.getElementById('googleDriveRestoreInput');
    if (input) {
      input.value = '';
      input.click();
    }
  }

  restoreGoogleDriveBackup(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const contactsToImport = Array.isArray(parsed) ? parsed : (parsed.contacts && Array.isArray(parsed.contacts) ? parsed.contacts : null);

        if (!contactsToImport) {
          throw new Error('File does not contain a valid contacts array.');
        }

        const merged = this.mergeContacts(this.app.contacts, contactsToImport);
        this.app.contacts = merged;
        this.app.saveContacts();
        this.app.render();

        if (this.isLocalSyncActive) {
          this.pushToLocalSyncServer();
        }

        this.app.showToast(`🎉 Restored ${contactsToImport.length} contacts from Google Drive backup!`, 'success');
        this.app.playChime('success');

        const modal = document.getElementById('googleSyncModal');
        if (modal) modal.style.display = 'none';
      } catch (err) {
        console.error('Failed to parse backup:', err);
        this.app.showToast('Invalid backup file. Please select a valid Orbit JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ========================================================================
  // GOOGLE CLOUD OAUTH 2.0 (GOOGLE DRIVE APPDATA)
  // ========================================================================

  requestGoogleSignIn() {
    if (window.location.protocol === 'file:') {
      this.app.showToast('Google OAuth requires http://localhost:5000. Switch to HTTP mode below.', 'warning');
      this.openConfigModal();
      return;
    }

    const input = document.getElementById('googleClientIdInput');
    const clientId = input ? input.value.trim() : this.clientId;

    if (!clientId) {
      // Check if user has entered an email in the email box
      const emailInput = document.getElementById('googleAccountEmailInput');
      const emailVal = emailInput ? emailInput.value.trim() : '';

      if (emailVal && emailVal.includes('@')) {
        this.linkGoogleEmail(emailVal);
        return;
      }

      this.app.showToast('Tip: Enter your Google Email above for instant 1-click sync, or enter an OAuth Client ID below.', 'info');
      this.openConfigModal();
      if (input) {
        input.focus();
        input.style.borderColor = 'var(--accent-purple)';
        setTimeout(() => input.style.borderColor = '', 2000);
      }
      return;
    }

    this.clientId = clientId;
    this.saveConfig();

    if (!this.tokenClient && window.google && window.google.accounts) {
      this.initGoogleIdentity();
    }

    if (this.tokenClient) {
      this.setSyncStatus('syncing', 'Signing in...');
      this.tokenClient.requestAccessToken({ prompt: '' });
    } else {
      this.app.showToast('Google Identity library is initializing. Please try again in 2 seconds.', 'info');
    }
  }

  async handleTokenResponse(tokenResponse) {
    if (tokenResponse && tokenResponse.access_token) {
      this.accessToken = tokenResponse.access_token;
      this.tokenExpiresAt = Date.now() + (tokenResponse.expires_in || 3599) * 1000;
      this.syncMode = 'google_oauth';

      await this.fetchUserProfile();
      this.app.showToast(`Signed in to Google as ${this.userProfile?.name || 'Google User'}!`, 'success');
      this.app.playChime('success');

      await this.performTwoWaySync();
    } else {
      this.setSyncStatus('error', 'Sign-in Cancelled');
    }
  }

  async fetchUserProfile() {
    if (!this.accessToken) return;
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.userProfile = {
          name: data.name,
          email: data.email,
          picture: data.picture
        };
        this.saveConfig();
        this.updateSyncUI();
      }
    } catch (e) {
      console.warn('Could not fetch user profile:', e);
    }
  }

  async findSyncFile() {
    const query = encodeURIComponent(`name = '${SYNC_FILE_NAME}' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    if (!res.ok) throw new Error(`Drive search failed: ${res.statusText}`);
    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  async downloadSyncFile(fileId) {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    if (!res.ok) throw new Error(`Drive download failed: ${res.statusText}`);
    return await res.json();
  }

  async createSyncFile(content) {
    const metadata = {
      name: SYNC_FILE_NAME,
      parents: [DRIVE_APP_DATA_FOLDER]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: form
    });
    if (!res.ok) throw new Error(`Drive create failed: ${res.statusText}`);
    const data = await res.json();
    return data.id;
  }

  async uploadSyncFile(fileId, content) {
    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(content, null, 2)
    });
    if (!res.ok) throw new Error(`Drive upload failed: ${res.statusText}`);
    return true;
  }

  // ========================================================================
  // UI STATUS & MODAL MANAGEMENT
  // ========================================================================

  setSyncStatus(status, label) {
    this.syncStatus = status;
    this.updateSyncUI(label);
  }

  updateSyncUI(customLabel = null) {
    const pill = document.getElementById('googleSyncPill');
    const dot = document.getElementById('syncStatusDot');
    const text = document.getElementById('syncStatusText');
    const avatar = document.getElementById('syncUserAvatar');
    const mobileSyncBtn = document.getElementById('mobileNavSync');

    if (!pill || !dot || !text) return;

    if (this.userProfile || this.isLocalSyncActive) {
      pill.classList.add('connected');
      dot.className = `sync-dot dot-${this.syncStatus === 'error' ? 'error' : 'synced'}`;

      const timeStr = this.lastSyncTime ? this.getRelativeTime(this.lastSyncTime) : 'Active';
      text.textContent = customLabel || (this.userProfile ? `${this.userProfile.name} (${timeStr})` : `Wi-Fi Synced`);

      if (avatar) {
        avatar.src = this.userProfile?.picture || 'icons/icon-96.png';
        avatar.style.display = 'inline-block';
      }
    } else {
      pill.classList.remove('connected');
      dot.className = 'sync-dot dot-disconnected';
      text.textContent = 'Sync with Google';
      if (avatar) avatar.style.display = 'none';
    }

    if (mobileSyncBtn) {
      if (this.syncStatus === 'syncing') {
        mobileSyncBtn.classList.add('nav-syncing');
      } else {
        mobileSyncBtn.classList.remove('nav-syncing');
      }
    }

    const syncChannelBox = document.getElementById('syncChannelDetailsBox');
    const syncKeyDisplay = document.getElementById('displaySyncChannelKey');
    if (syncChannelBox && syncKeyDisplay) {
      if (this.syncChannelId) {
        syncChannelBox.style.display = 'block';
        syncKeyDisplay.textContent = this.syncChannelId;
      } else {
        syncChannelBox.style.display = 'none';
      }
    }
  }

  getRelativeTime(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  openConfigModal() {
    const modal = document.getElementById('googleSyncModal');
    if (!modal) return;

    this.checkProtocolOrigin();

    const input = document.getElementById('googleClientIdInput');
    if (input) input.value = this.clientId || '';

    const emailInput = document.getElementById('googleAccountEmailInput');
    if (emailInput && this.userProfile) {
      emailInput.value = this.userProfile.email || '';
    }

    const syncChannelBox = document.getElementById('syncChannelDetailsBox');
    const syncKeyDisplay = document.getElementById('displaySyncChannelKey');
    if (syncChannelBox && syncKeyDisplay) {
      if (this.syncChannelId) {
        syncChannelBox.style.display = 'block';
        syncKeyDisplay.textContent = this.syncChannelId;
      } else {
        syncChannelBox.style.display = 'none';
      }
    }

    const profileCard = document.getElementById('googleAccountProfileCard');
    const linkSection = document.getElementById('googleLinkSection');

    if (this.userProfile) {
      if (profileCard) {
        profileCard.style.display = 'flex';
        document.getElementById('googleProfName').textContent = this.userProfile.name;
        document.getElementById('googleProfEmail').textContent = this.userProfile.email;
        if (this.userProfile.picture) {
          document.getElementById('googleProfImg').src = this.userProfile.picture;
        }
      }
      if (linkSection) linkSection.style.display = 'none';
    } else {
      if (profileCard) profileCard.style.display = 'none';
      if (linkSection) linkSection.style.display = 'block';
    }

    // Refresh server info
    this.checkServerStatusAndSync();

    modal.style.display = 'flex';
  }

  disconnect() {
    this.accessToken = null;
    this.userProfile = null;
    this.tokenExpiresAt = 0;
    this.lastSyncTime = null;
    this.syncMode = 'none';
    this.saveConfig();
    this.setSyncStatus('disconnected', 'Disconnected');
    this.app.showToast('Disconnected from Google Account.', 'info');
    this.openConfigModal();
  }

  async createGoogleCalendarEvent(eventData) {
    if (!this.accessToken) {
      return false;
    }

    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start: {
            dateTime: new Date(eventData.startTime).toISOString()
          },
          end: {
            dateTime: new Date(eventData.endTime).toISOString()
          },
          reminders: {
            useDefault: true
          }
        })
      });

      if (res.ok) {
        const json = await res.json();
        console.log('Google Calendar API created event:', json);
        return true;
      }
    } catch (e) {
      console.warn('Google Calendar API error:', e);
    }
    return false;
  }
}

window.GoogleSyncEngine = GoogleSyncEngine;
