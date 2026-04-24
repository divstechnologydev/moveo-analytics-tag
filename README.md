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

**Detailed tracking** (viewport **appear** / **disappear** events) is controlled only by **`exclude_detailed_tracking`**. If you omit that option, it defaults to **`false`** for **`STATIC_WEBSITE`** (impressions on) and **`true`** for **`WEB_APP`** (impressions off), so existing integrations keep the same behavior without changes.

- **`STATIC_WEBSITE`** (default) — Typical multi-page sites. By default, appear/disappear events are sent. Set **`exclude_detailed_tracking`** to **`true`** to turn them off.
- **`WEB_APP`** — For single-page or app-like experiences. By default, appear/disappear are off (`exclude_detailed_tracking` defaults to **`true`**). Set **`exclude_detailed_tracking`** to **`false`** if you want viewport impressions. All other tracking (clicks, links, media, viewport size, page view, etc.) works the same either way. With **`WEB_APP`** you can also send user data from storage (e.g. user ID) in session metadata for cross-session tracking and model creation.

```html
<script>
  // Static website (default): impression observer runs, appear/disappear sent
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE');

  // Static website: skip appear/disappear
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', { type: 'STATIC_WEBSITE', exclude_detailed_tracking: true });

  // Web app: default is no appear/disappear; other tracking unchanged
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', { type: 'WEB_APP' });

  // Web app: enable appear/disappear explicitly
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', { type: 'WEB_APP', exclude_detailed_tracking: false });
</script>
```

### User data from storage (WEB_APP only)

When `type` is `WEB_APP`, you can optionally pass a **storage source** and a list of **user data keys**. The script will read those keys from the chosen storage (e.g. your app’s `localStorage` or `sessionStorage`) when building the first session and add the key–value pairs to **session metadata** (`meta`), not to additional metadata. This only runs when `type === 'WEB_APP'`; for `STATIC_WEBSITE` these options are ignored.

- **`storageSource`** — Where to read from: `'local'` (default) for `localStorage`, or `'session'` for `sessionStorage`.
- **`userDataKeys`** — Array of storage key names to read (e.g. `['user_id', 'organization_id', 'user_email']`). Only keys that exist and can be read are added to session metadata (`meta`); missing keys are skipped. Invalid or inaccessible storage is caught and logged without breaking the script.

Example: if your app stores a user identifier under the key `id` in `localStorage`, you can send it in session metadata with:

```html
<script>
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', {
    type: 'WEB_APP',
    storageSource: 'local',   // default; use 'session' for sessionStorage
    userDataKeys: ['id', 'user_id', 'organization_id']
  });
</script>
```

### Defaults

If you don't pass an option, the following defaults apply:

| Option | Default |
|--------|---------|
| `type` | `'STATIC_WEBSITE'` |
| `exclude_detailed_tracking` | `false` if `type` is `'STATIC_WEBSITE'`, `true` if `type` is `'WEB_APP'` (when omitted) |
| `storageSource` | `'local'` |
| `userDataKeys` | `[]` |
| `calculateLatency` | `true` |

`appVersion` has no default; omit it if you don't want to send an app version.

### Complete Configuration Options

```html
<script>
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', {
    type: 'STATIC_WEBSITE',           // default: 'STATIC_WEBSITE'
    exclude_detailed_tracking: false, // omit: false for STATIC_WEBSITE, true for WEB_APP
    storageSource: 'local',           // default: 'local' — used only when type is 'WEB_APP'
    userDataKeys: [],                 // default: [] — used only when type is 'WEB_APP'
    appVersion: '1.0.0',             // optional; no default
    calculateLatency: true,           // default: true
  });
</script>
```

## Custom data attributes (optional)

You can annotate the DOM with `data-moveo-element-*` attributes to influence how events are sent. If you omit them, behavior is unchanged from previous library versions.

### Backward compatibility (no Moveo attributes)

If the page has **no** `data-moveo-element-*` attributes (or none on the ancestor chain where relevant):

- **`sg`**: Only the original section / `div[id]` / landmark logic applies. The Moveo id walk finds nothing and adds no alternate grouping.
- **`eID`**: Same as before: HTML `id` + path hash when present, otherwise the content signature hash. Nothing is read from `data-moveo-element-id` on the event target.
- **`eT`**: Stays tag-based (or the existing form/input-type rules); `data-moveo-element-type` is not present on the element.
- **`eV`**: Default extraction and redaction only; `data-moveo-element-value` is not set on the event element.
- **Impression observation**: `data-moveo-element-track` is ignored unless present on that node; `shouldTrackElement` matches the old rules.

Adding attributes later only affects nodes where they appear.

### Inheritance

For **semantic group** (`sg`) only, the library walks **up** from the element that fired the event (including that element) and uses the **first** non-empty `data-moveo-element-id` value. Descendants therefore inherit that `sg` from a post/card wrapper unless a closer ancestor defines another id.

**Event type** (`eT`) from `data-moveo-element-type` and **value** (`eV`) from `data-moveo-element-value` are **not** inherited: each applies only on the **same element** that emits the event (no parent or child lookup).

### `data-moveo-element-id`

- **Semantic group (`sg`)**: Nearest non-empty value (walking up) is normalized with the **same helper as `eID`** (trim + `cleanSemanticGroupName`). If none is found or the value is not usable after cleaning, the usual section / `div[id]` / landmark logic applies.
- **Stable element id (`eID`)**: Only the attribute on **that specific element** matters. When it is non-empty, `eID` uses the **same normalization as `sg`** (one shared code path: trim → `cleanSemanticGroupName`; no path hash suffix). If the value is not usable after cleaning, legacy `eID` logic is used instead. If both HTML `id` and `data-moveo-element-id` are set on the same node, **the Moveo attribute wins** for `eID`. If the attribute is missing or empty on that node, **legacy `eID` logic** runs unchanged (HTML `id` plus path hash, or content signature). Ancestor-only `data-moveo-element-id` affects `sg` for descendants but **does not** change their `eID` unless each node sets the attribute itself.

Changing or adding this attribute will change `eID` for that element.

### `data-moveo-element-type`

Overrides **`eT`** for element-driven events (impressions, clicks, hovers, media play/pause/complete, form submit/change) **only when the attribute is set on that element itself**—not on ancestors. Values are normalized (same rules as semantic names). Global event types (e.g. `page_view`, `download`, `outbound_link`) are not overridden.

### `data-moveo-element-track`

Opt-in **viewport** tracking for a node: use when you want **appear** / **disappear** impressions on a container that would not normally qualify (e.g. a `div` with little or no text). The attribute must be present on the element to observe; treat it as boolean: enabled if the attribute is present with an empty value, `true`, or `1`; disabled for `false` or `0`. The element must have a non-zero layout size and not be `display: none` / `visibility: hidden`. This does **not** bypass **`exclude_detailed_tracking`**: when detailed tracking is off, no appear/disappear events are sent.

### `data-moveo-element-value`

After the library computes the default **`eV`** (and after sensitive-field / sensitive-container redaction), if **this element** has a non-empty `data-moveo-element-value`, it **replaces** `eV`. Ancestors and descendants are not consulted. If the value would already be redacted (**`[REDACTED]`**), the override is **not** applied, so markup cannot replace redacted content.

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
