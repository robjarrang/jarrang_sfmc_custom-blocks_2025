/**
 * Shared Quill.js Configuration for SFMC Custom Blocks Template
 * Optimized for email content creation and SFMC compatibility
 */

class QuillConfigManager {
    static DEFAULT_TIMEOUT = 5000;
    static DEBOUNCE_DELAY = 300;
    
    // Predefined toolbar configurations for different use cases
    static TOOLBAR_PRESETS = {
        minimal: [['bold']],
        basic: [['bold', 'italic'], ['link']],
        title: [['bold'], [{ 'script': 'super' }]],
        button: [[{ 'script': 'super' }]],
        description: [['bold', 'italic'], [{ 'script': 'super' }], ['link']]
    };

    // Format configurations optimized for email
    static FORMAT_PRESETS = {
        minimal: ['bold'],
        basic: ['bold', 'italic', 'link'],
        title: ['bold', 'script'],
        button: ['script'],
        description: ['bold', 'italic', 'script', 'link']
    };

    // Email-optimized Quill configurations
    static BASE_CONFIG = {
        theme: 'snow',
        modules: {
            clipboard: { 
                matchVisual: false,
                // Strip formatting that doesn't work well in email
                matchers: [
                    // Convert non-breaking spaces to regular spaces
                    [Node.TEXT_NODE, function(node, delta) {
                        if (typeof node.data === 'string') {
                            // Replace all non-breaking spaces with regular spaces
                            const text = node.data.replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ');
                            return new (window.Quill.import('delta'))().insert(text);
                        }
                        return delta;
                    }],
                    // Remove problematic paragraph formatting
                    ['P', function(node, delta) {
                        return delta.compose(new (window.Quill.import('delta'))().retain(delta.length(), { 'block-format': null }));
                    }],
                    // Clean up any remaining non-breaking spaces from HTML
                    ['*', function(node, delta) {
                        if (node.innerHTML) {
                            node.innerHTML = node.innerHTML.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
                        }
                        return delta;
                    }]
                ]
            },
            // Configure keyboard module to prevent non-breaking spaces
            keyboard: {
                bindings: {
                    // Override space key to insert regular space
                    space: {
                        key: ' ',
                        handler: function(range, context) {
                            this.quill.insertText(range.index, ' ', 'user');
                            this.quill.setSelection(range.index + 1, 0, 'user');
                            return false;
                        }
                    }
                }
            }
        }
    };

    /**
     * Creates optimized Quill configuration for specific use cases
     * @param {string} type - Type of editor (minimal, basic, title, button, description)
     * @param {Object} options - Additional options
     * @returns {Object} Quill configuration object
     */
    static createConfig(type = 'basic', options = {}) {
        const {
            placeholder = 'Enter text...',
            maxLength = null,
            customToolbar = null,
            customFormats = null,
            additionalModules = {}
        } = options;

        const toolbar = customToolbar || this.TOOLBAR_PRESETS[type] || this.TOOLBAR_PRESETS.basic;
        const formats = customFormats || this.FORMAT_PRESETS[type] || this.FORMAT_PRESETS.basic;

        return {
            ...this.BASE_CONFIG,
            modules: {
                ...this.BASE_CONFIG.modules,
                toolbar,
                ...additionalModules
            },
            formats,
            placeholder
        };
    }

    /**
     * Initializes a Quill editor with error handling and optimization
     * @param {HTMLElement} element - Container element
     * @param {string} type - Editor type
     * @param {Object} options - Configuration options
     * @returns {Promise<Object>} Quill instance
     */
    static async initializeEditor(element, type = 'basic', options = {}) {
        if (!element) {
            throw new Error('Editor container element is required');
        }

        // Wait for Quill to be available
        await this.waitForQuill();

        const config = this.createConfig(type, options);
        
        try {
            const editor = new window.Quill(element, config);
            
            // Apply length limiting if specified
            if (options.maxLength) {
                this.addLengthLimiting(editor, options.maxLength);
            }

            // Add email-specific formatting cleanup
            this.addEmailFormatting(editor);

            // Add non-breaking space cleanup monitor
            this.addSpaceCleanupMonitor(editor);

            return editor;
        } catch (error) {
            throw new Error(`Failed to initialize Quill editor: ${error.message}`);
        }
    }

    /**
     * Waits for Quill library to be loaded
     * @returns {Promise<void>}
     */
    static waitForQuill() {
        return new Promise((resolve, reject) => {
            if (window.Quill) {
                resolve();
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Quill library failed to load within timeout'));
            }, this.DEFAULT_TIMEOUT);

            const checkQuill = () => {
                if (window.Quill) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(checkQuill, 100);
                }
            };

            checkQuill();
        });
    }

    /**
     * Adds length limiting functionality to editor
     * @param {Object} editor - Quill instance
     * @param {number} maxLength - Maximum character length
     */
    static addLengthLimiting(editor, maxLength) {
        editor.on('text-change', () => {
            const text = editor.getText();
            if (text.length > maxLength) {
                const range = editor.getSelection();
                editor.deleteText(maxLength, text.length - maxLength);
                if (range) {
                    editor.setSelection(Math.min(range.index, maxLength));
                }
            }
        });
    }

    /**
     * Adds email-optimized formatting cleanup
     * @param {Object} editor - Quill instance
     */
    static addEmailFormatting(editor) {
        // Ensure links have proper styling for email
        editor.on('selection-change', (range, oldRange, source) => {
            if (source === 'user' && range) {
                const format = editor.getFormat(range);
                if (format.link) {
                    // Apply email-safe link styling
                    const linkElement = editor.root.querySelector(`a[href="${format.link}"]`);
                    if (linkElement && !linkElement.style.color) {
                        linkElement.style.color = '#ffffff';
                        linkElement.style.textDecoration = 'underline';
                    }
                }
            }
        });

        // Clean up non-breaking spaces on text changes
        editor.on('text-change', (delta, oldDelta, source) => {
            if (source === 'user') {
                const text = editor.getText();
                if (text.includes('\u00A0')) {
                    // Replace non-breaking spaces with regular spaces
                    const cleanText = text.replace(/\u00A0/g, ' ');
                    const currentSelection = editor.getSelection();
                    editor.setText(cleanText);
                    if (currentSelection) {
                        editor.setSelection(currentSelection.index, currentSelection.length);
                    }
                }
            }
        });

        // Override paste behavior to clean up non-breaking spaces
        editor.clipboard.addMatcher(Node.TEXT_NODE, function(node, delta) {
            if (typeof node.data === 'string') {
                const cleanText = node.data.replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ');
                return new (window.Quill.import('delta'))().insert(cleanText);
            }
            return delta;
        });
    }

    /**
     * Creates a debounced update handler for editor changes
     * @param {Function} updateCallback - Function to call on content change
     * @param {number} delay - Debounce delay in milliseconds
     * @returns {Function} Debounced handler
     */
    static createUpdateHandler(updateCallback, delay = this.DEBOUNCE_DELAY) {
        let timeout;
        return (delta, oldDelta, source) => {
            if (source === 'user') {
                clearTimeout(timeout);
                timeout = setTimeout(() => updateCallback(delta, oldDelta, source), delay);
            }
        };
    }

    /**
     * Extracts clean HTML content from Quill editor
     * @param {Object} editor - Quill instance
     * @param {boolean} emailOptimized - Whether to apply email-specific cleanup
     * @returns {string} Clean HTML content
     */
    static getCleanContent(editor, emailOptimized = true) {
        if (!editor) return '';

        // Use getSemanticHTML for Quill 2.0, fallback to innerHTML
        let content = editor.getSemanticHTML ? 
            editor.getSemanticHTML() : 
            editor.root.innerHTML;

        // Always clean up non-breaking spaces
        content = this.cleanSpaces(content);

        if (emailOptimized) {
            content = this.sanitizeForEmail(content);
        }

        return content;
    }

    /**
     * Sanitizes HTML content for email compatibility
     * @param {string} html - HTML content to sanitize
     * @returns {string} Sanitized HTML
     */
    static sanitizeForEmail(html) {
        if (!html) return '';

        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Remove script and style tags
        temp.querySelectorAll('script, style').forEach(el => el.remove());

        // Remove event handlers
        const allElements = temp.getElementsByTagName('*');
        for (let el of allElements) {
            for (let attr of [...el.attributes]) {
                if (attr.name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
            }
        }

        // Clean up email-incompatible formatting and non-breaking spaces
        return temp.innerHTML
            .replace(/<p>/g, '')
            .replace(/<\/p>/g, '<br>')        // Convert closing </p> to <br> for line breaks
            .replace(/<div[^>]*>/g, '')
            .replace(/<\/div>/g, '<br>')      // Convert closing </div> to <br> for line breaks
            .replace(/^<br\s*\/?>/g, '')      // Remove leading <br>
            .replace(/<br\s*\/?>$/g, '')      // Remove trailing <br>
            .replace(/&nbsp;/g, ' ')          // Replace HTML non-breaking spaces
            .replace(/\u00A0/g, ' ')          // Replace Unicode non-breaking spaces
            .replace(/\s{2,}/g, ' ')          // Replace multiple spaces with single space
            .trim();
    }

    /**
     * Sets content in Quill editor safely
     * @param {Object} editor - Quill instance
     * @param {string} content - HTML content to set
     */
    static setContent(editor, content) {
        if (!editor || !content) return;

        try {
            // Clean content before setting - convert <br> tags to proper paragraph structure
            // This prevents duplicate line breaks when content is saved and reloaded
            let cleanContent = content
                .replace(/&nbsp;/g, ' ')
                .replace(/\u00A0/g, ' ')
                .replace(/<br\s*\/?>/gi, '</p><p>');  // Convert <br> to paragraph breaks
            
            // Wrap in paragraph tags if not already wrapped
            if (!cleanContent.trim().startsWith('<p>')) {
                cleanContent = '<p>' + cleanContent + '</p>';
            }
            
            // Clean up empty paragraphs and normalize
            cleanContent = cleanContent
                .replace(/<p><\/p>/g, '')           // Remove empty paragraphs
                .replace(/<p>\s*<\/p>/g, '')        // Remove whitespace-only paragraphs
                .replace(/<\/p>\s*<p>/g, '</p><p>'); // Normalize paragraph spacing

            // Clear existing content first
            editor.setText('');
            
            // Use clipboard.dangerouslyPasteHTML for Quill 2.0
            if (editor.clipboard && editor.clipboard.dangerouslyPasteHTML) {
                editor.clipboard.dangerouslyPasteHTML(cleanContent);
            } else {
                // Fallback for older versions
                editor.root.innerHTML = cleanContent;
            }

            // Additional cleanup after setting content
            const text = editor.getText();
            if (text.includes('\u00A0')) {
                const cleanText = text.replace(/\u00A0/g, ' ');
                editor.setText(cleanText);
            }
        } catch (error) {
            console.warn('Failed to set editor content:', error);
        }
    }

    /**
     * Properly cleans up Quill editor instances
     * @param {Object|Object[]} editors - Single editor or array of editors
     */
    static cleanup(editors) {
        const editorArray = Array.isArray(editors) ? editors : [editors];
        
        editorArray.forEach(editor => {
            if (editor && typeof editor.off === 'function') {
                // Remove all event listeners
                editor.off('text-change');
                editor.off('selection-change');
                
                // Clear content to prevent memory leaks
                try {
                    editor.setText('');
                } catch (error) {
                    console.warn('Error during editor cleanup:', error);
                }
            }
        });
    }

    /**
     * Bulk initialize multiple editors with consistent configuration
     * @param {Array} editorConfigs - Array of editor configuration objects
     * @returns {Promise<Object>} Object with initialized editors
     */
    static async initializeMultipleEditors(editorConfigs) {
        await this.waitForQuill();
        
        const editors = {};
        const initPromises = editorConfigs.map(async config => {
            const { id, element, type, options } = config;
            try {
                editors[id] = await this.initializeEditor(element, type, options);
                return { id, success: true };
            } catch (error) {
                console.error(`Failed to initialize editor ${id}:`, error);
                return { id, success: false, error };
            }
        });

        await Promise.all(initPromises);
        return editors;
    }

    /**
     * Cleans up non-breaking spaces from text content
     * @param {string} text - Text content to clean
     * @returns {string} Cleaned text with regular spaces
     */
    static cleanSpaces(text) {
        if (!text) return '';
        return text
            .replace(/&nbsp;/g, ' ')
            .replace(/\u00A0/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    /**
     * Monitors and cleans up non-breaking spaces in real-time
     * @param {Object} editor - Quill instance to monitor
     */
    static addSpaceCleanupMonitor(editor) {
        let isCleaningSpaces = false;

        const cleanupSpaces = () => {
            if (isCleaningSpaces) return;
            
            const text = editor.getText();
            if (text.includes('\u00A0')) {
                isCleaningSpaces = true;
                const selection = editor.getSelection();
                const cleanText = this.cleanSpaces(text);
                
                editor.setText(cleanText);
                
                if (selection) {
                    // Restore cursor position
                    const newIndex = Math.min(selection.index, cleanText.length);
                    editor.setSelection(newIndex, 0);
                }
                isCleaningSpaces = false;
            }
        };

        // Monitor for non-breaking spaces on text changes
        editor.on('text-change', (delta, oldDelta, source) => {
            if (source === 'user') {
                setTimeout(cleanupSpaces, 10); // Small delay to let Quill finish processing
            }
        });

        // Also clean on focus loss
        editor.root.addEventListener('blur', cleanupSpaces);
    }
}

// Export for use in modules
window.QuillConfigManager = QuillConfigManager;
