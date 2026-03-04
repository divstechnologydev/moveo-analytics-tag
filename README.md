# moveo-analytics-tag
JS Head Tag to integrate Moveo One analytics

To install the Moveo One analytics library for web, please follow the instructions below:

## Basic Installation

1. Include the two <script> lines at the very end of every page you want to track—just before each </body> tag. For example, on every HTML file:

```html
<!-- At the very end of the <body>, just before </body> -->
<script src="https://moveoonestorage.blob.core.windows.net/000-scripts/moveo-one-script.min.js"></script>
<script>
  // Initialize MoveoOne with their token
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE');
</script>
```

### App Version Tracking

You can track your application version by setting it during initialization:

```html
<script>
  // Initialize with app version
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', {
    appVersion: '1.0.0'
  });
</script>
```

### Deployment type (static website vs web app)

You can set the deployment type to control impression (appear/disappear) tracking:

- **`STATIC_WEBSITE`** (default) — The library tracks when elements enter and leave the viewport and sends appear/disappear events to the API.
- **`WEB_APP`** — Appear and disappear events are not sent. All other tracking (clicks, links, media, viewport, page view, etc.) works as usual. Use this for single-page or app-like experiences where viewport impressions are not needed.

```html
<script>
  // Static website (default): impression observer runs, appear/disappear sent
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE');

  // Web app: no appear/disappear events; all other tracking unchanged
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', { type: 'WEB_APP' });
</script>
```

### User data from storage (WEB_APP only)

When `type` is `WEB_APP`, you can optionally pass a **storage source** and a list of **user data keys**. The script will read those keys from the chosen storage (e.g. your app’s `localStorage` or `sessionStorage`) when building the first session metadata and add the key–value pairs to the event payload. This only runs when `type === 'WEB_APP'`; for `STATIC_WEBSITE` these options are ignored.

- **`storageSource`** — Where to read from: `'local'` (default) for `localStorage`, or `'session'` for `sessionStorage`.
- **`userDataKeys`** — Array of storage key names to read (e.g. `['user_id', 'organization_id', 'user_email']`). Only keys that exist and can be read are added to metadata; missing keys are skipped. Invalid or inaccessible storage is caught and logged without breaking the script.

Example: if your app stores a user identifier under the key `id` in `localStorage`, you can send it as metadata with:

```html
<script>
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', {
    type: 'WEB_APP',
    storageSource: 'local',   // default; use 'session' for sessionStorage
    userDataKeys: ['id', 'user_id', 'organization_id']
  });
</script>
```

### Complete Configuration Options

```html
<script>
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', {
    type: 'STATIC_WEBSITE',     // 'STATIC_WEBSITE' (default) or 'WEB_APP'
    storageSource: 'local',     // 'local' or 'session' — used only when type is 'WEB_APP'
    userDataKeys: [],          // e.g. ['user_id', 'organization_id'] — used only when type is 'WEB_APP'
    appVersion: '1.0.0',       // Your app version
    locale: 'en-US',           // User locale
    test: 'false',             // Test mode flag
  });
</script>
```

## Prediction API

The MoveoOne library includes a prediction method that allows you to get real-time predictions from your trained models.

### Basic Usage

```javascript
// Initialize MoveoOne first
MoveoOne.init('YOUR_TOKEN_HERE');

// Get prediction from a model
MoveoOne.predict('your-model-id')
  .then(result => {
    if (result.success) {
      console.log('Prediction probability:', result.prediction_probability);
      console.log('Binary result:', result.prediction_binary);
    } else {
      console.log('Error:', result.message);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });
```

## Response Examples

### Success Response

```javascript
{
  success: true,
  status: 'success',
  prediction_probability: 0.85,
  prediction_binary: true
}
```

### Error Responses

#### Not Initialized
```javascript
{
  success: false,
  status: 'not_initialized',
  message: 'MoveoOne must be initialized before using predict method. Call MoveoOne.init() first.'
}
```

#### Invalid Model ID
```javascript
{
  success: false,
  status: 'invalid_model_id',
  message: 'Model ID is required and must be a non-empty string'
}
```

#### Model Loading/Validating (Pending State)
```javascript
{
  success: false,
  status: 'pending',
  message: 'Model is loading, please try again'
}
```

#### Model Not Found
```javascript
{
  success: false,
  status: 'not_found',
  message: 'Model not found or not accessible'
}
```

#### Conflict Error
```javascript
{
  success: false,
  status: 'conflict',
  message: 'Conditional event not found'
}
```

#### A/B Test Skipped
```javascript
{
  success: false,
  status: 'ab_test_control',
  message: 'Prediction skipped due to A/B test configuration'
}
```

#### Target Already Reached
```javascript
{
  success: false,
  status: 'target_already_reached',
  message: 'Completion target already reached - prediction not applicable'
}
```

#### Server Error
```javascript
{
  success: false,
  status: 'server_error',
  message: 'Server error processing prediction request'
}
```

#### Network Error
```javascript
{
  success: false,
  status: 'network_error',
  message: 'Network error - please check your connection'
}
```

#### Timeout
```javascript
{
  success: false,
  status: 'timeout',
  message: 'Request timed out after 500 milliseconds'
}
```

## Performance Optimizations

The library includes several optimizations to make predict requests as fast as possible:

- **High Priority Requests**: Predict requests use `fetchpriority="high"` to jump ahead of other network traffic
- **DNS Prefetch**: Automatically prefetches DNS for the prediction service during initialization
- **Preconnect**: Establishes TCP/TLS connections early to eliminate connection setup time
- **Connection Warmup**: Makes a lightweight request to warm up the server connection

## Notes

- The `predict` method is **non-blocking** and won't affect your website's performance
- All requests have a 500-millisecond timeout to prevent hanging
- The method automatically uses the current session ID and sends all buffered events to the prediction service
- **423 responses are normal pending states** - models may need time to load or validate
- The method returns a Promise, so you can use async/await or .then()/.catch()
- Check `success: true` for complete predictions (only when `status: 'success'`)
- **First request optimization**: Connection establishment happens during library initialization, making the first predict request much faster

## Latency Tracking

The library automatically tracks prediction request latency when `calculateLatency` is enabled (default: true). This feature:

- **Non-blocking**: Latency tracking happens asynchronously and doesn't affect prediction response time
- **Automatic**: Tracks execution time from request start to response completion
- **Silent**: Errors in latency tracking are handled silently and won't impact your application
- **Performance-focused**: Uses browser timing APIs for accurate measurements

### Disabling Latency Tracking

To disable latency tracking:

```html
<script>
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', {
    calculateLatency: false
  });
</script>
```
