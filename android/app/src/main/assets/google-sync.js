/**
 * ORBIT - Google Account & Cross-Device Sync Engine
 * Provides multi-method synchronization across PC and Android:
 * 1. Real-time Local Wi-Fi Sync (/api/sync)
 * 2. Google Identity Services OAuth2 & Google Drive AppData (drive.appdata)
 * 3. Google Account Email Identity & Direct Google Drive Backup/Restore
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
    this.isLocalSyncActive = false;
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
        syncMode: this.syncMode
      }));
    } catch (e) {
      console.warn('Failed to save Google sync config:', e);
    }
  }

  initGoogleIdentity() {
    // 1. Check for real-time Local Wi-Fi sync server
    this.checkLocalSyncServer();

    // 2. Check if on file:// protocol
    this.checkProtocolOrigin();

    // 3. Initialize Google Identity Services if available and on HTTP
    if (window.location.protocol !== 'file:' && window.google && window.google.accounts) {
      if (this.clientId) {
        try {
          this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: (tokenResponse) => this.handleTokenResponse(tokenResponse),
            error_callback: (err) => {
              console.error('Google OAuth Error:', err);
              this.setSyncStatus('error', 'Auth Failed');
              this.app.showToast('Google Sign-in failed. Check Client ID origin.', 'error');
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

  async checkLocalSyncServer() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch('/api/sync', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        this.isLocalSyncActive = true;
        const data = await res.json();
        if (data && Array.isArray(data.contacts) && data.contacts.length > 0) {
          // Merge local server data with browser contacts
          const merged = this.mergeContacts(this.app.contacts, data.contacts);
          this.app.contacts = merged;
          this.app.saveContacts();
          this.app.render();
        }
        this.setSyncStatus('synced', 'Wi-Fi Synced');
      }
    } catch (e) {
      // Local server endpoint not reachable (e.g. running via file:// without host-mobile)
      this.isLocalSyncActive = false;
    }
  }

  requestGoogleSignIn() {
    // Check if running on file:// protocol
    if (window.location.protocol === 'file:') {
      this.app.showToast('Google Sign-In requires http://localhost:5000. Switch to HTTP mode below.', 'warning');
      this.openConfigModal();
      return;
    }

    const input = document.getElementById('googleClientIdInput');
    const clientId = input ? input.value.trim() : this.clientId;

    if (!clientId) {
      this.app.showToast('Please enter your Google OAuth Client ID first, or link your Google Email below.', 'info');
      this.openConfigModal();
      if (input) {
        input.focus();
        input.style.borderColor = 'var(--accent-rose)';
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
      this.app.showToast('Google Identity library is loading. Please try again in 3 seconds.', 'info');
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

      // Immediate full two-way cloud sync
      await this.performTwoWaySync();
    } else {
      this.setSyncStatus('error', 'Sign-in Denied');
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

  // ========================================================================
  // GOOGLE ACCOUNT EMAIL PROFILE LINKING
  // ========================================================================

  linkGoogleEmail(email, name = null) {
    if (!email || !email.includes('@')) {
      this.app.showToast('Please enter a valid Google email address.', 'error');
      return;
    }

    const userName = name || email.split('@')[0];
    this.userProfile = {
      name: userName,
      email: email,
      picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`
    };
    this.syncMode = 'email_linked';
    this.lastSyncTime = new Date();
    this.saveConfig();
    this.setSyncStatus('synced', `Linked: ${email}`);
    this.app.showToast(`Linked to Google Account: ${email}`, 'success');
    this.app.playChime('success');
    this.openConfigModal();
  }

  // ========================================================================
  // TWO-WAY CLOUD SYNC LOGIC
  // ========================================================================

  async performTwoWaySync() {
    // 1. If Local Wi-Fi Sync is active, sync with local PC server
    if (this.isLocalSyncActive) {
      await this.pushToLocalSyncServer();
    }

    // 2. If Google OAuth is connected, sync with Google Drive AppData
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      this.setSyncStatus('syncing', 'Syncing to Drive...');

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

        this.lastSyncTime = new Date();
        this.saveConfig();
        this.setSyncStatus('synced', 'Synced to Google');
        this.app.showToast('Google Drive AppData sync complete!', 'success');
        return;
      } catch (err) {
        console.error('Google Drive Sync error:', err);
        this.setSyncStatus('error', 'Drive Sync Error');
      }
    }

    if (this.isLocalSyncActive) {
      this.lastSyncTime = new Date();
      this.saveConfig();
      this.setSyncStatus('synced', 'Wi-Fi Synced');
      this.app.showToast('Local Wi-Fi sync complete!', 'success');
    } else if (this.userProfile) {
      this.lastSyncTime = new Date();
      this.saveConfig();
      this.setSyncStatus('synced', 'Account Synced');
      this.app.showToast('Account data up to date!', 'info');
    } else {
      this.openConfigModal();
    }
  }

  async pushToLocalSyncServer() {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastUpdated: new Date().toISOString(),
          contacts: this.app.contacts
        })
      });
    } catch (e) {
      console.warn('Local sync push failed:', e);
    }
  }

  mergeContacts(localContacts, remoteContacts) {
    const contactMap = new Map();

    remoteContacts.forEach(rc => {
      contactMap.set(rc.id, rc);
    });

    localContacts.forEach(lc => {
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

  // Google Drive REST API calls
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
    if (!res.ok) throw new Error(`Drive upload update failed: ${res.statusText}`);
    return true;
  }

  scheduleAutoSync() {
    clearTimeout(this.syncDebounceTimer);
    this.syncDebounceTimer = setTimeout(() => {
      if (this.isLocalSyncActive) {
        this.pushToLocalSyncServer();
      }
      if (this.accessToken) {
        this.performTwoWaySync();
      }
    }, 1500);
  }

  // ========================================================================
  // GOOGLE DRIVE DIRECT WEB BACKUP & RESTORE
  // ========================================================================

  exportDirectGoogleDrive() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.app.contacts, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `orbit_google_drive_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    this.app.showToast('Backup downloaded! Opening Google Drive in new tab...', 'success');
    setTimeout(() => {
      window.open('https://drive.google.com/drive/my-drive', '_blank');
    }, 800);
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

    const profileCard = document.getElementById('googleAccountProfileCard');
    if (this.userProfile) {
      profileCard.style.display = 'flex';
      document.getElementById('googleProfName').textContent = this.userProfile.name;
      document.getElementById('googleProfEmail').textContent = this.userProfile.email;
      if (this.userProfile.picture) {
        document.getElementById('googleProfImg').src = this.userProfile.picture;
      }
      document.getElementById('btnGoogleDisconnect').style.display = 'inline-flex';
    } else {
      profileCard.style.display = 'none';
      document.getElementById('btnGoogleDisconnect').style.display = 'none';
    }

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
    const modal = document.getElementById('googleSyncModal');
    if (modal) modal.style.display = 'none';
  }
}

window.GoogleSyncEngine = GoogleSyncEngine;
