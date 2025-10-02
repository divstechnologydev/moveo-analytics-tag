(function (window) {
    // Prevent multiple initializations
    if (window.MoveoOne) return;
  
    const API_URL = "{{API_URL}}";
    const DOLPHIN_URL = "{{DOLPHIN_URL}}";
    const LIB_VERSION = "1.0.9"; // Constant library version - cannot be changed by client
    const LOGGING_ENABLED = false; // Enable/disable console logging
  
    /**
     * Core MoveoOne Web Tracker
     */
    class MoveoOneWeb {
      constructor(token) {
        this.token = token;
        this.buffer = [];
        this.flushInterval = 5000;
        this.maxThreshold = 100;
        this.context = "WEB_STATIC";
  
        // Use persistent session ID across page loads
        this.sessionId = this.getOrCreateSessionId();
        this.started = false;
        this.pendingUpdates = []; // Queue for updates before session starts
  
        // Predefined meta fields (optional, no defaults)
        // Note: libVersion is automatically added and cannot be changed
        this.meta = {
          libVersion: LIB_VERSION, // Always include library version
          appVersion: null, // User-defined app version
        };
  
        // Additional metadata - flexible key-value pairs
        this.additionalMeta = {};
  
        // Track viewport size for resize events
        this.currentViewport = {
          width: window.innerWidth,
          height: window.innerHeight,
        };
  
        // Check if this is a page navigation within an existing session
        this.isPageNavigation = this.checkIfPageNavigation();
  
        // Impression tracking state
        this.impressionObserver = null;
        this.seenElements = new WeakSet(); // Elements currently in viewport
        this.appearedElements = new WeakSet(); // Elements that have actually appeared (sent appear event)
        this.trackedElements = new WeakSet(); // Track elements without DOM attributes
        this.trackedLinks = new WeakSet(); // Track links without DOM attributes
        this.trackedMedia = new WeakSet(); // Track media without DOM attributes
        this.pendingImpressions = []; // Queue for impression events before session starts
        this.pendingImmediateEvents = []; // Queue for immediate events before session starts
  
        // Start flush interval
        setInterval(() => this.flush(), this.flushInterval);
      }
  
      // Helper method to get reliable path
      getCurrentPath() {
        const pathname = window.location.pathname;
        // Return "unknown" for empty string, null, or undefined
        return pathname && pathname.trim() ? pathname : "unknown";
      }

      getPlatformInfo() {
        try {
          // Method 1: Try navigator.userAgentData (modern browsers)
          if (navigator.userAgentData && navigator.userAgentData.platform) {
            const platform = navigator.userAgentData.platform;
            if (platform && platform.trim() !== "") {
              return platform;
            }
          }

          // Method 2: Try navigator.platform (legacy, but still available)
          if (navigator.platform && navigator.platform.trim() !== "") {
            return navigator.platform;
          }

          // Method 3: Parse user agent string for platform detection
          const userAgent = navigator.userAgent;
          if (userAgent) {
            // Windows detection (various versions)
            if (userAgent.includes("Windows NT")) {
              return "Windows";
            }
            if (userAgent.includes("Windows")) {
              return "Windows";
            }
            
            // iOS detection (check BEFORE macOS since iOS includes "Mac OS X" in user agent)
            if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
              return "iOS";
            }
            
            // macOS detection
            if (userAgent.includes("Mac OS X") || userAgent.includes("Macintosh")) {
              return "macOS";
            }
            
            // Linux detection
            if (userAgent.includes("Linux")) {
              return "Linux";
            }
            
            // Android detection
            if (userAgent.includes("Android")) {
              return "Android";
            }
            
            // Chrome OS detection
            if (userAgent.includes("CrOS")) {
              return "Chrome OS";
            }
            
            // Firefox OS detection
            if (userAgent.includes("Firefox OS")) {
              return "Firefox OS";
            }
            
            // BlackBerry detection
            if (userAgent.includes("BlackBerry")) {
              return "BlackBerry";
            }
          }

          // Method 5: Try to detect from navigator properties
          if (navigator.appVersion) {
            const appVersion = navigator.appVersion.toLowerCase();
            if (appVersion.includes("win")) return "Windows";
            if (appVersion.includes("mac")) return "macOS";
            if (appVersion.includes("linux")) return "Linux";
            if (appVersion.includes("iphone") || appVersion.includes("ipad")) return "iOS";
            if (appVersion.includes("android")) return "Android";
          }

          // Final fallback
          return "Unknown";
        } catch (error) {
          // If any error occurs during platform detection, return "Unknown"
          if (LOGGING_ENABLED) {
            console.warn("MoveoOne: Error during platform detection:", error);
          }
          return "Unknown";
        }
      }

      getLanguageInfo() {
        try {
          // Method 1: Try navigator.language (modern browsers)
          if (navigator.language && navigator.language.trim() !== "") {
            return navigator.language;
          }

          // Method 2: Try navigator.userLanguage (legacy IE)
          if (navigator.userLanguage && navigator.userLanguage.trim() !== "") {
            return navigator.userLanguage;
          }

          // Method 3: Try navigator.languages array
          if (navigator.languages && navigator.languages.length > 0) {
            const firstLanguage = navigator.languages[0];
            if (firstLanguage && firstLanguage.trim() !== "") {
              return firstLanguage;
            }
          }

          // Method 4: Try to extract from user agent
          const userAgent = navigator.userAgent;
          if (userAgent) {
            // Look for language patterns in user agent
            const langMatch = userAgent.match(/[a-z]{2}-[A-Z]{2}/);
            if (langMatch) {
              return langMatch[0];
            }
          }

          // Final fallback
          return "Unknown";
        } catch (error) {
          if (LOGGING_ENABLED) {
            console.warn("MoveoOne: Error during language detection:", error);
          }
          return "Unknown";
        }
      }

      // Robust timezone detection with fallbacks
      getTimezoneInfo() {
        try {
          // Method 1: Try Intl.DateTimeFormat (modern browsers)
          if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (timezone && timezone.trim() !== "") {
              return timezone;
            }
          }

          // Method 2: Try to get timezone offset and convert to timezone name
          const offset = new Date().getTimezoneOffset();
          if (offset !== undefined) {
            // Convert offset to timezone name
            const hours = Math.abs(Math.floor(offset / 60));
            const minutes = Math.abs(offset % 60);
            const sign = offset <= 0 ? '+' : '-';
            return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          }

          // Method 3: Try to detect from date string
          const dateString = new Date().toString();
          const timezoneMatch = dateString.match(/\(([^)]+)\)/);
          if (timezoneMatch && timezoneMatch[1]) {
            return timezoneMatch[1];
          }

          // Final fallback
          return "Unknown";
        } catch (error) {
          if (LOGGING_ENABLED) {
            console.warn("MoveoOne: Error during timezone detection:", error);
          }
          return "Unknown";
        }
      }
  
      // Get existing session ID or create new one
      getOrCreateSessionId() {
        const storageKey = "moveo-session-id";
        const timestampKey = "moveo-session-timestamp";
        const sessionTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
  
        const existingSessionId = localStorage.getItem(storageKey);
        const sessionTimestamp = localStorage.getItem(timestampKey);
  
        // Check if existing session is still valid
        if (existingSessionId && sessionTimestamp) {
          const now = Date.now();
          const lastActivity = parseInt(sessionTimestamp, 10);
  
          if (now - lastActivity < sessionTimeout) {
            // Update timestamp for current activity
            localStorage.setItem(timestampKey, now.toString());
            this.isExistingSession = true;
            return existingSessionId;
          } else {
            // Session has expired - clear old session data
            localStorage.removeItem(storageKey);
            localStorage.removeItem(timestampKey);
          }
        }
  
        // Create new session
        this.isExistingSession = false;
        const newSessionId = this.generateUUID();
        localStorage.setItem(storageKey, newSessionId);
        localStorage.setItem(timestampKey, Date.now().toString());
  
        return newSessionId;
      }
  
      // Check if this is a page navigation within an existing session
      checkIfPageNavigation() {
        const lastPathKey = "moveo-last-path";
        const lastPath = localStorage.getItem(lastPathKey);
        const currentPath = this.getCurrentPath();
  
        // Store current path for next page load
        localStorage.setItem(lastPathKey, currentPath);
  
        // If we have a last path and it's different from current, it's navigation
        return lastPath && lastPath !== currentPath;
      }
  
      // Update session timestamp on activity
      updateSessionActivity() {
        const timestampKey = "moveo-session-timestamp";
        localStorage.setItem(timestampKey, Date.now().toString());
      }
  
      initialize() {
        // Prevent multiple initialize() calls
        if (this.initialized) {
          if (LOGGING_ENABLED) {
            console.warn("MoveoOne: Already initialized, ignoring duplicate initialize() call");
          }
          return;
        }
        
        this.initialized = true;
        
        // Start session asynchronously without blocking
        this.start();
  
        // Setup event listeners immediately
        this.setupClickTracking();
        this.setupDownloadOrOutboundLinkTracking();
        this.setupScrollTracking();
        this.setupFormTracking();
        this.setupHoverTracking();
        this.setupResizeTracking();
        this.setupPageUnloadTracking();
        this.setupMediaTracking();
        this.setupClipboardTracking();
  
        // Initialize impression tracking immediately (no longer waits for session)
        this.initImpressionObserver();
      }
  

  
      // Methods to update predefined meta fields (locale, test, softwareVersion)
      // Note: libVersion is protected and cannot be changed
      setLocale(locale) {
        this.meta.locale = locale;
        this.meta.libVersion = LIB_VERSION; // Ensure libVersion is always present
        this.queueOrSendUpdate("meta");
      }
  
      setTest(test) {
        this.meta.test = test;
        this.meta.libVersion = LIB_VERSION; // Ensure libVersion is always present
        this.queueOrSendUpdate("meta");
      }
  

  
      // Helper method to queue updates before session starts or send immediately
      queueOrSendUpdate(type) {
        if (this.started) {
          // Session already started, send update immediately
          if (type === "meta") {
            this.addUpdateMetadataEvent();
          } else if (type === "additional") {
            this.addUpdateAdditionalMetadataEvent();
          }
        } else {
          // Session not started yet, queue the update
          this.pendingUpdates.push(type);
        }
      }
  
      // Process all pending updates after session starts
      processPendingUpdates() {
        const uniqueUpdates = [...new Set(this.pendingUpdates)]; // Remove duplicates
  
        uniqueUpdates.forEach((type) => {
          if (type === "meta") {
            this.addUpdateMetadataEvent();
          } else if (type === "additional") {
            this.addUpdateAdditionalMetadataEvent();
          }
        });
  
        this.pendingUpdates = []; // Clear the queue
      }
  
      // Process all pending impression events after session starts
      processPendingImpressions() {
        if (this.pendingImpressions && this.pendingImpressions.length > 0) {
          this.pendingImpressions.forEach(({ el, rect, action, timestamp }) => {
            // Send with original timestamp
            this.sendAutoImpressionWithTimestamp(el, rect, action, timestamp);
          });
          this.pendingImpressions = [];
        }
      }
  
      // Process all pending immediate events after session starts
      processPendingImmediateEvents() {
        if (
          this.pendingImmediateEvents &&
          this.pendingImmediateEvents.length > 0
        ) {
          this.pendingImmediateEvents.forEach(({ type, data, timestamp }) => {
            // Send with original timestamp
            this.trackImmediateWithTimestamp(type, data, timestamp);
          });
          this.pendingImmediateEvents = [];
        }
      }
  
      // Send immediate event with specific timestamp
      trackImmediateWithTimestamp(type, data, timestamp) {
        // Update session activity
        this.updateSessionActivity();
  
        const event = {
          c: this.context,
          type: "track",
          t: timestamp, // Use original timestamp
          prop: {
            sg: data.semanticGroup || "global",
            eID: data.id,
            eA: data.action,
            eT: data.type,
            eV: data.value || "",
            sc: this.getCurrentPath(),
          },
          sId: this.sessionId,
        };
  
        // Send immediately using sendBeacon for reliability
        this.sendEventImmediate(event);
      }
  
      // Send impression event with specific timestamp
      sendAutoImpressionWithTimestamp(el, rect, action, timestamp) {
        // Determine the element value based on type
        let value = "";
  
        if (el.matches("img")) {
          value =
            el.alt ||
            el.title ||
            this.getFilenameFromUrl(el.currentSrc || el.src) ||
            "image";
        } else if (el.matches("video")) {
          value =
            el.title ||
            this.getFilenameFromUrl(el.currentSrc || el.src) ||
            "video";
        } else if (el.matches("iframe")) {
          value =
            el.title || this.getFilenameFromUrl(el.src) || "embedded_content";
        } else if (el.matches("a")) {
          value =
            (el.innerText || el.textContent || "").trim() || el.href || "link";
        } else if (el.matches('button,input,[role="button"]')) {
          value =
            (
              el.innerText ||
              el.value ||
              el.getAttribute("aria-label") ||
              ""
            ).trim() || "button";
        } else if (el.matches("h1,h2,h3")) {
          value = (el.innerText || el.textContent || "").trim() || "heading";
        } else {
          value = (el.innerText || el.textContent || "").trim() || "text";
        }
  
                // Create impression event with proper structure and original timestamp
        const data = {
          semanticGroup: this.getSemanticGroup(el),
          id: this.generateStableElementId(el),
          type: el.tagName.toLowerCase(),
          action: action,
          value: value,
        };

        // Create event with original timestamp
        const event = {
          c: this.context,
          type: "track",
          t: timestamp, // Use original timestamp
          prop: {
            sg: data.semanticGroup,
            eID: data.id,
            eA: data.action,
            eT: data.type,
            eV: data.value,
            sc: this.getCurrentPath(),
          },
          sId: this.sessionId,
        };
  
        this.buffer.push(event);
        this.flushOrRecord(false);
      }
  
            // Helper method to add update_metadata event to buffer
      addUpdateMetadataEvent() {
        // Ensure libVersion is always present in meta
        const protectedMeta = {
          ...this.meta,
          libVersion: LIB_VERSION,
        };

        const event = {
          c: this.context,
          type: "update_metadata",
          t: Date.now(),
          prop: {},
          meta: protectedMeta,
          additionalMeta: { ...this.additionalMeta },
          sId: this.sessionId,
        };
  
        this.buffer.push(event);
        this.flushOrRecord(false);
      }
  
      // Method to update additional metadata (flexible key-value)
      updateAdditionalMetadata(additionalData) {
        this.additionalMeta = {
          ...this.additionalMeta,
          ...additionalData,
        };
  
        this.queueOrSendUpdate("additional");
      }
  
            // Helper method to add update_metadata event to buffer
      addUpdateAdditionalMetadataEvent() {
        // Ensure libVersion is always present in meta
        const protectedMeta = {
          ...this.meta,
          libVersion: LIB_VERSION,
        };

        const event = {
          c: this.context,
          type: "update_metadata",
          t: Date.now(),
          prop: {},
          meta: protectedMeta,
          additionalMeta: { ...this.additionalMeta },
          sId: this.sessionId,
        };
  
        this.buffer.push(event);
        this.flushOrRecord(false);
      }
  
      // Legacy method - now only updates additionalMeta
      updateMetadata(metadata) {
        this.updateAdditionalMetadata(metadata);
      }
  
      // Helper method
      flushOrRecord(force = false) {
        if (force || this.buffer.length >= this.maxThreshold) {
          this.flush();
        }
      }
  
            track(type, data) {
        // Update session activity on any tracking event
        this.updateSessionActivity();

        const event = {
          c: this.context,
          type: "track",
          t: Date.now(),
          prop: {
            sg: data.semanticGroup || "global",
            eID: data.id,
            eA: data.action,
            eT: data.type,
            eV: data.value || "",
            sc: this.getCurrentPath(),
          },
          sId: this.sessionId,
        };
  
        this.buffer.push(event);
  
        if (this.buffer.length >= this.maxThreshold) {
          if (this.started) {
            this.flush();
          } else {
            // Wait for session to start, increase threshold temporarily
            if (LOGGING_ENABLED) {
              console.warn(
                "MoveoOne: Buffer threshold reached before session started, waiting..."
              );
            }
          }
        }
      }
  
      // Immediate track method for critical events (like downloads and outbound links)
      trackImmediate(type, data) {
        // Check if session is ready, if not queue the event
        if (!this.started) {
          // Queue immediate events until session is ready
          this.pendingImmediateEvents.push({
            type,
            data,
            timestamp: Date.now(),
          });
          return;
        }
  
        // Update session activity
        this.updateSessionActivity();
  
        const event = {
          c: this.context,
          type: "track",
          t: Date.now(),
          prop: {
            sg: data.semanticGroup || "global",
            eID: data.id,
            eA: data.action,
            eT: data.type,
            eV: data.value || "",
            sc: this.getCurrentPath(),
          },
          sId: this.sessionId,
        };
  
        // Merge any event-specific metadata into additionalMeta
        if (data.metadata) {
          event.additionalMeta = {
            ...event.additionalMeta,
            ...data.metadata,
          };
        }
  
        // Send immediately using sendBeacon for reliability
        this.sendEventImmediate(event);
      }
  
      // Send single event immediately using optimized approach for page unload scenarios
      sendEventImmediate(event) {
        const data = JSON.stringify({ events: [event] });
  
        // For outbound links and page unloads, we need maximum reliability
        // Use fetch with keepalive and additional optimizations
        fetch(API_URL, {
          method: "POST",
          headers: {
            Authorization: this.token,
            "Content-Type": "application/json",
          },
          body: data,
          keepalive: true, // Ensures request completes even if page unloads
          // Additional options for better reliability
          signal: AbortSignal.timeout(3000), // 3 second timeout for faster response
        }).catch((error) => {
          if (LOGGING_ENABLED) {
            console.error("MoveoOne Immediate Error:", error);
          }
        });
      }
  
      enrichWithIpAddress() {
        return fetch("https://api.moveo.one/api/my-ip")
          .then((response) => response.json())
          .then((data) => ({
            // IP address from your own endpoint
            ipAddress: data.ip || "Unknown",
          }))
          .catch((err) => {
            if (LOGGING_ENABLED) {
              console.warn("MoveoOne: Failed to get IP address", err);
            }
            return { ipAddress: "Unknown" };
          });
      }
  
      async start() {
        // Prevent multiple start() calls
        if (this.started) {
          if (LOGGING_ENABLED) {
            console.warn("MoveoOne: Session already started, ignoring duplicate start() call");
          }
          return;
        }
        
        // If this is a page navigation, send page_navigation event instead of start_session
        if (this.isPageNavigation) {
          await this.trackPageNavigation();
          this.started = true;
          this.processPendingUpdates();
          this.processPendingImpressions(); // ✅ Process any pending impressions
          this.processPendingImmediateEvents(); // ✅ Process any pending immediate events
  
          // Force flush any oversized buffer that was waiting
          if (this.buffer.length >= this.maxThreshold) {
            this.flush();
          }
          return;
        }
  
        // If this is an existing session (session ID was reused), don't send start_session
        if (this.isExistingSession) {
          this.started = true;
          this.processPendingUpdates();
          this.processPendingImpressions(); // ✅ Process any pending impressions
          this.processPendingImmediateEvents(); // ✅ Process any pending immediate events
  
          // Force flush any oversized buffer that was waiting
          if (this.buffer.length >= this.maxThreshold) {
            this.flush();
          }
  
          // Track initial page view for the return visit
          this.track("page_view", {
            semanticGroup: "global",
            id: this.generateGlobalEventId("page_view", {
              path: this.getCurrentPath(),
            }),
            type: "page",
            action: "page_view",
            value: this.getCurrentPath(),
          });
  
          this.track("viewport_size", {
            semanticGroup: "global",
            id: this.generateGlobalEventId("viewport_size", {
              path: this.getCurrentPath(),
            }),
            type: "viewport",
            action: "viewport_size",
            value: `${this.currentViewport.width}x${this.currentViewport.height}`,
          });
  
          return;
        }
  
        // This is a genuinely new session
        // Ensure libVersion is always present in meta
        const protectedMeta = {
          ...this.meta,
          libVersion: LIB_VERSION,
        };
  
        const event = {
          c: this.context,
          type: "start_session",
          t: Date.now(),
          prop: {},
          meta: protectedMeta,
          additionalMeta: { ...this.additionalMeta },
          sId: this.sessionId,
        };
  
        // Extract UTM parameters
        const params = new URLSearchParams(window.location.search);
        const utmParams = {
          utm_source: params.get("utm_source") || "",
          utm_medium: params.get("utm_medium") || "",
          utm_campaign: params.get("utm_campaign") || "",
          utm_term: params.get("utm_term") || "",
          utm_content: params.get("utm_content") || "",
        };
  
        // Check returning visitor status and add to additionalMeta
        const isReturning = localStorage.getItem("moveo-returning") === "true";
  
        if (!isReturning) {
          localStorage.setItem("moveo-returning", "true");
        }
  
        // All session data goes to additionalMeta
        const sessionData = {
          userAgent: navigator.userAgent || "Unknown",
          platform: this.getPlatformInfo(),
          language: this.getLanguageInfo(),
          timezone: this.getTimezoneInfo(),
          referrer: document.referrer || "Direct",
          returningVisitor: isReturning,
        };
  
        // Screen and viewport information
        const screenData = {
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          screenColorDepth: window.screen.colorDepth,
          devicePixelRatio: window.devicePixelRatio || 1,
        };
  
        // Get IP address data asynchronously (this is the slow part)
        const ipData = await this.enrichWithIpAddress();
  
        // Add all additional data to additionalMeta
        event.additionalMeta = {
          ...event.additionalMeta,
          ...utmParams,
          ...sessionData,
          ...screenData,
          ...ipData,
          title: document.title,
        };
  
        // Update instance additionalMeta
        this.additionalMeta = {
          ...this.additionalMeta,
          ...event.additionalMeta,
        };
  
        this.buffer.push(event);
        this.started = true; // Set started to true after adding start_session event
  
        // Process any pending updates that were queued before session started
        this.processPendingUpdates();
        this.processPendingImpressions(); // ✅ Process any pending impressions
        this.processPendingImmediateEvents(); // ✅ Process any pending immediate events
  
        // Force flush any oversized buffer that was waiting
        if (this.buffer.length >= this.maxThreshold) {
          this.flush();
        }
  
        // Flush the start_session event first
        this.flush();
  
        // Track initial page view
        this.track("page_view", {
          semanticGroup: "global",
          id: this.generateGlobalEventId("page_view", {
            path: this.getCurrentPath(),
          }),
          type: "page",
          action: "page_view",
          value: document.title,
        });
  
        this.track("viewport_size", {
          semanticGroup: "global",
          id: this.generateGlobalEventId("viewport_size", {
            path: this.getCurrentPath(),
          }),
          type: "viewport",
          action: "viewport_size",
          value: `${this.currentViewport.width}x${this.currentViewport.height}`,
        });
      }
  
      initImpressionObserver() {
        // Remove early exit to allow impression tracking to start immediately
        // if (!this.started) return; // ❌ Removed this line
  
        // Configuration
        const IO_THRESHOLD = 0.2; // 20% visible
        const APPEAR_DELAY = 800; // ms delay for appear events
  
        // Track pending appear events with timeouts
        const pendingAppearEvents = new Map(); // element -> timeout ID
  
        // Internals
        const schedule = (() => {
          let id;
          return (fn) => {
            cancelAnimationFrame(id);
            id = requestAnimationFrame(fn);
          };
        })();
  
        // Create intersection observer for appear/disappear events
        this.impressionObserver = new IntersectionObserver(
          (entries) => {
            schedule(() => {
              entries.forEach((e) => {
                if (e.isIntersecting && !this.seenElements.has(e.target)) {
                  // Element entered viewport - start timer for appear event
                  const timeoutId = setTimeout(() => {
                    // Check if element is still visible after delay
                    if (this.seenElements.has(e.target)) {
                      this.sendAutoImpression(
                        e.target,
                        e.boundingClientRect,
                        "appear"
                      );
                      // Mark as actually appeared (after sending appear event)
                      this.appearedElements.add(e.target);
                    }
                    // Clean up the pending event
                    pendingAppearEvents.delete(e.target);
                  }, APPEAR_DELAY);
  
                  // Store the timeout and mark as seen (currently in viewport)
                  pendingAppearEvents.set(e.target, timeoutId);
                  this.seenElements.add(e.target);
                } else if (!e.isIntersecting && this.seenElements.has(e.target)) {
                  // Element left viewport
  
                  // Cancel pending appear event if it exists
                  const pendingTimeout = pendingAppearEvents.get(e.target);
                  if (pendingTimeout) {
                    clearTimeout(pendingTimeout);
                    pendingAppearEvents.delete(e.target);
                  } else if (this.appearedElements.has(e.target)) {
                    // Element was visible long enough to have triggered appear event
                    // AND has actually appeared - so now send disappear event
                    this.sendAutoImpression(
                      e.target,
                      e.boundingClientRect,
                      "disappear"
                    );
                    // Remove from appeared elements since it's now disappeared
                    this.appearedElements.delete(e.target);
                  }
  
                  // Remove from seen elements (no longer in viewport)
                  this.seenElements.delete(e.target);
                }
              });
            });
          },
          { root: null, threshold: IO_THRESHOLD }
        );
  
        // Discovery helper
        const addIfInteresting = (el) => {
          if (!el || el.nodeType !== 1) return; // Only element nodes
  
          // Skip elements that are already being observed
          if (this.trackedElements.has(el)) return;
  
          // Use the same shouldTrackElement logic for consistency with click/hover tracking
          if (this.shouldTrackElement(el)) {
            this.impressionObserver.observe(el);
            this.trackedElements.add(el);
          }
        };
  
        // Initial DOM sweep - wait for DOM to be ready
        const performInitialScan = () => {
          document.querySelectorAll("*").forEach(addIfInteresting);
  
                      // Handle elements that are already visible when observer starts
            setTimeout(() => {
              const visibleElements = document.querySelectorAll("*");
              visibleElements.forEach((el) => {
                if (this.trackedElements.has(el)) {
                  const rect = el.getBoundingClientRect();
                  const isVisible =
                    rect.top < window.innerHeight &&
                    rect.bottom > 0 &&
                    rect.width > 0 &&
                    rect.height > 0;
  
                  if (isVisible && !this.seenElements.has(el)) {
                    // Element is already visible - send appear event immediately
                    this.seenElements.add(el);
                    this.sendAutoImpression(el, rect, "appear");
                    // Mark as actually appeared
                    this.appearedElements.add(el);
                  }
                }
              });
            }, 100); // Small delay to ensure observer is fully set up
        };
  
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", performInitialScan);
        } else {
          performInitialScan();
        }
  
        // SPA / lazy-load support: watch for new nodes
        const mutationObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType !== 1) return;
              addIfInteresting(node);
              if (node.querySelectorAll) {
                node.querySelectorAll("*").forEach(addIfInteresting);
              }
            });
          });
        });
  
        mutationObserver.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
  
        // Clean up timeouts when page unloads to prevent memory leaks
        window.addEventListener("beforeunload", () => {
          pendingAppearEvents.forEach((timeoutId) => {
            clearTimeout(timeoutId);
          });
          pendingAppearEvents.clear();
        });
      }
  
      sendAutoImpression(el, rect, action) {
        // Check if session is ready, if not queue the impression
        if (!this.started) {
          // Queue impression events until session is ready
          this.pendingImpressions.push({
            el,
            rect,
            action,
            timestamp: Date.now(),
          });
          return;
        }
  
        // Determine the element value based on type
        let value = "";
  
        if (el.matches("img")) {
          // For images, use alt text, title, or fallback to src filename
          value =
            el.alt ||
            el.title ||
            this.getFilenameFromUrl(el.currentSrc || el.src) ||
            "image";
        } else if (el.matches("video")) {
          // For videos, use title or fallback to src filename
          value =
            el.title ||
            this.getFilenameFromUrl(el.currentSrc || el.src) ||
            "video";
        } else if (el.matches("iframe")) {
          // For iframes (YouTube, Vimeo), use title or extract from src
          value =
            el.title || this.getFilenameFromUrl(el.src) || "embedded_content";
        } else if (el.matches("a")) {
          // For links, use the link text or href if no text
          value =
            (el.innerText || el.textContent || "").trim() || el.href || "link";
        } else if (el.matches('button,input,[role="button"]')) {
          // For buttons, use text content, value, or aria-label
          value =
            (
              el.innerText ||
              el.value ||
              el.getAttribute("aria-label") ||
              ""
            ).trim() || "button";
        } else if (el.matches("h1,h2,h3")) {
          // For headings, use the text content
          value = (el.innerText || el.textContent || "").trim() || "heading";
        } else if (el.matches("input:not([type=button]):not([type=submit])")) {
          // For form inputs, use type or placeholder
          value = el.placeholder || el.type || "input";
        } else if (el.matches("select")) {
          // For select dropdowns, use name or selected option
          const selectedOption = el.options[el.selectedIndex];
          value = selectedOption ? selectedOption.text : (el.name || "select");
        } else if (el.matches("textarea")) {
          // For textareas, use placeholder or name
          value = el.placeholder || el.name || "textarea";
        } else if (el.matches("label")) {
          // For labels, use text content or for attribute
          value = (el.innerText || el.textContent || "").trim() || el.getAttribute('for') || "label";
        } else if (el.matches("summary")) {
          // For summary elements, use text content
          value = (el.innerText || el.textContent || "").trim() || "summary";
        } else if (el.matches("details")) {
          // For details elements, use text content
          value = (el.innerText || el.textContent || "").trim() || "details";
        } else if (el.matches("audio")) {
          // For audio elements, use title or src
          value = el.title || this.getFilenameFromUrl(el.src) || "audio";
        } else if (el.matches('[role="checkbox"], [role="radio"], [role="switch"]')) {
          // For form controls with roles, use aria-label or text content
          value = el.getAttribute('aria-label') || (el.innerText || el.textContent || "").trim() || el.getAttribute('role');
        } else if (el.matches('[role="tab"], [role="menuitem"], [role="link"]')) {
          // For navigation elements with roles, use text content or aria-label
          value = (el.innerText || el.textContent || "").trim() || el.getAttribute('aria-label') || el.getAttribute('role');
        } else {
          // For text elements, use the text content
          value = (el.innerText || el.textContent || "").trim() || "text";
        }
  
        // Don't limit value length for event data - pass full content
  
        // Create impression event with proper structure
        const data = {
          semanticGroup: this.getSemanticGroup(el),
          id: this.generateStableElementId(el),
          type: el.tagName.toLowerCase(), // HTML tag name as type
          action: action, // 'appear' or 'disappear'
          value: value, // The actual content (text/alt/href)
        };
  
        this.track("impression", data);
      }
  
      // Helper method to extract filename from URL
      getFilenameFromUrl(url) {
        if (!url) return "";
        try {
          const pathname = new URL(url).pathname;
          const filename = pathname.split("/").pop();
          return filename || "";
        } catch (e) {
          // If URL parsing fails, try to extract filename directly
          const parts = url.split("/");
          return parts[parts.length - 1] || "";
        }
      }
  
      // Helper to clean URLs (remove query params for privacy)
      cleanUrl(url) {
        if (!url) return "";
        try {
          const urlObj = new URL(url);
          return urlObj.origin + urlObj.pathname;
        } catch (e) {
          return url;
        }
      }
  
      // Helper method to get stable text content from an element (shortened for ID generation)
      getElementText(element) {
        // Comprehensive null/undefined checks
        if (!element || typeof element !== "object") return "";
  
        // Ensure it's a DOM element
        if (!element.tagName || typeof element.tagName !== "string") return "";
  
        try {
          // For form elements, only get static attributes (not dynamic values)
          if (element.tagName === "INPUT") {
            return (element.type || "input").toString();
          }
          if (element.tagName === "SELECT") {
            return (element.name || "select").toString();
          }
          if (element.tagName === "TEXTAREA") {
            return "textarea";
          }
  
          // For images, get alt text (handle SVG images too)
          if (element.tagName === "IMG") {
            return (element.alt || element.title || "image").toString();
          }
  
          // For video and audio elements, get title, src, or fallback
          if (element.tagName === "VIDEO" || element.tagName === "AUDIO") {
            const title = element.title || element.getAttribute('title');
            const src = element.src || element.currentSrc;
            const poster = element.poster; // For video elements
            
            if (title) return title;
            if (poster) return "video_with_poster";
            if (src) return element.tagName.toLowerCase() + "_media";
            return element.tagName.toLowerCase();
          }
  
          // For buttons and interactive elements, get all text content including children
          const interactiveTags = ["BUTTON", "A", "LABEL", "SUMMARY"];
          if (interactiveTags.includes(element.tagName)) {
            let text = element.textContent || element.innerText || "";
            text = text.trim().replace(/\s+/g, " ");
            return text.length > 300 ? text.substring(0, 297) + "..." : text;
          }

          // For text container elements, get all text content including children
          const textContainerTags = ["P", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "DD", "DT", "TD", "TH"];
          if (textContainerTags.includes(element.tagName)) {
            let text = element.textContent || element.innerText || "";
            text = text.trim().replace(/\s+/g, " ");
            return text.length > 300 ? text.substring(0, 297) + "..." : text;
          }

          // For other elements, get direct text content (not including children)
          let text = "";

          // Safe iteration over childNodes
          if (element.childNodes && element.childNodes.length > 0) {
            for (let i = 0; i < element.childNodes.length; i++) {
              const child = element.childNodes[i];
              if (
                child &&
                child.nodeType === Node.TEXT_NODE &&
                child.textContent
              ) {
                text += child.textContent;
              }
            }
          }

          // Clean and limit the text (for ID generation purposes)
          text = text.trim().replace(/\s+/g, " ");
          return text.length > 100 ? text.substring(0, 97) + "..." : text;
        } catch (error) {
          // Fallback for any unexpected errors
          if (LOGGING_ENABLED) {
            console.warn("MoveoOne: Error getting element text:", error);
          }
          return "";
        }
      }
  
      // Helper method to get full text content from an element (for event data)
      getElementFullText(element) {
        // Comprehensive null/undefined checks
        if (!element || typeof element !== "object") return "";
  
        // Ensure it's a DOM element
        if (!element.tagName || typeof element.tagName !== "string") return "";
  
        try {
          // For form elements, only get static attributes (not dynamic values)
          if (element.tagName === "INPUT") {
            return (element.type || "input").toString();
          }
          if (element.tagName === "SELECT") {
            return (element.name || "select").toString();
          }
          if (element.tagName === "TEXTAREA") {
            return "textarea";
          }
  
          // For images, get alt text (handle SVG images too)
          if (element.tagName === "IMG") {
            return (element.alt || element.title || "image").toString();
          }
  
          // For video and audio elements, get title, src, or fallback
          if (element.tagName === "VIDEO" || element.tagName === "AUDIO") {
            const title = element.title || element.getAttribute('title');
            const src = element.src || element.currentSrc;
            const poster = element.poster; // For video elements
            
            if (title) return title;
            if (poster) return "video_with_poster";
            if (src) return element.tagName.toLowerCase() + "_media";
            return element.tagName.toLowerCase();
          }
  
          // For buttons and interactive elements, get all text content including children
          const interactiveTags = ["BUTTON", "A", "LABEL", "SUMMARY"];
          if (interactiveTags.includes(element.tagName)) {
            let text = element.textContent || element.innerText || "";
            text = text.trim().replace(/\s+/g, " ");
            return text;
          }

          // For text container elements, get all text content including children
          const textContainerTags = ["P", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "DD", "DT", "TD", "TH"];
          if (textContainerTags.includes(element.tagName)) {
            let text = element.textContent || element.innerText || "";
            text = text.trim().replace(/\s+/g, " ");
            return text;
          }

          // For other elements, get direct text content (not including children)
          let text = "";

          // Safe iteration over childNodes
          if (element.childNodes && element.childNodes.length > 0) {
            for (let i = 0; i < element.childNodes.length; i++) {
              const child = element.childNodes[i];
              if (
                child &&
                child.nodeType === Node.TEXT_NODE &&
                child.textContent
              ) {
                text += child.textContent;
              }
            }
          }

          // Clean the text but don't limit length (for event data)
          text = text.trim().replace(/\s+/g, " ");
          return text;
        } catch (error) {
          // Fallback for any unexpected errors
          if (LOGGING_ENABLED) {
            console.warn("MoveoOne: Error getting element full text:", error);
          }
          return "";
        }
      }
  
      // New method to detect semantic group for an element
      getSemanticGroup(element) {
        // For global events, return "global"
        if (!element || element === document || element === window) {
          return "global";
        }
  
        // Define semantic elements in priority order
        const otherSemanticElements = [
          "article",
          "aside",
          "nav",
          "header",
          "footer",
        ];
  
        // First, traverse up the DOM tree to find the closest section parent
        let currentElement = element;
        let sectionParent = null;
  
        while (currentElement && currentElement !== document.body) {
          const tagName = currentElement.tagName.toLowerCase();
  
          if (tagName === "section") {
            sectionParent = currentElement;
            break;
          }
  
          currentElement = currentElement.parentElement;
        }
  
        // If section found, use it as semantic parent
        if (sectionParent) {
          return this.getSemanticGroupName(sectionParent, false); // false = don't include element name
        }
  
        // Second priority: Look for div with ID (higher priority than semantic elements)
        currentElement = element;
        let divWithIdParent = null;
  
        while (currentElement && currentElement !== document.body) {
          const tagName = currentElement.tagName.toLowerCase();
  
          // Look for div with id
          if (
            tagName === "div" &&
            currentElement.id &&
            currentElement.id.trim()
          ) {
            divWithIdParent = currentElement;
            break;
          }
  
          currentElement = currentElement.parentElement;
        }
  
        // If div with ID found, use it as semantic parent
        if (divWithIdParent) {
          return this.getSemanticGroupName(divWithIdParent, false); // false = don't include element name
        }
  
        // Third priority: Look for other semantic elements
        currentElement = element;
        let semanticParent = null;
  
        while (currentElement && currentElement !== document.body) {
          const tagName = currentElement.tagName.toLowerCase();
  
          if (otherSemanticElements.includes(tagName)) {
            semanticParent = currentElement;
            break;
          }
  
          currentElement = currentElement.parentElement;
        }
  
        // If still no semantic parent, return "global"
        if (!semanticParent) {
          return "global";
        }
  
        // For non-section semantic elements, include the element name
        return this.getSemanticGroupName(semanticParent, true); // true = include element name
      }
  
      // Helper method to get semantic group name with smart naming strategy
      getSemanticGroupName(element, includeElementName) {
        const tagName = element.tagName.toLowerCase();
  
        // Smart naming strategy: Priority 1 - Element ID
        if (element.id && element.id.trim()) {
          const cleanId = this.cleanSemanticGroupName(element.id);
          return includeElementName ? `${tagName}_${cleanId}` : cleanId;
        }
  
        // Priority 2 - Use CSS classes for all semantic elements (both section and non-section)
        if (element.className && element.className.trim()) {
          const classNames = element.className
            .split(" ")
            .filter((cls) => cls.trim());
  
          // Filter out common utility classes and find meaningful ones
          const meaningfulClasses = classNames.filter((cls) => {
            const lowerCls = cls.toLowerCase();
            // Skip common utility classes and Webflow classes
            return (
              !lowerCls.match(
                /^(bg-|text-|p-|m-|w-|h-|flex|grid|block|inline|hidden|visible|opacity|border|rounded|shadow|transition|transform|hover|focus|active|disabled|container|row|col|btn|card|modal|nav|header|footer|sidebar|main|content|wrapper|section|article|aside|w-|w-embed|w-script|w-dyn-|w-tab-|w-form-|max-|min-|items-|justify-|self-|place-|gap-|space-|order-|col-span-|row-span-|aspect-|object-|overflow-|z-|relative|absolute|fixed|sticky|top-|right-|bottom-|left-|inset-)$/
              ) &&
              !lowerCls.includes("active") &&
              !lowerCls.includes("hidden")
            );
          });
  
          if (meaningfulClasses.length > 0) {
            // Take the first meaningful class
            const cleanClass = this.cleanSemanticGroupName(meaningfulClasses[0]);
            return includeElementName ? `${tagName}_${cleanClass}` : cleanClass;
          }
  
          // If no meaningful classes, try to use the first class that's not too generic
          const nonGenericClasses = classNames.filter((cls) => {
            const lowerCls = cls.toLowerCase();
            return !lowerCls.match(
              /^(container|wrapper|content|section|main|header|footer|nav|sidebar|row|col|btn|card|modal|w-|w-embed|w-script|w-dyn-|w-tab-|w-form-)$/
            );
          });
  
          if (nonGenericClasses.length > 0) {
            const cleanClass = this.cleanSemanticGroupName(nonGenericClasses[0]);
            return includeElementName ? `${tagName}_${cleanClass}` : cleanClass;
          }
        }
  
        // Priority 3 - Element position index as fallback
        const parent = element.parentElement;
  
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (child) => child.tagName.toLowerCase() === tagName
          );
  
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return includeElementName
              ? `${tagName}_${index}`
              : `${tagName}_${index}`;
          }
        }
  
        // Final fallback
        return includeElementName ? `${tagName}_element` : tagName;
      }
  
      // Helper method to clean semantic group names
      cleanSemanticGroupName(name) {
        if (!name) return "global";
  
        // Remove common prefixes/suffixes and clean up
        let cleaned = name
          .replace(/^[_-]+/, "") // Remove leading underscores/dashes
          .replace(/[_-]+$/, "") // Remove trailing underscores/dashes
          .replace(/[_-]+/g, "_") // Replace multiple underscores/dashes with single underscore
          .replace(/[^a-zA-Z0-9_]/g, "_") // Replace non-alphanumeric chars with underscore
          .toLowerCase();
  
        // Limit length
        if (cleaned.length > 50) {
          cleaned = cleaned.substring(0, 50);
        }
  
        return cleaned || "global";
      }
  
      // Helper method to determine if an element should be tracked
      shouldTrackElement(element) {
        // Skip script, style, and other non-visible elements
        const skipTags = [
          "SCRIPT",
          "STYLE",
          "NOSCRIPT",
          "META",
          "LINK",
          "HEAD",
          "TITLE",
        ];
        if (skipTags.includes(element.tagName)) return false;

        // Define interactive elements
        const interactiveTags = [
          "BUTTON",
          "A",
          "INPUT",
          "SELECT",
          "TEXTAREA",
          "LABEL",
          "SUMMARY",
          "DETAILS",
          "VIDEO",
          "AUDIO",
          "IMG",
          "IFRAME"
        ];
        
        const interactiveRoles = [
          "button",
          "link",
          "tab",
          "menuitem",
          "checkbox",
          "radio",
          "switch"
        ];

        const isInteractive = interactiveTags.includes(element.tagName) || 
                             (element.getAttribute && interactiveRoles.includes(element.getAttribute('role')));

        // For interactive elements, be more lenient with visibility checks
        if (isInteractive) {
          // Skip if element is part of tracking infrastructure
          if (element.id && element.id.includes("moveo")) return false;
          if (element.className && element.className.includes("moveo")) return false;
          
          // For interactive elements, only check if they're not completely hidden by CSS
          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return false;
          }
          
          // ALWAYS track interactive elements regardless of text content or getBoundingClientRect
          // This ensures buttons like "OK", "Cancel", etc. are always tracked
          return true;
        }

        // For non-interactive elements, use strict visibility check
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        // For non-interactive elements, check for meaningful content
        const text = this.getElementText(element);
        if (!text || text.length < 1) return false;

        // Skip if element is part of tracking infrastructure
        if (element.id && element.id.includes("moveo")) return false;
        if (element.className && element.className.includes("moveo")) return false;

        // Check if this is a small text element that should be excluded
        if (this.isSmallTextElement(element) && this.hasTextContainerParent(element)) {
          return false;
        }

        // Check if this is a text container element that should be excluded (nested in another text container)
        if (this.isTextContainerElement(element) && this.hasTextContainerParent(element)) {
          return false;
        }

        return true;
      }

      // Helper method to identify small text elements
      isSmallTextElement(element) {
        const smallTextTags = [
          "SPAN", "EM", "STRONG", "I", "B", "U", "S", "SMALL", "MARK", "DEL", "INS", "SUB", "SUP", "CODE", "KBD", "SAMP", "VAR", "CITE", "ABBR", "TIME", "DATA"
        ];
        return smallTextTags.includes(element.tagName);
      }

      // Helper method to identify text container elements
      isTextContainerElement(element) {
        const textContainerTags = [
          "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "DD", "DT", "TD", "TH"
        ];
        return textContainerTags.includes(element.tagName);
      }

      // Helper method to check if element has a text container parent
      hasTextContainerParent(element) {
        const textContainerTags = [
          "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "DD", "DT", "TD", "TH"
        ];
        
        let current = element.parentElement;
        while (current && current !== document.body) {
          // Check if current element is a text container
          if (textContainerTags.includes(current.tagName)) {
            // Verify it has meaningful text content
            const parentText = this.getElementText(current);
            if (parentText && parentText.trim().length > 0) {
              return true;
            }
          }
          
          current = current.parentElement;
        }
        
        return false;
      }
  
      // Enhanced hover tracking for all elements with text
      setupHoverTracking() {
        let hoverTimeout;
        const HOVER_DELAY = 1500; // Track hovers that last at least 1.5 seconds
  
        document.addEventListener("mouseover", (event) => {
          const target = event.target;
  
          // Clear any existing hover timeout
          clearTimeout(hoverTimeout);
  
          // Check if we should track this element
          if (!this.shouldTrackElement(target)) return;
  
          // Set timeout to track sustained hover
          hoverTimeout = setTimeout(() => {
            const elementText = this.getElementFullText(target);
  
            const data = {
              semanticGroup: this.getSemanticGroup(target),
              id: this.generateStableElementId(target),
              type: target.tagName.toLowerCase(),
              action: "hover",
              value: elementText,
            };
  
            this.track("hover", data);
          }, HOVER_DELAY);
        });
  
        // Clear timeout when mouse leaves
        document.addEventListener("mouseout", (event) => {
          clearTimeout(hoverTimeout);
        });
      }
  
      async trackPageNavigation() {
        // Track page view for the new page - send immediately to ensure proper ordering
        const event = {
          c: this.context,
          type: "track",
          t: Date.now(),
          prop: {
            sg: "global",
            eID: this.generateGlobalEventId("page_view", {
              path: this.getCurrentPath(),
            }),
            eA: "page_view",
            eT: "page",
            eV: this.getCurrentPath() || "",
            sc: this.getCurrentPath() || "unknown",
          },
          sId: this.sessionId,
        };
  
        // Send page view immediately to ensure it's processed before any user interactions
        this.sendEventImmediate(event);
      }
  
      // Helper method to check if a URL is outbound
      isOutboundLink(url) {
        try {
          const link = new URL(url, window.location.href);
          const currentDomain = window.location.hostname;
  
          // Check if it's a different domain
          return (
            link.hostname !== currentDomain && link.protocol.startsWith("http")
          );
        } catch (e) {
          return false;
        }
      }
  
      // Updated method name and functionality
      setupDownloadOrOutboundLinkTracking() {
        // Function to track existing download and outbound links
        const trackLinks = () => {
          const links = document.querySelectorAll("a[href]");
  
          links.forEach((link) => {
            // Skip if already tracked
            if (this.trackedLinks.has(link)) return;
  
            const url = link.href;
  
            // Check if it's a downloadable file
            const isDownloadable = url.match(
              /\.(pdf|zip|docx?|xlsx?|pptx?|txt|csv|json|xml|gz|tar|rar|7z|exe|dmg|pkg|deb|rpm|iso|img|mp3|mp4|avi|mov|wmv|flv|webm|ogg|wav|flac)$/i
            );
  
            // Check if it's an outbound link
            const isOutbound = this.isOutboundLink(url);
  
            // Only track if it's either downloadable or outbound
            if (isDownloadable || isOutbound) {
              this.trackedLinks.add(link);
  
              link.addEventListener("click", (event) => {
                if (isDownloadable) {
                  // Handle download tracking
                  const filename = url.split("/").pop() || url;
                  const fileExtension = filename.split(".").pop() || "unknown";
  
                  this.trackImmediate("download", {
                    semanticGroup: this.getSemanticGroup(link),
                    id: this.generateStableElementId(link),
                    type: "download",
                    action: "click",
                    value: filename,
                  });
  
                  if (LOGGING_ENABLED) {
                    console.log("MoveoOne: Download tracked -", filename);
                  }
                } else if (isOutbound) {
                  // Handle outbound link tracking with improved reliability
                  const domain = new URL(url).hostname;
  
                  // Track the outbound link immediately (don't prevent default behavior)
                  this.trackImmediate("outbound_link", {
                    semanticGroup: this.getSemanticGroup(link),
                    id: this.generateStableElementId(link),
                    type: "outbound_link",
                    action: "click",
                    value: url,
                  });
  
                  if (LOGGING_ENABLED) {
                    console.log("MoveoOne: Outbound link tracked -", domain);
                  }
                  
                  // Let the browser handle navigation naturally (new tab, same tab, etc.)
                  // The trackImmediate method uses keepalive to ensure the request completes
                }
              });
            }
          });
        };
  
        // Track links on initial load
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", trackLinks);
        } else {
          trackLinks();
        }
  
        // Watch for dynamically added links
        const setupLinkObserver = () => {
          const targetNode = document.body || document.documentElement;
          if (targetNode) {
            const observer = new MutationObserver(() => {
              trackLinks();
            });
  
            observer.observe(targetNode, {
              childList: true,
              subtree: true,
            });
          }
        };
  
        if (document.body) {
          setupLinkObserver();
        } else {
          document.addEventListener("DOMContentLoaded", setupLinkObserver);
        }
      }
  
      setupPageUnloadTracking() {
        // Track when user leaves the page
        window.addEventListener("beforeunload", () => {
          // Send any remaining events immediately
          if (this.buffer.length > 0) {
            // Use optimized approach for reliable delivery during page unload
            const data = JSON.stringify({ events: [...this.buffer] });
            fetch(API_URL, {
              method: "POST",
              headers: {
                Authorization: this.token,
                "Content-Type": "application/json",
              },
              body: data,
              keepalive: true, // Ensures request completes even if page unloads
              signal: AbortSignal.timeout(5000), // 5 second timeout
            }).catch((error) => {
              if (LOGGING_ENABLED) {
                console.error("MoveoOne Unload Error:", error);
              }
            });
          }
  
          // Update session timestamp
          this.updateSessionActivity();
        });
  
        // Backup: Also listen for pagehide event (more reliable than beforeunload)
        window.addEventListener("pagehide", () => {
          // Send any remaining events immediately
          if (this.buffer.length > 0) {
            const data = JSON.stringify({ events: [...this.buffer] });
            fetch(API_URL, {
              method: "POST",
              headers: {
                Authorization: this.token,
                "Content-Type": "application/json",
              },
              body: data,
              keepalive: true,
              signal: AbortSignal.timeout(5000),
            }).catch((error) => {
              if (LOGGING_ENABLED) {
                console.error("MoveoOne PageHide Error:", error);
              }
            });
          }
  
          // Update session timestamp
          this.updateSessionActivity();
        });
  
        // Also track page visibility changes
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") {
            this.updateSessionActivity();
            // Flush any pending events when page becomes hidden
            if (this.buffer.length > 0) {
              this.flush();
            }
  
            // Track when user switches away from the page
            this.track("visibility_change", {
              semanticGroup: "global",
              id: this.generateGlobalEventId("visibility_change", {
                state: "hidden",
              }),
              type: "hidden",
              action: "visibility_change",
              value: "page_hidden",
            });
          } else if (document.visibilityState === "visible") {
            this.updateSessionActivity();
  
            // Track when user returns to the page
            this.track("visibility_change", {
              semanticGroup: "global",
              id: this.generateGlobalEventId("visibility_change", {
                state: "visible",
              }),
              type: "visible",
              action: "visibility_change",
              value: "page_visible",
            });
          }
        });
      }
  
      setupMediaTracking() {
        // Track existing media elements
        const trackMediaElements = () => {
          const mediaElements = document.querySelectorAll("video, audio");
  
          mediaElements.forEach((media) => {
            // Avoid duplicate listeners by checking if already tracked
            if (this.trackedMedia.has(media)) return;
            this.trackedMedia.add(media);
  
            const mediaType = media.tagName.toLowerCase();
            const mediaId = this.generateStableElementId(media);
  
            media.addEventListener("play", () => {
              this.track("media_play", {
                semanticGroup: this.getSemanticGroup(media),
                id: mediaId,
                type: mediaType,
                action: "media_play",
              });
            });
  
            media.addEventListener("pause", () => {
              this.track("media_pause", {
                semanticGroup: this.getSemanticGroup(media),
                id: mediaId,
                type: mediaType,
                action: "media_pause",
              });
            });
  
            media.addEventListener("ended", () => {
              this.track("media_complete", {
                semanticGroup: this.getSemanticGroup(media),
                id: mediaId,
                type: mediaType,
                action: "media_complete",
              });
            });
          });
        };
  
        // Track media elements on initial load
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", trackMediaElements);
        } else {
          trackMediaElements();
        }
  
        // Watch for dynamically added media elements
        // Only set up observer if document.body exists, otherwise wait for DOM ready
        const setupObserver = () => {
          const targetNode = document.body || document.documentElement;
          if (targetNode) {
            const observer = new MutationObserver(() => {
              trackMediaElements();
            });
  
            observer.observe(targetNode, {
              childList: true,
              subtree: true,
            });
          }
        };
  
        if (document.body) {
          setupObserver();
        } else {
          document.addEventListener("DOMContentLoaded", setupObserver);
        }
      }
  
      setupClipboardTracking() {
        document.addEventListener("copy", (e) => {
          const text = window.getSelection().toString();
  
          // Only track if there's actual text selected
          if (text && text.trim().length > 0) {
            // Get the semantic group from the selection's anchor node
            const selection = window.getSelection();
            const anchorElement = selection.anchorNode
              ? selection.anchorNode.nodeType === Node.ELEMENT_NODE
                ? selection.anchorNode
                : selection.anchorNode.parentElement
              : null;
  
            this.track("copy", {
              semanticGroup: this.getSemanticGroup(anchorElement),
              id: anchorElement
                ? this.generateStableElementId(anchorElement)
                : "copy_text",
              type: "clipboard",
              action: "copy",
              value: text,
            });
          }
        });
      }
  
      flush() {
        if (this.buffer.length === 0) return;
  
        const dataToSend = [...this.buffer];
        this.buffer = [];
  
        // Debug logging
        if (LOGGING_ENABLED) {
          console.log("MoveoOne: Sending events", dataToSend);
          dataToSend.forEach((event, index) => {
            console.log(`Event ${index}:`, {
              type: event.type,
              context: event.c,
              sessionId: event.sId,
              eA: event.prop.eA,
              eT: event.prop.eT,
              eV: event.prop.eV,
              sc: event.prop.sc,
              meta: event.meta,
              additionalMeta: event.additionalMeta,
            });
          });
        }
  
        fetch(API_URL, {
          method: "POST",
          headers: {
            Authorization: this.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ events: dataToSend }),
        }).catch((error) => {
          if (LOGGING_ENABLED) {
            console.error("MoveoOne Error:", error);
          }
        });
      }
  
      // Enhanced click tracking for all elements with text
      setupClickTracking() {
        // Function to handle click events
        const handleClick = (event) => {
          let target = event.target;
  
          // Find the closest interactive element if we clicked on a child
          const findInteractiveParent = (element) => {
            const interactiveTags = ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY", "VIDEO", "AUDIO", "IMG", "IFRAME"];
            const interactiveRoles = ["button", "link", "tab", "menuitem", "checkbox", "radio", "switch"];
            
            let current = element;
            while (current && current !== document.body) {
              if (interactiveTags.includes(current.tagName) || 
                  (current.getAttribute && interactiveRoles.includes(current.getAttribute('role')))) {
                return current;
              }
              current = current.parentElement;
            }
            return element; // Return original if no interactive parent found
          };
  
          // Try to find the actual interactive element that was clicked
          const interactiveElement = findInteractiveParent(target);
          
          // Check if we should track this element
          if (!this.shouldTrackElement(interactiveElement)) {
            // Debug logging for untracked elements
            if (LOGGING_ENABLED) {
              console.log("MoveoOne: Element not tracked:", {
                tagName: interactiveElement.tagName,
                id: interactiveElement.id,
                className: interactiveElement.className,
                text: interactiveElement.textContent?.trim(),
                visible: interactiveElement.getBoundingClientRect().width > 0 && interactiveElement.getBoundingClientRect().height > 0
              });
            }
            return;
          }
  
          // Skip download and outbound links as they're handled separately by setupDownloadOrOutboundLinkTracking
          if (interactiveElement.tagName === "A" && interactiveElement.href) {
            const isDownloadable = interactiveElement.href.match(
              /\.(pdf|zip|docx?|xlsx?|pptx?|txt|csv|json|xml|gz|tar|rar|7z|exe|dmg|pkg|deb|rpm|iso|img|mp3|mp4|avi|mov|wmv|flv|webm|ogg|wav|flac)$/i
            );
            const isOutbound = this.isOutboundLink(interactiveElement.href);
  
            if (isDownloadable || isOutbound) {
              return;
            }
          }
  
          // Get the text content of the clicked element
          const elementText = this.getElementFullText(interactiveElement);
  
          const data = {
            semanticGroup: this.getSemanticGroup(interactiveElement),
            id: this.generateStableElementId(interactiveElement),
            type: interactiveElement.tagName.toLowerCase(),
            action: "click",
            value: elementText,
          };
  
          // Use immediate tracking for internal navigation links to prevent race conditions
          if (interactiveElement.tagName === "A" && interactiveElement.href) {
            try {
              const linkUrl = new URL(interactiveElement.href, window.location.href);
              const currentUrl = new URL(window.location.href);
  
              // Only handle internal navigation (same domain, different path)
              // Outbound links are handled by setupDownloadOrOutboundLinkTracking
              if (
                linkUrl.hostname === currentUrl.hostname &&
                linkUrl.pathname !== currentUrl.pathname
              ) {
                this.trackImmediate("click", data);
                return;
              }
            } catch (e) {
              // If URL parsing fails, log the error and fall back to buffered tracking
              if (LOGGING_ENABLED) {
                console.warn(
                  "MoveoOne: Failed to parse URL for click tracking:",
                  e
                );
              }
            }
          }
  
          // Use buffered tracking for non-navigation clicks
          this.track("click", data);
          
          // Debug logging for tracked clicks
          if (LOGGING_ENABLED) {
            console.log("MoveoOne: Click tracked:", {
              tagName: interactiveElement.tagName,
              id: interactiveElement.id,
              text: elementText,
              semanticGroup: data.semanticGroup
            });
          }
        };
  
        // Add click listener to document
        document.addEventListener("click", handleClick);
  
        // Also watch for dynamically added elements
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Re-attach click listener to ensure new elements are tracked
                if (node.addEventListener) {
                  node.addEventListener("click", handleClick);
                }
                // Also check child elements
                if (node.querySelectorAll) {
                  node.querySelectorAll("*").forEach((child) => {
                    if (child.addEventListener) {
                      child.addEventListener("click", handleClick);
                    }
                  });
                }
              }
            });
          });
        });
  
        // Start observing
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
  
      setupScrollTracking() {
        let lastScrollPosition = 0;
        let scrollTimeout;
  
        window.addEventListener("scroll", () => {
          clearTimeout(scrollTimeout);
  
          scrollTimeout = setTimeout(() => {
            const scrollPosition = window.scrollY;
            const documentHeight =
              document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercentage = Math.round(
              (scrollPosition / documentHeight) * 100
            );
  
            if (Math.abs(scrollPosition - lastScrollPosition) > 100) {
              this.track("scroll", {
                semanticGroup: "global",
                id: this.generateGlobalEventId("scroll", {
                  scrollPercentage: scrollPercentage,
                }),
                type: "scroll",
                action: "scroll",
                value: scrollPercentage.toString(),
              });
  
              lastScrollPosition = scrollPosition;
            }
          }, 500);
        });
      }
  
      setupFormTracking() {
        document.addEventListener("submit", (event) => {
          const form = event.target;
  
          // Use immediate tracking for form submissions to prevent race conditions
          this.trackImmediate("form_submit", {
            semanticGroup: this.getSemanticGroup(form),
            id: this.generateStableElementId(form),
            type: "form",
            action: "form_submit",
            value: "",
          });
        });
  
        document.addEventListener("change", (event) => {
          const target = event.target;
          if (
            ["select", "input", "textarea"].includes(target.tagName.toLowerCase())
          ) {
            this.track("form_change", {
              semanticGroup: this.getSemanticGroup(target),
              id: this.generateStableElementId(target),
              type: target.type || target.tagName.toLowerCase(),
              action: "form_change",
              value: target.type === "password" ? "[REDACTED]" : target.value,
            });
          }
        });
      }
  
      setupResizeTracking() {
        let resizeTimeout;
  
        window.addEventListener("resize", () => {
          clearTimeout(resizeTimeout);
  
          resizeTimeout = setTimeout(() => {
            const newViewport = {
              width: window.innerWidth,
              height: window.innerHeight,
            };
  
            // Only track if there's a significant change
            if (
              Math.abs(newViewport.width - this.currentViewport.width) > 50 ||
              Math.abs(newViewport.height - this.currentViewport.height) > 50
            ) {
              this.track("viewport_resize", {
                semanticGroup: "global",
                id: this.generateGlobalEventId("viewport_resize", {
                  width: newViewport.width,
                  height: newViewport.height,
                }),
                type: "resize",
                action: "viewport_resize",
                value: `${newViewport.width}x${newViewport.height}`,
              });
  
              this.currentViewport = newViewport;
            }
          }, 300);
        });
      }
  
      getElementPath(element) {
        const path = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
          let selector = element.nodeName.toLowerCase();
          if (element.id) {
            selector += "#" + element.id;
          } else if (element.className) {
            selector += "." + element.className.replace(/\s+/g, ".");
          }
          path.unshift(selector);
          element = element.parentNode;
        }
        return path.join(" > ");
      }
  
      generateUUID() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
          /[xy]/g,
          function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }
        );
      }
  
      // Generate stable, unique element ID that persists across page loads
      generateStableElementId(element) {
        // For elements with stable IDs, use them directly
        if (element.id && element.id.trim()) {
          return this.cleanElementId(element.id);
        }
  
        // Build a stable signature using only immutable properties
        const signature = this.buildStableSignature(element);
        const signatureHash = this.hashString(JSON.stringify(signature));
  
        // Ensure the final ID is not too long and is clean
        const finalId = `${element.tagName.toLowerCase()}_${signatureHash}`;
        return this.cleanElementId(finalId);
      }
  
      // Build a stable signature using only immutable element properties
      buildStableSignature(element) {
        const signature = {
          tag: element.tagName.toLowerCase(),
          // Only include stable attributes that don't change
          stableAttributes: this.getStableAttributes(element),
          // Only include stable content that doesn't change
          stableContent: this.getStableContent(element),
        };
  
        return signature;
      }
  
      // Get only stable attributes that don't change
      getStableAttributes(element) {
        const attributes = {};
  
        // Only include attributes that are set in HTML and don't change
        if (element.name) attributes.name = element.name;
        if (element.type) attributes.type = element.type;
        if (element.title) attributes.title = element.title;
        if (element.alt) attributes.alt = element.alt;
  
        // Extract meaningful CSS classes (similar to getSemanticGroupName)
        if (element.className && element.className.trim()) {
          const classNames = element.className
            .split(" ")
            .filter((cls) => cls.trim());
  
          // Filter out common utility classes and find meaningful ones
          const meaningfulClasses = classNames.filter((cls) => {
            const lowerCls = cls.toLowerCase();
            // Skip common utility classes and Webflow classes
            return (
              !lowerCls.match(
                /^(bg-|text-|p-|m-|w-|h-|flex|grid|block|inline|hidden|visible|opacity|border|rounded|shadow|transition|transform|hover|focus|active|disabled|container|row|col|btn|card|modal|nav|header|footer|sidebar|main|content|wrapper|section|article|aside|w-|w-embed|w-script|w-dyn-|w-tab-|w-form-|max-|min-|items-|justify-|self-|place-|gap-|space-|order-|col-span-|row-span-|aspect-|object-|overflow-|z-|relative|absolute|fixed|sticky|top-|right-|bottom-|left-|inset-)$/
              ) &&
              !lowerCls.includes("active") &&
              !lowerCls.includes("hidden")
            );
          });
  
          if (meaningfulClasses.length > 0) {
            // Take the first meaningful class
            attributes.meaningfulClass = this.cleanSemanticGroupName(
              meaningfulClasses[0]
            );
          }
        }
  
        return attributes;
      }
  
      // Get only stable content that doesn't change
      getStableContent(element) {
        const content = {};
  
        // Only include static text content (not dynamic values)
        const textContent = this.getElementText(element);
        if (textContent && textContent.trim().length > 0) {
          // Skip form values that can change
          if (element.tagName !== "INPUT" || element.type === "hidden") {
            content.text = textContent.trim();
          }
        }
  
        // For links, include the href (stable URL)
        if (element.tagName === "A" && element.href) {
          content.href = element.href;
        }
  
        // For images, include the src (stable URL)
        if (element.tagName === "IMG" && element.src) {
          content.src = element.src;
        }
  
        // For media elements, include the src (stable URL)
        if (
          (element.tagName === "VIDEO" || element.tagName === "AUDIO") &&
          element.src
        ) {
          content.src = element.src;
        }
  
        return content;
      }
  
      // Helper method to clean element IDs
      cleanElementId(id) {
        if (!id) return "unnamed_element";
  
        return id
          .replace(/[^a-zA-Z0-9_-]/g, "_") // Replace invalid chars with underscore
          .replace(/_{2,}/g, "_") // Replace multiple underscores with single
          .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
          .toLowerCase()
          .substring(0, 50); // Limit length
      }
  
      // Enhanced hash function for better uniqueness and JSON handling
      hashString(str) {
        if (!str) return "empty";
  
        // For JSON objects, normalize the string first
        if (typeof str === "object") {
          str = JSON.stringify(str, Object.keys(str).sort());
        }
  
        // Use a more robust hash function (djb2 variant)
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
          hash = (hash << 5) + hash + str.charCodeAt(i);
          hash = hash & 0xffffffff; // Keep 32-bit
        }
  
        // Convert to positive hex string with better distribution
        return Math.abs(hash).toString(16).padStart(8, "0");
      }
  
      // Generate unique ID for global events (events without specific DOM elements)
      generateGlobalEventId(eventType, additionalData = {}) {
        // Create a unique identifier based on event type and additional data
        let uniqueKey = eventType;

        // Add additional data to make it more unique
        if (additionalData.path) {
          uniqueKey += `_${this.hashString(additionalData.path)}`;
        }

        if (additionalData.value) {
          uniqueKey += `_${this.hashString(additionalData.value)}`;
        }

        if (additionalData.action) {
          uniqueKey += `_${additionalData.action}`;
        }

        // For page-specific events, include the current path
        if (eventType === "page_view" || eventType === "viewport_size") {
          const currentPath = this.getCurrentPath();
          uniqueKey += `_${this.hashString(currentPath)}`;
        }

        // For scroll events, include scroll percentage
        if (eventType === "scroll" && additionalData.scrollPercentage) {
          uniqueKey += `_${additionalData.scrollPercentage}`;
        }

        // For viewport resize events, include dimensions
        if (
          eventType === "viewport_resize" &&
          additionalData.width &&
          additionalData.height
        ) {
          uniqueKey += `_${additionalData.width}x${additionalData.height}`;
        }

        // Create final hash to ensure consistent length
        const finalHash = this.hashString(uniqueKey);

        // Return with event type prefix for clarity
        return `${eventType}_${finalHash}`;
      }

      // Internal predict method with comprehensive error handling
      async internalPredict(modelId, sessionId) {
        try {
          // Validate inputs
          if (!modelId || typeof modelId !== 'string' || modelId.trim() === '') {
            throw new Error('Model ID is required and must be a non-empty string');
          }

          if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
            throw new Error('Session ID is required and must be a non-empty string');
          }

          // Construct the API endpoint
          const endpoint = `${DOLPHIN_URL}/api/models/${encodeURIComponent(modelId.trim())}/predict`;
          
          // Prepare the request payload
          const requestPayload = {
            session_id: sessionId.trim()
          };

          // Make the HTTP request with timeout and error handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 100); // 100 millisecond timeout

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': this.token
            },
            body: JSON.stringify(requestPayload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          // Handle different response status codes
          if (response.status === 202) {
            // Model is loading or validating - client needs to retry
            const responseData = await response.json();
            return {
              success: false,
              status: 'pending',
              message: responseData.message || 'Model is loading, please try again'
            };
          }

          if (response.status === 404) {
            const errorData = await response.json().catch(() => ({}));
            return {
              success: false,
              status: 'not_found',
              message: errorData.detail || `Model '${modelId}' not found or not accessible`
            };
          }

          if (response.status === 409) {
            const errorData = await response.json().catch(() => ({}));
            return {
              success: false,
              status: 'conflict',
              message: errorData.detail || 'Conditional event not found'
            };
          }

          if (response.status === 422) {
            const errorData = await response.json().catch(() => ({}));
            return {
              success: false,
              status: 'invalid_data',
              message: errorData.detail || 'Invalid prediction data'
            };
          }

          if (response.status === 500) {
            return {
              success: false,
              status: 'server_error',
              message: 'Server error processing prediction request'
            };
          }

          if (!response.ok) {
            return {
              success: false,
              status: 'error',
              message: `Request failed with status ${response.status}`
            };
          }

          // Parse successful response
          const predictionData = await response.json();
          
          return {
            success: true,
            status: 'success',
            prediction_probability: predictionData.prediction_probability,
            prediction_binary: predictionData.prediction_binary
          };

        } catch (error) {
          // Handle different types of errors
          if (error.name === 'AbortError') {
            return {
              success: false,
              status: 'timeout',
              message: 'Request timed out after 100 milliseconds'
            };
          }

          if (error instanceof TypeError && error.message.includes('fetch')) {
            return {
              success: false,
              status: 'network_error',
              message: 'Network error - please check your connection'
            };
          }

          // Log unexpected errors in development
          if (LOGGING_ENABLED) {
            console.error('MoveoOne: Unexpected error in predict method:', error);
          }

          return {
            success: false,
            status: 'error',
            message: 'An unexpected error occurred'
          };
        }
      }
    }
  
    // Global initialization function
    window.MoveoOne = {
      init: function (token, options = {}) {
        // Prevent multiple initializations
        if (window.MoveoOne.instance) {
          if (LOGGING_ENABLED) {
            console.warn("MoveoOne: Already initialized, returning existing instance");
          }
          return window.MoveoOne.instance;
        }
        
        const instance = new MoveoOneWeb(token);
  
        // Define allowed meta fields (libVersion is automatically included and protected)
        const allowedMetaFields = ["locale", "test", "appVersion"];
  
        // Validate and set only allowed meta values
        Object.keys(options).forEach((key) => {
          if (allowedMetaFields.includes(key)) {
            switch (key) {
              case "locale":
                if (typeof options[key] === "string") {
                  instance.meta.locale = options[key];
                }
                break;
              case "test":
                if (typeof options[key] === "string") {
                  instance.meta.test = options[key];
                }
                break;
              case "appVersion":
                if (typeof options[key] === "string") {
                  instance.meta.appVersion = options[key];
                }
                break;
            }
          } else if (key === "libVersion") {
            console.warn(
              `MoveoOne: libVersion is automatically set to "${LIB_VERSION}" and cannot be overridden by client code.`
            );
          } else {
            console.warn(
              `MoveoOne: Invalid meta field "${key}" ignored. Allowed fields: ${allowedMetaFields.join(
                ", "
              )}. Note: libVersion is automatically included.`
            );
          }
        });
  
        instance.initialize();
  
        // Store instance globally for access
        window.MoveoOne.instance = instance;
  
        return instance;
      },
  
      // Getter method to expose the library version (read-only)
      getLibVersion: function () {
        return LIB_VERSION;
      },

      // Global predict method - can only be called after initialization
      predict: function (modelId) {
        // Check if MoveoOne has been initialized
        if (!window.MoveoOne.instance) {
          return Promise.resolve({
            success: false,
            status: 'not_initialized',
            message: 'MoveoOne must be initialized before using predict method. Call MoveoOne.init() first.'
          });
        }

        // Validate modelId parameter
        if (!modelId || typeof modelId !== 'string' || modelId.trim() === '') {
          return Promise.resolve({
            success: false,
            status: 'invalid_model_id',
            message: 'Model ID is required and must be a non-empty string'
          });
        }

        // Get the current session ID from the instance
        const sessionId = window.MoveoOne.instance.sessionId;
        
        if (!sessionId) {
          return Promise.resolve({
            success: false,
            status: 'no_session',
            message: 'No active session found. Please ensure MoveoOne is properly initialized.'
          });
        }

        // Call the internal predict method asynchronously
        // This is non-blocking and won't affect website performance
        return window.MoveoOne.instance.internalPredict(modelId.trim(), sessionId);
      }

    };
  })(window);
  