// MoveoOne Analytics GTM Template - Simplified Version (No Window Access)
// Copy this entire code into the GTM Template Editor Code tab

const injectScript = require('injectScript');
const log = require('logToConsole');

// Get configuration from template fields
const moveoToken = data.moveoToken;

// Validate required token
if (!moveoToken || moveoToken.trim() === '') {
  log('MoveoOne Error: Token is required');
  data.gtmOnFailure();
  return;
}

log('MoveoOne: Loading script with token:', moveoToken);

// Load MoveoOne library
const moveoScriptUrl = 'https://moveoonestorage.blob.core.windows.net/000-scripts/moveo-one-script.min.js';

injectScript(moveoScriptUrl, function() {
  log('MoveoOne: Script loaded successfully');
  data.gtmOnSuccess();
}, function() {
  log('MoveoOne Error: Failed to inject script');
  data.gtmOnFailure();
});
