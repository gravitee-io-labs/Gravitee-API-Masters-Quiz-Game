/**
 * Theme management
 * Handles light/dark theme switching
 */

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.init();
    }
    
    init() {
        // Set theme select value
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = this.currentTheme;
            themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }
        
        // Apply initial theme
        this.applyTheme();
        
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (this.currentTheme === 'system') {
                    this.applyTheme();
                }
            });
        }
    }
    
    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme();
    }
    
    applyTheme() {
        let effectiveTheme = this.currentTheme;
        
        // Handle system theme
        if (effectiveTheme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                effectiveTheme = 'dark';
            } else {
                effectiveTheme = 'light';
            }
        }
        
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', effectiveTheme);
    }
    
    getTheme() {
        return this.currentTheme;
    }
}

// Create global theme manager instance
const themeManager = new ThemeManager();
