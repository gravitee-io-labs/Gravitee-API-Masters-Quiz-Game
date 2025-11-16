/**
 * Internationalization (i18n) support
 * Handles translations between English and French
 */

const translations = {
    en: {
        // Home page
        'home.title': 'Become THE Ultimate API Master!',
        'home.subtitle': 'Test your knowledge about APIs, AI, MCP, A2A, and Gravitee',
        'home.playButton': 'Play',
        
        // Registration
        'registration.title': 'Player Registration',
        'registration.firstName': 'First Name',
        'registration.lastName': 'Last Name',
        'registration.email': 'Email',
        'registration.submitButton': 'Continue',
        
        // Rules
        'rules.title': 'Game Rules',
        'rules.intro': "Welcome to API Masters! Here's how to become THE API Master:",
        'rules.rule1': 'You will answer 15 questions',
        'rules.rule2': 'Each question has 20 seconds timer',
        'rules.rule3': 'Answer using the physical Green or Red buttons',
        'rules.rule5': 'Faster correct answers earn bonus points!',
        'rules.greenButton': 'Green Button',
        'rules.redButton': 'Red Button',
        'rules.startButton': 'Start Game',
        
        // Game
        'game.question': 'Question',
        
        // Results
        'results.title': 'Your Results',
        'results.score': 'Score',
        'results.rank': 'Rank',
        'results.correct': 'Correct',
        'results.wrong': 'Wrong',
        'results.reviewButton': 'Review Answers',
        'results.scoreboardButton': 'View Scoreboard',
        
        // Review
        'review.title': 'Answer Review',
        'review.yourAnswer': 'Your Answer',
        'review.correctAnswer': 'Correct Answer',
        'review.unanswered': 'Unanswered',
        'review.explanation': 'Explanation',
        'review.backButton': 'Back to Results',
        
        // Scoreboard
        'scoreboard.title': 'Scoreboard',
        'scoreboard.backButton': 'Back to Home',
        
        // Theme
        'theme.system': 'System',
        'theme.light': 'Light',
        'theme.dark': 'Dark',
        
        // Common
        'common.loading': 'Loading...',
        'common.error': 'An error occurred. Please try again.',
        'common.green': 'Green',
        'common.red': 'Red',
    },
    fr: {
        // Home page
        'home.title': 'Devenez LE Maître Ultime des API !',
        'home.subtitle': 'Testez vos connaissances sur les API, IA, MCP, A2A et Gravitee',
        'home.playButton': 'Jouer',
        
        // Registration
        'registration.title': 'Inscription du Joueur',
        'registration.firstName': 'Prénom',
        'registration.lastName': 'Nom',
        'registration.email': 'Email',
        'registration.submitButton': 'Continuer',
        
        // Rules
        'rules.title': 'Règles du Jeu',
        'rules.intro': "Bienvenue à API Masters ! Voici comment devenir LE Maître des API :",
        'rules.rule1': 'Vous répondrez à 15 questions',
        'rules.rule2': 'Chaque question a un minuteur de 20 secondes',
        'rules.rule3': 'Répondez en utilisant les boutons physiques Vert ou Rouge',
        'rules.rule5': 'Les réponses correctes plus rapides rapportent des points bonus !',
        'rules.greenButton': 'Bouton Vert',
        'rules.redButton': 'Bouton Rouge',
        'rules.startButton': 'Commencer le Jeu',
        
        // Game
        'game.question': 'Question',
        
        // Results
        'results.title': 'Vos Résultats',
        'results.score': 'Score',
        'results.rank': 'Rang',
        'results.correct': 'Correct',
        'results.wrong': 'Incorrect',
        'results.reviewButton': 'Revoir les Réponses',
        'results.scoreboardButton': 'Voir le Classement',
        
        // Review
        'review.title': 'Révision des Réponses',
        'review.yourAnswer': 'Votre Réponse',
        'review.correctAnswer': 'Bonne Réponse',
        'review.unanswered': 'Non répondu',
        'review.explanation': 'Explication',
        'review.backButton': 'Retour aux Résultats',
        
        // Scoreboard
        'scoreboard.title': 'Classement',
        'scoreboard.backButton': "Retour à l'Accueil",
        
        // Theme
        'theme.system': 'Système',
        'theme.light': 'Clair',
        'theme.dark': 'Sombre',
        
        // Common
        'common.loading': 'Chargement...',
        'common.error': 'Une erreur est survenue. Veuillez réessayer.',
        'common.green': 'Vert',
        'common.red': 'Rouge',
    }
};

class I18n {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.init();
    }
    
    init() {
        // Set language select value
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = this.currentLanguage;
            languageSelect.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }
        
        // Apply translations
        this.applyTranslations();
    }
    
    setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        this.applyTranslations();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }
    
    getLanguage() {
        return this.currentLanguage;
    }
    
    translate(key) {
        const translation = translations[this.currentLanguage]?.[key];
        return translation || key;
    }
    
    applyTranslations() {
        // Find all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                const translation = this.translate(key);
                
                // Don't update if translation is the same as key (not found)
                if (translation !== key) {
                    // Only update textContent for elements that should contain text
                    // Avoid updating inputs, selects, etc.
                    if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
                        element.textContent = translation;
                    }
                }
            }
        });
        
        // Update document language
        document.documentElement.lang = this.currentLanguage;
    }
}

// Create global i18n instance
const i18n = new I18n();
