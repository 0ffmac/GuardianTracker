"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "es";

type Messages = Record<string, string>;

const messages: Record<Language, Messages> = {
  en: {
    // Navbar
    "nav.features": "Features",
    "nav.discover": "Discover",
    "nav.pricing": "Pricing",
    "nav.about": "About",
    "nav.overview": "Overview",
    "nav.map": "Map",
    "nav.metrics": "Metrics",
    "nav.analytics": "Analytics",
    "nav.settings": "Settings",
    "nav.signIn": "Sign In",
    "nav.signOut": "Sign Out",
    "nav.dashboard": "Dashboard",
    "nav.getStarted": "Get Started",
    "nav.lang.en": "EN",
    "nav.lang.es": "ES",

    // Hero
    "hero.badge": "The New Standard in Safety",
    "hero.body":
      "Experience next-level personal & family security. Military-grade encryption, intelligent route monitoring, and smart proximity alerts that detect unusual patterns, unfamiliar devices, and potential risks—keeping your loved ones safe and connected.",
    "hero.beginTrial": "Begin Trial",
    "hero.discoverMore": "Discover More",
    "hero.explore": "Explore",

    // Home CTA section
     "home.cta.title": "Uncompromised Security",
     "home.cta.body":
       "Join an exclusive network of individuals who prioritize safety above all else. Your peace of mind begins here.",
     "home.cta.startTrial": "Start Trial",
     "home.cta.contactSales": "Contact Sales",

    // Home Features section
     "home.features.badge": "Capability",
     "home.features.heading.line1": "Engineered for",
     "home.features.heading.line2": "Perfection.",
     "home.features.subtitle":
       "Every detail has been meticulously crafted to provide an experience that is as beautiful as it is secure.",
     "home.features.item1.title": "Elite Encryption",
     "home.features.item1.desc": "AES-256 protocols ensure your data remains accessible only to you.",
     "home.features.item2.title": "Precision GPS",
     "home.features.item2.desc": "Pinpoint accuracy within 3 meters, updated via premium satellite feeds.",
     "home.features.item3.title": "Legacy History",
     "home.features.item3.desc": "Retain detailed location logs for up to 30 days securely in the cloud.",
     "home.features.item4.title": "Private Circles",
     "home.features.item4.desc": "Curate exclusive groups for family or team members with custom rights.",
     "home.features.item5.title": "Instant Alerts",
     "home.features.item5.desc": "Micro-second latency notifications for zone entries and exits.",
     "home.features.item6.title": "Global Roaming",
     "home.features.item6.desc": "Uninterrupted service across 150+ nations without reconfiguration.",
     "home.features.item7.title": "Smart Efficiency",
     "home.features.item7.desc": "Optimized algorithms consume negligible battery life during operation.",
     "home.features.item8.title": "Emergency SOS",
     "home.features.item8.desc": "Priority distress signal broadcasting to your chosen emergency contacts.",

     // Dashboard overview
     "dashboard.loading": "Loading...",
     "dashboard.greeting": "Welcome back",
     "dashboard.overview.fallback": "Your overview",

     "dashboard.download.title": "Enable Real-Time Tracking",
     "dashboard.download.body": "Download the Guard Royal Client App to send live location data from your device.",
     "dashboard.download.button": "Download Client App",

     "dashboard.alerts.title": "Emergency Alerts",
     "dashboard.alerts.subtitle": "View alerts you have received from your trusted contacts or ones you have sent to them.",
     "dashboard.alerts.pendingMobileSuffix": "pending on your mobile",
     "dashboard.alerts.sentLast30Suffix": "sent in last 30 min",
     "dashboard.alerts.unreadSingle": "1 alert has a new audio reply from your contacts.",
     "dashboard.alerts.unreadMultipleSuffix": "alerts have new audio replies from your contacts.",
     "dashboard.alerts.tab.received": "Received",
     "dashboard.alerts.tab.sent": "Sent",

     "dashboard.live.title": "Live Tracking",
     "dashboard.live.subtitle": "The dashboard only shows live points while a device is actively reporting. Use the Map tab to explore history.",
     "dashboard.live.status.active": "Active",
      "dashboard.live.status.idle": "Idle",
      "dashboard.live.lastUpdatedPrefix": "Last seen",
      "dashboard.live.lastSeen.justNow": "just now",
      "dashboard.live.lastSeen.minsSuffix": "min ago",
      "dashboard.live.lastSeen.hoursSuffix": "hr ago",
 
      "dashboard.live.noActive": "No active tracking right now. Start the mobile app to see your live position here.",


     "dashboard.nearby.title": "Alerts & Nearby Contacts",
     "dashboard.nearby.subtitle": "See trusted contacts that are physically close to your live location.",
     "dashboard.nearby.radius": "Radius",
     "dashboard.nearby.share": "Share my live location",
     "dashboard.nearby.noLive": "Start the mobile app to enable nearby contact detection.",
     "dashboard.nearby.nonePrefix": "No trusted contacts within",
     "dashboard.nearby.noneSuffix": "km.",
     "dashboard.nearby.selectedPrefix": "Selected:",

     "dashboard.history.title": "Tracking History",
     "dashboard.history.label": "View Tracking History",
     "dashboard.history.defaultOption": "--- Select a Session to Visualize ---",
     "dashboard.history.stat.distance": "Distance",
     "dashboard.history.stat.duration": "Duration",
     "dashboard.history.stat.points": "Points",
     "dashboard.history.stat.devices": "Devices",
     "dashboard.history.wifiTitle": "Wi-Fi Networks Seen",
     "dashboard.history.wifiSummaryPrefix": "",
     "dashboard.history.wifiSummaryMiddle": "scan samples across",
     "dashboard.history.wifiSummarySuffix": "networks",
     "dashboard.history.wifiNoData": "No Wi-Fi data recorded for this session yet.",

     "dashboard.suspicious.title": "Suspicious observations",
     "dashboard.suspicious.body": "Once Guard Royal has enough tracking history, Wi-Fi and Bluetooth devices that seem to follow you across different places will be surfaced here.",
     "dashboard.suspicious.note": "You can explore full details in Settings – Suspicious Wi-Fi & Bluetooth Devices.",

     "dashboard.current.title": "Current Location",
     "dashboard.current.lat": "Latitude",
     "dashboard.current.lon": "Longitude",
     "dashboard.current.lastUpdated": "Last Updated",
 
      // Dashboard metrics
      "dashboard.metrics.title": "Tracking Metrics",
      "dashboard.metrics.session.label": "Session",
      "dashboard.metrics.wifiSeen.title": "Wi-Fi Networks Seen",
      "dashboard.metrics.wifiSeen.empty": "No Wi-Fi data recorded for this session yet.",
      "dashboard.metrics.wifiSeen.columns.ssid": "SSID",
      "dashboard.metrics.wifiSeen.columns.bssid": "BSSID",
      "dashboard.metrics.wifiSeen.columns.samples": "Samples",
      "dashboard.metrics.wifiSeen.columns.avgRssi": "Avg RSSI",
      "dashboard.metrics.wifiTop.title": "Wi-Fi Devices Most Time Nearby",
      "dashboard.metrics.wifiTop.columns.samplesProxy": "Samples (proxy for time)",
      "dashboard.metrics.wifi.hidden": "(hidden)",
      "dashboard.metrics.bleSeen.title": "Bluetooth Devices Seen",
      "dashboard.metrics.bleSeen.empty": "No BLE data recorded for this session yet.",
      "dashboard.metrics.bleSeen.columns.name": "Name",
      "dashboard.metrics.bleSeen.columns.address": "Address",
      "dashboard.metrics.bleSeen.columns.samples": "Samples",
      "dashboard.metrics.bleSeen.columns.avgRssi": "Avg RSSI",
      "dashboard.metrics.bleTop.title": "Bluetooth Devices Most Time Nearby",
      "dashboard.metrics.bleTop.columns.samplesProxy": "Samples (proxy for time)",
      "dashboard.metrics.ble.unknown": "(unknown)",
 
      // Dashboard analytics
      "analytics.hero.kicker": "Analytics & Threat Intelligence",
      "analytics.hero.title": "Alert & Stalker Analytics",
      "analytics.hero.body": "Understand how alerts unfold over time and which nearby devices consistently appear around emergency events.",

      "analytics.range.last7": "Last 7 days",
      "analytics.range.last30": "Last 30 days",
      "analytics.range.label": "Range:",

      "analytics.error.load": "Failed to load analytics:",

      "analytics.scope.label": "Alert scope",
      "analytics.scope.all": "All alerts",
      "analytics.scope.sent": "Alerts I sent",
      "analytics.scope.received": "Alerts I received",

      "analytics.time.label": "Time range",
      "analytics.time.relative": "Relative (last 7/30 days)",
      "analytics.time.custom": "Custom range",
      "analytics.time.from": "From",
      "analytics.time.to": "To",

      "analytics.compare.label": "Compare to previous period",

      "analytics.kpi.total": "Total alerts",
      "analytics.kpi.sent": "Sent",
      "analytics.kpi.received": "Received",
      "analytics.kpi.suspicious": "Suspicious devices",
      "analytics.kpi.prevPrefix": "prev",
      "analytics.kpi.deltaPrefix": "Δ",
      "analytics.kpi.nearSelectedAlertSuffix": "near selected alert",

      "analytics.alertsOverTime.title": "Alerts over time",
      "analytics.alertsOverTime.subtitlePrefix": "Buckets are per",
      "analytics.alertsOverTime.empty": "No alerts in this time range.",

      "analytics.focus.title": "Focus on a specific alert",
      "analytics.focus.body": "Select an alert to flag suspicious devices that were active around that time.",
      "analytics.focus.selectLabel": "Alert",
      "analytics.focus.allOption": "All alerts",

      "analytics.focus.legend.gps": "GPS points (from device GNSS)",
      "analytics.focus.legend.wifi": "Wi‑Fi only points (from AP fingerprints)",
      "analytics.focus.legend.hybrid": "Hybrid points (GPS + Wi‑Fi)",
      "analytics.focus.legend.nearAlert": "Devices marked \"seen near alert\" appeared within ~30 minutes of the selected alert.",

      "analytics.sessions.title": "Sessions correlation radar",
      "analytics.sessions.body": "Search across tracking sessions for Wi‑Fi and Bluetooth devices that follow you between different places in this time range. Known devices from your environment are marked so you can focus on potential stalker hardware.",
      "analytics.sessions.chip.sessionsSuffix": "sessions in range",
      "analytics.sessions.chip.devicesSuffix": "devices across selected sessions",
      "analytics.sessions.chip.suspiciousSuffix": "flagged as non‑trusted",
      "analytics.sessions.loading": "Loading sessions & environment…",

      "analytics.sessions.filter.label": "Session filter",
      "analytics.sessions.filter.placeholder": "Search by name, coffee shop, restaurant, club…",
      "analytics.sessions.filter.empty": "No sessions match this analytics time window yet.",
      "analytics.sessions.filter.token.cafe": "cafe",
      "analytics.sessions.filter.token.coffee": "coffee",
      "analytics.sessions.filter.token.restaurant": "restaurant",
      "analytics.sessions.filter.token.bar": "bar",
      "analytics.sessions.filter.token.club": "club",
      "analytics.sessions.filter.token.home": "home",

      "analytics.sessions.list.label": "Sessions in this range",
      "analytics.sessions.list.fallbackName": "Session",
      "analytics.sessions.list.unknownTime": "Unknown time",
      "analytics.sessions.list.selected": "Selected",
      "analytics.sessions.list.tapToInclude": "Tap to include",

      "analytics.sessions.deviceKind.label": "Device kind",
      "analytics.sessions.deviceKind.all": "All",
      "analytics.sessions.deviceKind.wifi": "Wi‑Fi",
      "analytics.sessions.deviceKind.ble": "Bluetooth",
      "analytics.sessions.hideTrusted": "Hide networks and devices already known in my environment",

      "analytics.sessions.radar.caption": "Each dot is a device seen across the selected sessions. Distance from center roughly follows how often it appears across sessions; size reflects total sightings. Red means devices you have not marked as known; green means you have marked them as known/trusted.",
      "analytics.sessions.radar.expand": "Expand radar view",

      "analytics.sessions.overlap.needMoreSessions": "Select at least two sessions on the left to see devices that follow you between different places (for example a coffee shop, a restaurant and later a club).",
      "analytics.sessions.overlap.none": "No overlapping devices found for the current filters. Try including more sessions or showing trusted devices as well.",
      "analytics.sessions.overlap.headers.device": "Device",
      "analytics.sessions.overlap.headers.kind": "Kind",
      "analytics.sessions.overlap.headers.sessions": "Sessions",
      "analytics.sessions.overlap.headers.totalSightings": "Total sightings",
      "analytics.sessions.overlap.headers.trusted": "Trusted",
      "analytics.sessions.overlap.paging.showingPrefix": "Showing",
      "analytics.sessions.overlap.paging.of": "of",
      "analytics.sessions.overlap.paging.page": "Page",
      "analytics.sessions.overlap.paging.pageOf": "of",
      "analytics.sessions.overlap.paging.prev": "Prev",
      "analytics.sessions.overlap.paging.next": "Next",

      "analytics.suspicious.title": "Top suspicious devices",
      "analytics.suspicious.body": "Devices that repeatedly appear near your app device in different places. These may represent potential trackers or stalker tools.",
      "analytics.suspicious.summary.none": "No suspicious devices for this range",
      "analytics.suspicious.summary.someSuffix": "devices flagged",
      "analytics.suspicious.empty": "No suspicious devices detected for this time range.",
      "analytics.suspicious.table.identifier": "Identifier",
      "analytics.suspicious.table.type": "Type",
      "analytics.suspicious.table.name": "Name",
      "analytics.suspicious.table.sightings": "Sightings",
      "analytics.suspicious.table.places": "Places",
      "analytics.suspicious.table.score": "Score",
      "analytics.suspicious.table.firstSeen": "First seen",
      "analytics.suspicious.table.lastSeen": "Last seen",
      "analytics.suspicious.table.nearAlert": "Near alert",
      "analytics.suspicious.table.trusted": "Trusted",
      "analytics.suspicious.nearAlertPill": "near alert",
      "analytics.suspicious.nearAlertNo": "no",
      "analytics.suspicious.na": "n/a",
      "analytics.suspicious.unknownName": "(unknown)",

      "analytics.trusted.known": "known",
      "analytics.trusted.markUntrusted": "mark as untrusted",
      "analytics.trusted.possibleTracker": "possible tracker",
      "analytics.trusted.markKnown": "mark as known",

      "analytics.modal.title": "Sessions correlation radar – full view",
      "analytics.modal.deviceKind.all": "All",
      "analytics.modal.deviceKind.wifi": "Wi‑Fi",
      "analytics.modal.deviceKind.ble": "Bluetooth",
      "analytics.modal.hideKnown": "Hide known devices",
      "analytics.modal.close": "Close",

      "analytics.modal.sessions.label": "Sessions in this range",
      "analytics.modal.sessions.empty": "No sessions match this analytics time window yet.",
      "analytics.modal.sessions.fallbackName": "Session",
      "analytics.modal.sessions.unknownTime": "Unknown time",
      "analytics.modal.sessions.selected": "Selected",
      "analytics.modal.sessions.tapToInclude": "Tap to include",

      "analytics.modal.devices.caption": "Devices seen across selected sessions. Click a row to select and inspect.",
      "analytics.modal.devices.empty": "No devices for the current session selection and filters.",
      "analytics.modal.group.routers": "Wi‑Fi routers & access points",
      "analytics.modal.group.mobiles": "Mobiles & phone hotspots",
      "analytics.modal.group.bluetooth": "Bluetooth devices",
      "analytics.modal.device.known": "known",
      "analytics.modal.device.possibleTracker": "possible tracker",

      "analytics.modal.zoom.near": "Near",
      "analytics.modal.zoom.medium": "Medium",
      "analytics.modal.zoom.far": "Far",
      "analytics.modal.legend.routers": "Wi‑Fi routers / access points",
      "analytics.modal.legend.mobiles": "Mobiles & phone hotspots",
      "analytics.modal.legend.bluetooth": "Bluetooth devices",
      "analytics.modal.legend.you": "You",
      "analytics.modal.description": "Animated rings show approximate distance bands (scaled by zoom). Each glowing bubble is a device seen across the selected sessions: icon and color show type, size reflects how often it appears, and the small bars indicate relative signal/visibility strength. When distance estimates are known, inline labels show the average meters along each connection line.",
      "analytics.modal.hover.sessions": "Sessions:",
      "analytics.modal.hover.sightings": "Sightings:",
      "analytics.modal.hover.avgDist": "Avg dist:",

      "analytics.modal.details.sessionsHeading": "Sessions where this device appears:",
      "analytics.modal.details.sightingsLabel": "sightings:",
      "analytics.modal.details.showMap": "Show map",
      "analytics.modal.details.inlineMapsTitle": "Inline session maps (last known paths)",
      "analytics.modal.details.clearMaps": "Clear maps",
      "analytics.modal.details.loadingMaps": "Loading session map data…",
      "analytics.modal.details.noSessions": "No devices for the current session selection and filters.",
      "analytics.modal.details.closeMap": "close",
      "analytics.modal.details.wifiFocus": "Wi‑Fi focus",
      "analytics.modal.details.bleFocus": "Bluetooth focus",
      "analytics.modal.details.openMap": "Open map",
      "analytics.modal.details.error.loadFailed": "Failed to load session map.",
 
 
         // Dashboard map





      "dashboard.map.title": "Tracking Map",
      "dashboard.map.suspicious.checking": "Checking for suspicious devices nearby...",
      "dashboard.map.suspicious.error": "Could not check for suspicious devices nearby.",
      "dashboard.map.suspicious.bannerPrefix": "Potential stalker devices detected nearby: ",
      "dashboard.map.suspicious.bannerSuffix": ". See details in Settings → Suspicious devices.",
      "dashboard.map.session.label": "Session",
      "dashboard.map.quality.label": "Quality",
      "dashboard.map.search.label": "Search",
      "dashboard.map.search.placeholder": "Name or date",
      "dashboard.map.quality.all": "All tracks",
      "dashboard.map.quality.good": "Good (green)",
      "dashboard.map.quality.regular": "Regular (orange)",
      "dashboard.map.quality.bad": "Not good (red)",
      "dashboard.map.buttons.route.title": "Toggle snapped route",
      "dashboard.map.buttons.wifi.title": "Toggle Wi‑Fi devices",
      "dashboard.map.buttons.ble.title": "Toggle Bluetooth devices",
      "dashboard.map.buttons.export.title": "Export all to Wigle",
      "dashboard.map.buttons.export.sr": "Export all to Wigle",
      "dashboard.map.legend.gps": "GPS",
      "dashboard.map.legend.wifi": "Wi‑Fi",
      "dashboard.map.legend.hybrid": "Hybrid (GPS + Wi‑Fi)",
      "dashboard.map.legend.focusPrefix": "Focused from analytics:",
      "dashboard.map.legend.focus.wifi": "Wi‑Fi",
      "dashboard.map.legend.focus.ble": "Bluetooth",
      "dashboard.map.osrm.confidencePrefix": "OSRM confidence:",
 
      // Alert list / emergency alerts

     "alerts.empty.title": "No emergency alerts yet",
     "alerts.empty.body": "When a trusted contact triggers Guard Royal from their mobile, active alerts – including audio messages and response status – will appear here.",
     "alerts.meta.fromPrefix": "From:",
     "alerts.status.resolvedNote": "This alert has been marked as resolved by the sender.",
     "alerts.status.inactiveNote": "This alert is no longer active.",
     "alerts.audio.header": "Audio Messages:",
     "alerts.audio.sendLabel": "Send audio message:",
     "alerts.recipients.title": "Recipients",
     "alerts.actions.note": "These actions update your response status for the sender; they do not send a text message.",
     "alerts.actions.markRead": "Mark as Read",
     "alerts.actions.acknowledge": "Acknowledge Alert",
     "alerts.actions.dismiss": "Dismiss Alert",
     "alerts.actions.confirmAcknowledge": "Do you want to acknowledge this alert?",
     "alerts.actions.confirmResolve": "Mark this alert thread as resolved?",
     "alerts.actions.resolveLabel": "Mark alert as resolved",
     "alerts.audio.aria.pause": "Pause",
     "alerts.audio.aria.play": "Play",
     "alerts.toggle.aria.close": "Close alert details",
     "alerts.toggle.aria.open": "Open alert details and play audio",
  
       // Footer



    "footer.slogan":
      "Redefining personal security for the modern era. We combine cutting-edge technology with timeless design principles.",
    "footer.sitemapTitle": "Sitemap",
    "footer.legalTitle": "Legal",
    "footer.newsletterTitle": "Newsletter",
    "footer.designedFor": "Designed for Excellence",

    "footer.sitemap.features": "Features",
    "footer.sitemap.discover": "Discover",
    "footer.sitemap.pricing": "Pricing",
    "footer.sitemap.about": "About",

    "footer.legal.privacy": "Privacy Policy",
    "footer.legal.terms": "Terms of Service",
    "footer.legal.cookies": "Cookie Policy",
    "footer.legal.licenses": "Licenses",

    "footer.newsletter.placeholder": "EMAIL ADDRESS",
    "footer.newsletter.aria": "Subscribe to newsletter",

    // About page
    "about.hero.titlePrefix": "About",
    "about.hero.subtitle": "Under Construction",
    "about.hero.body":
      "We’re burning the keyboard to GTD — building features, polishing flows, and charting the course. Check back soon for the full voyage log.",

    // Pricing page
    "pricing.plan.label": "Plan",
    "pricing.plan.free": "Free",
    "pricing.plan.description": "All core features included. Personal use. No ads.",
    "pricing.features.label": "What you get",
    "pricing.features.bullet1": "Real-time tracking & matched routes",
    "pricing.features.bullet2": "Signal fusion (GPS + Wi-Fi/BLE)",
    "pricing.features.bullet3": "Private sharing for trusted contacts",
    "pricing.features.bullet4": "Alerts and safety check-ins",
    "pricing.future.label": "Future",
    "pricing.future.body": "Open APIs, responder tooling, and enhanced analytics — driven by the community.",
 
     // Discover page - hero

    "discover.hero.titlePrefix": "Discover",
    "discover.hero.titleSuffix": "Technology",
    "discover.hero.body":
      "A modern safety platform combining precise map-matching, intelligent signal fusion, and privacy-first data handling to protect people in real time.",
    "discover.hero.pulse": "Live Detection Pulse",

    // Discover - technical pillars
    "discover.pillars.osrmTitle": "OSRM Map-Matching",
    "discover.pillars.osrmBody":
      "We snap GPS traces to real road segments using OSRM's map_match endpoint. Under the hood, a Hidden Markov Model with Viterbi search weighs emission (GPS noise) and transition (movement) probabilities to output a clean, navigable path with a confidence score.",
    "discover.pillars.fusionTitle": "Signal Fusion",
    "discover.pillars.fusionBody":
      "Alongside GPS, the mobile app optionally collects Wi-Fi BSSIDs and BLE beacons. We store these as time-bound observations and use them to stabilize position indoors, flag unfamiliar devices, and detect proximity patterns that could indicate harassment or tracking.",
    "discover.pillars.privacyTitle": "Privacy by Design",
    "discover.pillars.privacyBody":
      "All personally identifiable data stays within our infrastructure. We never sell to third parties. Access is strictly scoped per user, with auditing, short-lived tokens, and encryption at rest and in transit.",

    // Discover - data flow
    "discover.dataFlow.title": "Data Flow",
    "discover.dataFlow.step1":
      "1) Mobile app posts batched or live points to /api/update_location. Poor-accuracy points are filtered and short hops under a few meters are skipped to reduce jitter.",
    "discover.dataFlow.step2":
      "2) The server persists rows in Location and links optional WifiScan/BleScan records for proximity intelligence.",
    "discover.dataFlow.step3":
      "3) For route visualization, recent points are sent to /api/map_match, which calls OSRM and returns a GeoJSON geometry and confidence.",
    "discover.dataFlow.prismaTitle": "Prisma Models",
    "discover.dataFlow.prismaBody": "User, Device, Location, WifiScan, BleScan, TrackingSession",
    "discover.dataFlow.filtersTitle": "Filters",
    "discover.dataFlow.filtersBody": "Accuracy threshold, min-distance dedupe, session scoping",

    // Discover - alerts cards
    "discover.cards.alertsTitle": "Realtime Alerts",
    "discover.cards.alertsBody":
      "Configurable triggers watch for events like sudden stops, long idle in unsafe areas, unusual detours, or unknown devices shadowing you. When thresholds trip, alerts can auto-notify trusted contacts and, where configured, local responders.",
    "discover.cards.alerts.commuter":
      "Commuter safety: If your route deviates significantly at night, the app asks for confirmation and can share your live session.",
    "discover.cards.alerts.stalking":
      "Device stalking: Repeated BLE MAC near you across time windows raises severity from ‘notice’ → ‘warning’ → ‘urgent’.",
    "discover.cards.alerts.stranded":
      "Stranded: No movement + low battery + late hours can notify your emergency contact with last matched route.",

    "discover.cards.healthTitle": "Health & Safety",
    "discover.cards.healthBody":
      "With opt-in, motion and heart-rate signals (via wearables) highlight potential falls or cardiac events, prompting fast welfare checks and sharing the last matched route.",
    "discover.cards.health.fall":
      "Fall detection: Sudden acceleration + no subsequent motion can ping a caregiver with location and time.",
    "discover.cards.health.cardiac":
      "Cardiac risk: Abnormal HR patterns paired with low movement triggers a ‘check-in’ prompt before notifying contacts.",
    "discover.cards.health.outdoor":
      "Outdoor activity: Hiking alone? Share a timed session that escalates if you don’t return by sunset.",

    "discover.cards.mobileTitle": "Mobile + Web",
    "discover.cards.mobileBody":
      "The website mirrors the mobile feed for authorized viewers, so the right people see the right data at the right time.",
    "discover.cards.mobile.family":
      "Family check-ins: Share a live session link that auto-expires when you arrive safely.",
    "discover.cards.mobile.care":
      "Care circles: Caregivers can get notified and follow the snapped route when someone needs help.",
    "discover.cards.mobile.public":
      "Public safety: In emergencies, generate a restricted view for responders with only the essentials.",

    // Discover - mission & vision
    "discover.mission.title": "Mission & Vision",
    "discover.mission.body":
      "Our mission is simple: give people the tools to be found fast and to deter harm. The vision is a world where location data serves the user first—private, precise, and actionable—so that police, medics, and loved ones reach you when seconds matter.",

    // Discover - legal & privacy
    "discover.legal.title": "Legal & Privacy",
    "discover.legal.consent":
      "Consent: Users control data collection and sharing. Trusted contacts must be explicitly added by the user. For minors, guardians manage consent.",
    "discover.legal.use":
      "Data Use: We use your data to provide core features (routing, alerts, dashboards). We do not sell data. We do not share with third parties or big ad networks.",
    "discover.legal.security":
      "Security: TLS in transit; encryption at rest. Strict RBAC; short-lived sessions; audit logs. Suspect access is flagged and rate-limited.",
    "discover.legal.retention":
      "Retention: Raw telemetry is minimized. You can request export or deletion. Aggregated analytics are anonymized.",
    "discover.legal.public":
      "Public Information: When we show public view links, they are scoped to specific sessions with expiring tokens and redaction of sensitive fields.",

    // Discover - CTA
    "discover.cta.title": "Ready to Explore More?",
     "discover.cta.body":
       "Start a private trial or talk to us about tailored deployments for families, health, or public safety.",
     "discover.cta.start": "Start Trial",
     "discover.cta.contact": "Contact",

     // Settings page
     "settings.page.title": "Settings",
     "settings.danger.title": "Danger Zone",
     "settings.danger.body":
       "Delete all your location history, devices, tracking sessions, and your account. This action is irreversible.",
     "settings.danger.button.idle": "Delete All My Data",
     "settings.danger.button.loading": "Deleting...",

     "settings.account.title": "Account & Contacts",
     "settings.account.profile.title": "Profile",
     "settings.account.profile.body": "Update the information that appears in your dashboard and for trusted contacts.",
     "settings.account.profile.avatarNote": "This avatar will appear in the navigation bar.",
     "settings.account.profile.nameLabel": "Name",
     "settings.account.profile.emailLabel": "Email",
     "settings.account.profile.avatarLabel": "Avatar URL",
     "settings.account.profile.save": "Save Profile",

     "settings.privacy.title": "Privacy",
     "settings.privacy.body": "Control whether your live location can be used to find nearby trusted contacts.",
     "settings.privacy.helper": "When enabled, your last known position is used to calculate distances to your accepted contacts.",
     "settings.privacy.shareToggle": "Share my live location",

     "settings.map.title": "Map Experience",
     "settings.map.body": "Choose between the built-in map and Google 3D Maps when you provide your own API key.",
     "settings.map.apiKeyLabel": "Google Maps API key",
     "settings.map.apiKeyPlaceholder": "Paste your Google Maps API key",
     "settings.map.apiKeyHelper": "Restrict this key by HTTP referrer in your Google Cloud Console. It is stored only for your account.",
     "settings.map.useGoogle3D": "Use Google 3D Maps on the dashboard when this key is set",
     "settings.map.useGoogle3D.addKeySuffix": " (add a key first)",
     "settings.map.save.idle": "Save map settings",
     "settings.map.save.loading": "Saving...",
     "settings.map.loadingSaved": "Loading saved map settings...",

     "settings.contacts.title": "Emergency Contacts",
     "settings.contacts.body": "Add trusted people who can receive alerts about your location. Only existing Guard Royal accounts can be added for now.",
     "settings.contacts.inputPlaceholder": "Contact's email address",
     "settings.contacts.add.idle": "Add Contact",
     "settings.contacts.add.loading": "Adding...",
     "settings.contacts.deleteAll": "Delete all",
     "settings.contacts.remove.idle": "Remove",
     "settings.contacts.remove.loading": "Removing...",
     "settings.contacts.trustedBy.title": "People Who Trust You",
     "settings.contacts.trustedBy.body": "These people have added you as an emergency contact in their Guard Royal account.",
     "settings.contacts.trustedBy.summary.one": "You are an emergency contact for 1 person.",
     "settings.contacts.trustedBy.summary.manyPrefix": "You are an emergency contact for",
     "settings.contacts.trustedBy.summary.manySuffix": "people.",
     "settings.contacts.empty": "No emergency contacts yet.",
     "settings.contacts.flags.emergencyAlerts": "Emergency alerts",
     "settings.contacts.flags.callsMessages": "Calls & messages",
     "settings.contacts.trustedBy.pendingTitle": "Pending emergency contact requests",
     "settings.contacts.trustedBy.pendingPrefix": "You have",
     "settings.contacts.trustedBy.pendingSuffix": "pending request to become an emergency contact.",
     "settings.contacts.trustedBy.pendingSuffixPlural": "pending requests to become an emergency contact.",
     "settings.contacts.trustedBy.empty": "No one has added you as an emergency contact yet.",
 
      "settings.sessions.title": "Tracking Sessions",
     "settings.sessions.body": "View, inspect and delete recorded tracking sessions from your devices.",
     "settings.sessions.deleteAll": "Delete all",
     "settings.sessions.loading": "Loading...",
     "settings.sessions.empty": "No tracking sessions found yet. They will appear here when you use live tracking.",
     "settings.sessions.listTitle": "Sessions",
     "settings.sessions.sessionFallback": "Session",
     "settings.sessions.quality.good": "Good",
     "settings.sessions.quality.bad": "Not good",
     "settings.sessions.quality.regular": "Regular",
     "settings.sessions.details.title": "Session details",
     "settings.sessions.details.viewEnv.idle": "View environment metrics",
     "settings.sessions.details.viewEnv.loading": "Loading environment...",
     "settings.sessions.details.selectPrompt": "Select a session on the left to see its details.",
     "settings.sessions.details.name": "Name",
     "settings.sessions.details.duration": "Duration",
     "settings.sessions.details.durationUnknown": "Unknown",
     "settings.sessions.details.points": "Points",
     "settings.sessions.details.devices": "Devices in session",
     "settings.sessions.details.devicesNone": "No device info",
     "settings.sessions.edit.label": "Edit session name / tag",
     "settings.sessions.edit.placeholder": "e.g. Morning commute, City test drive",
     "settings.sessions.edit.helper": "Give this track a short label to make it easier to find later.",
     "settings.sessions.rating.label": "Quality rating",
     "settings.sessions.rating.good": "Good (green)",
     "settings.sessions.rating.regular": "Regular (orange)",
     "settings.sessions.rating.bad": "Not good (red)",
     "settings.sessions.saveMeta.idle": "Save tag & rating",
     "settings.sessions.saveMeta.loading": "Saving...",
     "settings.sessions.row.delete": "Delete",
     "settings.sessions.row.deleting": "Deleting...",
 
     "settings.nearby.title": "Nearby Wi-Fi & Bluetooth Devices",
     "settings.nearby.refresh.idle": "Refresh",
     "settings.nearby.refresh.loading": "Refreshing...",
     "settings.nearby.body": "See Wi-Fi networks and Bluetooth devices that have been recently observed near you.",
     "settings.nearby.loading": "Loading nearby devices...",
     "settings.nearby.empty": "No nearby devices recorded yet. Start a tracking session or use the mobile app to see devices here.",
     "settings.nearby.wifiHeading": "Wi-Fi devices",
     "settings.nearby.bluetoothHeading": "Bluetooth devices",
     "settings.nearby.hiddenNetwork": "Hidden network",
     "settings.nearby.manufacturer": "Manufacturer:",
     "settings.nearby.partOfSessions": "Part of sessions",
     "settings.nearby.delete": "Delete",
     "settings.nearby.firstSeen": "First seen:",
     "settings.nearby.lastSeen": "Last seen:",
     "settings.nearby.scans": "Scans:",
     "settings.nearby.nearDuration": "Near you for ~",
     "settings.nearby.unknownDevice": "Unknown device",
     "settings.nearby.address": "Address:",

     "settings.suspicious.title": "Suspicious Wi-Fi & Bluetooth Devices",
     "settings.suspicious.body": "Based on your tracking history, these devices have been seen many times across different places for the selected session's device.",
     "settings.suspicious.loading": "Loading suspicious devices...",
     "settings.suspicious.emptyTitle": "No suspicious devices detected yet.",
     "settings.suspicious.emptyBody": "As you build up tracking history, Wi-Fi and Bluetooth devices that repeatedly appear across different places near you will be highlighted here.",
     "settings.suspicious.wifiHeading": "Wi-Fi devices",
     "settings.suspicious.bluetoothHeading": "Bluetooth devices",
     "settings.suspicious.unknownWifi": "Unknown Wi-Fi device",
     "settings.suspicious.unknownBle": "Unknown Bluetooth device",
     "settings.suspicious.bssid": "BSSID:",
     "settings.suspicious.address": "Address:",
     "settings.suspicious.score": "Score:",
     "settings.suspicious.places": "Places:",
     "settings.suspicious.firstSeen": "First seen:",
     "settings.suspicious.lastSeen": "Last seen:",
     "settings.suspicious.sightings": "Sightings:",

     "settings.alerts.title": "Alerts",
     "settings.alerts.body": "See alerts you've sent or received, and filter them.",
     "settings.alerts.deleteAll": "Delete all",
     "settings.alerts.typeLabel": "Type",
     "settings.alerts.type.sent": "Sent",
     "settings.alerts.type.received": "Received",
     "settings.alerts.statusLabel": "Status",
     "settings.alerts.loading": "Loading alerts...",
     "settings.alerts.empty": "No alerts found for this filter. Trigger or receive an alert and they'll appear here.",
     "settings.alerts.item.fallbackTitle": "Alert",
     "settings.alerts.item.delete": "Delete",
     "settings.alerts.item.recipients": "Recipients:",
     "settings.alerts.item.audioMessages": "Audio messages:",
     "settings.alerts.item.myStatus": "My status:",

    },
    es: {

    // Navbar
    "nav.features": "Funciones",
    "nav.discover": "Descubrir",
    "nav.pricing": "Precios",
    "nav.about": "Acerca de",
    "nav.overview": "Resumen",
    "nav.map": "Mapa",
    "nav.metrics": "Métricas",
    "nav.analytics": "Analítica",
    "nav.settings": "Ajustes",
    "nav.signIn": "Iniciar sesión",
    "nav.signOut": "Cerrar sesión",
    "nav.dashboard": "Panel",
    "nav.getStarted": "Empezar",
    "nav.lang.en": "EN",
    "nav.lang.es": "ES",

    // Hero
    "hero.badge": "El nuevo estándar en seguridad",
    "hero.body":
      "Experimenta un nivel superior de seguridad personal y familiar. Cifrado de nivel militar, monitorización inteligente de rutas y alertas de proximidad que detectan patrones inusuales, dispositivos desconocidos y riesgos potenciales para mantener a tus seres queridos seguros y conectados.",
    "hero.beginTrial": "Comenzar prueba",
    "hero.discoverMore": "Descubrir más",
    "hero.explore": "Explorar",

    // Home CTA section
     "home.cta.title": "Seguridad sin concesiones",
     "home.cta.body":
       "Únete a una red exclusiva de personas que priorizan la seguridad por encima de todo. Tu tranquilidad comienza aquí.",
     "home.cta.startTrial": "Iniciar prueba",
     "home.cta.contactSales": "Contactar ventas",

    // Home Features section
     "home.features.badge": "Capacidades",
     "home.features.heading.line1": "Diseñado para",
     "home.features.heading.line2": "la perfección.",
     "home.features.subtitle":
       "Cada detalle ha sido cuidadosamente creado para ofrecer una experiencia tan bella como segura.",
     "home.features.item1.title": "Cifrado de élite",
     "home.features.item1.desc": "Los protocolos AES-256 garantizan que tus datos solo sean accesibles para ti.",
     "home.features.item2.title": "GPS de precisión",
     "home.features.item2.desc": "Precisión de hasta 3 metros, actualizada mediante señales satelitales premium.",
     "home.features.item3.title": "Historial extendido",
     "home.features.item3.desc": "Conserva registros de ubicación detallados hasta 30 días de forma segura en la nube.",
     "home.features.item4.title": "Círculos privados",
     "home.features.item4.desc": "Crea grupos exclusivos para familia o equipo con permisos personalizados.",
     "home.features.item5.title": "Alertas instantáneas",
     "home.features.item5.desc": "Notificaciones casi instantáneas al entrar o salir de zonas definidas.",
     "home.features.item6.title": "Cobertura global",
     "home.features.item6.desc": "Servicio ininterrumpido en más de 150 países sin reconfiguración.",
     "home.features.item7.title": "Eficiencia inteligente",
     "home.features.item7.desc": "Algoritmos optimizados que apenas consumen batería durante la operación.",
     "home.features.item8.title": "SOS de emergencia",
     "home.features.item8.desc": "Señal de auxilio prioritaria a los contactos de emergencia que elijas.",
 
     // Dashboard overview
     "dashboard.loading": "Cargando...",
     "dashboard.greeting": "Bienvenido de nuevo",
     "dashboard.overview.fallback": "Tu panel",

     "dashboard.download.title": "Activa el seguimiento en tiempo real",
     "dashboard.download.body": "Descarga la app Guard Royal Client para enviar datos de ubicación en vivo desde tu dispositivo.",
     "dashboard.download.button": "Descargar app cliente",

     "dashboard.alerts.title": "Alertas de emergencia",
     "dashboard.alerts.subtitle": "Consulta las alertas que has recibido de tus contactos de confianza o las que les has enviado.",
     "dashboard.alerts.pendingMobileSuffix": "pendientes en tu móvil",
     "dashboard.alerts.sentLast30Suffix": "enviadas en los últimos 30 min",
     "dashboard.alerts.unreadSingle": "1 alerta tiene una nueva respuesta de audio de tus contactos.",
     "dashboard.alerts.unreadMultipleSuffix": "alertas tienen nuevas respuestas de audio de tus contactos.",
     "dashboard.alerts.tab.received": "Recibidas",
     "dashboard.alerts.tab.sent": "Enviadas",

     "dashboard.live.title": "Seguimiento en vivo",
     "dashboard.live.subtitle": "El panel solo muestra puntos en vivo mientras un dispositivo está informando activamente. Usa la pestaña Mapa para explorar el historial.",
      "dashboard.live.status.active": "Activo",
      "dashboard.live.status.idle": "Inactivo",
      "dashboard.live.lastUpdatedPrefix": "Visto por última vez",
      "dashboard.live.lastSeen.justNow": "hace un momento",
      "dashboard.live.lastSeen.minsSuffix": "min",
      "dashboard.live.lastSeen.hoursSuffix": "h",
 
      "dashboard.live.noActive": "No hay seguimiento activo ahora mismo. Abre la app móvil para ver aquí tu posición en vivo.",


     "dashboard.nearby.title": "Alertas y contactos cercanos",
     "dashboard.nearby.subtitle": "Muestra contactos de confianza que están físicamente cerca de tu ubicación en vivo.",
     "dashboard.nearby.radius": "Radio",
     "dashboard.nearby.share": "Compartir mi ubicación en vivo",
     "dashboard.nearby.noLive": "Abre la app móvil para activar la detección de contactos cercanos.",
     "dashboard.nearby.nonePrefix": "No hay contactos de confianza dentro de",
     "dashboard.nearby.noneSuffix": "km.",
     "dashboard.nearby.selectedPrefix": "Seleccionado:",

     "dashboard.history.title": "Historial de seguimiento",
     "dashboard.history.label": "Ver historial de seguimiento",
     "dashboard.history.defaultOption": "--- Selecciona una sesión para visualizar ---",
     "dashboard.history.stat.distance": "Distancia",
     "dashboard.history.stat.duration": "Duración",
     "dashboard.history.stat.points": "Puntos",
     "dashboard.history.stat.devices": "Dispositivos",
     "dashboard.history.wifiTitle": "Redes Wi‑Fi vistas",
     "dashboard.history.wifiSummaryPrefix": "",
     "dashboard.history.wifiSummaryMiddle": "muestras de escaneo en",
     "dashboard.history.wifiSummarySuffix": "redes",
     "dashboard.history.wifiNoData": "Aún no hay datos Wi‑Fi registrados para esta sesión.",

     "dashboard.suspicious.title": "Observaciones sospechosas",
     "dashboard.suspicious.body": "Cuando Guard Royal tenga suficiente historial de rutas, las redes Wi‑Fi y dispositivos Bluetooth que parezcan seguirte por distintos lugares aparecerán aquí.",
     "dashboard.suspicious.note": "Puedes ver todos los detalles en Ajustes – Dispositivos Wi‑Fi y Bluetooth sospechosos.",

     "dashboard.current.title": "Ubicación actual",
     "dashboard.current.lat": "Latitud",
     "dashboard.current.lon": "Longitud",
      "dashboard.current.lastUpdated": "Última actualización",
 
      // Dashboard metrics
      "dashboard.metrics.title": "Métricas de seguimiento",
      "dashboard.metrics.session.label": "Sesión",
      "dashboard.metrics.wifiSeen.title": "Redes Wi‑Fi vistas",
      "dashboard.metrics.wifiSeen.empty": "Aún no hay datos Wi‑Fi registrados para esta sesión.",
      "dashboard.metrics.wifiSeen.columns.ssid": "SSID",
      "dashboard.metrics.wifiSeen.columns.bssid": "BSSID",
      "dashboard.metrics.wifiSeen.columns.samples": "Muestras",
      "dashboard.metrics.wifiSeen.columns.avgRssi": "RSSI medio",
      "dashboard.metrics.wifiTop.title": "Redes Wi‑Fi más tiempo cerca",
      "dashboard.metrics.wifiTop.columns.samplesProxy": "Muestras (aprox. tiempo)",
      "dashboard.metrics.wifi.hidden": "(oculta)",
      "dashboard.metrics.bleSeen.title": "Dispositivos Bluetooth vistos",
      "dashboard.metrics.bleSeen.empty": "Aún no hay datos BLE registrados para esta sesión.",
      "dashboard.metrics.bleSeen.columns.name": "Nombre",
      "dashboard.metrics.bleSeen.columns.address": "Dirección",
      "dashboard.metrics.bleSeen.columns.samples": "Muestras",
      "dashboard.metrics.bleSeen.columns.avgRssi": "RSSI medio",
      "dashboard.metrics.bleTop.title": "Dispositivos Bluetooth más tiempo cerca",
      "dashboard.metrics.bleTop.columns.samplesProxy": "Muestras (aprox. tiempo)",
      "dashboard.metrics.ble.unknown": "(desconocido)",
 
      // Dashboard analytics
      "analytics.hero.kicker": "Analítica y detección de amenazas",
      "analytics.hero.title": "Analítica de alertas y acoso",
      "analytics.hero.body": "Comprende cómo se desarrollan las alertas en el tiempo y qué dispositivos cercanos aparecen de forma constante alrededor de los eventos de emergencia.",

      "analytics.range.last7": "Últimos 7 días",
      "analytics.range.last30": "Últimos 30 días",
      "analytics.range.label": "Rango:",

      "analytics.error.load": "Error al cargar la analítica:",

      "analytics.scope.label": "Ámbito de alertas",
      "analytics.scope.all": "Todas las alertas",
      "analytics.scope.sent": "Alertas que he enviado",
      "analytics.scope.received": "Alertas que he recibido",

      "analytics.time.label": "Intervalo de tiempo",
      "analytics.time.relative": "Relativo (últimos 7/30 días)",
      "analytics.time.custom": "Rango personalizado",
      "analytics.time.from": "Desde",
      "analytics.time.to": "Hasta",

      "analytics.compare.label": "Comparar con el periodo anterior",

      "analytics.kpi.total": "Alertas totales",
      "analytics.kpi.sent": "Enviadas",
      "analytics.kpi.received": "Recibidas",
      "analytics.kpi.suspicious": "Dispositivos sospechosos",
      "analytics.kpi.prevPrefix": "previo",
      "analytics.kpi.deltaPrefix": "Δ",
      "analytics.kpi.nearSelectedAlertSuffix": "cerca de la alerta seleccionada",

      "analytics.alertsOverTime.title": "Alertas en el tiempo",
      "analytics.alertsOverTime.subtitlePrefix": "Los intervalos son por",
      "analytics.alertsOverTime.empty": "No hay alertas en este intervalo de tiempo.",

      "analytics.focus.title": "Foco en una alerta concreta",
      "analytics.focus.body": "Selecciona una alerta para resaltar los dispositivos sospechosos que estaban activos alrededor de ese momento.",
      "analytics.focus.selectLabel": "Alerta",
      "analytics.focus.allOption": "Todas las alertas",

      "analytics.focus.legend.gps": "Puntos GPS (del GNSS del dispositivo)",
      "analytics.focus.legend.wifi": "Puntos solo Wi‑Fi (a partir de puntos de acceso)",
      "analytics.focus.legend.hybrid": "Puntos híbridos (GPS + Wi‑Fi)",
      "analytics.focus.legend.nearAlert": "Los dispositivos marcados como \"vistos cerca de la alerta\" aparecieron en ~30 minutos alrededor de la alerta seleccionada.",
 
      "analytics.sessions.title": "Radar de correlación de sesiones",
      "analytics.sessions.body": "Busca en tus sesiones de seguimiento dispositivos Wi‑Fi y Bluetooth que te sigan entre distintos lugares en este intervalo. Los dispositivos conocidos en tu entorno se marcan para que puedas centrarte en hardware potencialmente perseguidor.",
      "analytics.sessions.chip.sessionsSuffix": "sesiones en el intervalo",
      "analytics.sessions.chip.devicesSuffix": "dispositivos en las sesiones seleccionadas",
      "analytics.sessions.chip.suspiciousSuffix": "marcados como no confiables",
      "analytics.sessions.loading": "Cargando sesiones y entorno…",

      "analytics.sessions.filter.label": "Filtro de sesiones",
      "analytics.sessions.filter.placeholder": "Busca por nombre, cafetería, restaurante, club…",
      "analytics.sessions.filter.empty": "Aún no hay sesiones que coincidan con este rango de analítica.",
      "analytics.sessions.filter.token.cafe": "cafetería",
      "analytics.sessions.filter.token.coffee": "café",
      "analytics.sessions.filter.token.restaurant": "restaurante",
      "analytics.sessions.filter.token.bar": "bar",
      "analytics.sessions.filter.token.club": "club",
      "analytics.sessions.filter.token.home": "casa",

      "analytics.sessions.list.label": "Sesiones en este intervalo",
      "analytics.sessions.list.fallbackName": "Sesión",
      "analytics.sessions.list.unknownTime": "Hora desconocida",
      "analytics.sessions.list.selected": "Seleccionada",
      "analytics.sessions.list.tapToInclude": "Toca para incluir",

      "analytics.sessions.deviceKind.label": "Tipo de dispositivo",
      "analytics.sessions.deviceKind.all": "Todos",
      "analytics.sessions.deviceKind.wifi": "Wi‑Fi",
      "analytics.sessions.deviceKind.ble": "Bluetooth",
      "analytics.sessions.hideTrusted": "Ocultar redes y dispositivos ya conocidos en mi entorno",

      "analytics.sessions.radar.caption": "Cada punto es un dispositivo visto en las sesiones seleccionadas. La distancia al centro refleja de forma aproximada en cuántas sesiones aparece; el tamaño refleja el número total de apariciones. Rojo indica dispositivos que no has marcado como conocidos; verde indica dispositivos marcados como conocidos/confiables.",
      "analytics.sessions.radar.expand": "Ampliar vista de radar",

      "analytics.sessions.overlap.needMoreSessions": "Selecciona al menos dos sesiones a la izquierda para ver dispositivos que te siguen entre distintos lugares (por ejemplo una cafetería, un restaurante y luego un club).",
      "analytics.sessions.overlap.none": "No se encontraron dispositivos solapados para los filtros actuales. Prueba a incluir más sesiones o mostrar también los dispositivos de confianza.",
      "analytics.sessions.overlap.headers.device": "Dispositivo",
      "analytics.sessions.overlap.headers.kind": "Tipo",
      "analytics.sessions.overlap.headers.sessions": "Sesiones",
      "analytics.sessions.overlap.headers.totalSightings": "Avistamientos totales",
      "analytics.sessions.overlap.headers.trusted": "Confiable",
      "analytics.sessions.overlap.paging.showingPrefix": "Mostrando",
      "analytics.sessions.overlap.paging.of": "de",
      "analytics.sessions.overlap.paging.page": "Página",
      "analytics.sessions.overlap.paging.pageOf": "de",
      "analytics.sessions.overlap.paging.prev": "Anterior",
      "analytics.sessions.overlap.paging.next": "Siguiente",

      "analytics.suspicious.title": "Dispositivos sospechosos principales",
      "analytics.suspicious.body": "Dispositivos que aparecen repetidamente cerca de tu dispositivo en distintos lugares. Pueden representar rastreadores o herramientas de acoso.",
      "analytics.suspicious.summary.none": "No hay dispositivos sospechosos para este intervalo",
      "analytics.suspicious.summary.someSuffix": "dispositivos marcados",
      "analytics.suspicious.empty": "No se detectaron dispositivos sospechosos para este intervalo de tiempo.",
      "analytics.suspicious.table.identifier": "Identificador",
      "analytics.suspicious.table.type": "Tipo",
      "analytics.suspicious.table.name": "Nombre",
      "analytics.suspicious.table.sightings": "Avistamientos",
      "analytics.suspicious.table.places": "Lugares",
      "analytics.suspicious.table.score": "Puntuación",
      "analytics.suspicious.table.firstSeen": "Primera vez",
      "analytics.suspicious.table.lastSeen": "Última vez",
      "analytics.suspicious.table.nearAlert": "Cerca de alerta",
      "analytics.suspicious.table.trusted": "Confiable",
      "analytics.suspicious.nearAlertPill": "cerca de alerta",
      "analytics.suspicious.nearAlertNo": "no",
      "analytics.suspicious.na": "n/d",
      "analytics.suspicious.unknownName": "(desconocido)",

      "analytics.trusted.known": "conocido",
      "analytics.trusted.markUntrusted": "marcar como no confiable",
      "analytics.trusted.possibleTracker": "posible rastreador",
      "analytics.trusted.markKnown": "marcar como conocido",

      "analytics.modal.title": "Radar de correlación de sesiones – vista completa",
      "analytics.modal.deviceKind.all": "Todos",
      "analytics.modal.deviceKind.wifi": "Wi‑Fi",
      "analytics.modal.deviceKind.ble": "Bluetooth",
      "analytics.modal.hideKnown": "Ocultar dispositivos conocidos",
      "analytics.modal.close": "Cerrar",

      "analytics.modal.sessions.label": "Sesiones en este intervalo",
      "analytics.modal.sessions.empty": "Aún no hay sesiones que coincidan con este rango de analítica.",
      "analytics.modal.sessions.fallbackName": "Sesión",
      "analytics.modal.sessions.unknownTime": "Hora desconocida",
      "analytics.modal.sessions.selected": "Seleccionada",
      "analytics.modal.sessions.tapToInclude": "Toca para incluir",

      "analytics.modal.devices.caption": "Dispositivos vistos en las sesiones seleccionadas. Haz clic en una fila para seleccionarla y examinarla.",
      "analytics.modal.devices.empty": "No hay dispositivos para la selección de sesiones y filtros actuales.",
      "analytics.modal.group.routers": "Routers y puntos de acceso Wi‑Fi",
      "analytics.modal.group.mobiles": "Móviles y puntos de acceso de teléfono",
      "analytics.modal.group.bluetooth": "Dispositivos Bluetooth",
      "analytics.modal.device.known": "conocido",
      "analytics.modal.device.possibleTracker": "posible rastreador",

      "analytics.modal.zoom.near": "Cerca",
      "analytics.modal.zoom.medium": "Medio",
      "analytics.modal.zoom.far": "Lejos",
      "analytics.modal.legend.routers": "Routers / puntos de acceso Wi‑Fi",
      "analytics.modal.legend.mobiles": "Móviles y puntos de acceso de teléfono",
      "analytics.modal.legend.bluetooth": "Dispositivos Bluetooth",
      "analytics.modal.legend.you": "Tú",
      "analytics.modal.description": "Los anillos animados muestran bandas de distancia aproximadas (según el zoom). Cada burbuja brillante es un dispositivo visto en las sesiones seleccionadas: el icono y el color indican el tipo, el tamaño refleja con qué frecuencia aparece y las pequeñas barras indican la intensidad relativa de señal/visibilidad. Cuando hay estimaciones de distancia, las etiquetas muestran los metros medios a lo largo de cada línea de conexión.",
      "analytics.modal.hover.sessions": "Sesiones:",
      "analytics.modal.hover.sightings": "Avistamientos:",
      "analytics.modal.hover.avgDist": "Dist. media:",

      "analytics.modal.details.sessionsHeading": "Sesiones en las que aparece este dispositivo:",
      "analytics.modal.details.sightingsLabel": "avistamientos:",
      "analytics.modal.details.showMap": "Mostrar mapa",
      "analytics.modal.details.inlineMapsTitle": "Mapas de sesión integrados (últimas rutas conocidas)",
      "analytics.modal.details.clearMaps": "Borrar mapas",
      "analytics.modal.details.loadingMaps": "Cargando datos de mapa de sesión…",
      "analytics.modal.details.noSessions": "No hay dispositivos para la selección de sesiones y filtros actuales.",
      "analytics.modal.details.closeMap": "cerrar",
      "analytics.modal.details.wifiFocus": "Foco Wi‑Fi",
      "analytics.modal.details.bleFocus": "Foco Bluetooth",
      "analytics.modal.details.openMap": "Abrir mapa",
      "analytics.modal.details.error.loadFailed": "No se pudo cargar el mapa de la sesión.",
 
   
         // Dashboard map




      "dashboard.map.title": "Mapa de seguimiento",
      "dashboard.map.suspicious.checking": "Comprobando dispositivos sospechosos cercanos...",
      "dashboard.map.suspicious.error": "No se pudo comprobar si hay dispositivos sospechosos cerca.",
      "dashboard.map.suspicious.bannerPrefix": "Posibles dispositivos acosadores detectados cerca: ",
      "dashboard.map.suspicious.bannerSuffix": ". Consulta los detalles en Ajustes → Dispositivos sospechosos.",
      "dashboard.map.session.label": "Sesión",
      "dashboard.map.quality.label": "Calidad",
      "dashboard.map.search.label": "Buscar",
      "dashboard.map.search.placeholder": "Nombre o fecha",
      "dashboard.map.quality.all": "Todas las rutas",
      "dashboard.map.quality.good": "Buena (verde)",
      "dashboard.map.quality.regular": "Regular (naranja)",
      "dashboard.map.quality.bad": "No buena (roja)",
      "dashboard.map.buttons.route.title": "Mostrar ruta ajustada",
      "dashboard.map.buttons.wifi.title": "Mostrar dispositivos Wi‑Fi",
      "dashboard.map.buttons.ble.title": "Mostrar dispositivos Bluetooth",
      "dashboard.map.buttons.export.title": "Exportar todo a Wigle",
      "dashboard.map.buttons.export.sr": "Exportar todo a Wigle",
      "dashboard.map.legend.gps": "GPS",
      "dashboard.map.legend.wifi": "Wi‑Fi",
      "dashboard.map.legend.hybrid": "Híbrido (GPS + Wi‑Fi)",
      "dashboard.map.legend.focusPrefix": "Foco desde analíticas:",
      "dashboard.map.legend.focus.wifi": "Wi‑Fi",
      "dashboard.map.legend.focus.ble": "Bluetooth",
      "dashboard.map.osrm.confidencePrefix": "Confianza de OSRM:",
  
       // Alert list / emergency alerts

     "alerts.empty.title": "Aún no hay alertas de emergencia",
     "alerts.empty.body": "Cuando un contacto de confianza active Guard Royal desde su móvil, las alertas activas –incluidos mensajes de audio y estado de respuesta– aparecerán aquí.",
     "alerts.meta.fromPrefix": "De:",
     "alerts.status.resolvedNote": "Esta alerta ha sido marcada como resuelta por el emisor.",
     "alerts.status.inactiveNote": "Esta alerta ya no está activa.",
     "alerts.audio.header": "Mensajes de audio:",
     "alerts.audio.sendLabel": "Enviar mensaje de audio:",
     "alerts.recipients.title": "Destinatarios",
     "alerts.actions.note": "Estas acciones actualizan tu estado de respuesta para quien envió la alerta; no envían un mensaje de texto.",
     "alerts.actions.markRead": "Marcar como leída",
     "alerts.actions.acknowledge": "Reconocer alerta",
     "alerts.actions.dismiss": "Descartar alerta",
     "alerts.actions.confirmAcknowledge": "¿Quieres reconocer esta alerta?",
     "alerts.actions.confirmResolve": "¿Marcar este hilo de alerta como resuelto?",
     "alerts.actions.resolveLabel": "Marcar alerta como resuelta",
     "alerts.audio.aria.pause": "Pausar",
     "alerts.audio.aria.play": "Reproducir",
     "alerts.toggle.aria.close": "Cerrar detalles de la alerta",
     "alerts.toggle.aria.open": "Abrir detalles de la alerta y reproducir audio",
  
       // Footer



    "footer.slogan":
      "Redefiniendo la seguridad personal para la era moderna. Combinamos tecnología de vanguardia con principios de diseño atemporales.",
    "footer.sitemapTitle": "Mapa del sitio",
    "footer.legalTitle": "Legal",
    "footer.newsletterTitle": "Boletín",
    "footer.designedFor": "Diseñado para la excelencia",

    "footer.sitemap.features": "Funciones",
    "footer.sitemap.discover": "Descubrir",
    "footer.sitemap.pricing": "Precios",
    "footer.sitemap.about": "Acerca de",

    "footer.legal.privacy": "Política de privacidad",
    "footer.legal.terms": "Términos del servicio",
    "footer.legal.cookies": "Política de cookies",
    "footer.legal.licenses": "Licencias",

    "footer.newsletter.placeholder": "CORREO ELECTRÓNICO",
    "footer.newsletter.aria": "Suscribirse al boletín",

    // About page
    "about.hero.titlePrefix": "Acerca de",
    "about.hero.subtitle": "En construcción",
    "about.hero.body":
      "Estamos dejando el teclado al rojo vivo: construyendo funciones, puliendo experiencias y trazando el rumbo. Vuelve pronto para ver el registro completo de viaje.",

    // Pricing page
    "pricing.plan.label": "Plan",
    "pricing.plan.free": "Gratis",
    "pricing.plan.description": "Todas las funciones principales incluidas. Uso personal. Sin anuncios.",
    "pricing.features.label": "Qué incluye",
    "pricing.features.bullet1": "Seguimiento en tiempo real y rutas ajustadas",
    "pricing.features.bullet2": "Fusión de señales (GPS + Wi-Fi/BLE)",
    "pricing.features.bullet3": "Compartición privada con contactos de confianza",
    "pricing.features.bullet4": "Alertas y comprobaciones de seguridad",
    "pricing.future.label": "Futuro",
    "pricing.future.body": "APIs abiertas, herramientas para equipos de respuesta y analíticas avanzadas, impulsadas por la comunidad.",
 
     // Discover page - hero

    "discover.hero.titlePrefix": "Descubre",
    "discover.hero.titleSuffix": "Tecnología",
    "discover.hero.body":
      "Una plataforma de seguridad moderna que combina map-matching de alta precisión, fusión inteligente de señales y gestión de datos con privacidad primero para proteger a las personas en tiempo real.",
    "discover.hero.pulse": "Pulso de detección en vivo",

    // Discover - technical pillars
    "discover.pillars.osrmTitle": "Map-Matching con OSRM",
    "discover.pillars.osrmBody":
      "Alineamos las trazas GPS con los segmentos reales de carretera usando el endpoint map_match de OSRM. Bajo el capó, un modelo oculto de Markov con búsqueda de Viterbi pondera probabilidades de emisión (ruido GPS) y de transición (movimiento) para producir una ruta limpia y navegable con un nivel de confianza.",
    "discover.pillars.fusionTitle": "Fusión de señales",
    "discover.pillars.fusionBody":
      "Además del GPS, la app móvil puede recopilar BSSID de Wi‑Fi y balizas BLE. Guardamos estas observaciones ligadas al tiempo y las usamos para estabilizar la posición en interiores, marcar dispositivos desconocidos y detectar patrones de proximidad que puedan indicar acoso o rastreo.",
    "discover.pillars.privacyTitle": "Privacidad por diseño",
    "discover.pillars.privacyBody":
      "Todos los datos personales se mantienen dentro de nuestra infraestructura. Nunca los vendemos a terceros. El acceso se limita estrictamente por usuario, con auditoría, tokens de corta duración y cifrado en reposo y en tránsito.",

    // Discover - data flow
    "discover.dataFlow.title": "Flujo de datos",
    "discover.dataFlow.step1":
      "1) La app móvil envía puntos por lotes o en vivo a /api/update_location. Los puntos con poca precisión se filtran y los saltos cortos de pocos metros se omiten para reducir el jitter.",
    "discover.dataFlow.step2":
      "2) El servidor guarda filas en Location y vincula registros opcionales WifiScan/BleScan para inteligencia de proximidad.",
    "discover.dataFlow.step3":
      "3) Para visualizar rutas, los puntos recientes se envían a /api/map_match, que llama a OSRM y devuelve una geometría GeoJSON y un nivel de confianza.",
    "discover.dataFlow.prismaTitle": "Modelos Prisma",
    "discover.dataFlow.prismaBody": "User, Device, Location, WifiScan, BleScan, TrackingSession",
    "discover.dataFlow.filtersTitle": "Filtros",
    "discover.dataFlow.filtersBody": "Umbral de precisión, deduplicación por distancia mínima, ámbito por sesión",

    // Discover - alerts cards
    "discover.cards.alertsTitle": "Alertas en tiempo real",
    "discover.cards.alertsBody":
      "Disparadores configurables vigilan eventos como paradas bruscas, tiempo prolongado en zonas inseguras, desvíos inusuales o dispositivos desconocidos que te siguen. Cuando se superan los umbrales, las alertas pueden notificar automáticamente a contactos de confianza y, donde esté configurado, a servicios locales.",
    "discover.cards.alerts.commuter":
      "Seguridad en trayectos: si tu ruta se desvía notablemente por la noche, la app pide confirmación y puede compartir tu sesión en vivo.",
    "discover.cards.alerts.stalking":
      "Dispositivo perseguidor: la repetición de la misma MAC BLE cerca de ti en distintas ventanas temporales aumenta la gravedad de ‘aviso’ → ‘alerta’ → ‘urgente’.",
    "discover.cards.alerts.stranded":
      "Varado: sin movimiento + batería baja + horario nocturno puede avisar a tu contacto de emergencia con la última ruta ajustada.",

    "discover.cards.healthTitle": "Salud y seguridad",
    "discover.cards.healthBody":
      "Con consentimiento, las señales de movimiento y ritmo cardíaco (a través de wearables) destacan posibles caídas o eventos cardíacos, facilitando comprobaciones rápidas del estado y compartiendo la última ruta ajustada.",
    "discover.cards.health.fall":
      "Detección de caídas: aceleración brusca + ausencia de movimiento posterior puede avisar a un cuidador con ubicación y hora.",
    "discover.cards.health.cardiac":
      "Riesgo cardíaco: patrones anómalos de frecuencia cardíaca combinados con poca actividad disparan un aviso de ‘revisión’ antes de notificar a los contactos.",
    "discover.cards.health.outdoor":
      "Actividad al aire libre: ¿excursión en solitario? Comparte una sesión temporizada que escala si no vuelves antes del atardecer.",

    "discover.cards.mobileTitle": "Móvil + Web",
    "discover.cards.mobileBody":
      "El sitio web refleja el flujo de la app móvil para los espectadores autorizados, de modo que las personas adecuadas vean los datos adecuados en el momento adecuado.",
    "discover.cards.mobile.family":
      "Revisiones familiares: comparte un enlace de sesión en vivo que expira automáticamente cuando llegas a salvo.",
    "discover.cards.mobile.care":
      "Círculos de cuidado: los cuidadores pueden recibir avisos y seguir la ruta ajustada cuando alguien necesita ayuda.",
    "discover.cards.mobile.public":
      "Seguridad pública: en emergencias, genera una vista restringida para los equipos de respuesta con solo lo esencial.",

    // Discover - mission & vision
    "discover.mission.title": "Misión y visión",
    "discover.mission.body":
      "Nuestra misión es sencilla: dar a las personas las herramientas para ser encontradas rápido y disuadir el daño. La visión es un mundo en el que los datos de ubicación sirven primero al usuario: privados, precisos y accionables, para que policía, servicios médicos y seres queridos te alcancen cuando cada segundo cuenta.",

    // Discover - legal & privacy
    "discover.legal.title": "Aspectos legales y privacidad",
    "discover.legal.consent":
      "Consentimiento: los usuarios controlan la recopilación y el intercambio de datos. Los contactos de confianza deben ser añadidos explícitamente por el usuario. En menores, los tutores gestionan el consentimiento.",
    "discover.legal.use":
      "Uso de datos: utilizamos tus datos para ofrecer funciones básicas (rutas, alertas, paneles). No vendemos datos. No los compartimos con terceros ni grandes redes de anuncios.",
    "discover.legal.security":
      "Seguridad: TLS en tránsito; cifrado en reposo. RBAC estricto; sesiones de corta duración; registros de auditoría. Los accesos sospechosos se marcan y limitan.",
    "discover.legal.retention":
      "Retención: se minimiza la telemetría en bruto. Puedes solicitar exportación o eliminación. Las analíticas agregadas se anonimizan.",
    "discover.legal.public":
      "Información pública: cuando mostramos vistas públicas, se limitan a sesiones específicas con tokens que expiran y campos sensibles redactados.",

    // Discover - CTA
    "discover.cta.title": "¿Listo para descubrir más?",
     "discover.cta.body":
       "Inicia una prueba privada o habla con nosotros sobre despliegues a medida para familias, salud o seguridad pública.",
     "discover.cta.start": "Iniciar prueba",
     "discover.cta.contact": "Contacto",

     // Settings page
     "settings.page.title": "Ajustes",
     "settings.danger.title": "Zona de peligro",
     "settings.danger.body":
       "Elimina todo tu historial de ubicaciones, dispositivos, sesiones de seguimiento y tu cuenta. Esta acción es irreversible.",
     "settings.danger.button.idle": "Eliminar todos mis datos",
     "settings.danger.button.loading": "Eliminando...",

     "settings.account.title": "Cuenta y contactos",
     "settings.account.profile.title": "Perfil",
     "settings.account.profile.body": "Actualiza la información que aparece en tu panel y para tus contactos de confianza.",
     "settings.account.profile.avatarNote": "Este avatar aparecerá en la barra de navegación.",
     "settings.account.profile.nameLabel": "Nombre",
     "settings.account.profile.emailLabel": "Correo electrónico",
     "settings.account.profile.avatarLabel": "URL del avatar",
     "settings.account.profile.save": "Guardar perfil",

     "settings.privacy.title": "Privacidad",
     "settings.privacy.body": "Controla si tu ubicación en tiempo real puede usarse para encontrar contactos de confianza cercanos.",
     "settings.privacy.helper": "Cuando está activado, tu última posición conocida se usa para calcular las distancias a tus contactos aceptados.",
     "settings.privacy.shareToggle": "Compartir mi ubicación en tiempo real",

     "settings.map.title": "Experiencia de mapa",
     "settings.map.body": "Elige entre el mapa integrado y Google 3D Maps cuando proporciones tu propia clave de API.",
     "settings.map.apiKeyLabel": "Clave de API de Google Maps",
     "settings.map.apiKeyPlaceholder": "Pega tu clave de API de Google Maps",
     "settings.map.apiKeyHelper": "Restringe esta clave por referente HTTP en tu Google Cloud Console. Solo se almacenará para tu cuenta.",
     "settings.map.useGoogle3D": "Usar Google 3D Maps en el panel cuando esta clave esté configurada",
     "settings.map.useGoogle3D.addKeySuffix": " (añade una clave primero)",
     "settings.map.save.idle": "Guardar ajustes de mapa",
     "settings.map.save.loading": "Guardando...",
     "settings.map.loadingSaved": "Cargando ajustes de mapa guardados...",

     "settings.contacts.title": "Contactos de emergencia",
     "settings.contacts.body": "Añade personas de confianza que puedan recibir alertas sobre tu ubicación. De momento solo se pueden añadir cuentas existentes de Guard Royal.",
     "settings.contacts.inputPlaceholder": "Correo electrónico del contacto",
     "settings.contacts.add.idle": "Añadir contacto",
     "settings.contacts.add.loading": "Añadiendo...",
     "settings.contacts.deleteAll": "Eliminar todos",
     "settings.contacts.remove.idle": "Eliminar",
     "settings.contacts.remove.loading": "Eliminando...",
     "settings.contacts.trustedBy.title": "Personas que confían en ti",
     "settings.contacts.trustedBy.body": "Estas personas te han añadido como contacto de emergencia en su cuenta de Guard Royal.",
     "settings.contacts.trustedBy.summary.one": "Eres contacto de emergencia para 1 persona.",
     "settings.contacts.trustedBy.summary.manyPrefix": "Eres contacto de emergencia para",
     "settings.contacts.trustedBy.summary.manySuffix": "personas.",
     "settings.contacts.empty": "Todavía no tienes contactos de emergencia.",
     "settings.contacts.flags.emergencyAlerts": "Alertas de emergencia",
     "settings.contacts.flags.callsMessages": "Llamadas y mensajes",
     "settings.contacts.trustedBy.pendingTitle": "Solicitudes de contacto de emergencia pendientes",
     "settings.contacts.trustedBy.pendingPrefix": "Tienes",
     "settings.contacts.trustedBy.pendingSuffix": "solicitud pendiente para ser contacto de emergencia.",
     "settings.contacts.trustedBy.pendingSuffixPlural": "solicitudes pendientes para ser contacto de emergencia.",
     "settings.contacts.trustedBy.empty": "Nadie te ha añadido todavía como contacto de emergencia.",
 
      "settings.sessions.title": "Sesiones de seguimiento",
     "settings.sessions.body": "Consulta, inspecciona y elimina sesiones de seguimiento registradas desde tus dispositivos.",
     "settings.sessions.deleteAll": "Eliminar todas",
     "settings.sessions.loading": "Cargando...",
     "settings.sessions.empty": "Aún no se encontraron sesiones de seguimiento. Aparecerán aquí cuando uses el seguimiento en vivo.",
     "settings.sessions.listTitle": "Sesiones",
     "settings.sessions.sessionFallback": "Sesión",
     "settings.sessions.quality.good": "Buena",
     "settings.sessions.quality.bad": "No buena",
     "settings.sessions.quality.regular": "Regular",
     "settings.sessions.details.title": "Detalles de la sesión",
     "settings.sessions.details.viewEnv.idle": "Ver métricas de entorno",
     "settings.sessions.details.viewEnv.loading": "Cargando entorno...",
     "settings.sessions.details.selectPrompt": "Selecciona una sesión a la izquierda para ver sus detalles.",
     "settings.sessions.details.name": "Nombre",
     "settings.sessions.details.duration": "Duración",
     "settings.sessions.details.durationUnknown": "Desconocida",
     "settings.sessions.details.points": "Puntos",
     "settings.sessions.details.devices": "Dispositivos en la sesión",
     "settings.sessions.details.devicesNone": "Sin información de dispositivo",
     "settings.sessions.edit.label": "Editar nombre/etiqueta de la sesión",
     "settings.sessions.edit.placeholder": "p. ej. Trayecto matutino, Prueba en ciudad",
     "settings.sessions.edit.helper": "Ponle a esta ruta una etiqueta corta para encontrarla más fácilmente más adelante.",
     "settings.sessions.rating.label": "Valoración de calidad",
     "settings.sessions.rating.good": "Buena (verde)",
     "settings.sessions.rating.regular": "Regular (naranja)",
     "settings.sessions.rating.bad": "No buena (roja)",
     "settings.sessions.saveMeta.idle": "Guardar etiqueta y valoración",
      "settings.sessions.saveMeta.loading": "Guardando...",
      "settings.sessions.row.delete": "Eliminar",
      "settings.sessions.row.deleting": "Eliminando...",
 
      "settings.nearby.title": "Dispositivos Wi‑Fi y Bluetooth cercanos",
     "settings.nearby.refresh.idle": "Actualizar",
     "settings.nearby.refresh.loading": "Actualizando...",
     "settings.nearby.body": "Consulta redes Wi‑Fi y dispositivos Bluetooth que se han detectado recientemente cerca de ti.",
     "settings.nearby.loading": "Cargando dispositivos cercanos...",
     "settings.nearby.empty": "Todavía no se han registrado dispositivos cercanos. Inicia una sesión de seguimiento o usa la app móvil para ver dispositivos aquí.",
     "settings.nearby.wifiHeading": "Dispositivos Wi‑Fi",
     "settings.nearby.bluetoothHeading": "Dispositivos Bluetooth",
     "settings.nearby.hiddenNetwork": "Red oculta",
     "settings.nearby.manufacturer": "Fabricante:",
     "settings.nearby.partOfSessions": "Parte de sesiones",
     "settings.nearby.delete": "Eliminar",
     "settings.nearby.firstSeen": "Primera detección:",
     "settings.nearby.lastSeen": "Última detección:",
     "settings.nearby.scans": "Escaneos:",
     "settings.nearby.nearDuration": "Cerca de ti durante ~",
     "settings.nearby.unknownDevice": "Dispositivo desconocido",
     "settings.nearby.address": "Dirección:",

     "settings.suspicious.title": "Dispositivos Wi‑Fi y Bluetooth sospechosos",
     "settings.suspicious.body": "Según tu historial de seguimiento, estos dispositivos se han visto muchas veces en distintos lugares para el dispositivo de la sesión seleccionada.",
     "settings.suspicious.loading": "Cargando dispositivos sospechosos...",
     "settings.suspicious.emptyTitle": "Todavía no se han detectado dispositivos sospechosos.",
     "settings.suspicious.emptyBody": "A medida que generes historial de seguimiento, aquí se destacarán los dispositivos Wi‑Fi y Bluetooth que aparezcan repetidamente en distintos lugares cerca de ti.",
     "settings.suspicious.wifiHeading": "Dispositivos Wi‑Fi",
     "settings.suspicious.bluetoothHeading": "Dispositivos Bluetooth",
     "settings.suspicious.unknownWifi": "Dispositivo Wi‑Fi desconocido",
     "settings.suspicious.unknownBle": "Dispositivo Bluetooth desconocido",
     "settings.suspicious.bssid": "BSSID:",
     "settings.suspicious.address": "Dirección:",
     "settings.suspicious.score": "Puntuación:",
     "settings.suspicious.places": "Lugares:",
     "settings.suspicious.firstSeen": "Primera detección:",
     "settings.suspicious.lastSeen": "Última detección:",
     "settings.suspicious.sightings": "Avistamientos:",

     "settings.alerts.title": "Alertas",
     "settings.alerts.body": "Consulta las alertas que has enviado o recibido y aplícales filtros.",
     "settings.alerts.deleteAll": "Eliminar todas",
     "settings.alerts.typeLabel": "Tipo",
     "settings.alerts.type.sent": "Enviadas",
     "settings.alerts.type.received": "Recibidas",
     "settings.alerts.statusLabel": "Estado",
     "settings.alerts.loading": "Cargando alertas...",
     "settings.alerts.empty": "No se encontraron alertas para este filtro. Lanza o recibe una alerta y aparecerá aquí.",
     "settings.alerts.item.fallbackTitle": "Alerta",
     "settings.alerts.item.delete": "Eliminar",
     "settings.alerts.item.recipients": "Destinatarios:",
     "settings.alerts.item.audioMessages": "Mensajes de audio:",
     "settings.alerts.item.myStatus": "Mi estado:",

    },
  };




interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>("es");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("lang");
    if (stored === "en" || stored === "es") {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lang", lang);
    }
  };

  const t = (key: string): string => {
    const langTable = messages[language] || messages.en;
    return langTable[key] ?? messages.en[key] ?? key;
  };

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t,
  };
 
  return React.createElement(LanguageContext.Provider, { value }, children);
}


export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
