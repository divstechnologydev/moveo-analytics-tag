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

## Advanced Configuration

### App Version Tracking

You can track your application version by setting it during initialization or updating it dynamically:

```html
<script>
  // Initialize with app version
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', {
    appVersion: '1.0.0'
  });
  
  // Update app version later (e.g., after app update)
  MoveoOne.setAppVersion('1.1.0');
</script>
```

### Complete Configuration Options

```html
<script>
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', {
    appVersion: '1.0.0',        // Your app version
    locale: 'en-US',            // User locale
    test: 'false'               // Test mode flag
  });
</script>
```

### Available Methods

- `MoveoOne.init(token, options)` - Initialize the analytics library
- `MoveoOne.setAppVersion(version)` - Update app version globally
- `MoveoOne.getInstance()` - Get the current instance
- `MoveoOne.getLibVersion()` - Get the library version (read-only)

### Version Bump Workflow

When your application updates, you can bump the version to track the change:

```html
<script>
  // Initialize
  const moveo = MoveoOne.init('YOUR_TOKEN_HERE', {
    appVersion: '1.0.0'
  });
  
  // Later, when your app updates
  MoveoOne.setAppVersion('1.1.0');
  
  // The version change will be tracked in analytics
</script>
``` 
