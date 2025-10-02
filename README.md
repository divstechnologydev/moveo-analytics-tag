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
  message: 'Request timed out after 150 milliseconds'
}
```

## Notes

- The `predict` method is **non-blocking** and won't affect your website's performance
- All requests have a 150-millisecond timeout to prevent hanging
- The method automatically uses the current session ID and sends all buffered events to the prediction service
- **202 responses are normal pending states** - models may need time to load or validate
- The method returns a Promise, so you can use async/await or .then()/.catch()
- Check `success: true` for complete predictions (only when `status: 'success'`)
