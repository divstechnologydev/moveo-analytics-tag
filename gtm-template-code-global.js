// MoveoOne Analytics GTM Template - Sandboxed JavaScript Code (Global Access Version)
// Copy this entire code into the GTM Template Editor Code tab

const injectScript = require('injectScript');
const log = require('logToConsole');
const global = require('global');

// Get configuration from template fields
const moveoToken = data.moveoToken;
const appVersion = data.appVersion || '';
const locale = data.locale || '';
const testMode = data.testMode || false;
const calculateLatency = data.calculateLatency !== false; // Default to true

// Validate required token
if (!moveoToken || moveoToken.trim() === '') {
  log('MoveoOne Error: Token is required');
  data.gtmOnFailure();
  return;
}

// Build configuration object (only allowed fields per MoveoOne validation)
const config = {};
if (appVersion && appVersion.trim() !== '') {
  config.appVersion = appVersion.trim();
}
if (locale && locale.trim() !== '') {
  config.locale = locale.trim();
}
if (testMode) {
  config.test = 'true';
}
config.calculateLatency = calculateLatency;

log('MoveoOne: Initializing with token and config:', config);

// Load MoveoOne library
const moveoScriptUrl = 'https://moveoonestorage.blob.core.windows.net/000-scripts/moveo-one-script.min.js';

injectScript(moveoScriptUrl, function() {
  // Check if MoveoOne loaded successfully
  if (global.MoveoOne && typeof global.MoveoOne.init === 'function') {
    try {
      // Initialize MoveoOne with token and config
      const moveoInstance = global.MoveoOne.init(moveoToken, config);
      
      // Expose prediction method globally for custom triggers
      if (global.MoveoOne.predict) {
        global.moveoPredict = function(modelId) {
          if (!modelId || typeof modelId !== 'string') {
            log('MoveoOne Error: Model ID must be a non-empty string');
            return Promise.reject('Invalid model ID');
          }
          return global.MoveoOne.predict(modelId);
        };
      }
      
      // Expose instance for debugging (optional)
      global.moveoInstance = moveoInstance;
      
      log('MoveoOne: Successfully initialized');
      data.gtmOnSuccess();
      
    } catch (error) {
      log('MoveoOne Error: Initialization failed -', error.message);
      data.gtmOnFailure();
    }
  } else {
    log('MoveoOne Error: Library failed to load or init method not available');
    data.gtmOnFailure();
  }
}, function() {
  log('MoveoOne Error: Failed to inject script');
  data.gtmOnFailure();
});
