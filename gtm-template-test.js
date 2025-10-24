// MoveoOne GTM Template Test
// Copy this into the Template Tests section in GTM Template Editor

const mockData = {
  // Mocked field values - these should match your template field IDs exactly
  moveoToken: 'test-token-123',
  appVersion: '1.0.0',
  locale: 'en-US',
  test: 'A', // A/B test identifier
  calculateLatency: true
};

// Call runCode to run the template's code.
runCode(mockData);

// Verify that injectScript was called
assertApi('injectScript').wasCalled();

// Verify that logToConsole was called
assertApi('logToConsole').wasCalled();

// Note: callInWindow is called inside injectScript success callback
// which may not execute in test environment, so we focus on the main actions
// The actual callInWindow('MoveoOne.init') happens after script loads
