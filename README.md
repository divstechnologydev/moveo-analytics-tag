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
  model_id: 'your-model-id',
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
  success: true,
  status: 'pending',
  message: 'Model is loading, please try again',
  model_id: 'your-model-id'
}
```

#### Model Not Found
```javascript
{
  success: false,
  status: 'not_found',
  message: 'Model not found or not accessible',
  model_id: 'your-model-id'
}
```

#### Server Error
```javascript
{
  success: false,
  status: 'server_error',
  message: 'Server error processing prediction request',
  model_id: 'your-model-id'
}
```

#### Network Error
```javascript
{
  success: false,
  status: 'network_error',
  message: 'Network error - please check your connection',
  model_id: 'your-model-id'
}
```

#### Timeout
```javascript
{
  success: false,
  status: 'timeout',
  message: 'Request timed out after 10 seconds',
  model_id: 'your-model-id'
}
```

## Notes

- The `predict` method is **non-blocking** and won't affect your website's performance
- All requests have a 10-second timeout to prevent hanging
- The method automatically uses the current session ID from the MoveoOne instance
- **202 responses are normal pending states** - models may need time to load or validate
- The method returns a Promise, so you can use async/await or .then()/.catch()
- Check both `success: true` and `status: 'success'` to ensure you have a complete prediction

