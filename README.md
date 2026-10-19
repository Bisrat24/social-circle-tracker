# 🪐 Orbit — Social Circle & Connection Tracker

A personal relationship CRM designed to keep you connected with the friends, family, and people you never want to lose touch with. Built for **PC, Web, and Android** with **Google Account Cloud Sync**.

---

## 🌟 Why Orbit?

We all experience this:
1. You say *"I will call you back later!"* during a busy afternoon.
2. Life gets in the way, days or weeks slip by, and you forget.
3. Then, it feels awkward or intimidating to reach out after prolonged silence.
4. Slowly, valuable friendships fade away.

**Orbit solves this completely** by giving you an intuitive system to:
- **Never forget a callback**: High-visibility urgency deck for promises made.
- **Beat the awkwardness**: Built-in *Icebreaker Generator* with warm, disarming, guilt-free scripts to reconnect effortlessly.
- **Connection Leveler**: Automatically calculates and visualizes your relationship bond from Level 1 (*Acquaintance*) to Level 10 (*Soul Sibling*).
- **Reciprocity Tracking**: Rewards when friends initiate contact, keeping track of two-way balance.
- **Google Account Cloud Sync**: Seamlessly syncs your friends, notes, and levels between your Android phone and PC via private Google Drive AppData.
- **Android Ready**: Installable as a standalone Android app (PWA) and comes with a complete Android Studio native project.

---

## 📱 Android Version & How to Install

### 🌐 Live Cloud Web App & Direct APK Download (Version 1.0.3)

| Platform | Link | Description |
|---|---|---|
| **Live Cloud Web App** | [https://aerial-latency-5do0q.ship.place/](https://aerial-latency-5do0q.ship.place/) | 24/7 HTTPS cloud deployment with instant mobile & desktop access |
| **Direct APK Download** | [https://aerial-latency-5do0q.ship.place/Orbit.apk](https://aerial-latency-5do0q.ship.place/Orbit.apk) | Native signed Android APK (0.18 MB, v1+v2+v3 signatures, offline-capable) |

#### How to install it on your Android phone:
1. Tap the **[Download Orbit.apk](https://aerial-latency-5do0q.ship.place/Orbit.apk)** link on your phone.
2. Tap the downloaded file to install/update the app.
3. Grant **Contacts** and **Call Logs** permissions when prompted to enable 1-tap friend adding and call history auto-sync.
4. Enjoy easy relationship management!

---

## ☁️ Google Account & Cross-Device Sync

Orbit offers flexible ways to keep your social circle in sync between PC and Android:

### Method 1: Instant Google Account & Cloud Sync (Zero Setup)
- Click **"Sync with Google"** in the top header.
- Enter your **Google Email address** and click **"⚡ Connect Account"** — Orbit links your profile, personalizes your avatar, and activates cloud-ready sync automatically!
- **Pairing Key**: Copy your 32-character Sync Key and paste it into Orbit on any other device (or tap **"Pair & Sync"**) to immediately share and keep your contacts synchronized.
- Click **"💾 Save Backup to Google Drive"**: Orbit launches the native Android Share sheet with Google Drive pre-configured to upload your backup directly, or downloads the file on web.
- Click **"📥 Restore from Google Drive"**: Select any backup file directly from your Google Drive or local storage to restore all your friends, levels, and notes!

### Method 2: Real-Time PC ⇄ Android Local Wi-Fi Sync
- Double-click **`launch.bat`** (or **`host-mobile.bat`**) on your PC.
- Orbit launches on `http://localhost:5000/` and displays your phone access URL (e.g. `http://192.168.137.207:5000/`).
- Open this link on your phone (or tap **Sync** in the Android app): any updates made on PC or Android sync between both devices in real time!

### Method 3: Advanced Google Cloud OAuth 2.0 (Drive AppData)
- For automated background cloud sync into Google Drive's private `appDataFolder`, enter your Google Cloud OAuth Client ID under **Advanced** and click **"Sign in with Google OAuth"**.

---

## 💎 Core Features

### 1. ⏳ "I Promised to Call Back" Urgency Deck
Whenever someone reaches out or you promise to call back later, log it with one click:
- Sets a deadline (*Later today*, *Tomorrow*, *In 3 days*, *This weekend*).
- Pins the contact to the top in the pulsing **Promised Call Back Deck**.
- Once you call them back, click **"Call & Keep Promise"** to mark it fulfilled, clear the alert, and award bonus XP!

### 2. ⚡ Awkwardness-Busting Icebreaker Generator
Stuck feeling weird about calling back after 2 weeks or 6 months?
Click the **⚡ Icebreaker** button on any friend's card to access ready-to-send messages:
- **😅 Honest & Humorous Apology**: Disarming scripts that joke about being the worst at calling back.
- **🌿 Warm Reconnect**: Low-pressure check-ins acknowledging how quickly time flies.
- **💭 Thought of You**: Organic casual check-ins referencing past topics.
- **☕ Quick Invite**: 15-minute phone call or coffee date suggestions.
- **1-Click Actions**: Direct links to Call, WhatsApp, or SMS.

### 3. 📈 The Connection Leveler (Level 1 to 10)
Every interaction helps your connection grow:
| Level | Title | Description |
|---|---|---|
| **Lv 1-2** | 🌱 Acquaintance / Familiar Face | New connections, occasional contact |
| **Lv 3-4** | 🤝 Casual Friend / Good Pal | Regular friendly rapport |
| **Lv 5-6** | 💛 Solid Friend / Close Friend | Reliable bonds, frequent catch-ups |
| **Lv 7-8** | 🌟 Trusted Confidant / Inner Circle | Deep mutual trust and intimacy |
| **Lv 9-10** | 🔥 Ride-or-Die / Soul Sibling | Unshakable, lifelong friendship |

- **XP Engine**:
  - In-person hangout: **+35 XP**
  - Phone or Video call: **+25 XP**
  - Text / Voice message: **+15 XP**
  - **Reciprocity Bonus (They contacted you)**: **+15 Bonus XP!**
- **Dormancy Decay**:
  - If you go past your set rhythm (e.g. 14 days, 30 days), the connection will enter **🍂 Needs Water / Cooling Down** mode to alert you before you drift apart.
- **Manual Adjustment**:
  - Adjust any friend's level manually from the Profile modal slider at any time.

### 4. 🔄 Two-Way Reciprocity Ratio
Friendships are a two-way street. Orbit tracks who initiated each interaction and shows a visual split (`50% You / 50% Them`). If a friend regularly reaches out to you, their effort is highlighted and rewarded.

### 5. 💡 "Things to Ask Next Time" Memory Aid
Never draw a blank on your next call:
- Log details like upcoming job interviews, pets, family updates, or travel plans.
- They appear prominently on the contact card so you remember what to ask about right away.

---

## 🚀 Quick Launch Shortcuts

- **Launch on PC**: Double-click [`launch.bat`](file:///c:/Users/Bisrat/Documents/APPS/social-circle-tracker/launch.bat)
- **Host for Android Phone on Wi-Fi**: Double-click [`host-mobile.bat`](file:///c:/Users/Bisrat/Documents/APPS/social-circle-tracker/host-mobile.bat)
- **Native Android Studio Project**: Open [`android/`](file:///c:/Users/Bisrat/Documents/APPS/social-circle-tracker/android) in Android Studio
- **Backup & Restore**: Use **Settings (⚙️) ➔ Export All Data (JSON)** anytime.
