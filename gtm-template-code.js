// MoveoOne Analytics GTM Template - Sandboxed JavaScript Code
// Copy this entire code into the GTM Template Editor Code tab

const injectScript = require('injectScript');
const callInWindow = require('callInWindow');
const log = require('logToConsole');

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

log('MoveoOne: Setting up initialization data with token and config:', config);

log('MoveoOne: Loading script...');

// Load MoveoOne library
const moveoScriptUrl = 'https://moveoonestoragedev.blob.core.windows.net/gtm-template-source/moveo-one-script.min.js';

injectScript(moveoScriptUrl, function() {
  log('MoveoOne: Script loaded successfully, initializing...');
  
  // Initialize MoveoOne using callInWindow (proper GTM approach)
  callInWindow('MoveoOne.init', moveoToken.trim(), config);
  
  log('MoveoOne: Initialized successfully');
  data.gtmOnSuccess();
}, function() {
  log('MoveoOne Error: Failed to inject script');
  data.gtmOnFailure();
});
