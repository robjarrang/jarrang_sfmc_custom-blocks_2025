# Optimized Quill.js Configuration Guide

## Overview
The shared `QuillConfigManager` provides a centralized, optimized way to handle Quill.js editors across all custom blocks in this template. This approach reduces code duplication, improves performance, and ensures consistency across different client implementations.

## Key Benefits

### 1. **Reduced Bundle Size**
- Single shared configuration instead of repeated code
- Optimized toolbar presets for common use cases
- Lazy loading with proper error handling

### 2. **Better Performance**
- Bulk editor initialization
- Efficient cleanup to prevent memory leaks
- Debounced update handlers
- Email-optimized formatting

### 3. **Consistency**
- Standardized toolbar configurations
- Unified content sanitization
- Consistent error handling patterns

### 4. **Email Compatibility**
- Pre-configured for SFMC/email constraints
- Automatic cleanup of problematic HTML
- Link styling optimized for email clients

## Usage Examples

### Basic Editor Initialization
```javascript
// Single editor
const editor = await QuillConfigManager.initializeEditor(
    element, 
    'basic',  // preset type
    {
        placeholder: 'Enter text...',
        maxLength: 200
    }
);

// Multiple editors
const editors = await QuillConfigManager.initializeMultipleEditors([
    {
        id: 'title',
        element: titleElement,
        type: 'title',
        options: { placeholder: 'Enter title...', maxLength: 100 }
    },
    {
        id: 'description',
        element: descElement,
        type: 'description',
        options: { placeholder: 'Enter description...', maxLength: 500 }
    }
]);
```

### Event Handling
```javascript
// Optimized update handler
const updateHandler = QuillConfigManager.createUpdateHandler((delta, oldDelta, source) => {
    const content = QuillConfigManager.getCleanContent(editor, true);
    updateData('fieldName', content);
}, debounceDelay);

editor.on('text-change', updateHandler);
```

### Content Management
```javascript
// Get clean content
const content = QuillConfigManager.getCleanContent(editor, true); // true = email optimized

// Set content safely
QuillConfigManager.setContent(editor, htmlContent);

// Sanitize for email
const cleanHtml = QuillConfigManager.sanitizeForEmail(rawHtml);
```

### Cleanup
```javascript
// Clean up single editor
QuillConfigManager.cleanup(editor);

// Clean up multiple editors
QuillConfigManager.cleanup(Object.values(state.editors));
```

## Preset Configurations

### Available Presets
- **minimal**: Bold only `[['bold']]`
- **basic**: Bold, italic, links `[['bold', 'italic'], ['link']]`
- **title**: Bold + superscript `[['bold'], [{ 'script': 'super' }]]`
- **button**: Superscript only `[[{ 'script': 'super' }]]`
- **description**: Bold, italic, links (same as basic)

### Custom Configuration
```javascript
const editor = await QuillConfigManager.initializeEditor(element, 'basic', {
    customToolbar: [['bold'], ['italic'], ['link'], ['clean']],
    customFormats: ['bold', 'italic', 'link'],
    maxLength: 300,
    additionalModules: {
        history: {
            delay: 1000,
            maxStack: 50
        }
    }
});
```

## Migration Guide

### Before (Individual modules)
```javascript
function initializeEditors() {
    if (!window.Quill) throw new Error('Quill library not loaded');
    
    const quillOptions = {
        theme: 'snow',
        modules: { 
            toolbar: [['bold', 'italic'], ['link']], 
            clipboard: { matchVisual: false } 
        },
        formats: ['bold', 'italic', 'link'],
        placeholder: 'Enter text...'
    };
    
    state.editors.example = new Quill(element, quillOptions);
    
    const debouncedUpdate = utils.debounce((delta, oldDelta, source) => {
        if (source === 'user') {
            const content = state.editors.example.getSemanticHTML ? 
                state.editors.example.getSemanticHTML() : 
                state.editors.example.root.innerHTML;
            updateData('example', utils.sanitizeHtml(content));
        }
    }, debounceDelay);
    
    state.editors.example.on('text-change', debouncedUpdate);
}
```

### After (Optimized)
```javascript
async function initializeEditors() {
    try {
        state.editors.example = await QuillConfigManager.initializeEditor(
            element, 
            'basic',
            {
                placeholder: 'Enter text...',
                maxLength: 200
            }
        );

        const updateHandler = QuillConfigManager.createUpdateHandler((delta, oldDelta, source) => {
            const content = QuillConfigManager.getCleanContent(state.editors.example, true);
            updateData('example', content);
        }, debounceDelay);
        
        state.editors.example.on('text-change', updateHandler);
    } catch (error) {
        throw new Error(`Failed to initialize editors: ${error.message}`);
    }
}
```

## Best Practices

### 1. **Always Use Async/Await**
```javascript
// Good
async function initializeEditors() {
    const editor = await QuillConfigManager.initializeEditor(element, 'basic');
}

// Avoid
function initializeEditors() {
    QuillConfigManager.initializeEditor(element, 'basic').then(editor => {
        // This makes error handling harder
    });
}
```

### 2. **Proper Error Handling**
```javascript
try {
    const editors = await QuillConfigManager.initializeMultipleEditors(configs);
    // Handle successful initialization
} catch (error) {
    console.error('Editor initialization failed:', error);
    // Provide fallback or user feedback
}
```

### 3. **Always Clean Up**
```javascript
// In your cleanup function
function cleanup() {
    QuillConfigManager.cleanup(Object.values(state.editors));
    // Other cleanup code...
}

// Register cleanup
window.addEventListener('beforeunload', cleanup);
```

### 4. **Use Email-Optimized Content**
```javascript
// Always use the email-optimized flag for SFMC
const content = QuillConfigManager.getCleanContent(editor, true);
```

## Performance Considerations

### Memory Management
- The shared config automatically handles proper cleanup
- Event listeners are properly removed to prevent memory leaks
- Content is sanitized to remove unnecessary DOM nodes

### Loading Performance
- Quill library is loaded once and reused
- Configurations are cached and reused
- Bulk initialization reduces DOM manipulation

### Runtime Performance
- Debounced update handlers prevent excessive API calls
- Optimized content extraction reduces processing time
- Email-specific formatting is pre-optimized

## Troubleshooting

### Common Issues

1. **"Quill library not loaded"**
   - Ensure Quill script is loaded before the config manager
   - Check network connectivity for CDN resources

2. **Editor not initializing**
   - Verify the container element exists in DOM
   - Check for JavaScript errors in console
   - Ensure element is visible (not display: none)

3. **Content not updating**
   - Verify event handlers are attached
   - Check debounce settings
   - Ensure updateData function is working

4. **Memory leaks**
   - Always call QuillConfigManager.cleanup()
   - Register cleanup on page unload
   - Remove event listeners properly

### Debug Mode
```javascript
// Enable detailed logging
QuillConfigManager.DEBUG = true;

// This will log initialization steps and errors
const editor = await QuillConfigManager.initializeEditor(element, 'basic');
```
