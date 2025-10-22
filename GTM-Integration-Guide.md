# MoveoOne Analytics - Google Tag Manager Integration Guide

This guide explains how to integrate the MoveoOne Analytics tag into Google Tag Manager (GTM) for deployment across client websites.

## Overview

The MoveoOne Analytics tag provides comprehensive web analytics including:
- **Automatic Event Tracking**: Clicks, scrolls, hovers, form interactions
- **Session Management**: Persistent sessions across page loads
- **Impression Tracking**: Element visibility with Intersection Observer
- **Prediction API**: Real-time ML model predictions
- **Media Tracking**: Video/audio play/pause events
- **Download & Outbound Link Tracking**: Automatic file download and external link tracking

## Prerequisites

- Google Tag Manager account
- MoveoOne authentication token
- Access to GTM container for your website

## Step 1: Create GTM Variables

Create the following **Constant** variables in your GTM container:

### Required Variables

1. **MoveoOne Token**
   - **Type**: Constant
   - **Value**: Your MoveoOne authentication token
   - **Variable Name**: `MoveoOne Token`

### Optional Variables

2. **App Version**
   - **Type**: Constant
   - **Value**: `1.0.0` (your application version)
   - **Variable Name**: `App Version`

3. **Locale**
   - **Type**: Constant
   - **Value**: `en-US` (user locale)
   - **Variable Name**: `Locale`

4. **Test Mode**
   - **Type**: Constant
   - **Value**: `false` (set to `true` for testing)
   - **Variable Name**: `Test Mode`

**Note**: The API URLs are hardcoded in the tag and don't require GTM variables.

## Step 2: Create Custom HTML Tag

1. **Navigate to Tags**
   - Go to your GTM container
   - Click **Tags** in the left sidebar
   - Click **New**

2. **Configure Tag**
   - **Tag Name**: `MoveoOne Analytics`
   - **Tag Type**: `Custom HTML`

3. **Add HTML Code**
   - Copy the entire content from `moveo-one-gtm.html`
   - Paste it into the **HTML** field

4. **Set Trigger**
   - **Trigger**: `All Pages` (or create custom triggers)
   - **Tag Firing Options**: `Once per page`

5. **Save Tag**
   - Click **Save**
   - Give your tag a descriptive name

## Step 3: Test Your Implementation

### Preview Mode Testing

1. **Enable Preview Mode**
   - Click **Preview** in GTM
   - Enter your website URL

2. **Verify Initialization**
   - Open browser console
   - Check for MoveoOne object: `console.log(window.MoveoOne)`
   - Should return the MoveoOne object with methods

3. **Test Basic Functionality**
   ```javascript
   // Check if initialized
   console.log(window.MoveoOne.instance);
   
   // Test prediction API
   MoveoOne.predict('your-model-id').then(result => {
       console.log('Prediction result:', result);
   });
   ```

### Production Testing

1. **Publish Container**
   - Click **Submit** in GTM
   - Add version name and description
   - Click **Publish**

2. **Verify on Live Site**
   - Check browser console for errors
   - Verify analytics data is being sent
   - Test prediction API functionality

## Step 4: Advanced Configuration

### Custom Triggers

Instead of "All Pages", you can create custom triggers:

1. **Page View Trigger**
   - **Trigger Type**: Page View
   - **This trigger fires on**: All Page Views

2. **Specific Page Trigger**
   - **Trigger Type**: Page View
   - **This trigger fires on**: Some Page Views
   - **Page Path**: equals `/checkout` (example)

3. **Event-Based Trigger**
   - **Trigger Type**: Custom Event
   - **Event Name**: `moveo_init`

### Data Layer Integration

You can push data to GTM's data layer from your website:

```javascript
// Push custom data to GTM
dataLayer.push({
    'event': 'moveo_custom_event',
    'moveo_user_id': 'user123',
    'moveo_custom_property': 'value'
});
```

Then create GTM variables to capture this data:
- **Variable Type**: Data Layer Variable
- **Data Layer Variable Name**: `moveo_user_id`

## Step 5: Using the Prediction API

### Basic Usage

```javascript
// Get prediction from a model
MoveoOne.predict('your-model-id')
  .then(result => {
    if (result.success) {
      console.log('Prediction probability:', result.prediction_probability);
      console.log('Binary result:', result.prediction_binary);
      
      // Use prediction in your application
      if (result.prediction_binary) {
        // Show personalized content
        showPersonalizedContent();
      }
    } else {
      console.log('Error:', result.message);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });
```

### Response Examples

**Success Response:**
```javascript
{
  success: true,
  status: 'success',
  prediction_probability: 0.85,
  prediction_binary: true
}
```

**Error Response:**
```javascript
{
  success: false,
  status: 'not_initialized',
  message: 'MoveoOne must be initialized before using predict method'
}
```

## Step 6: Monitoring and Maintenance

### Performance Monitoring

1. **Check Network Tab**
   - Verify API calls are being made
   - Check response times
   - Monitor error rates

2. **Console Monitoring**
   - Watch for JavaScript errors
   - Monitor prediction API responses
   - Check session management

### Regular Maintenance

1. **Update Token**
   - Update `MoveoOne Token` variable when needed
   - Test after token updates

2. **Version Updates**
   - Update `App Version` variable
   - Test new features

3. **URL Updates**
   - Update hardcoded URLs in the tag if endpoints change
   - Test connectivity

## Troubleshooting

### Common Issues

1. **MoveoOne Not Initialized**
   - Check if GTM tag is firing
   - Verify token is correct
   - Check console for errors

2. **Prediction API Not Working**
   - Ensure MoveoOne is initialized first
   - Check model ID is correct
   - Verify network connectivity

3. **Events Not Tracking**
   - Check if tag is firing on all pages
   - Verify DOM elements are present
   - Check console for JavaScript errors

### Debug Mode

Enable debug logging by modifying the tag:
```javascript
const LOGGING_ENABLED = true; // Change to true for debugging
```

### Support

For technical support:
- Check browser console for error messages
- Verify GTM tag configuration
- Test with GTM Preview mode
- Contact MoveoOne support with specific error details

## Best Practices

1. **Test Thoroughly**
   - Always test in Preview mode first
   - Test on multiple pages and devices
   - Verify prediction API functionality

2. **Monitor Performance**
   - Check for JavaScript errors
   - Monitor API response times
   - Track prediction accuracy

3. **Version Control**
   - Use descriptive version names in GTM
   - Document changes
   - Keep backup of working configurations

4. **Security**
   - Keep authentication tokens secure
   - Use HTTPS for all API endpoints
   - Regularly rotate tokens

## Mobile App Integration

For mobile apps (Android/iOS), you'll need:
- **Firebase Tag Manager** instead of GTM
- **Native SDK** implementation
- **Custom mobile template**

Contact MoveoOne support for mobile integration assistance.

---

**Note**: This integration maintains all MoveoOne Analytics functionality while providing the benefits of GTM deployment, including centralized management, version control, and easy updates across multiple websites.
