/**
 * Theme management (same as game client)
 */

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'system';
        this.init();
    }
    
    init() {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = this.currentTheme;
            themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }
        
        this.applyTheme();
        
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
        
        if (effectiveTheme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                effectiveTheme = 'dark';
            } else {
                effectiveTheme = 'light';
            }
        }
        
        document.documentElement.setAttribute('data-theme', effectiveTheme);
    }
}

const themeManager = new ThemeManager();
