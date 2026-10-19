/**
 * ORBIT - Social Circle & Connection Tracker
 * Pure vanilla JavaScript application with persistent storage,
 * connection leveling engine, reciprocity tracking, and awkwardness-busting reconnect tools.
 */

// ==========================================================================
// CONFIGURATION & CONSTANTS
// ==========================================================================

const APP_VERSION = '1.0.1';

const LEVEL_DEFINITIONS = [
  { level: 1, title: 'Acquaintance', minXp: 0, maxXp: 99, colorClass: 'lvl-1' },
  { level: 2, title: 'Familiar Face', minXp: 100, maxXp: 199, colorClass: 'lvl-2' },
  { level: 3, title: 'Casual Friend', minXp: 200, maxXp: 299, colorClass: 'lvl-3' },
  { level: 4, title: 'Good Pal', minXp: 300, maxXp: 399, colorClass: 'lvl-4' },
  { level: 5, title: 'Solid Friend', minXp: 400, maxXp: 499, colorClass: 'lvl-5' },
  { level: 6, title: 'Close Friend', minXp: 500, maxXp: 649, colorClass: 'lvl-6' },
  { level: 7, title: 'Trusted Confidant', minXp: 650, maxXp: 799, colorClass: 'lvl-7' },
  { level: 8, title: 'Inner Circle', minXp: 800, maxXp: 899, colorClass: 'lvl-8' },
  { level: 9, title: 'Ride-or-Die', minXp: 900, maxXp: 974, colorClass: 'lvl-9' },
  { level: 10, title: 'Soul Sibling', minXp: 975, maxXp: 1000, colorClass: 'lvl-10' }
];

const CIRCLE_LABELS = {
  inner: { label: 'Inner Circle', icon: '🌟', badgeClass: 'badge-inner' },
  close: { label: 'Close Friends', icon: '💛', badgeClass: 'badge-close' },
  old: { label: 'Old Friends', icon: '🌿', badgeClass: 'badge-old' },
  family: { label: 'Family', icon: '🏠', badgeClass: 'badge-family' },
  casual: { label: 'Casual', icon: '☕', badgeClass: 'badge-casual' }
};

const STORAGE_KEY = 'orbit_social_circle_data_v2';
const THEME_KEY = 'orbit_theme_preference';

// Sample Seed Data to help the user immediately understand the app
const SAMPLE_CONTACTS = [
  {
    id: 'c1',
    name: 'Marcus Vance',
    nickname: 'Marc (College Roommate)',
    phone: '+1 555-0144',
    email: 'marcus.v@example.com',
    circle: 'old',
    targetCadenceDays: 30,
    currentXp: 420,
    manualLevelOverride: null,
    birthday: '1996-04-12',
    notes: 'Roommates for 3 years at university. Shared love for photography and hiking.',
    nextTopicsToAsk: 'How did his new golden retriever puppy settle in?',
    promisedCall: {
      isPromised: true,
      deadline: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), // overdue by 36 hours
      reason: 'I said "I will call you back this afternoon" on Tuesday and completely forgot!'
    },
    programs: [
      {
        id: 'prog_c1_1',
        title: 'Callback Marc & ask about golden retriever puppy',
        dateTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        durationMinutes: 30,
        location: 'Phone (+1 555-0144)',
        notes: 'Marc called earlier. Remember to ask how his new puppy is settling in!',
        completed: false
      }
    ],
    interactions: [
      {
        id: 'i1_1',
        type: 'promised_call',
        initiator: 'them',
        date: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        mood: 'quick',
        summary: 'Marcus called to say hello. I was rushing into a meeting and said I would call him back later. I missed it!',
        nextTopics: 'Ask about the puppy!'
      },
      {
        id: 'i1_2',
        type: 'call',
        initiator: 'me',
        date: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
        mood: 'great',
        summary: 'Caught up on his job switch to design lead. Great 40-minute call.',
        nextTopics: ''
      }
    ]
  },
  {
    id: 'c2',
    name: 'Elena Rostova',
    nickname: 'Elena (Bestie)',
    phone: '+1 555-0891',
    email: 'elena.rostova@example.com',
    circle: 'inner',
    targetCadenceDays: 7,
    currentXp: 860,
    manualLevelOverride: 8,
    birthday: '1998-09-22',
    notes: 'Go-to person for life advice, book recommendations, and venting.',
    nextTopicsToAsk: 'Did she hear back from the grant committee?',
    promisedCall: null,
    programs: [
      {
        id: 'prog_c2_1',
        title: 'Coffee catch-up at Blue Bottle Cafe',
        dateTime: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        durationMinutes: 60,
        location: 'Blue Bottle Cafe, Downtown',
        notes: 'Celebrate grant announcement and discuss upcoming book club reading',
        completed: false
      }
    ],
    interactions: [
      {
        id: 'i2_1',
        type: 'meetup',
        initiator: 'them',
        date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        mood: 'deep',
        summary: 'Met at Blue Bottle for coffee. She surprised me with pastries!',
        nextTopics: 'Grant committee decision'
      },
      {
        id: 'i2_2',
        type: 'call',
        initiator: 'me',
        date: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
        mood: 'great',
        summary: 'Video call on Sunday evening. Talked about holiday plans.',
        nextTopics: ''
      }
    ]
  },
  {
    id: 'c3',
    name: 'David Kim',
    nickname: 'Dave',
    phone: '+1 555-0329',
    email: 'dave.k@example.com',
    circle: 'close',
    targetCadenceDays: 14,
    currentXp: 540,
    manualLevelOverride: null,
    birthday: '1995-11-05',
    notes: 'High school friend. Very genuine guy, works in renewable energy.',
    nextTopicsToAsk: 'Check in on his half-marathon training.',
    promisedCall: null,
    interactions: [
      {
        id: 'i3_1',
        type: 'message',
        initiator: 'them',
        date: new Date(Date.now() - 22 * 24 * 3600 * 1000).toISOString(),
        mood: 'good',
        summary: 'Sent a hilarious video from our old school camp.',
        nextTopics: 'Half marathon training'
      }
    ]
  },
  {
    id: 'c4',
    name: 'Amina Farah',
    nickname: 'Amina',
    phone: '+1 555-0672',
    email: 'amina.f@example.com',
    circle: 'family',
    targetCadenceDays: 14,
    currentXp: 780,
    manualLevelOverride: null,
    birthday: '1992-01-18',
    notes: 'Cousin living in Chicago. Family dinners together.',
    nextTopicsToAsk: 'Auntie Mary recovery',
    promisedCall: {
      isPromised: true,
      deadline: new Date(Date.now() + 12 * 3600 * 1000).toISOString(), // due in 12 hours
      reason: 'She texted asking to catch up tonight or tomorrow.'
    },
    interactions: [
      {
        id: 'i4_1',
        type: 'call',
        initiator: 'them',
        date: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        mood: 'good',
        summary: 'Quick call to coordinate family holiday gifts.',
        nextTopics: ''
      }
    ]
  }
];

// ==========================================================================
// APPLICATION STATE
// ==========================================================================

class SocialCircleApp {
  constructor() {
    this.contacts = [];
    this.currentCircleFilter = 'all';
    this.currentStatusFilter = 'all';
    this.currentSort = 'urgency';
    this.searchQuery = '';
    this.audioCtx = null;
    this.activeProfileContactId = null;
    this.deferredInstallPrompt = null;
    this.googleSync = new GoogleSyncEngine(this);

    this.init();
  }

  init() {
    this.loadTheme();
    this.loadContacts();
    this.registerServiceWorker();
    this.initNotifications();
    this.initOfflineHandling();
    this.initNativePhoneIntegration();
    try {
      if (this.googleSync) {
        this.googleSync.initGoogleIdentity();
      }
    } catch (e) {
      console.warn('Google Sync init note:', e);
    }
    this.bindEvents();
    this.render();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(err => {
        console.warn('Service worker registration note:', err);
      });
    }
  }

  // ========================================================================
  // PERSISTENCE & DATA MANAGEMENT
  // ========================================================================

  loadContacts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.contacts = JSON.parse(raw);
      } else {
        this.contacts = JSON.parse(JSON.stringify(SAMPLE_CONTACTS));
        this.saveContacts();
      }
    } catch (e) {
      console.error('Failed to load contacts from localStorage:', e);
      this.contacts = JSON.parse(JSON.stringify(SAMPLE_CONTACTS));
    }

    // Ensure every contact has a valid programs array
    this.contacts.forEach(c => {
      if (!Array.isArray(c.programs)) {
        c.programs = [];
      }
    });
  }

  saveContacts() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.contacts));
      // Schedule background sync to Google Drive if connected
      if (this.googleSync) {
        this.googleSync.scheduleAutoSync();
      }
    } catch (e) {
      console.error('Failed to save contacts to localStorage:', e);
      this.showToast('Could not save changes locally.', 'error');
    }
  }

  loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      document.getElementById('themeIcon').textContent = '🌙';
    } else {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      document.getElementById('themeIcon').textContent = '☀️';
    }
  }

  toggleTheme() {
    const isLight = document.body.classList.contains('theme-light');
    if (isLight) {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      document.getElementById('themeIcon').textContent = '☀️';
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      document.getElementById('themeIcon').textContent = '🌙';
      localStorage.setItem(THEME_KEY, 'light');
    }
  }

  // ========================================================================
  // CONNECTION LEVELER ENGINE
  // ========================================================================

  /**
   * Calculates dynamic connection health, level, XP, and status for a contact
   */
  calculateContactMetrics(contact) {
    const now = Date.now();
    let lastContactDate = null;

    if (contact.interactions && contact.interactions.length > 0) {
      const sorted = [...contact.interactions].sort((a, b) => new Date(b.date) - new Date(a.date));
      lastContactDate = new Date(sorted[0].date);
    }

    const daysSinceLast = lastContactDate 
      ? Math.max(0, Math.floor((now - lastContactDate.getTime()) / (1000 * 3600 * 24)))
      : 999;

    const cadence = contact.targetCadenceDays || 14;

    // Reciprocity calculations: who initiated?
    let userInitiatedCount = 0;
    let themInitiatedCount = 0;
    if (contact.interactions) {
      contact.interactions.forEach(inter => {
        if (inter.initiator === 'them') {
          themInitiatedCount++;
        } else {
          userInitiatedCount++;
        }
      });
    }
    const totalInteractions = userInitiatedCount + themInitiatedCount;
    const themRatio = totalInteractions > 0 ? Math.round((themInitiatedCount / totalInteractions) * 100) : 50;
    const userRatio = 100 - themRatio;

    // Base XP computation with decay if overdue
    let effectiveXp = contact.currentXp || 400;

    // If contact is overdue, apply gentle dormancy decay (-1.5% per week overdue)
    if (daysSinceLast > cadence) {
      const overdueDays = daysSinceLast - cadence;
      const decayWeeks = overdueDays / 7;
      const decayXp = Math.floor(decayWeeks * 12);
      effectiveXp = Math.max(50, effectiveXp - decayXp);
    }

    // Determine level from XP or manual override
    let currentLevelDef = LEVEL_DEFINITIONS[0];
    if (contact.manualLevelOverride) {
      currentLevelDef = LEVEL_DEFINITIONS.find(l => l.level === contact.manualLevelOverride) || LEVEL_DEFINITIONS[4];
    } else {
      for (let i = LEVEL_DEFINITIONS.length - 1; i >= 0; i--) {
        if (effectiveXp >= LEVEL_DEFINITIONS[i].minXp) {
          currentLevelDef = LEVEL_DEFINITIONS[i];
          break;
        }
      }
    }

    // Determine connection health status
    let status = 'thriving';
    let statusLabel = 'Flourishing';

    if (contact.promisedCall && contact.promisedCall.isPromised) {
      status = 'owe_call';
      statusLabel = 'Promised Call Back';
    } else if (daysSinceLast > cadence * 1.5) {
      status = 'cooling';
      statusLabel = 'Cooling Down';
    } else if (daysSinceLast >= cadence) {
      status = 'due';
      statusLabel = 'Due for Check-in';
    }

    // Calculate level progress percentage towards next level
    let levelProgressPct = 100;
    if (currentLevelDef.level < 10) {
      const span = currentLevelDef.maxXp - currentLevelDef.minXp + 1;
      const progressInLevel = Math.max(0, effectiveXp - currentLevelDef.minXp);
      levelProgressPct = Math.min(100, Math.round((progressInLevel / span) * 100));
    }

    return {
      daysSinceLast,
      cadence,
      lastContactDate,
      effectiveXp,
      levelDef: currentLevelDef,
      levelProgressPct,
      status,
      statusLabel,
      totalInteractions,
      themInitiatedCount,
      userInitiatedCount,
      themRatio,
      userRatio
    };
  }

  /**
   * Applies XP gains when an interaction is logged
   */
  addXpForInteraction(contact, type, initiator) {
    let xpGain = 15;
    if (type === 'meetup') xpGain = 35;
    else if (type === 'call') xpGain = 25;
    else if (type === 'message') xpGain = 15;

    // Reciprocity boost when THEY reached out!
    if (initiator === 'them') {
      xpGain += 15; // Bonus for mutual effort
    }

    contact.currentXp = Math.min(1000, (contact.currentXp || 400) + xpGain);
    return xpGain;
  }

  // ========================================================================
  // AUDIO SYNTHESIZER (Pleasant Chimes with Web Audio API)
  // ========================================================================

  playChime(type = 'success') {
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'success') {
        // High harmonic ascending chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.start(now);
        osc.stop(now + 0.65);
      } else if (type === 'alert') {
        // Soft warm ping
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (e) {
      console.warn('Web Audio not allowed without user interaction:', e);
    }
  }

  // ========================================================================
  // TOAST NOTIFICATIONS
  // ========================================================================

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✨';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ========================================================================
  // ANDROID SYSTEM NOTIFICATIONS & OFFLINE ENGINE
  // ========================================================================

  initNotifications() {
    this.updateNotificationUI();

    // Check if permission banner was dismissed previously
    const dismissed = localStorage.getItem('orbit_notif_banner_dismissed') === 'true';
    const banner = document.getElementById('notificationPermissionBanner');
    if (banner && 'Notification' in window) {
      if (Notification.permission === 'default' && !dismissed) {
        banner.style.display = 'flex';
      } else {
        banner.style.display = 'none';
      }
    }

    // Start background check loop for callbacks (every 60s)
    if (!this.notificationCheckInterval) {
      this.notificationCheckInterval = setInterval(() => {
        this.checkAndSendDueNotifications();
      }, 60000);
    }

    // Also run check immediately and on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndSendDueNotifications();
        this.updateNotificationUI();
      }
    });

    setTimeout(() => this.checkAndSendDueNotifications(), 2500);
  }

  initOfflineHandling() {
    const updateOfflineUI = () => {
      const isOnline = navigator.onLine;
      const banner = document.getElementById('offlineIndicatorBanner');
      if (banner) {
        banner.style.display = isOnline ? 'none' : 'block';
      }
      if (!isOnline) {
        this.showToast('Working offline. All changes saved locally on device.', 'info');
      } else {
        if (this.googleSync && this.googleSync.accessToken) {
          this.googleSync.scheduleAutoSync();
        }
      }
    };

    window.addEventListener('online', updateOfflineUI);
    window.addEventListener('offline', updateOfflineUI);
    updateOfflineUI();
  }

  updateNotificationUI() {
    const badge = document.getElementById('notifStatusBadge');
    if (!badge) return;

    if (!('Notification' in window)) {
      badge.className = 'notif-badge badge-denied';
      badge.textContent = '❌ Unsupported on this browser';
      return;
    }

    if (window.AndroidBridge && typeof window.AndroidBridge.showNotification === 'function') {
      badge.className = 'notif-badge badge-granted';
      badge.textContent = '🟢 Native Android Active';
      const banner = document.getElementById('notificationPermissionBanner');
      if (banner) banner.style.display = 'none';
      return;
    }

    if (Notification.permission === 'granted') {
      badge.className = 'notif-badge badge-granted';
      badge.textContent = '🟢 Enabled & Active';
      const banner = document.getElementById('notificationPermissionBanner');
      if (banner) banner.style.display = 'none';
    } else if (Notification.permission === 'denied') {
      badge.className = 'notif-badge badge-denied';
      badge.textContent = '🔴 Blocked in Settings';
    } else {
      badge.className = 'notif-badge badge-pending';
      badge.textContent = '🟡 Permission Needed';
    }
  }

  async requestNotificationPermission() {
    if (window.AndroidBridge && typeof window.AndroidBridge.showNotification === 'function') {
      this.updateNotificationUI();
      this.showToast('🔔 Android notification access active!', 'success');
      return true;
    }

    if (!('Notification' in window)) {
      this.showToast('System notifications are not supported in this environment.', 'warning');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.updateNotificationUI();

      if (permission === 'granted') {
        this.showToast('🔔 Notification access granted! You will be reminded when callbacks are due.', 'success');
        this.playChimeSound();
        const banner = document.getElementById('notificationPermissionBanner');
        if (banner) banner.style.display = 'none';
        return true;
      } else if (permission === 'denied') {
        this.showToast('Notifications were denied. You can enable them in Android App Settings.', 'warning');
        return false;
      }
    } catch (e) {
      console.warn('Notification permission error:', e);
    }
    return false;
  }

  async sendTestNotification() {
    const hasNative = (window.AndroidBridge && typeof window.AndroidBridge.showNotification === 'function');
    if (!hasNative && !('Notification' in window)) {
      this.showToast('Notifications not supported in this browser.', 'warning');
      return;
    }

    if (!hasNative && Notification.permission !== 'granted') {
      const granted = await this.requestNotificationPermission();
      if (!granted) return;
    }

    this.dispatchNotification('🪐 Orbit: Notification Test', {
      body: 'Notifications are working perfectly! You will receive alerts when promised callbacks are due.',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-96.png',
      tag: 'orbit-test',
      data: { action: 'test' }
    });

    this.showToast('Test notification dispatched! Check your notification drawer.', 'success');
  }

  dispatchNotification(title, options = {}) {
    this.playChimeSound();

    if (window.AndroidBridge && typeof window.AndroidBridge.showNotification === 'function') {
      try {
        const bodyText = options.body || options.message || '';
        window.AndroidBridge.showNotification(title, bodyText);
        if (typeof window.AndroidBridge.vibrate === 'function') {
          window.AndroidBridge.vibrate(200);
        }
        return;
      } catch (e) {
        console.warn('AndroidBridge dispatch error:', e);
      }
    }

    if ('vibrate' in navigator) {
      try { navigator.vibrate([150, 80, 150]); } catch (e) {}
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, options);
      }).catch(err => {
        try { new Notification(title, options); } catch (e) {}
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, options); } catch (e) {}
    }
  }

  checkAndSendDueNotifications() {
    const hasNative = (window.AndroidBridge && typeof window.AndroidBridge.showNotification === 'function');
    if (!hasNative && (!('Notification' in window) || Notification.permission !== 'granted')) {
      return;
    }

    const now = Date.now();
    let sentCount = 0;
    const historyKey = 'orbit_notified_callbacks';
    let notifiedHistory = {};
    try {
      notifiedHistory = JSON.parse(localStorage.getItem(historyKey) || '{}');
    } catch (e) {}

    this.contacts.forEach(contact => {
      if (contact.promisedCall && contact.promisedCall.isPromised && contact.promisedCall.deadline) {
        const deadline = new Date(contact.promisedCall.deadline).getTime();
        // If deadline has passed or is due within 15 minutes
        if (now >= (deadline - 15 * 60 * 1000)) {
          const lastSent = notifiedHistory[contact.id] || 0;
          // Send notification once every 3 hours per overdue friend
          if (now - lastSent > 3 * 3600 * 1000) {
            notifiedHistory[contact.id] = now;
            sentCount++;
            this.dispatchNotification(`⏳ Call Back Due: ${contact.name}`, {
              body: `You promised to call back ${contact.name}! Reason: ${contact.promisedCall.reason || 'Check in'}`,
              icon: 'icons/icon-192.png',
              badge: 'icons/icon-96.png',
              tag: `callback-${contact.id}`,
              requireInteraction: true,
              data: { contactId: contact.id, action: 'callback' }
            });
          }
        }
      }
    });

    try {
      localStorage.setItem(historyKey, JSON.stringify(notifiedHistory));
    } catch (e) {}
  }

  playChimeSound() {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // Melodic dual tone chime: C5 (523Hz) -> G5 (784Hz)
      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.12);
      gain2.gain.setValueAtTime(0.18, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  // ========================================================================
  // RENDERING ENGINE
  // ========================================================================

  render() {
    this.renderStats();
    this.renderPromisedDeck();
    this.renderContactsGrid();
    this.renderCalendarSchedule();
    this.updateCalendarBadges();
    this.updateCallLogsBadges();
  }

  renderStats() {
    let total = this.contacts.length;
    let promisedCount = 0;
    let needsWaterCount = 0;
    let flourishingCount = 0;
    let totalThemInteractions = 0;
    let totalAllInteractions = 0;

    this.contacts.forEach(c => {
      const m = this.calculateContactMetrics(c);
      if (m.status === 'owe_call') promisedCount++;
      if (m.status === 'cooling' || m.status === 'due') needsWaterCount++;
      if (m.status === 'thriving') flourishingCount++;

      totalThemInteractions += m.themInitiatedCount;
      totalAllInteractions += m.totalInteractions;
    });

    const reciprocityAvg = totalAllInteractions > 0 
      ? Math.round((totalThemInteractions / totalAllInteractions) * 100) 
      : 50;

    document.getElementById('statTotalContacts').textContent = total;
    document.getElementById('statPromisedCalls').textContent = promisedCount;
    document.getElementById('statNeedsCheckin').textContent = needsWaterCount;
    document.getElementById('statFlourishing').textContent = flourishingCount;
    document.getElementById('statReciprocityScore').textContent = `${reciprocityAvg}% Them`;

    // Highlight stat alert if promised calls exist
    const statOwe = document.getElementById('statCardOweCall');
    if (promisedCount > 0) {
      statOwe.classList.add('stat-alert');
    } else {
      statOwe.classList.remove('stat-alert');
    }

    // Update Android mobile bottom navigation badge
    const navBadge = document.getElementById('navPromisedBadge');
    if (navBadge) {
      if (promisedCount > 0) {
        navBadge.textContent = promisedCount;
        navBadge.style.display = 'flex';
      } else {
        navBadge.style.display = 'none';
      }
    }
  }

  renderPromisedDeck() {
    const deck = document.getElementById('promisedCallsDeck');
    const list = document.getElementById('promisedCallsList');
    const badge = document.getElementById('promisedCountBadge');

    const promisedContacts = this.contacts.filter(c => c.promisedCall && c.promisedCall.isPromised);
    badge.textContent = promisedContacts.length;

    if (promisedContacts.length === 0) {
      deck.style.display = 'none';
      list.innerHTML = '';
      return;
    }

    deck.style.display = 'block';
    list.innerHTML = '';

    promisedContacts.forEach(contact => {
      const deadline = new Date(contact.promisedCall.deadline);
      const isOverdue = deadline.getTime() < Date.now();
      const hoursDiff = Math.round(Math.abs(Date.now() - deadline.getTime()) / (1000 * 3600));

      let dueText = '';
      let dueClass = '';

      if (isOverdue) {
        dueClass = 'due-overdue';
        dueText = `Overdue by ${hoursDiff > 24 ? Math.floor(hoursDiff / 24) + 'd' : hoursDiff + 'h'}`;
      } else if (hoursDiff <= 24) {
        dueClass = 'due-today';
        dueText = `Due in ${hoursDiff}h`;
      } else {
        dueClass = 'due-future';
        dueText = `Due in ${Math.round(hoursDiff / 24)}d`;
      }

      const card = document.createElement('div');
      card.className = 'promised-card';
      card.innerHTML = `
        <div class="promised-card-top">
          <div class="promised-friend-info">
            <div class="avatar-mini" style="background:${this.getAvatarGradient(contact.name)}">
              ${this.getInitials(contact.name)}
            </div>
            <div class="friend-name-sub">
              <h4>${this.escapeHtml(contact.name)}</h4>
              <span>${this.escapeHtml(contact.nickname || 'Friend')}</span>
            </div>
          </div>
          <span class="due-pill ${dueClass}">${dueText}</span>
        </div>

        <div class="promised-note">
          " ${this.escapeHtml(contact.promisedCall.reason || 'Promised to call back')} "
        </div>

        <div class="promised-actions">
          <button class="btn btn-sm btn-primary btn-call-promised" data-id="${contact.id}">
            📞 Call & Keep Promise
          </button>
          <button class="btn btn-sm btn-secondary btn-calendar-sync" data-id="${contact.id}" title="Set date in Google Calendar">
            📅 Google Calendar
          </button>
          <button class="btn btn-sm btn-ghost btn-icebreaker-quick" data-id="${contact.id}">
            ⚡ Icebreaker
          </button>
        </div>
      `;
      list.appendChild(card);
    });
  }

  renderContactsGrid() {
    const grid = document.getElementById('contactsGrid');
    const emptyState = document.getElementById('emptyState');

    let filtered = this.contacts.filter(contact => {
      // Circle tab filter
      if (this.currentCircleFilter !== 'all' && contact.circle !== this.currentCircleFilter) {
        return false;
      }

      // Status filter
      const m = this.calculateContactMetrics(contact);
      if (this.currentStatusFilter === 'owe_call' && m.status !== 'owe_call') return false;
      if (this.currentStatusFilter === 'cooling' && m.status !== 'cooling' && m.status !== 'due') return false;
      if (this.currentStatusFilter === 'thriving' && m.status !== 'thriving') return false;
      if (this.currentStatusFilter === 'they_reached_out') {
        const last = contact.interactions && contact.interactions[0];
        if (!last || last.initiator !== 'them') return false;
      }

      // Search query
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const inName = contact.name.toLowerCase().includes(q);
        const inNick = (contact.nickname || '').toLowerCase().includes(q);
        const inNotes = (contact.notes || '').toLowerCase().includes(q);
        const inTopics = (contact.nextTopicsToAsk || '').toLowerCase().includes(q);
        if (!inName && !inNick && !inNotes && !inTopics) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      const ma = this.calculateContactMetrics(a);
      const mb = this.calculateContactMetrics(b);

      if (this.currentSort === 'urgency') {
        // Owe call first, then highest ratio of (daysSinceLast / cadence)
        const aOwe = ma.status === 'owe_call' ? 1 : 0;
        const bOwe = mb.status === 'owe_call' ? 1 : 0;
        if (aOwe !== bOwe) return bOwe - aOwe;

        const aUrgencyRatio = ma.daysSinceLast / ma.cadence;
        const bUrgencyRatio = mb.daysSinceLast / mb.cadence;
        return bUrgencyRatio - aUrgencyRatio;
      }

      if (this.currentSort === 'level_desc') {
        return mb.effectiveXp - ma.effectiveXp;
      }

      if (this.currentSort === 'level_asc') {
        return ma.effectiveXp - mb.effectiveXp;
      }

      if (this.currentSort === 'recent') {
        const da = ma.lastContactDate ? ma.lastContactDate.getTime() : 0;
        const db = mb.lastContactDate ? mb.lastContactDate.getTime() : 0;
        return db - da;
      }

      if (this.currentSort === 'name') {
        return a.name.localeCompare(b.name);
      }

      return 0;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '';
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';
    grid.innerHTML = '';

    filtered.forEach(contact => {
      const m = this.calculateContactMetrics(contact);
      const circleMeta = CIRCLE_LABELS[contact.circle] || CIRCLE_LABELS.close;
      const initials = this.getInitials(contact.name);
      const avatarBg = this.getAvatarGradient(contact.name);

      let statusDotClass = 'status-thriving';
      if (m.status === 'owe_call') statusDotClass = 'status-owe';
      else if (m.status === 'cooling') statusDotClass = 'status-cooling';
      else if (m.status === 'due') statusDotClass = 'status-due';

      // Last contact text
      let lastContactText = 'Never contacted';
      if (m.lastContactDate) {
        if (m.daysSinceLast === 0) lastContactText = 'Contacted today';
        else if (m.daysSinceLast === 1) lastContactText = '1 day ago';
        else lastContactText = `${m.daysSinceLast} days ago`;
      }

      const card = document.createElement('div');
      card.className = 'contact-card';
      card.dataset.id = contact.id;
      card.innerHTML = `
        <!-- Top row -->
        <div class="contact-header">
          <div class="avatar-wrapper">
            <div class="avatar" style="background:${avatarBg}">${initials}</div>
            <div class="status-dot ${statusDotClass}" title="${m.statusLabel}"></div>
          </div>
          <div class="contact-info">
            <div class="contact-name-row">
              <h3 class="contact-name">${this.escapeHtml(contact.name)}</h3>
            </div>
            ${contact.nickname ? `<div class="contact-nickname">${this.escapeHtml(contact.nickname)}</div>` : ''}
            <div class="contact-tags">
              <span class="circle-badge ${circleMeta.badgeClass}">${circleMeta.icon} ${circleMeta.label}</span>
              ${m.status === 'owe_call' ? `<span class="circle-badge badge-inner" style="background:rgba(244,63,94,0.2);color:#ff6b8b;">⏳ Owe Call</span>` : ''}
            </div>
          </div>
          <button class="card-top-action btn-view-profile" data-id="${contact.id}" title="View profile & history">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>

        <!-- Connection Leveler Display -->
        <div class="connection-leveler-display">
          <div class="leveler-top">
            <div class="level-tag">
              <span class="level-number-pill ${m.levelDef.colorClass}">Lv ${m.levelDef.level}</span>
              <span>${m.levelDef.title}</span>
            </div>
            <span class="xp-counter">${m.effectiveXp} / 1000 XP</span>
          </div>

          <div class="progress-track">
            <div class="progress-bar-fill" style="width: ${m.levelProgressPct}%;"></div>
          </div>

          <div class="leveler-sub">
            <span>Rhythm: Every ${m.cadence}d</span>
            <div class="reciprocity-pill ${m.themRatio > 40 ? 'rec-they-initiated' : ''}" title="Reciprocity: ${m.themRatio}% initiated by them">
              🔄 ${m.userRatio}% You / ${m.themRatio}% Them
            </div>
          </div>
        </div>

        <!-- Meta / Topics Preview -->
        <div class="contact-body">
          <div class="contact-meta-row">
            <div class="meta-item">
              <span>🕒</span>
              <span>${lastContactText}</span>
            </div>
            <div class="meta-item">
              <span>${m.status === 'cooling' ? '🍂 Needs water' : m.status === 'due' ? '⚠️ Due' : '✨ Connected'}</span>
            </div>
          </div>

          ${contact.nextTopicsToAsk ? `
            <div class="topics-preview" title="${this.escapeHtml(contact.nextTopicsToAsk)}">
              <span>💡 Ask: ${this.escapeHtml(contact.nextTopicsToAsk)}</span>
            </div>
          ` : ''}
        </div>

        <!-- Action Buttons -->
        <div class="card-actions">
          <button class="btn-card-action btn-card-call btn-quick-log" data-id="${contact.id}">
            📞 Log Contact
          </button>
          <button class="btn-card-action btn-card-calendar btn-open-calendar" data-id="${contact.id}" title="Set date in Google Calendar">
            📅 Calendar
          </button>
          <button class="btn-card-action btn-view-profile" data-id="${contact.id}">
            👤 Profile
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // ========================================================================
  // INTERACTION LOGGING MODAL
  // ========================================================================

  openLogInteractionModal(contactId = null, callPrefill = null) {
    const modal = document.getElementById('interactionModal');
    const pickerWrap = document.getElementById('logContactPickerWrap');
    const select = document.getElementById('logContactSelect');
    const form = document.getElementById('interactionForm');
    form.reset();

    // Populate contacts dropdown
    select.innerHTML = '';
    this.contacts.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${CIRCLE_LABELS[c.circle]?.label || 'Friend'})`;
      if (contactId && c.id === contactId) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    // Default datetime to now
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('interactionDate').value = localIso;

    // Reset interaction type selection to call
    document.querySelectorAll('.type-pill').forEach(pill => {
      pill.classList.remove('selected');
      const radio = pill.querySelector('input');
      if (radio.value === 'call') {
        radio.checked = true;
        pill.classList.add('selected');
      }
    });

    // Reset reciprocity selector to 'me'
    document.querySelectorAll('.radio-card').forEach(rc => {
      rc.classList.remove('selected');
      const radio = rc.querySelector('input');
      if (radio.value === 'me') {
        radio.checked = true;
        rc.classList.add('selected');
      }
    });

    document.getElementById('promiseDeadlineContainer').style.display = 'none';
    document.getElementById('reciprocityFieldGroup').style.display = 'block';

    // Apply callPrefill if passed
    if (callPrefill) {
      if (callPrefill.date) {
        const cd = new Date(callPrefill.date);
        document.getElementById('interactionDate').value = new Date(cd.getTime() - cd.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
      if (callPrefill.summary) {
        document.getElementById('interactionSummary').value = callPrefill.summary;
      }
      if (callPrefill.direction) {
        document.querySelectorAll('.radio-card').forEach(rc => {
          rc.classList.remove('selected');
          const radio = rc.querySelector('input');
          if (radio.value === callPrefill.direction) {
            radio.checked = true;
            rc.classList.add('selected');
          }
        });
      }
    }

    // Check for recent unlogged call suggestions with this friend
    const suggestionBox = document.getElementById('recentCallSuggestionBox');
    const targetContactId = contactId || (select.value ? select.value : null);
    const targetContact = this.contacts.find(c => c.id === targetContactId);

    if (suggestionBox && targetContact && targetContact.phone && !callPrefill) {
      const logRes = this.getDeviceCallLogs(20);
      const calls = (logRes && logRes.calls) ? logRes.calls : [];
      const recentCall = calls.find(call => {
        return this.normalizePhoneNumber(call.number) === this.normalizePhoneNumber(targetContact.phone);
      });

      if (recentCall && (Date.now() - recentCall.date) < 7 * 24 * 3600 * 1000) {
        const isMissed = recentCall.type === 'missed';
        const d = new Date(recentCall.date);
        suggestionBox.style.display = 'flex';
        document.getElementById('recentCallSuggestionContent').innerHTML = `
          <strong>${recentCall.direction === 'them' ? '📥 Incoming' : '📤 Outgoing'} ${isMissed ? 'Missed Call' : 'Call'}</strong> 
          • ${d.toLocaleDateString([], {month:'short', day:'numeric'})} at ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 
          (${this.formatDuration(recentCall.duration)})
        `;
        document.getElementById('btnApplyCallSuggestion').onclick = () => {
          document.getElementById('interactionDate').value = new Date(recentCall.date - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          document.getElementById('interactionSummary').value = `${recentCall.direction === 'them' ? 'Incoming' : 'Outgoing'} call (${this.formatDuration(recentCall.duration)})`;
          
          document.querySelectorAll('.radio-card').forEach(rc => {
            rc.classList.remove('selected');
            const radio = rc.querySelector('input');
            if (radio.value === recentCall.direction) {
              radio.checked = true;
              rc.classList.add('selected');
            }
          });
          suggestionBox.style.display = 'none';
          this.showToast('⚡ Auto-filled details from call log!', 'info');
        };
      } else {
        suggestionBox.style.display = 'none';
      }
    } else if (suggestionBox) {
      suggestionBox.style.display = 'none';
    }

    modal.style.display = 'flex';
  }

  saveInteraction(e) {
    e.preventDefault();
    const contactId = document.getElementById('logContactSelect').value;
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;

    const typeRadio = document.querySelector('input[name="interactionType"]:checked');
    const type = typeRadio ? typeRadio.value : 'call';

    const initiatorRadio = document.querySelector('input[name="initiator"]:checked');
    const initiator = initiatorRadio ? initiatorRadio.value : 'me';

    const dateVal = document.getElementById('interactionDate').value;
    const moodVal = document.getElementById('interactionMood').value;
    const summaryVal = document.getElementById('interactionSummary').value.trim();
    const nextTopicsVal = document.getElementById('interactionNextTopics').value.trim();

    // If it's a "Promised to Call", handle promised callback state
    if (type === 'promised_call') {
      const deadlineVal = document.getElementById('promisedDeadline').value || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      contact.promisedCall = {
        isPromised: true,
        deadline: new Date(deadlineVal).toISOString(),
        reason: summaryVal || 'Promised to call back soon'
      };
      this.showToast(`Callback reminder set for ${contact.name}!`, 'warning');
      this.playChime('alert');
    } else {
      // If we are logging a real interaction, clear any pending promised call!
      if (contact.promisedCall && contact.promisedCall.isPromised) {
        contact.promisedCall = null;
        this.showToast(`Promise fulfilled! Cleared pending callback for ${contact.name}!`, 'success');
      }

      // Add XP & reciprocity boost
      const xpGained = this.addXpForInteraction(contact, type, initiator);
      this.showToast(`+${xpGained} Connection XP with ${contact.name}!`, 'success');
      this.playChime('success');
    }

    // Save interaction record in timeline
    if (!contact.interactions) contact.interactions = [];
    contact.interactions.unshift({
      id: 'i_' + Date.now(),
      type,
      initiator,
      date: new Date(dateVal).toISOString(),
      mood: moodVal,
      summary: summaryVal,
      nextTopics: nextTopicsVal
    });

    if (nextTopicsVal) {
      contact.nextTopicsToAsk = nextTopicsVal;
    }

    this.saveContacts();
    this.closeModal('interactionModal');
    this.render();

    // If profile modal is open for this contact, refresh it
    if (this.activeProfileContactId === contactId) {
      this.openProfileModal(contactId);
    }
  }

  // ========================================================================
  // AWKWARDNESS-BUSTER ICEBREAKER GENERATOR
  // ========================================================================

  openIcebreakerModal(contactId) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;

    document.getElementById('icebreakerFriendName').textContent = contact.name;
    const container = document.getElementById('scriptCardsContainer');

    // Setup action direct links
    const phone = contact.phone ? contact.phone.replace(/[^0-9+]/g, '') : '';
    const btnCall = document.getElementById('btnActionCall');
    const btnWa = document.getElementById('btnActionWhatsApp');
    const btnSms = document.getElementById('btnActionSms');

    if (phone) {
      btnCall.href = `tel:${phone}`;
      btnCall.style.display = 'inline-flex';
      btnWa.href = `https://wa.me/${phone.replace('+', '')}`;
      btnWa.style.display = 'inline-flex';
      btnSms.href = `sms:${phone}`;
      btnSms.style.display = 'inline-flex';
    } else {
      btnCall.style.display = 'none';
      btnWa.style.display = 'none';
      btnSms.style.display = 'none';
    }

    this.renderIcebreakerScripts(contact, 'forgot_call');

    // Bind tab clicks
    document.querySelectorAll('.ice-tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.scenario === 'forgot_call') tab.classList.add('active');
      tab.onclick = () => {
        document.querySelectorAll('.ice-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderIcebreakerScripts(contact, tab.dataset.scenario);
      };
    });

    document.getElementById('icebreakerModal').style.display = 'flex';
  }

  renderIcebreakerScripts(contact, scenario) {
    const container = document.getElementById('scriptCardsContainer');
    container.innerHTML = '';

    const firstName = contact.name.split(' ')[0];
    const topic = contact.nextTopicsToAsk || 'how things have been with you';

    let scripts = [];

    if (scenario === 'forgot_call') {
      scripts = [
        {
          tone: '😄 Sincere, Humorous & Disarming',
          text: `Hey ${firstName}! I am officially the worst for not calling you back right away 🤦‍♂️ Life completely swept me up, but I really didn't want any more time to pass without checking in. How are you doing?`
        },
        {
          tone: '💛 Warm & Honest Apology',
          text: `Hey ${firstName}, I remembered I said I'd call you back and I felt so guilty that time slipped away! No excuses, just wanted to say I miss you and would love to catch up properly whenever you're free.`
        },
        {
          tone: '⚡ Low-Pressure Voice Note / Text',
          text: `Hey ${firstName}! So sorry for the delayed ping—zero pressure to reply right away! Just wanted to hear your voice soon. Are you free for a quick 10-minute phone call sometime this week?`
        }
      ];
    } else if (scenario === 'been_months') {
      scripts = [
        {
          tone: '🌿 Pure Warmth & Zero Guilt',
          text: `Hey ${firstName}! I know it's been a minute since we caught up, but you randomly crossed my mind today and made me smile. How has life been treating you lately?`
        },
        {
          tone: '✨ Reconnecting the Spark',
          text: `Hey ${firstName}! Time moves absurdly fast, but our friendship means a lot to me and I hate losing touch. How have you been? Also, I remember you mentioned ${topic}—how did that turn out?`
        },
        {
          tone: '☕ Casual Coffee / Catch-up',
          text: `Hey ${firstName}! Way too long. Let's fix that! Would you be up for a quick phone call or coffee catch-up sometime soon? Miss catching up with you.`
        }
      ];
    } else if (scenario === 'random_thought') {
      scripts = [
        {
          tone: '💭 Organic & Low Stakes',
          text: `Hey ${firstName}! Something earlier today reminded me of you and made me realize we haven't spoken in a while. Hope you're thriving!`
        },
        {
          tone: '🐕 Topic-Specific Check-in',
          text: `Hey ${firstName}! Was just thinking about you—how is ${topic} going? Hope life is being good to you!`
        }
      ];
    } else if (scenario === 'catchup_call') {
      scripts = [
        {
          tone: '📞 Direct Call Invitation',
          text: `Hey ${firstName}! I'd love to hear your voice and catch up properly on everything. Do you have 15 minutes sometime this Thursday or over the weekend?`
        },
        {
          tone: '☕ Lunch / Coffee Plan',
          text: `Hey ${firstName}! It's been too long since we hung out in person. Are you around sometime this week to grab a coffee or a quick bite?`
        }
      ];
    }

    scripts.forEach(s => {
      const card = document.createElement('div');
      card.className = 'script-card';
      card.innerHTML = `
        <div class="script-header">
          <span class="script-tone">${s.tone}</span>
          <button class="btn btn-sm btn-ghost btn-copy-script" title="Copy text to clipboard">📋 Copy</button>
        </div>
        <div class="script-text">${this.escapeHtml(s.text)}</div>
      `;

      card.querySelector('.btn-copy-script').onclick = () => {
        navigator.clipboard.writeText(s.text).then(() => {
          this.showToast('Copied script to clipboard!', 'success');
        });
      };

      container.appendChild(card);
    });
  }

  // ========================================================================
  // CONTACT PROFILE & FULL HISTORY MODAL
  // ========================================================================

  openProfileModal(contactId) {
    this.activeProfileContactId = contactId;
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;

    const m = this.calculateContactMetrics(contact);
    const circleMeta = CIRCLE_LABELS[contact.circle] || CIRCLE_LABELS.close;

    document.getElementById('profAvatar').textContent = this.getInitials(contact.name);
    document.getElementById('profAvatar').style.background = this.getAvatarGradient(contact.name);
    document.getElementById('profName').textContent = contact.name;
    document.getElementById('profCircleBadge').textContent = `${circleMeta.icon} ${circleMeta.label}`;
    document.getElementById('profStatusBadge').textContent = m.statusLabel;

    // Connection Leveler
    document.getElementById('profLevelBadge').textContent = `Level ${m.levelDef.level}`;
    document.getElementById('profProgressFill').style.width = `${m.levelProgressPct}%`;
    document.getElementById('profXpText').textContent = `${m.effectiveXp} / 1000 XP`;
    document.getElementById('profLevelTitle').textContent = m.levelDef.title;

    // Manual slider
    const slider = document.getElementById('profManualSlider');
    const sliderVal = document.getElementById('profManualSliderVal');
    slider.value = m.levelDef.level;
    sliderVal.textContent = `Lv ${m.levelDef.level}`;
    slider.oninput = (e) => {
      sliderVal.textContent = `Lv ${e.target.value}`;
    };

    // Apply manual level button
    document.getElementById('applyManualLevelBtn').onclick = () => {
      const chosenLevel = parseInt(slider.value, 10);
      contact.manualLevelOverride = chosenLevel;
      const targetDef = LEVEL_DEFINITIONS.find(l => l.level === chosenLevel);
      if (targetDef) {
        contact.currentXp = targetDef.minXp + 25;
      }
      this.saveContacts();
      this.showToast(`Updated ${contact.name}'s Connection Level to Lv ${chosenLevel}!`, 'success');
      this.playChime('success');
      this.openProfileModal(contact.id);
      this.render();
    };

    // Reciprocity bar
    document.getElementById('profRecUserFill').style.width = `${m.userRatio}%`;
    document.getElementById('profRecUserFill').textContent = `${m.userRatio}% You`;
    document.getElementById('profRecThemFill').style.width = `${m.themRatio}%`;
    document.getElementById('profRecThemFill').textContent = `${m.themRatio}% Them`;

    let caption = 'Balanced two-way connection!';
    if (m.themRatio > 60) caption = 'Great mutual effort! They often reach out to you.';
    else if (m.userRatio > 70) caption = 'You have initiated most contacts lately.';
    document.getElementById('profRecCaption').textContent = caption;

    // Contact details
    document.getElementById('profPhoneText').textContent = contact.phone || 'No phone set';
    document.getElementById('profEmailText').textContent = contact.email || 'No email set';
    document.getElementById('profCadenceText').textContent = `Every ${contact.targetCadenceDays || 14} days`;
    document.getElementById('profBirthdayText').textContent = contact.birthday || 'None set';
    document.getElementById('profNextTopicsBox').textContent = contact.nextTopicsToAsk || 'No topics noted yet.';

    // Profile top actions
    document.getElementById('profLogInterBtn').onclick = () => {
      this.closeModal('profileModal');
      this.openLogInteractionModal(contact.id);
    };
    document.getElementById('profIcebreakerBtn').onclick = () => {
      this.closeModal('profileModal');
      this.openIcebreakerModal(contact.id);
    };
    document.getElementById('profEditBtn').onclick = () => {
      this.closeModal('profileModal');
      this.openAddEditContactModal(contact.id);
    };
    const profDeleteBtn = document.getElementById('profDeleteBtn');
    if (profDeleteBtn) {
      profDeleteBtn.onclick = () => {
        this.deleteFriend(contact.id);
      };
    }

    // Timeline history
    const timelineList = document.getElementById('profTimelineList');
    timelineList.innerHTML = '';

    if (!contact.interactions || contact.interactions.length === 0) {
      timelineList.innerHTML = '<p class="text-sm" style="color:var(--text-muted);padding:1rem 0;">No interactions logged yet. Log your first call or hangout!</p>';
    } else {
      contact.interactions.forEach(item => {
        let icon = '📞';
        let typeName = 'Phone / Video Call';
        if (item.type === 'meetup') { icon = '☕'; typeName = 'Met in Person'; }
        if (item.type === 'message') { icon = '💬'; typeName = 'Text / Message'; }
        if (item.type === 'promised_call') { icon = '⏳'; typeName = 'Promised Callback'; }

        const dateStr = new Date(item.date).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const timelineCard = document.createElement('div');
        timelineCard.className = 'timeline-card';
        timelineCard.innerHTML = `
          <div class="timeline-dot">${icon}</div>
          <div class="timeline-body">
            <div class="timeline-meta">
              <span class="timeline-title">${typeName}</span>
              <span class="timeline-time">${dateStr}</span>
            </div>
            ${item.summary ? `<div class="timeline-note">${this.escapeHtml(item.summary)}</div>` : ''}
            <div>
              ${item.initiator === 'them' ? `<span class="timeline-badge-reciprocity">📥 They contacted you (+15 Bonus XP)</span>` : ''}
            </div>
          </div>
        `;
        timelineList.appendChild(timelineCard);
      });
    }

    document.getElementById('profileModal').style.display = 'flex';
  }

  // ========================================================================
  // ADD / EDIT CONTACT MODAL
  // ========================================================================

  openAddEditContactModal(contactId = null, prefill = null) {
    const modal = document.getElementById('contactModal');
    const form = document.getElementById('contactForm');
    const title = document.getElementById('contactModalTitle');
    const importActions = document.getElementById('contactImportActionsWrap');
    form.reset();

    const slider = document.getElementById('formInitialLevel');
    const sliderVal = document.getElementById('formLevelVal');
    const levelBadge = document.getElementById('formLevelBadge');

    const updateSliderUI = (lvl) => {
      sliderVal.textContent = `Lv ${lvl}`;
      const def = LEVEL_DEFINITIONS.find(l => l.level === parseInt(lvl, 10)) || LEVEL_DEFINITIONS[4];
      levelBadge.textContent = `Level ${def.level}: ${def.title}`;
    };

    slider.oninput = (e) => updateSliderUI(e.target.value);

    const btnDelete = document.getElementById('btnDeleteFriendFromModal');

    if (contactId) {
      const contact = this.contacts.find(c => c.id === contactId);
      if (!contact) return;
      title.textContent = 'Edit Friend';
      if (importActions) importActions.style.display = 'none';
      if (btnDelete) {
        btnDelete.style.display = 'inline-flex';
        btnDelete.onclick = () => this.deleteFriend(contact.id);
      }
      document.getElementById('editContactId').value = contact.id;
      document.getElementById('formName').value = contact.name;
      document.getElementById('formNickname').value = contact.nickname || '';
      document.getElementById('formPhone').value = contact.phone || '';
      document.getElementById('formEmail').value = contact.email || '';
      document.getElementById('formCircle').value = contact.circle || 'close';
      document.getElementById('formCadence').value = contact.targetCadenceDays || 14;
      document.getElementById('formBirthday').value = contact.birthday || '';
      document.getElementById('formNextTopics').value = contact.nextTopicsToAsk || '';
      document.getElementById('formNotes').value = contact.notes || '';

      const m = this.calculateContactMetrics(contact);
      slider.value = m.levelDef.level;
      updateSliderUI(m.levelDef.level);
    } else {
      title.textContent = 'Add New Friend';
      if (importActions) importActions.style.display = 'flex';
      if (btnDelete) {
        btnDelete.style.display = 'none';
        btnDelete.onclick = null;
      }
      document.getElementById('editContactId').value = '';
      if (prefill) {
        if (prefill.name) document.getElementById('formName').value = prefill.name;
        if (prefill.phone) document.getElementById('formPhone').value = prefill.phone;
        if (prefill.notes) document.getElementById('formNotes').value = prefill.notes;
        if (prefill.circle) document.getElementById('formCircle').value = prefill.circle;
      }
      slider.value = 5;
      updateSliderUI(5);
    }

    modal.style.display = 'flex';
  }

  saveContactForm(e) {
    e.preventDefault();
    const editId = document.getElementById('editContactId').value;
    const name = document.getElementById('formName').value.trim();
    if (!name) return;

    const nickname = document.getElementById('formNickname').value.trim();
    const phone = document.getElementById('formPhone').value.trim();
    const email = document.getElementById('formEmail').value.trim();
    const circle = document.getElementById('formCircle').value;
    const cadence = parseInt(document.getElementById('formCadence').value, 10);
    const initialLevel = parseInt(document.getElementById('formInitialLevel').value, 10);
    const birthday = document.getElementById('formBirthday').value;
    const nextTopics = document.getElementById('formNextTopics').value.trim();
    const notes = document.getElementById('formNotes').value.trim();

    if (editId) {
      const contact = this.contacts.find(c => c.id === editId);
      if (contact) {
        contact.name = name;
        contact.nickname = nickname;
        contact.phone = phone;
        contact.email = email;
        contact.circle = circle;
        contact.targetCadenceDays = cadence;
        contact.birthday = birthday;
        contact.nextTopicsToAsk = nextTopics;
        contact.notes = notes;
        contact.manualLevelOverride = initialLevel;
        const targetDef = LEVEL_DEFINITIONS.find(l => l.level === initialLevel);
        if (targetDef) contact.currentXp = targetDef.minXp + 20;

        this.showToast(`Updated details for ${name}!`, 'success');
      }
    } else {
      const def = LEVEL_DEFINITIONS.find(l => l.level === initialLevel) || LEVEL_DEFINITIONS[4];
      const newContact = {
        id: 'c_' + Date.now(),
        name,
        nickname,
        phone,
        email,
        circle,
        targetCadenceDays: cadence,
        currentXp: def.minXp + 20,
        manualLevelOverride: null,
        birthday,
        notes,
        nextTopicsToAsk: nextTopics,
        promisedCall: null,
        interactions: []
      };
      this.contacts.unshift(newContact);
      this.showToast(`Added ${name} to your social circle!`, 'success');
      this.playChime('success');
    }

    this.saveContacts();
    this.closeModal('contactModal');
    this.render();
  }

  deleteFriend(contactId) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;
    if (!confirm(`Are you sure you want to remove "${contact.name}" from your Orbit circle?`)) {
      return;
    }
    const name = contact.name;
    this.contacts = this.contacts.filter(c => c.id !== contactId);
    this.saveContacts();
    this.closeModal('contactModal');
    this.closeModal('profileModal');
    this.render();
    if (this.googleSync && typeof this.googleSync.scheduleAutoSync === 'function') {
      this.googleSync.scheduleAutoSync();
    }
    this.showToast(`Removed "${name}" from your circle.`, 'info');
  }

  // ========================================================================
  // SETTINGS & DATA EXPORT / IMPORT
  // ========================================================================

  exportData() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.contacts, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `orbit_social_circle_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    this.showToast('Data exported successfully!', 'success');
  }

  importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          this.contacts = imported;
          this.saveContacts();
          this.render();
          this.closeModal('dataSettingsModal');
          this.showToast(`Imported ${imported.length} contacts!`, 'success');
          this.playChime('success');
        } else {
          throw new Error('Invalid format: root must be an array of contacts.');
        }
      } catch (err) {
        console.error('Import failed:', err);
        this.showToast('Import failed. Invalid JSON structure.', 'error');
      }
    };
    reader.readAsText(file);
  }

  resetSampleData() {
    if (confirm('Reload the sample friends data? Any newly added friends will be replaced.')) {
      this.contacts = JSON.parse(JSON.stringify(SAMPLE_CONTACTS));
      this.saveContacts();
      this.render();
      this.closeModal('dataSettingsModal');
      this.showToast('Sample data reloaded!', 'info');
    }
  }

  clearAllData() {
    if (confirm('Are you sure you want to wipe all contacts and history? This cannot be undone.')) {
      this.contacts = [];
      this.saveContacts();
      this.render();
      this.closeModal('dataSettingsModal');
      this.showToast('All data has been cleared.', 'warning');
    }
  }

  // ========================================================================
  // GOOGLE CALENDAR SCHEDULER & PROGRAM ENGINE
  // ========================================================================

  getAllPrograms() {
    const programs = [];
    this.contacts.forEach(contact => {
      // 1. Explicit contact.programs array
      if (Array.isArray(contact.programs)) {
        contact.programs.forEach(prog => {
          programs.push({
            ...prog,
            contactId: contact.id,
            contactName: contact.name,
            contactPhone: contact.phone,
            contactCircle: contact.circle
          });
        });
      }

      // 2. Incorporate contact.promisedCall if not already in programs
      if (contact.promisedCall && contact.promisedCall.isPromised && contact.promisedCall.deadline) {
        const alreadyIncluded = programs.some(p => p.contactId === contact.id && p.dateTime === contact.promisedCall.deadline);
        if (!alreadyIncluded) {
          programs.push({
            id: 'promised_' + contact.id,
            contactId: contact.id,
            contactName: contact.name,
            contactPhone: contact.phone,
            contactCircle: contact.circle,
            title: contact.promisedCall.reason || `Promised callback to ${contact.name}`,
            dateTime: contact.promisedCall.deadline,
            durationMinutes: 30,
            location: contact.phone ? `Phone (${contact.phone})` : 'Phone Call / Meetup',
            notes: contact.nextTopicsToAsk || 'Scheduled callback',
            completed: false,
            isPromisedCall: true
          });
        }
      }
    });

    // Sort by dateTime ascending (earliest / overdue first)
    programs.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    return programs;
  }

  updateCalendarBadges() {
    const activePrograms = this.getAllPrograms().filter(p => !p.completed);
    const count = activePrograms.length;

    const headerBadge = document.getElementById('headerCalendarBadge');
    if (headerBadge) {
      headerBadge.textContent = count;
      headerBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    const circleBadge = document.getElementById('circleCalendarBadge');
    if (circleBadge) {
      circleBadge.textContent = count;
      circleBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  switchView(viewName) {
    const calSection = document.getElementById('calendarScheduleSection');
    const contactsSection = document.getElementById('contactsMainSection');
    const toolbarFilters = document.querySelector('.toolbar-filters');
    const circleTabs = document.querySelectorAll('.circle-tab');
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');

    if (viewName === 'calendar') {
      if (calSection) calSection.style.display = 'flex';
      if (contactsSection) contactsSection.style.display = 'none';
      if (toolbarFilters) toolbarFilters.style.display = 'none';

      circleTabs.forEach(t => {
        if (t.dataset.circle === 'calendar') t.classList.add('active');
        else t.classList.remove('active');
      });

      mobileNavItems.forEach(item => {
        if (item.dataset.nav === 'calendar') item.classList.add('active');
        else item.classList.remove('active');
      });

      this.renderCalendarSchedule();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (calSection) calSection.style.display = 'none';
      if (contactsSection) contactsSection.style.display = 'block';
      if (toolbarFilters) toolbarFilters.style.display = 'flex';

      circleTabs.forEach(t => {
        if (t.dataset.circle === 'calendar') t.classList.remove('active');
        else if (t.dataset.circle === (this.currentCircleFilter || 'all')) t.classList.add('active');
      });

      mobileNavItems.forEach(item => {
        if (item.dataset.nav === 'circle') item.classList.add('active');
        else if (item.dataset.nav === 'calendar') item.classList.remove('active');
      });

      this.renderContactsGrid();
    }
  }

  renderCalendarSchedule() {
    const list = document.getElementById('calendarScheduleList');
    if (!list) return;

    const programs = this.getAllPrograms();
    this.updateCalendarBadges();

    if (programs.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem;">
          <div class="empty-illustration">📅</div>
          <h3>No Upcoming Programs Scheduled</h3>
          <p>Set a date to call a friend, grab coffee, or catch up. It will sync directly to Google Calendar and your phone!</p>
          <button class="btn btn-primary" id="btnEmptyScheduleProgram" style="margin-top: 1rem;">
            <span>➕ Schedule a Program</span>
          </button>
        </div>
      `;
      const btnEmpty = document.getElementById('btnEmptyScheduleProgram');
      if (btnEmpty) btnEmpty.onclick = () => this.openCalendarModal();
      return;
    }

    const now = Date.now();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    list.innerHTML = programs.map(p => {
      const d = new Date(p.dateTime);
      const isValid = !isNaN(d.getTime());
      const month = isValid ? months[d.getMonth()] : 'DATE';
      const day = isValid ? d.getDate() : '--';
      const timeStr = isValid ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const dateStr = isValid ? d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';
      const isOverdue = isValid && d.getTime() < now && !p.completed;

      // Build universal Google Calendar URL
      const pad = n => String(n).padStart(2, '0');
      const startStr = isValid ? `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z` : '';
      const durMs = (p.durationMinutes || 30) * 60 * 1000;
      const endD = isValid ? new Date(d.getTime() + durMs) : new Date();
      const endStr = isValid ? `${endD.getUTCFullYear()}${pad(endD.getUTCMonth() + 1)}${pad(endD.getUTCDate())}${pad(endD.getUTCHours())}${pad(endD.getUTCMinutes())}${pad(endD.getUTCSeconds())}Z` : '';
      const fullDesc = `${p.notes ? p.notes + '\n\n' : ''}Scheduled via Orbit - Social Circle Tracker\nContact: ${p.contactName || ''}${p.contactPhone ? ' (' + p.contactPhone + ')' : ''}`;
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(p.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(fullDesc)}&location=${encodeURIComponent(p.location || '')}`;

      return `
        <div class="program-card ${p.completed ? 'program-completed' : ''} ${isOverdue ? 'program-overdue' : ''}" data-program-id="${p.id}" data-contact-id="${p.contactId}">
          <div class="program-card-left">
            <div class="program-date-badge ${isOverdue ? 'badge-overdue' : ''}">
              <span class="p-month">${month}</span>
              <span class="p-day">${day}</span>
              <span class="p-time">${timeStr}</span>
            </div>
            <div class="program-details">
              <h4>
                ${this.escapeHtml(p.title)}
                <span class="program-friend-tag">👤 ${this.escapeHtml(p.contactName || 'Friend')}</span>
                ${isOverdue ? '<span class="status-badge status-overdue" style="font-size:0.68rem; padding: 1px 6px;">⚠️ Past Due</span>' : ''}
                ${p.completed ? '<span class="status-badge status-thriving" style="font-size:0.68rem; padding: 1px 6px;">✓ Completed</span>' : ''}
              </h4>
              <div class="program-meta">
                <span>📅 ${dateStr} at ${timeStr}</span>
                ${p.location ? `<span>📍 ${this.escapeHtml(p.location)}</span>` : ''}
                <span>⏱️ ${p.durationMinutes || 30} mins</span>
              </div>
              ${p.notes ? `<p class="program-note">💬 ${this.escapeHtml(p.notes)}</p>` : ''}
            </div>
          </div>
          <div class="program-card-actions">
            <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary btn-program-gcal" data-prog-id="${p.id}" title="Open or add in Google Calendar">
              📅 Google Calendar ↗
            </a>
            <button class="btn btn-sm btn-secondary btn-program-ics" data-prog-id="${p.id}" data-contact-id="${p.contactId}" title="Download .ics offline file">
              📥 .ICS
            </button>
            ${!p.completed ? `
              <button class="btn btn-sm btn-primary btn-program-done" data-prog-id="${p.id}" data-contact-id="${p.contactId}" title="Mark completed and log interaction">
                ✅ Log & Done
              </button>
            ` : ''}
            <button class="btn btn-sm btn-ghost btn-program-delete" data-prog-id="${p.id}" data-contact-id="${p.contactId}" title="Remove program">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind item actions
    list.querySelectorAll('.btn-program-ics').forEach(btn => {
      btn.onclick = () => {
        const prog = programs.find(p => p.id === btn.dataset.progId);
        if (prog) {
          this.downloadIcsCalendarEvent({
            contactId: prog.contactId,
            title: prog.title,
            dateTime: prog.dateTime,
            durationMinutes: prog.durationMinutes,
            location: prog.location,
            notes: prog.notes
          });
        }
      };
    });

    list.querySelectorAll('.btn-program-done').forEach(btn => {
      btn.onclick = () => {
        this.completeProgram(btn.dataset.contactId, btn.dataset.progId);
      };
    });

    list.querySelectorAll('.btn-program-delete').forEach(btn => {
      btn.onclick = () => {
        this.deleteProgram(btn.dataset.contactId, btn.dataset.progId);
      };
    });

    // On Android Native WebView, route .btn-program-gcal clicks to native Calendar Intent
    if (window.AndroidBridge && typeof window.AndroidBridge.openGoogleCalendar === 'function') {
      list.querySelectorAll('.btn-program-gcal').forEach(a => {
        a.onclick = (e) => {
          e.preventDefault();
          const prog = programs.find(p => p.id === a.dataset.progId);
          if (prog) {
            const d = new Date(prog.dateTime);
            const durMs = (prog.durationMinutes || 30) * 60 * 1000;
            const endD = new Date(d.getTime() + durMs);
            const fullDesc = `${prog.notes ? prog.notes + '\n\n' : ''}Scheduled via Orbit - Social Circle Tracker\nContact: ${prog.contactName || ''}`;
            window.AndroidBridge.openGoogleCalendar(prog.title, fullDesc, prog.location || '', d.getTime(), endD.getTime(), a.href);
          }
        };
      });
    }
  }

  completeProgram(contactId, programId) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;

    if (Array.isArray(contact.programs)) {
      const prog = contact.programs.find(p => p.id === programId);
      if (prog) {
        prog.completed = true;
      }
    }

    if (contact.promisedCall && (programId === 'promised_' + contact.id || !contact.programs || contact.programs.length === 0)) {
      contact.promisedCall = null;
    }

    // Add interaction and XP
    const interaction = {
      id: 'i_' + Date.now(),
      type: 'meetup',
      initiator: 'me',
      date: new Date().toISOString(),
      mood: 'great',
      summary: `Completed scheduled program with ${contact.name}!`,
      nextTopics: contact.nextTopicsToAsk || ''
    };
    if (!contact.interactions) contact.interactions = [];
    contact.interactions.unshift(interaction);
    contact.currentXp = Math.min(1000, (contact.currentXp || 0) + 35);

    this.saveContacts();
    this.render();
    this.showToast(`🎉 Program completed with ${contact.name}! (+35 XP)`, 'success');
    this.playLevelUpSound();
  }

  deleteProgram(contactId, programId) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;

    if (Array.isArray(contact.programs)) {
      contact.programs = contact.programs.filter(p => p.id !== programId);
    }

    if (programId === 'promised_' + contact.id && contact.promisedCall) {
      contact.promisedCall = null;
    }

    this.saveContacts();
    this.render();
    this.showToast('Program removed from schedule.', 'info');
  }

  openCalendarModal(contactId = null, defaultTitle = '', defaultDate = null, defaultNotes = '') {
    const modal = document.getElementById('calendarModal');
    const friendSelect = document.getElementById('calFriendSelect');
    const titleInput = document.getElementById('calEventTitle');
    const dateInput = document.getElementById('calDateTime');
    const locationInput = document.getElementById('calLocation');
    const notesInput = document.getElementById('calNotes');

    if (!modal) return;

    friendSelect.innerHTML = '';
    if (this.contacts.length === 0) {
      this.showToast('Please add a friend first before scheduling a program!', 'warning');
      this.openAddEditContactModal();
      return;
    }

    this.contacts.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const tier = CIRCLE_LABELS[c.circle]?.label || 'Friend';
      opt.textContent = `${c.name} (${c.nickname || tier})`;
      friendSelect.appendChild(opt);
    });

    if (contactId) {
      friendSelect.value = contactId;
    }

    const selectedContact = this.contacts.find(c => c.id === (contactId || friendSelect.value));
    const friendName = selectedContact ? selectedContact.name : 'Friend';

    titleInput.value = defaultTitle || `Catch up with ${friendName}`;

    // Set date: tomorrow at 15:00 if not provided
    let targetDate = defaultDate ? new Date(defaultDate) : new Date(Date.now() + 24 * 3600 * 1000);
    if (isNaN(targetDate.getTime())) {
      targetDate = new Date(Date.now() + 24 * 3600 * 1000);
    }
    const pad = n => String(n).padStart(2, '0');
    dateInput.value = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;

    locationInput.value = (selectedContact && selectedContact.phone) ? `Phone (${selectedContact.phone})` : 'Phone Call / Meetup';
    notesInput.value = defaultNotes || (selectedContact ? selectedContact.nextTopicsToAsk : '') || '';

    friendSelect.onchange = () => {
      const c = this.contacts.find(ct => ct.id === friendSelect.value);
      if (c && !titleInput.value.includes(c.name)) {
        titleInput.value = `Catch up with ${c.name}`;
        if (c.nextTopicsToAsk && !notesInput.value) {
          notesInput.value = c.nextTopicsToAsk;
        }
      }
    };

    modal.style.display = 'flex';
  }

  downloadIcsFile({ title, description, location, startDate, endDate }) {
    const pad = n => String(n).padStart(2, '0');
    const formatIcsDate = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Orbit//Social Circle Tracker//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@orbit-tracker`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${(title || 'Orbit Catch-up').replace(/[\r\n]+/g, ' ')}`,
      `DESCRIPTION:${(description || '').replace(/[\r\n]+/g, '\\n')}`,
      `LOCATION:${(location || '').replace(/[\r\n]+/g, ' ')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(title || 'event').replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  }

  downloadIcsCalendarEvent({ contactId, title, dateTime, durationMinutes = 30, location = '', notes = '' }) {
    const contact = this.contacts.find(c => c.id === contactId);
    let startDate = new Date(dateTime);
    if (isNaN(startDate.getTime())) {
      startDate = new Date(Date.now() + 24 * 3600 * 1000);
    }
    const durationMs = parseInt(durationMinutes, 10) * 60 * 1000;
    const endDate = new Date(startDate.getTime() + durationMs);
    const fullDescription = `${notes ? notes + '\n\n' : ''}Scheduled via Orbit - Social Circle Tracker\nContact: ${contact ? contact.name : ''}${contact && contact.phone ? ' (' + contact.phone + ')' : ''}`;

    this.downloadIcsFile({ title, description: fullDescription, location, startDate, endDate });

    if (contact) {
      if (!Array.isArray(contact.programs)) contact.programs = [];
      const newProgram = {
        id: 'prog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        title,
        dateTime: startDate.toISOString(),
        durationMinutes: parseInt(durationMinutes, 10) || 30,
        location,
        notes,
        completed: false,
        createdAt: new Date().toISOString()
      };
      contact.programs.unshift(newProgram);

      contact.promisedCall = {
        isPromised: true,
        deadline: startDate.toISOString(),
        reason: title
      };
      this.saveContacts();
      this.render();
      this.showToast(`📥 Saved calendar invite for ${contact.name}!`, 'success');
      this.playChimeSound();
    }
    this.closeModal('calendarModal');
    this.switchView('calendar');
  }

  scheduleGoogleCalendarEvent({ contactId, title, dateTime, durationMinutes = 30, location = '', notes = '' }) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) {
      this.showToast('Please select a friend first!', 'warning');
      return;
    }

    let startDate = new Date(dateTime);
    if (isNaN(startDate.getTime())) {
      startDate = new Date(Date.now() + 24 * 3600 * 1000);
    }

    const durationMs = parseInt(durationMinutes, 10) * 60 * 1000;
    const endDate = new Date(startDate.getTime() + durationMs);

    const pad = n => String(n).padStart(2, '0');
    const formatGCalDate = d => {
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    };

    const startStr = formatGCalDate(startDate);
    const endStr = formatGCalDate(endDate);

    const fullDescription = `${notes ? notes + '\n\n' : ''}Scheduled via Orbit - Social Circle Tracker\nContact: ${contact ? contact.name : ''}${contact && contact.phone ? ' (' + contact.phone + ')' : ''}`;
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(fullDescription)}&location=${encodeURIComponent(location)}`;

    // 1. Record program in contact.programs
    if (!Array.isArray(contact.programs)) {
      contact.programs = [];
    }
    const newProgram = {
      id: 'prog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title,
      dateTime: startDate.toISOString(),
      durationMinutes: parseInt(durationMinutes, 10) || 30,
      location,
      notes,
      completed: false,
      createdAt: new Date().toISOString()
    };
    contact.programs.unshift(newProgram);

    // 2. Keep promised callback in sync
    contact.promisedCall = {
      isPromised: true,
      deadline: startDate.toISOString(),
      reason: title
    };

    this.saveContacts();
    this.render();

    // 3. Dispatch to Android Native Bridge OR Desktop/Web
    if (window.AndroidBridge && typeof window.AndroidBridge.openGoogleCalendar === 'function') {
      try {
        window.AndroidBridge.openGoogleCalendar(title, fullDescription, location, startDate.getTime(), endDate.getTime(), gcalUrl);
        this.showToast(`📅 Scheduled with ${contact.name}! Opening Calendar app...`, 'success');
      } catch (e) {
        console.warn('AndroidBridge calendar error:', e);
        try {
          window.open(gcalUrl, '_blank');
        } catch (ignored) {}
        this.showToast(`📅 Scheduled with ${contact.name}!`, 'success');
      }
    } else {
      // Desktop / Web: open in new tab safely without ever redirecting or hijacking Orbit
      try {
        const win = window.open(gcalUrl, '_blank', 'noopener,noreferrer');
        if (!win) {
          this.showToast(`📅 Scheduled! <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer" style="color:#fff; text-decoration:underline; font-weight:bold; margin-left:8px;">Open Google Calendar ↗</a>`, 'success');
        } else {
          this.showToast(`📅 Scheduled with ${contact.name}! Opening Google Calendar...`, 'success');
        }
      } catch (err) {
        this.showToast(`📅 Scheduled! <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer" style="color:#fff; text-decoration:underline; font-weight:bold; margin-left:8px;">Open Google Calendar ↗</a>`, 'success');
      }
    }

    // 4. Direct Google Calendar API sync if OAuth token active
    if (this.googleSync && this.googleSync.accessToken) {
      this.googleSync.createGoogleCalendarEvent({
        title,
        description: fullDescription,
        location,
        startTime: startDate,
        endTime: endDate
      }).catch(e => console.warn('OAuth calendar sync note:', e));
    }

    this.playChimeSound();
    this.closeModal('calendarModal');
    this.switchView('calendar');
  }

  // ========================================================================
  // PHONE CONTACTS & CALL LOGS ENGINE
  // ========================================================================

  initNativePhoneIntegration() {
    // 1. Listen for native Android contact picker result
    window.onNativeContactPicked = (contact) => {
      if (!contact) return;
      this.applyPickedContact(contact);
    };

    // 2. Listen for permission grant callbacks
    window.onNativeContactsPermissionResult = (granted) => {
      if (granted) {
        this.showToast('📱 Device contacts access granted!', 'success');
        this.loadDeviceContacts();
      } else {
        this.showToast('Contacts permission was denied.', 'warning');
      }
    };

    window.onNativeCallLogPermissionResult = (granted) => {
      if (granted) {
        this.showToast('📞 Call log access granted!', 'success');
        this.renderCallLogs();
        this.updateCallLogsBadges();
      } else {
        this.showToast('Call log permission was denied.', 'warning');
      }
    };

    window.onNativeAllPermissionsResult = () => {
      this.showToast('All phone permissions granted!', 'success');
      this.renderCallLogs();
      this.updateCallLogsBadges();
    };

    // Initial check for unlogged calls badge
    setTimeout(() => {
      this.updateCallLogsBadges();
    }, 1000);
  }

  normalizePhoneNumber(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    return digits.length >= 7 ? digits.slice(-7) : digits;
  }

  findContactByPhone(phone) {
    if (!phone) return null;
    const target = this.normalizePhoneNumber(phone);
    if (!target || target.length < 5) return null;
    return this.contacts.find(c => {
      if (!c.phone) return false;
      const cNorm = this.normalizePhoneNumber(c.phone);
      return cNorm === target || (cNorm.length >= 7 && target.length >= 7 && (cNorm.endsWith(target) || target.endsWith(cNorm)));
    });
  }

  formatDuration(seconds) {
    const sec = parseInt(seconds, 10) || 0;
    if (sec <= 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}m ${s > 0 ? s + 's' : ''}`.trim();
    return `${s}s`;
  }

  // Pick contact using native Android picker or Web Contacts API
  pickContactFromPhone() {
    if (window.AndroidBridge && typeof window.AndroidBridge.pickContact === 'function') {
      try {
        window.AndroidBridge.pickContact();
        return;
      } catch (e) {
        console.warn('AndroidBridge.pickContact error:', e);
      }
    }

    if (navigator.contacts && 'select' in navigator.contacts) {
      navigator.contacts.select(['name', 'tel'], { multiple: false })
        .then(contacts => {
          if (contacts && contacts.length > 0) {
            const c = contacts[0];
            const name = (c.name && c.name[0]) || '';
            const phone = (c.tel && c.tel[0]) || '';
            this.applyPickedContact({ name, phone });
          }
        })
        .catch(() => {
          this.openDeviceContactsModal();
        });
      return;
    }

    this.openDeviceContactsModal();
  }

  applyPickedContact(contact) {
    if (!contact) return;
    const modal = document.getElementById('contactModal');
    if (!modal || modal.style.display === 'none') {
      this.openAddEditContactModal(null, {
        name: contact.name || '',
        phone: contact.phone || ''
      });
    } else {
      if (contact.name) document.getElementById('formName').value = contact.name;
      if (contact.phone) document.getElementById('formPhone').value = contact.phone;
      const circleSel = document.getElementById('formCircle');
      if (circleSel) circleSel.focus();
    }
    this.showToast(`📱 Picked: ${contact.name || contact.phone}`, 'success');
  }

  openDeviceContactsModal() {
    const modal = document.getElementById('deviceContactsModal');
    if (!modal) return;
    modal.style.display = 'flex';
    this.loadDeviceContacts();
  }

  loadDeviceContacts(filterText = '') {
    const list = document.getElementById('deviceContactsList');
    const notice = document.getElementById('deviceContactsStatusNotice');
    if (!list) return;

    let deviceContacts = [];

    if (window.AndroidBridge && typeof window.AndroidBridge.getDeviceContacts === 'function') {
      try {
        const raw = window.AndroidBridge.getDeviceContacts(300);
        deviceContacts = JSON.parse(raw);
      } catch (e) {
        console.warn('Error reading device contacts:', e);
      }
    }

    // Fallback: If running on browser without native contacts or empty
    if (!deviceContacts || deviceContacts.length === 0) {
      if (notice) {
        notice.style.display = 'block';
        notice.innerHTML = `
          <div class="calendar-sync-notice" style="margin-bottom:0.5rem;">
            <span>ℹ️ <strong>Address Book:</strong> On Android devices, contacts are loaded directly from your phone. Below are demo/sample contacts you can easily import.</span>
          </div>
        `;
      }
      deviceContacts = [
        { name: 'Sarah Miller', phone: '+1 555-0819' },
        { name: 'Liam O\'Connor', phone: '+1 555-0422' },
        { name: 'Chloe Dubois', phone: '+1 555-0633' },
        { name: 'Tariq Hassan', phone: '+1 555-0744' },
        { name: 'Maya Lin', phone: '+1 555-0955' }
      ];
    } else {
      if (notice) notice.style.display = 'none';
    }

    if (filterText) {
      const q = filterText.toLowerCase();
      deviceContacts = deviceContacts.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.phone && c.phone.includes(q))
      );
    }

    if (deviceContacts.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:1.5rem;"><p>No contacts found matching "${this.escapeHtml(filterText)}".</p></div>`;
      return;
    }

    list.innerHTML = deviceContacts.map(c => {
      const existing = this.findContactByPhone(c.phone);
      return `
        <div class="device-contact-card">
          <div class="device-contact-left">
            <div class="avatar" style="width:38px; height:38px; border-radius:50%; background:${this.getAvatarGradient(c.name || 'Friend')}; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; font-size:0.85rem; flex-shrink:0;">
              ${this.getInitials(c.name || 'Friend')}
            </div>
            <div class="device-contact-details">
              <h4>
                ${this.escapeHtml(c.name || 'Unknown Name')}
                ${existing ? `<span class="call-status-tag tag-friend">In Orbit (${CIRCLE_LABELS[existing.circle]?.label || 'Friend'})</span>` : ''}
              </h4>
              <div class="device-contact-meta">
                <span>📞 ${this.escapeHtml(c.phone)}</span>
              </div>
            </div>
          </div>
          <div class="device-contact-actions">
            ${existing ? `
              <button class="btn btn-sm btn-ghost" disabled>✓ Added</button>
            ` : `
              <button class="btn btn-sm btn-primary btn-add-device-contact" data-name="${this.escapeHtml(c.name)}" data-phone="${this.escapeHtml(c.phone)}">
                ➕ Add Friend
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.btn-add-device-contact').forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.name;
        const phone = btn.dataset.phone;
        this.closeModal('deviceContactsModal');
        this.openAddEditContactModal(null, { name, phone });
      };
    });
  }

  // Read call logs from native bridge or fallback
  getDeviceCallLogs(limit = 100) {
    if (window.AndroidBridge && typeof window.AndroidBridge.getRecentCallLogs === 'function') {
      try {
        const raw = window.AndroidBridge.getRecentCallLogs(limit);
        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch (jsonErr) {
          console.warn('Bridge getRecentCallLogs parse error:', jsonErr);
        }

        if (parsed) {
          if (Array.isArray(parsed)) {
            return {
              permissionGranted: true,
              calls: parsed,
              isNative: true
            };
          }
          if (parsed.calls && Array.isArray(parsed.calls)) {
            return {
              permissionGranted: parsed.permissionGranted !== false,
              calls: parsed.calls,
              isNative: true,
              error: parsed.error || null
            };
          }
        }
      } catch (e) {
        console.warn('Error fetching native call logs:', e);
      }
      return {
        permissionGranted: false,
        calls: [],
        isNative: true
      };
    }

    // Web Fallback Demo Call Logs (only when previewing on web without AndroidBridge)
    const now = Date.now();
    return {
      permissionGranted: true,
      isNative: false,
      calls: [
        {
          number: '+1 555-0144',
          cachedName: 'Marcus Vance',
          type: 'call',
          direction: 'them',
          date: now - 3 * 3600 * 1000,
          duration: 840
        },
        {
          number: '+1 555-0891',
          cachedName: 'Elena Rostova',
          type: 'call',
          direction: 'me',
          date: now - 26 * 3600 * 1000,
          duration: 1250
        },
        {
          number: '+1 555-0329',
          cachedName: 'David Kim',
          type: 'missed',
          direction: 'them',
          date: now - 48 * 3600 * 1000,
          duration: 0
        },
        {
          number: '+1 555-9182',
          cachedName: 'Jordan Taylor',
          type: 'call',
          direction: 'them',
          date: now - 72 * 3600 * 1000,
          duration: 320
        }
      ]
    };
  }

  openCallLogsModal() {
    const modal = document.getElementById('callLogsModal');
    if (!modal) return;
    modal.style.display = 'flex';
    this.renderCallLogs();
  }

  renderCallLogs(filter = null) {
    const list = document.getElementById('callLogsList');
    const notice = document.getElementById('callLogsStatusNotice');
    const filterSelect = document.getElementById('callLogsFilter');
    if (!list) return;

    const currentFilter = filter || (filterSelect ? filterSelect.value : 'unlogged');
    const logResult = this.getDeviceCallLogs(100);
    const rawCalls = (logResult && logResult.calls) ? logResult.calls : [];

    if (notice) {
      if (logResult.isNative && !logResult.permissionGranted) {
        notice.style.display = 'block';
        notice.innerHTML = `
          <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
              <div>
                <strong style="color: #f59e0b; display: block; margin-bottom: 2px;">🔒 Call Log Permission Required</strong>
                <span style="font-size: 0.82rem; color: var(--text-secondary);">Orbit needs call log permission to show your phone calls and match with friends.</span>
              </div>
              <button type="button" id="btnRequestCallPermPrompt" class="btn btn-sm btn-primary" style="white-space: nowrap;">
                📱 Grant Permission
              </button>
            </div>
          </div>
        `;
        const permBtn = document.getElementById('btnRequestCallPermPrompt');
        if (permBtn && window.AndroidBridge && window.AndroidBridge.requestCallLogPermission) {
          permBtn.onclick = () => window.AndroidBridge.requestCallLogPermission();
        }
      } else if (!logResult.isNative) {
        notice.style.display = 'block';
        notice.innerHTML = `
          <div class="calendar-sync-notice">
            <span>ℹ️ <strong>Web Demo Calls:</strong> When installed on Android, Orbit automatically reads real phone call logs. Below is demo call history for web preview.</span>
          </div>
        `;
      } else {
        notice.style.display = 'none';
      }
    }

    let callsWithStatus = rawCalls.map(call => {
      const matchedContact = this.findContactByPhone(call.number);
      let isLogged = false;
      if (matchedContact && Array.isArray(matchedContact.interactions)) {
        isLogged = matchedContact.interactions.some(i => {
          if (i.callLogDate && i.callLogDate === call.date) return true;
          const iDate = new Date(i.date).getTime();
          return Math.abs(iDate - call.date) < 180000;
        });
      }
      return {
        ...call,
        matchedContact,
        isLogged
      };
    });

    // Apply Filter
    if (currentFilter === 'friends') {
      callsWithStatus = callsWithStatus.filter(c => c.matchedContact);
    } else if (currentFilter === 'unlogged') {
      callsWithStatus = callsWithStatus.filter(c => c.matchedContact && !c.isLogged);
    } else if (currentFilter === 'missed') {
      callsWithStatus = callsWithStatus.filter(c => c.type === 'missed');
    } else if (currentFilter === 'unknown') {
      callsWithStatus = callsWithStatus.filter(c => !c.matchedContact);
    }

    if (callsWithStatus.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem; text-align: center;">
          <div class="empty-illustration" style="font-size: 2.5rem; margin-bottom: 0.5rem;">📞</div>
          <h3 style="margin-bottom: 0.25rem;">
            ${logResult.isNative && !logResult.permissionGranted ? 'Call Log Permission Required' : 'No calls matching filter'}
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            ${logResult.isNative && !logResult.permissionGranted ? 'Tap "Grant Permission" above to load your recent calls.' : 'Make or receive phone calls on your phone to log them with friends.'}
          </p>
          <button type="button" class="btn btn-secondary btn-sm" onclick="orbit.renderCallLogs()">🔄 Refresh Call Logs</button>
        </div>
      `;
      return;
    }

    list.innerHTML = callsWithStatus.map((call, idx) => {
      const d = new Date(call.date);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const isMissed = call.type === 'missed';
      const isIncoming = call.direction === 'them' && !isMissed;
      const isOutgoing = call.direction === 'me' && !isMissed;

      let iconClass = 'call-icon-outgoing';
      let iconSymbol = '📤';
      let typeLabel = 'Outgoing Call';

      if (isIncoming) {
        iconClass = 'call-icon-incoming';
        iconSymbol = '📥';
        typeLabel = 'Incoming Call';
      } else if (isMissed) {
        iconClass = 'call-icon-missed';
        iconSymbol = '📵';
        typeLabel = 'Missed Call';
      }

      const displayName = call.matchedContact ? call.matchedContact.name : (call.cachedName || call.number);

      return `
        <div class="call-log-card" data-index="${idx}">
          <div class="call-log-left">
            <div class="call-icon-badge ${iconClass}">
              <span>${iconSymbol}</span>
            </div>
            <div class="call-details">
              <h4>
                ${this.escapeHtml(displayName)}
                ${call.matchedContact ? `
                  <span class="call-status-tag tag-friend">👤 ${this.escapeHtml(CIRCLE_LABELS[call.matchedContact.circle]?.label || 'Friend')}</span>
                ` : `
                  <span class="call-status-tag tag-new">New Number</span>
                `}
                ${call.isLogged ? `
                  <span class="call-status-tag tag-logged">✓ Logged</span>
                ` : ''}
              </h4>
              <div class="call-meta">
                <span>${typeLabel}</span>
                <span>•</span>
                <span>📅 ${dateStr} at ${timeStr}</span>
                <span>•</span>
                <span>⏱️ ${isMissed ? 'No answer' : this.formatDuration(call.duration)}</span>
                ${call.matchedContact && call.matchedContact.phone !== call.number ? `<span>• 📞 ${this.escapeHtml(call.number)}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="call-actions">
            ${call.matchedContact ? (
              call.isLogged ? `
                <button class="btn btn-sm btn-ghost" disabled>✓ In Orbit</button>
              ` : (
                isMissed ? `
                  <button class="btn btn-sm btn-secondary btn-log-missed-call" data-contact-id="${call.matchedContact.id}" data-date="${call.date}" title="Set callback reminder for missed call">
                    ⏳ Owe Call
                  </button>
                ` : `
                  <button class="btn btn-sm btn-primary btn-quick-log-call" data-contact-id="${call.matchedContact.id}" data-direction="${call.direction}" data-duration="${call.duration}" data-date="${call.date}">
                    ⚡ Log Catch-up
                  </button>
                `
              )
            ) : `
              <button class="btn btn-sm btn-secondary btn-add-friend-from-call" data-name="${this.escapeHtml(call.cachedName || '')}" data-phone="${this.escapeHtml(call.number)}" data-date="${call.date}">
                ➕ Add Friend
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Bind action buttons
    list.querySelectorAll('.btn-quick-log-call').forEach(btn => {
      btn.onclick = () => {
        const contactId = btn.dataset.contactId;
        const direction = btn.dataset.direction;
        const duration = parseInt(btn.dataset.duration, 10);
        const date = parseInt(btn.dataset.date, 10);
        this.logCallInteraction({ contactId, direction, duration, date });
        this.renderCallLogs();
      };
    });

    list.querySelectorAll('.btn-log-missed-call').forEach(btn => {
      btn.onclick = () => {
        const contactId = btn.dataset.contactId;
        const date = parseInt(btn.dataset.date, 10);
        const contact = this.contacts.find(c => c.id === contactId);
        if (contact) {
          contact.promisedCall = {
            isPromised: true,
            deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
            reason: `Missed call on ${new Date(date).toLocaleDateString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}`
          };
          this.saveContacts();
          this.render();
          this.showToast(`⏳ Set callback reminder for ${contact.name}!`, 'warning');
          this.renderCallLogs();
        }
      };
    });

    list.querySelectorAll('.btn-add-friend-from-call').forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.name;
        const phone = btn.dataset.phone;
        const date = parseInt(btn.dataset.date, 10);
        this.closeModal('callLogsModal');
        this.openAddEditContactModal(null, {
          name: name || '',
          phone: phone || '',
          notes: `Added from call log (${new Date(date).toLocaleDateString()})`
        });
      };
    });
  }

  logCallInteraction({ contactId, direction, duration, date }) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;

    const durSec = duration || 0;
    const isThey = direction === 'them';
    const xpGained = 25 + (isThey ? 15 : 0);

    const interaction = {
      id: 'i_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: 'call',
      initiator: direction,
      date: new Date(date).toISOString(),
      mood: durSec > 300 ? 'great' : (durSec > 60 ? 'good' : 'quick'),
      summary: `${isThey ? 'Incoming' : 'Outgoing'} phone call (${this.formatDuration(durSec)})`,
      nextTopics: contact.nextTopicsToAsk || '',
      callLogDate: date
    };

    if (!Array.isArray(contact.interactions)) contact.interactions = [];
    contact.interactions.unshift(interaction);
    contact.currentXp = Math.min(1000, (contact.currentXp || 0) + xpGained);

    // If promise was active, fulfill it
    if (contact.promisedCall && contact.promisedCall.isPromised) {
      contact.promisedCall = null;
    }

    this.saveContacts();
    this.render();
    this.showToast(`📞 Logged call with ${contact.name}! (+${xpGained} XP)`, 'success');
    this.playLevelUpSound();
    this.updateCallLogsBadges();
  }

  autoSyncUnloggedCalls() {
    const logRes = this.getDeviceCallLogs(100);
    const rawCalls = (logRes && logRes.calls) ? logRes.calls : [];
    let count = 0;

    rawCalls.forEach(call => {
      if (call.type === 'missed') return;
      const contact = this.findContactByPhone(call.number);
      if (!contact) return;

      if (!Array.isArray(contact.interactions)) contact.interactions = [];
      const isAlreadyLogged = contact.interactions.some(i => {
        if (i.callLogDate && i.callLogDate === call.date) return true;
        const iDate = new Date(i.date).getTime();
        return Math.abs(iDate - call.date) < 180000;
      });

      if (!isAlreadyLogged) {
        const isThey = call.direction === 'them';
        const xpGained = 25 + (isThey ? 15 : 0);
        contact.interactions.unshift({
          id: 'i_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          type: 'call',
          initiator: call.direction,
          date: new Date(call.date).toISOString(),
          mood: call.duration > 300 ? 'great' : 'good',
          summary: `${isThey ? 'Incoming' : 'Outgoing'} call (${this.formatDuration(call.duration)})`,
          nextTopics: contact.nextTopicsToAsk || '',
          callLogDate: call.date
        });
        contact.currentXp = Math.min(1000, (contact.currentXp || 0) + xpGained);
        if (contact.promisedCall) contact.promisedCall = null;
        count++;
      }
    });

    if (count > 0) {
      this.saveContacts();
      this.render();
      this.renderCallLogs();
      this.updateCallLogsBadges();
      this.showToast(`⚡ Automatically logged ${count} calls from phone history!`, 'success');
      this.playLevelUpSound();
    } else {
      this.showToast('All calls with friends are already up to date!', 'info');
    }
  }

  updateCallLogsBadges() {
    const logRes = this.getDeviceCallLogs(100);
    const rawCalls = (logRes && logRes.calls) ? logRes.calls : [];
    let unloggedCount = 0;

    rawCalls.forEach(call => {
      const contact = this.findContactByPhone(call.number);
      if (!contact) return;
      if (!Array.isArray(contact.interactions)) return;

      const isLogged = contact.interactions.some(i => {
        if (i.callLogDate && i.callLogDate === call.date) return true;
        const iDate = new Date(i.date).getTime();
        return Math.abs(iDate - call.date) < 180000;
      });
      if (!isLogged) unloggedCount++;
    });

    const headerBadge = document.getElementById('headerCallLogsBadge');
    if (headerBadge) {
      headerBadge.textContent = unloggedCount;
      headerBadge.style.display = unloggedCount > 0 ? 'inline-block' : 'none';
    }

    const mobileBadge = document.getElementById('mobileCallLogsBadge');
    if (mobileBadge) {
      mobileBadge.textContent = unloggedCount;
      mobileBadge.style.display = unloggedCount > 0 ? 'inline-block' : 'none';
    }
  }

  // ========================================================================
  // EVENT BINDINGS
  // ========================================================================

  bindEvents() {
    // Top actions
    document.getElementById('addContactBtn').onclick = () => this.openAddEditContactModal();
    document.getElementById('emptyAddBtn').onclick = () => this.openAddEditContactModal();
    document.getElementById('quickLogBtn').onclick = () => this.openLogInteractionModal();
    document.getElementById('themeToggleBtn').onclick = () => this.toggleTheme();

    // Call Logs & Contact Picker top/mobile bindings
    const headerCallLogsBtn = document.getElementById('headerCallLogsBtn');
    if (headerCallLogsBtn) {
      headerCallLogsBtn.onclick = () => this.openCallLogsModal();
    }

    const mobileCallLogsBtn = document.getElementById('mobileActionCallLogs');
    if (mobileCallLogsBtn) {
      mobileCallLogsBtn.onclick = () => this.openCallLogsModal();
    }

    const btnPickPhone = document.getElementById('btnPickPhoneContact');
    if (btnPickPhone) {
      btnPickPhone.onclick = () => this.pickContactFromPhone();
    }

    const btnBrowseContacts = document.getElementById('btnBrowsePhoneContacts');
    if (btnBrowseContacts) {
      btnBrowseContacts.onclick = () => this.openDeviceContactsModal();
    }

    const devSearch = document.getElementById('deviceContactsSearch');
    if (devSearch) {
      devSearch.oninput = (e) => this.loadDeviceContacts(e.target.value.trim());
    }

    const btnAutoSync = document.getElementById('btnAutoSyncCallLogs');
    if (btnAutoSync) {
      btnAutoSync.onclick = () => this.autoSyncUnloggedCalls();
    }

    const btnRefreshCalls = document.getElementById('btnRefreshCallLogs');
    if (btnRefreshCalls) {
      btnRefreshCalls.onclick = () => {
        this.renderCallLogs();
        this.showToast('🔄 Refreshed phone call logs', 'info');
      };
    }

    const callLogsFilter = document.getElementById('callLogsFilter');
    if (callLogsFilter) {
      callLogsFilter.onchange = (e) => this.renderCallLogs(e.target.value);
    }

    const btnPickCallForInter = document.getElementById('btnPickFromCallLogsForInteraction');
    if (btnPickCallForInter) {
      btnPickCallForInter.onclick = () => {
        this.closeModal('interactionModal');
        this.openCallLogsModal();
      };
    }

    // Desktop Header Calendar Button
    const headerCalBtn = document.getElementById('headerCalendarBtn');
    if (headerCalBtn) {
      headerCalBtn.onclick = () => this.switchView('calendar');
    }

    // Calendar Section "Schedule New Program" Button
    const btnNewProg = document.getElementById('btnScheduleNewProgram');
    if (btnNewProg) {
      btnNewProg.onclick = () => this.openCalendarModal();
    }

    // Mobile quick action bar
    const mobileActionAdd = document.getElementById('mobileActionAddFriend');
    if (mobileActionAdd) {
      mobileActionAdd.onclick = () => this.openAddEditContactModal();
    }
    const mobileActionCal = document.getElementById('mobileActionCalendar');
    if (mobileActionCal) {
      mobileActionCal.onclick = () => this.openCalendarModal();
    }
    const mobileActionLog = document.getElementById('mobileActionQuickLog');
    if (mobileActionLog) {
      mobileActionLog.onclick = () => this.openLogInteractionModal();
    }

    // Profile modal calendar button
    const profCalBtn = document.getElementById('profCalendarBtn');
    if (profCalBtn) {
      profCalBtn.onclick = () => {
        this.openCalendarModal(this.activeProfileContactId);
      };
    }

    // Calendar Form submission & .ICS download
    const calForm = document.getElementById('calendarForm');
    if (calForm) {
      calForm.onsubmit = (e) => {
        e.preventDefault();
        const contactId = document.getElementById('calFriendSelect').value;
        const title = document.getElementById('calEventTitle').value.trim();
        const dateTime = document.getElementById('calDateTime').value;
        const durationMinutes = document.getElementById('calDuration').value;
        const location = document.getElementById('calLocation').value.trim();
        const notes = document.getElementById('calNotes').value.trim();
        this.scheduleGoogleCalendarEvent({ contactId, title, dateTime, durationMinutes, location, notes });
      };
    }

    const btnIcs = document.getElementById('btnDownloadIcsEvent');
    if (btnIcs) {
      btnIcs.onclick = () => {
        const contactId = document.getElementById('calFriendSelect').value;
        const title = document.getElementById('calEventTitle').value.trim() || 'Orbit Program';
        const dateTime = document.getElementById('calDateTime').value;
        const durationMinutes = document.getElementById('calDuration').value;
        const location = document.getElementById('calLocation').value.trim();
        const notes = document.getElementById('calNotes').value.trim();
        this.downloadIcsCalendarEvent({ contactId, title, dateTime, durationMinutes, location, notes });
      };
    }

    // Settings modal
    const settingsBtn = document.getElementById('dataSettingsBtn');
    settingsBtn.onclick = () => {
      document.getElementById('dataSettingsModal').style.display = 'flex';
    };

    document.getElementById('exportDataBtn').onclick = () => this.exportData();
    const importInput = document.getElementById('importFileInput');
    document.getElementById('importDataBtn').onclick = () => importInput.click();
    importInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        this.importData(e.target.files[0]);
      }
    };
    const enableSoundBtn = document.getElementById('enableSoundBtn');
    if (enableSoundBtn) {
      enableSoundBtn.onclick = () => {
        this.playChimeSound();
        this.showToast('🎵 Chime tested successfully!', 'info');
      };
    }

    const btnReqNotif = document.getElementById('btnRequestNotifPermission');
    if (btnReqNotif) {
      btnReqNotif.onclick = () => this.requestNotificationPermission();
    }

    const btnTestNotif = document.getElementById('btnSendTestNotification');
    if (btnTestNotif) {
      btnTestNotif.onclick = () => this.sendTestNotification();
    }

    const btnGrantNotif = document.getElementById('btnGrantNotifications');
    if (btnGrantNotif) {
      btnGrantNotif.onclick = () => this.requestNotificationPermission();
    }

    const btnDismissNotif = document.getElementById('btnDismissNotifications');
    if (btnDismissNotif) {
      btnDismissNotif.onclick = () => {
        const banner = document.getElementById('notificationPermissionBanner');
        if (banner) banner.style.display = 'none';
        localStorage.setItem('orbit_notif_banner_dismissed', 'true');
      };
    }
    document.getElementById('loadSampleDataBtn').onclick = () => this.resetSampleData();
    document.getElementById('clearAllDataBtn').onclick = () => this.clearAllData();

    // Circle tab filters & Calendar View
    document.querySelectorAll('.circle-tab').forEach(tab => {
      tab.onclick = () => {
        if (tab.dataset.circle === 'calendar') {
          this.switchView('calendar');
          return;
        }
        document.querySelectorAll('.circle-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCircleFilter = tab.dataset.circle;
        this.switchView('circles');
      };
    });

    // Status filter
    document.getElementById('statusFilterSelect').onchange = (e) => {
      this.currentStatusFilter = e.target.value;
      this.renderContactsGrid();
    };

    // Sort
    document.getElementById('sortSelect').onchange = (e) => {
      this.currentSort = e.target.value;
      this.renderContactsGrid();
    };

    // Search
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearchBtn');
    searchInput.oninput = (e) => {
      this.searchQuery = e.target.value.trim();
      clearSearch.style.display = this.searchQuery ? 'block' : 'none';
      this.renderContactsGrid();
    };
    clearSearch.onclick = () => {
      searchInput.value = '';
      this.searchQuery = '';
      clearSearch.style.display = 'none';
      this.renderContactsGrid();
    };

    // Stat card filter clicks
    document.querySelectorAll('.stat-card').forEach(card => {
      card.onclick = () => {
        const f = card.dataset.filter;
        if (f === 'all') {
          this.currentStatusFilter = 'all';
          this.currentCircleFilter = 'all';
          document.querySelectorAll('.circle-tab').forEach(t => t.classList.remove('active'));
          document.querySelector('.circle-tab[data-circle="all"]').classList.add('active');
          document.getElementById('statusFilterSelect').value = 'all';
        } else if (f === 'owe_call') {
          this.currentStatusFilter = 'owe_call';
          document.getElementById('statusFilterSelect').value = 'owe_call';
        } else if (f === 'needs_water') {
          this.currentStatusFilter = 'cooling';
          document.getElementById('statusFilterSelect').value = 'cooling';
        } else if (f === 'strong') {
          this.currentStatusFilter = 'thriving';
          document.getElementById('statusFilterSelect').value = 'thriving';
        } else if (f === 'two_way') {
          this.currentStatusFilter = 'they_reached_out';
          document.getElementById('statusFilterSelect').value = 'they_reached_out';
        }
        this.renderContactsGrid();
      };
    });

    // Forms
    document.getElementById('contactForm').onsubmit = (e) => this.saveContactForm(e);
    document.getElementById('interactionForm').onsubmit = (e) => this.saveInteraction(e);

    // Modal close buttons & backdrop click
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.onclick = () => this.closeModal(btn.dataset.close);
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.onclick = (e) => {
        if (e.target === backdrop) {
          backdrop.style.display = 'none';
        }
      };
    });

    document.querySelectorAll('.modal-handle').forEach(handle => {
      handle.onclick = () => {
        const parentBackdrop = handle.closest('.modal-backdrop');
        if (parentBackdrop) {
          parentBackdrop.style.display = 'none';
        }
      };
    });

    // Interaction form type pills selection change
    document.querySelectorAll('.type-pill').forEach(pill => {
      pill.onclick = () => {
        document.querySelectorAll('.type-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        const radio = pill.querySelector('input');
        radio.checked = true;

        const deadlineBox = document.getElementById('promiseDeadlineContainer');
        const recGroup = document.getElementById('reciprocityFieldGroup');

        if (radio.value === 'promised_call') {
          deadlineBox.style.display = 'block';
          recGroup.style.display = 'none';
          document.getElementById('saveInteractionBtn').textContent = 'Set Callback Reminder';
        } else {
          deadlineBox.style.display = 'none';
          recGroup.style.display = 'block';
          document.getElementById('saveInteractionBtn').textContent = 'Save & Level Up';
        }
      };
    });

    // Reciprocity radio card styling
    document.querySelectorAll('.radio-card').forEach(card => {
      card.onclick = () => {
        document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        card.querySelector('input').checked = true;
      };
    });

    // Deadline presets
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.onclick = () => {
        const hours = parseInt(btn.dataset.hours, 10);
        const target = new Date(Date.now() + hours * 3600 * 1000);
        const localIso = new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('promisedDeadline').value = localIso;
      };
    });

    // Global event delegation for contact card actions
    document.addEventListener('click', (e) => {
      // Quick Log contact
      const logBtn = e.target.closest('.btn-quick-log');
      if (logBtn) {
        this.openLogInteractionModal(logBtn.dataset.id);
        return;
      }

      // Schedule in Google Calendar
      const calBtn = e.target.closest('.btn-card-calendar') || e.target.closest('.btn-calendar-sync');
      if (calBtn) {
        const contact = this.contacts.find(c => c.id === calBtn.dataset.id);
        const reason = (contact && contact.promisedCall) ? contact.promisedCall.reason : '';
        const deadline = (contact && contact.promisedCall) ? contact.promisedCall.deadline : null;
        this.openCalendarModal(calBtn.dataset.id, reason ? `Promised Callback: ${contact.name}` : '', deadline, reason);
        return;
      }

      // Open Icebreaker
      const iceBtn = e.target.closest('.btn-open-icebreaker') || e.target.closest('.btn-icebreaker-quick');
      if (iceBtn) {
        this.openIcebreakerModal(iceBtn.dataset.id);
        return;
      }

      // View profile / history
      const profBtn = e.target.closest('.btn-view-profile');
      if (profBtn) {
        this.openProfileModal(profBtn.dataset.id);
        return;
      }

      // Promised call fulfill directly from urgent deck
      const callPromisedBtn = e.target.closest('.btn-call-promised');
      if (callPromisedBtn) {
        const contact = this.contacts.find(c => c.id === callPromisedBtn.dataset.id);
        if (contact && contact.phone) {
          window.location.href = `tel:${contact.phone}`;
        }
        this.openLogInteractionModal(callPromisedBtn.dataset.id);
        return;
      }

      // Tap on contact card itself to open full profile & history
      const card = e.target.closest('.contact-card');
      if (card && card.dataset.id && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select') && !e.target.closest('a')) {
        this.openProfileModal(card.dataset.id);
        return;
      }
    });

    // ======================================================================
    // GOOGLE CLOUD SYNC EVENT LISTENERS
    // ======================================================================
    const syncPill = document.getElementById('googleSyncPill');
    if (syncPill) {
      syncPill.onclick = () => this.googleSync.openConfigModal();
    }

    const btnLinkGoogleEmail = document.getElementById('btnLinkGoogleEmail');
    if (btnLinkGoogleEmail) {
      btnLinkGoogleEmail.onclick = () => {
        const email = document.getElementById('googleAccountEmailInput').value.trim();
        this.googleSync.linkGoogleEmail(email);
      };
    }

    const btnExportToGoogleDrive = document.getElementById('btnExportToGoogleDrive');
    if (btnExportToGoogleDrive) {
      btnExportToGoogleDrive.onclick = () => this.googleSync.exportDirectGoogleDrive();
    }

    const btnSyncNowGlobal = document.getElementById('btnSyncNowGlobal');
    if (btnSyncNowGlobal) {
      btnSyncNowGlobal.onclick = () => this.googleSync.performTwoWaySync();
    }

    const btnSyncNowProfile = document.getElementById('btnSyncNowProfile');
    if (btnSyncNowProfile) {
      btnSyncNowProfile.onclick = () => this.googleSync.performTwoWaySync();
    }

    const btnRestoreFromGoogleDrive = document.getElementById('btnRestoreFromGoogleDrive');
    const googleDriveRestoreInput = document.getElementById('googleDriveRestoreInput');
    if (btnRestoreFromGoogleDrive) {
      btnRestoreFromGoogleDrive.onclick = () => this.googleSync.triggerRestoreGoogleDrive();
    }
    if (googleDriveRestoreInput) {
      googleDriveRestoreInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          this.googleSync.restoreGoogleDriveBackup(e.target.files[0]);
          e.target.value = '';
        }
      };
    }

    const btnForceWifiSync = document.getElementById('btnForceWifiSync');
    if (btnForceWifiSync) {
      btnForceWifiSync.onclick = async () => {
        await this.googleSync.checkServerStatusAndSync();
        await this.googleSync.performTwoWaySync();
      };
    }

    const btnCopyWifiUrl = document.getElementById('btnCopyWifiUrl');
    if (btnCopyWifiUrl) {
      btnCopyWifiUrl.onclick = () => {
        const urlElem = document.getElementById('androidWifiSyncUrl');
        if (urlElem) {
          navigator.clipboard.writeText(urlElem.textContent.trim()).then(() => {
            this.showToast('📋 Copied Android link to clipboard!', 'info');
          }).catch(() => {
            this.showToast(urlElem.textContent.trim(), 'info');
          });
        }
      };
    }

    const btnSaveClientId = document.getElementById('btnSaveClientId');
    if (btnSaveClientId) {
      btnSaveClientId.onclick = () => {
        const val = document.getElementById('googleClientIdInput').value.trim();
        this.googleSync.clientId = val;
        this.googleSync.saveConfig();
        this.googleSync.initGoogleIdentity();
        this.showToast('Saved Google Client ID!', 'success');
      };
    }

    const btnGoogleConnect = document.getElementById('btnGoogleConnect');
    if (btnGoogleConnect) {
      btnGoogleConnect.onclick = () => this.googleSync.requestGoogleSignIn();
    }

    const btnGoogleDisconnect = document.getElementById('btnGoogleDisconnect');
    if (btnGoogleDisconnect) {
      btnGoogleDisconnect.onclick = () => this.googleSync.disconnect();
    }

    // ======================================================================
    // ANDROID PWA INSTALL PROMPT
    // ======================================================================
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const banner = document.getElementById('androidInstallBanner');
      if (banner) banner.style.display = 'flex';
    });

    const btnInstallApp = document.getElementById('btnInstallApp');
    if (btnInstallApp) {
      btnInstallApp.onclick = async () => {
        if (this.deferredInstallPrompt) {
          this.deferredInstallPrompt.prompt();
          const { outcome } = await this.deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            this.showToast('Orbit installed to your Android device!', 'success');
          }
          this.deferredInstallPrompt = null;
          const banner = document.getElementById('androidInstallBanner');
          if (banner) banner.style.display = 'none';
        } else {
          this.showToast('To install, tap your browser menu (⋮) and choose "Add to Home screen" or "Install App".', 'info');
        }
      };
    }

    const btnDismissInstall = document.getElementById('btnDismissInstall');
    if (btnDismissInstall) {
      btnDismissInstall.onclick = () => {
        const banner = document.getElementById('androidInstallBanner');
        if (banner) banner.style.display = 'none';
      };
    }

    // ======================================================================
    // ANDROID MOBILE BOTTOM NAVIGATION
    // ======================================================================
    document.querySelectorAll('.mobile-nav-item[data-nav]').forEach(item => {
      item.onclick = () => {
        document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const navTarget = item.dataset.nav;

        if (navTarget === 'circle') {
          this.switchView('circles');
          this.currentCircleFilter = 'all';
          this.currentStatusFilter = 'all';
          document.querySelectorAll('.circle-tab').forEach(t => t.classList.remove('active'));
          const allTab = document.querySelector('.circle-tab[data-circle="all"]');
          if (allTab) allTab.classList.add('active');
          document.getElementById('statusFilterSelect').value = 'all';
          this.renderContactsGrid();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (navTarget === 'callbacks') {
          this.switchView('circles');
          this.currentStatusFilter = 'owe_call';
          document.getElementById('statusFilterSelect').value = 'owe_call';
          this.renderContactsGrid();
          const deck = document.getElementById('promisedCallsDeck');
          if (deck && deck.style.display !== 'none') {
            deck.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (navTarget === 'calendar') {
          this.switchView('calendar');
        } else if (navTarget === 'settings') {
          document.getElementById('dataSettingsModal').style.display = 'flex';
        }
      };
    });

    const mobileNavCalendar = document.getElementById('mobileNavCalendar');
    if (mobileNavCalendar) {
      mobileNavCalendar.onclick = () => this.switchView('calendar');
    }

    const mobileFabAdd = document.getElementById('mobileFabAdd');
    if (mobileFabAdd) {
      mobileFabAdd.onclick = () => this.openAddEditContactModal();
    }

    const mobileNavSync = document.getElementById('mobileNavSync');
    if (mobileNavSync) {
      mobileNavSync.onclick = () => {
        if (this.googleSync.accessToken) {
          this.googleSync.performTwoWaySync();
        } else {
          this.googleSync.openConfigModal();
        }
      };
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getAvatarGradient(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'linear-gradient(135deg, #6366f1, #4f46e5)',
      'linear-gradient(135deg, #ec4899, #f43f5e)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #06b6d4, #0284c7)',
      'linear-gradient(135deg, #8b5cf6, #6d28d9)'
    ];
    return gradients[Math.abs(hash) % gradients.length];
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.orbitApp = new SocialCircleApp();
});
