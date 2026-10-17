/**
 * ORBIT - Social Circle & Connection Tracker
 * Pure vanilla JavaScript application with persistent storage,
 * connection leveling engine, reciprocity tracking, and awkwardness-busting reconnect tools.
 */

// ==========================================================================
// CONFIGURATION & CONSTANTS
// ==========================================================================

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
  // RENDERING ENGINE
  // ========================================================================

  render() {
    this.renderStats();
    this.renderPromisedDeck();
    this.renderContactsGrid();
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
          <button class="btn btn-sm btn-secondary btn-icebreaker-quick" data-id="${contact.id}">
            ⚡ Beat Awkwardness
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
          <button class="btn-card-action btn-card-icebreaker btn-open-icebreaker" data-id="${contact.id}" title="Awkwardness-Busting Reconnect Scripts">
            ⚡ Icebreaker
          </button>
          <button class="btn-card-action btn-view-profile" data-id="${contact.id}">
            👤 History
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // ========================================================================
  // INTERACTION LOGGING MODAL
  // ========================================================================

  openLogInteractionModal(contactId = null) {
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

  openAddEditContactModal(contactId = null) {
    const modal = document.getElementById('contactModal');
    const form = document.getElementById('contactForm');
    const title = document.getElementById('contactModalTitle');
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

    if (contactId) {
      const contact = this.contacts.find(c => c.id === contactId);
      if (!contact) return;
      title.textContent = 'Edit Friend';
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
      document.getElementById('editContactId').value = '';
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
  // EVENT BINDINGS
  // ========================================================================

  bindEvents() {
    // Top actions
    document.getElementById('addContactBtn').onclick = () => this.openAddEditContactModal();
    document.getElementById('emptyAddBtn').onclick = () => this.openAddEditContactModal();
    document.getElementById('quickLogBtn').onclick = () => this.openLogInteractionModal();
    document.getElementById('themeToggleBtn').onclick = () => this.toggleTheme();

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
    document.getElementById('enableSoundBtn').onclick = () => {
      this.playChime('success');
      this.showToast('Chime tested successfully!', 'info');
    };
    document.getElementById('loadSampleDataBtn').onclick = () => this.resetSampleData();
    document.getElementById('clearAllDataBtn').onclick = () => this.clearAllData();

    // Circle tab filters
    document.querySelectorAll('.circle-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.circle-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCircleFilter = tab.dataset.circle;
        this.renderContactsGrid();
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
    if (btnRestoreFromGoogleDrive && googleDriveRestoreInput) {
      btnRestoreFromGoogleDrive.onclick = () => googleDriveRestoreInput.click();
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
          this.currentCircleFilter = 'all';
          this.currentStatusFilter = 'all';
          document.querySelectorAll('.circle-tab').forEach(t => t.classList.remove('active'));
          const allTab = document.querySelector('.circle-tab[data-circle="all"]');
          if (allTab) allTab.classList.add('active');
          document.getElementById('statusFilterSelect').value = 'all';
          this.renderContactsGrid();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (navTarget === 'callbacks') {
          this.currentStatusFilter = 'owe_call';
          document.getElementById('statusFilterSelect').value = 'owe_call';
          this.renderContactsGrid();
          const deck = document.getElementById('promisedCallsDeck');
          if (deck && deck.style.display !== 'none') {
            deck.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (navTarget === 'settings') {
          document.getElementById('dataSettingsModal').style.display = 'flex';
        }
      };
    });

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
