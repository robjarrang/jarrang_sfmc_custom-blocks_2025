# Base Template Module

A comprehensive starting point for creating new Salesforce Marketing Cloud custom email blocks. This template includes the best practices, common patterns, and utilities from the existing modules and is ready to be adapted for any client.

> **📘 For general development guidelines, email standards, and shared patterns, see [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)**

## Features

### Core Functionality
- ✅ **SFMC BlockSDK Integration** - Full integration with Salesforce Marketing Cloud Content Builder
- ✅ **HTML Editor Tab** - Enabled by default for viewing/editing raw HTML
- ✅ **Quill Rich Text Editor** - Pre-configured with email-optimized settings
- ✅ **QuillConfigManager Integration** - Shared configuration for consistent text handling
- ✅ **Line Break Support** - Proper `<br>` tag preservation in rich text content
- ✅ **Memory Management** - Advanced cleanup with WeakMap and FinalizationRegistry

### UI Components Included
- Background color selector (Red/Black)
- Text input fields with character limits
- URL input fields with validation
- Toggle switches (checkbox style)
- Number inputs with step validation
- Rich text editors (Quill)
- Option selectors (button groups)
- Dynamic list/checklist items (commented, ready to use)

### Styling
- Consistent across all modules in this template
- Clean white background (no borders or shadows)
- Responsive field groups
- Loading overlay with spinner
- Error banner for user feedback
- Proper focus states and transitions

### Data Management
- Debounced updates for smooth UX
- Request animation frame for preview updates
- Type-safe field value retrieval
- Automatic fallback to default values
- Rich text sanitization for email compatibility

### Best Practices Implemented
- URL validation with visual error feedback
- Number input rounding to 4px steps
- Event listener tracking for cleanup
- Retry logic for initialization failures
- Visibility change detection for data refresh

## How to Use This Template

### 1. Copy the Template
```bash
cp -r _base-template your-new-module-name
```

### 2. Customize Module Config
Update the `moduleConfig` object with your fields:

```javascript
const moduleConfig = {
    name: 'Your Module Name',
    fields: {
        yourField: { type: 'text', defaultValue: 'Value', maxLength: 100 },
        // Add more fields as needed
    },
    debounceDelay: 300,
    maxRetries: 3
};
```

### 3. Update HTML Structure
Modify the HTML body to match your module's UI needs:
- Add/remove field groups
- Update labels and placeholders
- Enable/disable sections (like dynamic lists)

### 4. Implement Template Generation
Update the `generateTemplate()` function to create your email HTML:

```javascript
function generateTemplate() {
    // Get your field values
    const field1 = utils.getFieldValue('field1');
    
    // Return your email HTML structure
    return `<!-- Your email HTML -->`;
}
```

### 5. Add Icons (Optional)
Add your module's icons:
- `icon.png` - Main icon for Content Builder
- `dragIcon.png` - Icon shown when dragging the block

## Field Types Supported

### Text
```javascript
fieldName: { type: 'text', defaultValue: 'Text', maxLength: 100 }
```

### URL
```javascript
fieldName: { type: 'url', defaultValue: 'https://example.com/', validator: 'url' }
```

### Boolean/Toggle
```javascript
fieldName: { type: 'boolean', defaultValue: true }
```

### Rich Text
```javascript
fieldName: { type: 'richtext', defaultValue: 'Content...', maxLength: 500 }
```

### Number
```javascript
fieldName: { type: 'number', defaultValue: 20 }
```

### List (Dynamic Items)
```javascript
fieldName: {
    type: 'list',
    defaultValue: [
        { id: crypto.randomUUID(), text: '<strong>Item</strong>' }
    ]
}
```

## Optional Features

### Dynamic List Items
Uncomment the following sections to enable dynamic list management:
1. HTML `<template>` section for item UI
2. `renderItemsUI()` function
3. `updateDataFromUI()` function
4. List item event handlers in `initializeEventHandlers()`

### Font Size Controls
The template includes inline font-size controls. You can:
- Keep them for customizable typography
- Remove them for fixed sizing
- Add more style controls (alignment, color, etc.)

## Common Customizations

### Change Background Colors
Update the preset colors in `generateTemplate()` to match your target brand:
```javascript
const bgColorHex = backgroundColor === 'primary' ? '#DB011C' : '#000000'; // replace with your palette
```

### Add More Editor Types
Use different Quill configurations:
- `'minimal'` - Bold only
- `'basic'` - Bold, Italic, Link
- `'title'` - Bold, Superscript
- `'description'` - Bold, Italic, Link

### Custom Validation
Add custom validators in the `utils` object:
```javascript
validateCustomField(value) {
    // Your validation logic
    return isValid;
}
```

## Email HTML Guidelines

> **📘 For complete email standards (structure, spacing, typography, colors, mobile classes), see the [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md#standard-email-width)**

### Quick Reference
- **Total width:** 620px (20px gutters + 580px content)
- **Primary Color:** `#DB011C` (replace with your brand color)
- **Secondary Color:** `#000000` (replace with your brand color)
- **Use table-based layouts** for email compatibility
- **Include mobile responsive classes** for proper mobile rendering

## Debugging

### Check Console
The template includes extensive logging:
- Editor creation/cleanup
- Data loading/saving
- Error messages

### Common Issues

**Preview not updating?**
- Check browser console for errors
- Verify `generateTemplate()` returns valid HTML
- Ensure all field names match between config and functions

**Editors not working?**
- Verify Quill library loaded
- Check QuillConfigManager loaded
- Ensure container elements exist

**Data not persisting?**
- Verify BlockSDK initialized correctly
- Check getData/setData callbacks
- Ensure field names match config

## Testing Checklist

Before deploying a new module:

- [ ] All fields save and load correctly
- [ ] Preview updates when fields change
- [ ] HTML Editor tab is visible and functional
- [ ] Rich text formatting preserved (bold, italic, links, line breaks)
- [ ] URL validation working (if applicable)
- [ ] Number inputs round to correct steps (if applicable)
- [ ] Dynamic items can be added/removed/reordered (if applicable)
- [ ] Module works after page refresh
- [ ] No console errors
- [ ] Generated HTML renders correctly in email clients
- [ ] Mobile responsive (test width)

## Additional Resources

### Documentation
- **[DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)** - General development guidelines, email standards, and best practices
- **[shared-assets/quill-config.js](../shared-assets/README.md)** - Text editor utilities and email sanitization
- **SFMC Content Builder Block SDK** - Official Salesforce documentation

### Reference Implementations
Review existing modules in this repository for working examples that you can rebrand for new clients:
- `full-width-button/` - Simple button with color variants
- `checklist/` - Dynamic list items with rich text
- `stats/` - Multiple items with customizable spacing
- `image-carousel/` - Complex interactive component
