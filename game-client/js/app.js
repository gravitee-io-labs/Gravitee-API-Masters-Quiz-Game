/**
 * Main application logic for API Masters Quiz Game Client
 */

class QuizApp {
    constructor() {
        // Game state
        this.currentPlayer = null;
        this.currentGameSession = null;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.timer = null;
        this.timerSeconds = 20;
        this.gameResults = null;
        this.answerSubmitted = false; // Flag to prevent multiple submissions
        this.settings = null; // Game settings
        
        // Buzzer manager
        this.buzzerManager = null;
        this.buzzerUI = null;
        
        // Initialize
        this.init();
    }
    
    async init() {
        console.log('Initializing Quiz App');
        this.setupEventListeners();
        this.setupKeyboardControls();
        await this.loadSettings();
        this.initializeBuzzers();
        this.showPage('homePage');
    }
    
    /**
     * Initialize buzzer manager and UI
     */
    initializeBuzzers() {
        if (typeof BuzzerManager !== 'undefined') {
            this.buzzerManager = new BuzzerManager();
            if (typeof BuzzerUI !== 'undefined') {
                this.buzzerUI = new BuzzerUI(this, this.buzzerManager);
                console.log('Buzzer system initialized');
            }
        } else {
            console.warn('BuzzerManager not available');
        }
    }
    
    /**
     * Load game settings
     */
    async loadSettings() {
        try {
            this.settings = await api.getSettings();
            console.log('Settings loaded:', this.settings);
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Use defaults if settings can't be loaded
            this.settings = {
                questions_per_game: 15,
                timer_seconds: 20,
                points_correct: 1000,
                points_wrong: 0,
                time_bonus_max: 500
            };
        }
    }
    
    /**
     * Setup event listeners for all interactive elements
     */
    setupEventListeners() {
        // Home page
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.addEventListener('click', () => {
                this.showPage('registrationPage');
            });
        }
        
        // Registration form
        const registrationForm = document.getElementById('registrationForm');
        if (registrationForm) {
            registrationForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegistration();
            });
        }
        
        // Rules page
        const startGameButton = document.getElementById('startGameButton');
        if (startGameButton) {
            startGameButton.addEventListener('click', async () => {
                await this.startGame();
            });
        }
        
        // Game page - answer buttons
        const greenButton = document.getElementById('greenButton');
        if (greenButton) {
            greenButton.addEventListener('click', () => {
                this.submitAnswer('green');
            });
        }
        
        const redButton = document.getElementById('redButton');
        if (redButton) {
            redButton.addEventListener('click', () => {
                this.submitAnswer('red');
            });
        }
        
        // Results page
        const reviewButton = document.getElementById('reviewButton');
        if (reviewButton) {
            reviewButton.addEventListener('click', () => {
                this.showReview();
            });
        }
        
        const viewScoreboardButton = document.getElementById('viewScoreboardButton');
        if (viewScoreboardButton) {
            viewScoreboardButton.addEventListener('click', async () => {
                await this.showScoreboard();
            });
        }
        
        // Review page
        const backToResultsButton = document.getElementById('backToResultsButton');
        if (backToResultsButton) {
            backToResultsButton.addEventListener('click', () => {
                this.showPage('resultsPage');
            });
        }
        
        // Scoreboard page
        const backToHomeButton = document.getElementById('backToHomeButton');
        if (backToHomeButton) {
            backToHomeButton.addEventListener('click', () => {
                this.resetGame();
                this.showPage('homePage');
            });
        }
        
        // Language change - update dynamic content
        window.addEventListener('languageChanged', () => {
            this.updateDynamicContent();
        });
    }
    
    /**
     * Setup keyboard controls (G for Green, R for Red)
     */
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            // Only handle keyboard in game page
            const gamePage = document.getElementById('gamePage');
            if (!gamePage.classList.contains('active')) return;
            
            const key = e.key.toLowerCase();
            if (key === 'g') {
                this.submitAnswer('green');
            } else if (key === 'r') {
                this.submitAnswer('red');
            }
        });
    }
    
    /**
     * Show a specific page and hide others
     */
    showPage(pageId) {
        console.log('Showing page:', pageId);
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');
    }
    
    /**
     * Show/hide loading overlay
     */
    setLoading(isLoading) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = isLoading ? 'flex' : 'none';
        }
    }
    
    /**
     * Show error toast
     */
    showError(message) {
        const toast = document.getElementById('errorToast');
        const messageEl = document.getElementById('errorMessage');
        
        if (!toast || !messageEl) return;
        
        messageEl.textContent = message || i18n.translate('common.error');
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }
    
    /**
     * Show success toast
     */
    showToast(message, type = 'success') {
        // Reuse error toast for now, could create separate success toast
        const toast = document.getElementById('errorToast');
        const messageEl = document.getElementById('errorMessage');
        
        if (!toast || !messageEl) return;
        
        messageEl.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
            toast.className = 'toast error'; // Reset to default
        }, 3000);
    }
    
    /**
     * Handle player registration
     */
    async handleRegistration() {
        const firstNameEl = document.getElementById('firstName');
        const lastNameEl = document.getElementById('lastName');
        const emailEl = document.getElementById('email');
        
        if (!firstNameEl || !lastNameEl || !emailEl) {
            console.error('Registration form elements not found');
            return;
        }
        
        const firstName = firstNameEl.value.trim();
        const lastName = lastNameEl.value.trim();
        const email = emailEl.value.trim();
        
        if (!firstName || !lastName || !email) {
            this.showError('Please fill in all fields');
            return;
        }
        
        // Validate that names don't look like email addresses
        if (firstName.includes('@') || lastName.includes('@')) {
            this.showError('Please enter your name, not your email address');
            return;
        }
        
        this.setLoading(true);
        
        try {
            this.currentPlayer = await api.registerPlayer(firstName, lastName, email);
            console.log('Player registered:', this.currentPlayer);
            this.updateRulesWithSettings();
            this.showPage('rulesPage');
        } catch (error) {
            console.error('Registration failed:', error);
            this.showError('Registration failed. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Update rules page with actual game settings
     */
    updateRulesWithSettings() {
        if (!this.settings) return;
        
        const lang = i18n.currentLanguage;
        const rulesList = document.querySelector('.rules-list');
        
        if (rulesList && this.settings) {
            const questionsText = lang === 'fr' 
                ? `Vous répondrez à ${this.settings.questions_per_game} questions`
                : `You will answer ${this.settings.questions_per_game} questions`;
            
            const timerText = lang === 'fr'
                ? `Chaque question a un minuteur de ${this.settings.timer_seconds} secondes`
                : `Each question has ${this.settings.timer_seconds} seconds timer`;
            
            const buttonText = lang === 'fr'
                ? 'Répondez en utilisant les boutons physiques Vert ou Rouge'
                : 'Answer using the physical Green or Red buttons';
            
            const bonusText = lang === 'fr'
                ? 'Les réponses correctes plus rapides rapportent des points bonus !'
                : 'Faster correct answers earn bonus points!';
            
            rulesList.innerHTML = `
                <li>${questionsText}</li>
                <li>${timerText}</li>
                <li>${buttonText}</li>
                <li>${bonusText}</li>
            `;
        }
    }
    
    /**
     * Start a new game
     */
    async startGame() {
        if (!this.currentPlayer) {
            this.showError('Please register first');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const gameData = await api.startGame(this.currentPlayer.id);
            console.log('Game started:', gameData);
            
            this.currentGameSession = gameData.game_session_id;
            this.questions = gameData.questions;
            this.timerSeconds = gameData.timer_seconds;
            this.currentQuestionIndex = 0;
            this.answers = [];
            this.answerSubmitted = false;
            
            // Update total questions display
            const totalQuestionsEl = document.getElementById('totalQuestions');
            if (totalQuestionsEl) {
                totalQuestionsEl.textContent = this.questions.length;
            }
            
            // Show first question
            this.showPage('gamePage');
            this.displayQuestion();
        } catch (error) {
            console.error('Failed to start game:', error);
            this.showError('Failed to start game. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Display current question
     */
    displayQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.finishGame();
            return;
        }
        
        // Reset answer submission flag for new question
        this.answerSubmitted = false;
        
        const question = this.questions[this.currentQuestionIndex];
        const lang = i18n.getLanguage();
        
        // Update question number
        const currentQuestionEl = document.getElementById('currentQuestion');
        if (currentQuestionEl) {
            currentQuestionEl.textContent = this.currentQuestionIndex + 1;
        }
        
        // Update category tag
        const categoryEl = document.getElementById('questionCategory');
        if (categoryEl) {
            if (question.category) {
                categoryEl.textContent = question.category.name;
                categoryEl.style.backgroundColor = question.category.color;
            } else {
                categoryEl.textContent = 'Generic';
                categoryEl.style.backgroundColor = '#6c757d';
            }
        }
        
        // Update question text
        const questionText = lang === 'fr' ? question.question_text_fr : question.question_text_en;
        const questionTextEl = document.getElementById('questionText');
        if (questionTextEl) {
            questionTextEl.textContent = questionText;
        }
        
        // Update button labels
        const greenLabel = lang === 'fr' ? question.green_label_fr : question.green_label_en;
        const redLabel = lang === 'fr' ? question.red_label_fr : question.red_label_en;
        const greenLabelEl = document.getElementById('greenLabel');
        const redLabelEl = document.getElementById('redLabel');
        if (greenLabelEl) greenLabelEl.textContent = greenLabel;
        if (redLabelEl) redLabelEl.textContent = redLabel;
        
        // Handle media (if any)
        const mediaContainer = document.getElementById('questionMedia');
        const mediaImage = document.getElementById('questionImage');
        if (mediaContainer && mediaImage) {
            if (question.media_url && question.question_type !== 'text') {
                mediaImage.src = question.media_url;
                mediaImage.style.display = 'block';
                mediaContainer.style.display = 'block';
            } else {
                mediaContainer.style.display = 'none';
                mediaImage.style.display = 'none';
            }
        }
        
        // Enable buttons
        const greenButton = document.getElementById('greenButton');
        const redButton = document.getElementById('redButton');
        if (greenButton) greenButton.disabled = false;
        if (redButton) redButton.disabled = false;
        
        // Start timer
        this.startTimer();
    }
    
    /**
     * Start question timer
     */
    startTimer() {
        let timeLeft = this.timerSeconds;
        const timerText = document.getElementById('timerText');
        const timerCircle = document.querySelector('.timer-ring-circle');
        
        if (!timerText || !timerCircle) {
            console.error('Timer elements not found');
            return;
        }
        
        // Reset timer display
        timerText.textContent = timeLeft;
        timerCircle.style.strokeDashoffset = '0';
        
        // Record start time for answer timing
        this.questionStartTime = Date.now();
        
        // Clear any existing timer
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        // Start countdown
        this.timer = setInterval(() => {
            timeLeft--;
            if (timerText) timerText.textContent = timeLeft;
            
            // Update circular progress
            const circumference = 226.195; // 2 * PI * radius (36)
            const offset = circumference * (1 - timeLeft / this.timerSeconds);
            if (timerCircle) timerCircle.style.strokeDashoffset = offset;
            
            if (timeLeft <= 0) {
                clearInterval(this.timer);
                this.submitAnswer(null); // Timeout - no answer
            }
        }, 1000);
    }
    
    /**
     * Submit an answer for current question
     */
    submitAnswer(answer) {
        // Prevent multiple submissions for the same question
        if (this.answerSubmitted) {
            console.log('Answer already submitted for this question, ignoring duplicate submission');
            return;
        }
        
        // Mark as submitted immediately to prevent any race conditions
        this.answerSubmitted = true;
        
        // Clear timer
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        // Disable buttons
        const greenButton = document.getElementById('greenButton');
        const redButton = document.getElementById('redButton');
        if (greenButton) greenButton.disabled = true;
        if (redButton) redButton.disabled = true;
        
        // Calculate time taken
        const timeTaken = (Date.now() - this.questionStartTime) / 1000;
        
        // Store answer
        const question = this.questions[this.currentQuestionIndex];
        const isCorrect = answer === question.correct_answer;
        
        this.answers.push({
            question_id: question.id,
            player_answer: answer,
            time_taken: Math.min(timeTaken, this.timerSeconds),
        });
        
        console.log('Answer submitted:', {
            question: this.currentQuestionIndex + 1,
            answer,
            correct: question.correct_answer,
            isCorrect,
            timeTaken,
        });
        
        // Provide LED feedback through buzzers
        if (this.buzzerUI && answer) {
            this.buzzerUI.provideFeedback(answer, isCorrect);
        }
        
        // Move to next question after short delay
        setTimeout(() => {
            this.currentQuestionIndex++;
            this.displayQuestion();
        }, 500);
    }
    
    /**
     * Finish game and submit answers
     */
    async finishGame() {
        console.log('Game finished, submitting answers...');
        this.setLoading(true);
        
        try {
            this.gameResults = await api.submitGame(this.currentGameSession, this.answers);
            console.log('Game results:', this.gameResults);
            
            this.displayResults();
        } catch (error) {
            console.error('Failed to submit game:', error);
            this.showError('Failed to submit game. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Display game results
     */
    displayResults() {
        const results = this.gameResults.game_session;
        
        const finalScoreEl = document.getElementById('finalScore');
        const playerRankEl = document.getElementById('playerRank');
        const correctCountEl = document.getElementById('correctCount');
        const wrongCountEl = document.getElementById('wrongCount');
        
        if (finalScoreEl) finalScoreEl.textContent = results.total_score;
        if (playerRankEl) playerRankEl.textContent = `${this.gameResults.rank} / ${this.gameResults.total_players}`;
        if (correctCountEl) correctCountEl.textContent = results.correct_answers;
        if (wrongCountEl) wrongCountEl.textContent = results.wrong_answers;
        
        this.showPage('resultsPage');
    }
    
    /**
     * Show answer review
     */
    showReview() {
        const reviewList = document.getElementById('reviewList');
        if (!reviewList) {
            console.error('Review list element not found');
            return;
        }
        
        reviewList.innerHTML = '';
        
        const lang = i18n.getLanguage();
        
        this.gameResults.review.forEach((item, index) => {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            
            // Add class based on result
            if (item.is_correct === true) {
                reviewItem.classList.add('correct');
            } else if (item.is_correct === false) {
                reviewItem.classList.add('wrong');
            } else {
                reviewItem.classList.add('unanswered');
            }
            
            const questionText = lang === 'fr' ? item.question_text_fr : item.question_text_en;
            const explanation = lang === 'fr' ? item.explanation_fr : item.explanation_en;
            
            const yourAnswerLabel = i18n.translate('review.yourAnswer');
            const correctAnswerLabel = i18n.translate('review.correctAnswer');
            const unansweredLabel = i18n.translate('review.unanswered');
            const explanationLabel = i18n.translate('review.explanation');
            
            const greenText = lang === 'fr' ? item.green_label_fr : item.green_label_en;
            const redText = lang === 'fr' ? item.red_label_fr : item.red_label_en;
            
            const yourAnswer = item.player_answer ? 
                (item.player_answer === 'green' ? `🟢 ${greenText}` : `🔴 ${redText}`) : 
                unansweredLabel;
            const correctAnswer = item.correct_answer === 'green' ? 
                `🟢 ${greenText}` : 
                `🔴 ${redText}`;
            
            // Determine status text
            let statusText = '';
            let statusClass = '';
            if (item.is_correct === true) {
                statusText = '✓ Correct';
                statusClass = 'correct';
            } else if (item.is_correct === false) {
                statusText = '✗ Wrong';
                statusClass = 'wrong';
            } else {
                statusText = '- Unanswered';
                statusClass = 'unanswered';
            }
            
            // Category tag
            let categoryTag = '';
            if (item.category) {
                categoryTag = `<span class="review-category-tag" style="background-color: ${item.category.color}">${item.category.name}</span>`;
            } else {
                categoryTag = `<span class="review-category-tag" style="background-color: #6c757d">Generic</span>`;
            }
            
            // Build answer display - only show correct answer if wrong or unanswered
            let answerHTML = '';
            if (item.is_correct === true) {
                // Correct: only show player's answer
                answerHTML = `
                    <div class="review-answer-line">
                        <span>${yourAnswerLabel}:</span>
                        <strong>${yourAnswer}</strong>
                    </div>
                `;
            } else {
                // Wrong or unanswered: show both on separate lines
                answerHTML = `
                    <div class="review-answer-line">
                        <span>${yourAnswerLabel}:</span>
                        <strong>${yourAnswer}</strong>
                    </div>
                    <div class="review-answer-line">
                        <span>${correctAnswerLabel}:</span>
                        <strong>${correctAnswer}</strong>
                    </div>
                `;
            }
            
            reviewItem.innerHTML = `
                <div class="review-header">
                    <div class="review-question">${index + 1}. ${questionText}</div>
                    ${categoryTag}
                    <span class="review-status ${statusClass}">${statusText}</span>
                </div>
                <div class="review-answers">
                    ${answerHTML}
                </div>
                <div class="review-meta">
                    <span>Points: <strong>${item.points_earned}</strong></span>
                    <span>Time: <strong>${item.time_taken ? item.time_taken.toFixed(1) + 's' : '-'}</strong></span>
                </div>
                ${explanation ? `<div class="review-explanation">${explanationLabel}: ${explanation}</div>` : ''}
            `;
            
            reviewList.appendChild(reviewItem);
        });
        
        this.showPage('reviewPage');
    }
    
    /**
     * Show scoreboard
     */
    async showScoreboard() {
        this.setLoading(true);
        
        try {
            const scoreboard = await api.getScoreboard(10);
            console.log('Scoreboard:', scoreboard);
            
            const scoreboardList = document.getElementById('scoreboardList');
            if (!scoreboardList) {
                console.error('Scoreboard list element not found');
                return;
            }
            
            scoreboardList.innerHTML = '';
            
            if (scoreboard.length === 0) {
                scoreboardList.innerHTML = '<div class="loading">No scores yet</div>';
            } else {
                scoreboard.forEach(entry => {
                    const item = document.createElement('div');
                    item.className = 'scoreboard-item';
                    
                    item.innerHTML = `
                        <div class="scoreboard-rank">${entry.rank}</div>
                        <div class="scoreboard-player">${entry.player_name}</div>
                        <div class="scoreboard-stats">${entry.correct_answers} / ${entry.correct_answers + entry.wrong_answers}</div>
                        <div class="scoreboard-score">${entry.score}</div>
                    `;
                    
                    scoreboardList.appendChild(item);
                });
            }
            
            this.showPage('scoreboardPage');
        } catch (error) {
            console.error('Failed to load scoreboard:', error);
            this.showError('Failed to load scoreboard.');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Update dynamic content when language changes
     */
    updateDynamicContent() {
        // If on review page, refresh it
        const reviewPage = document.getElementById('reviewPage');
        if (reviewPage && reviewPage.classList.contains('active')) {
            this.showReview();
        }
    }
    
    /**
     * Reset game state
     */
    resetGame() {
        this.currentPlayer = null;
        this.currentGameSession = null;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.gameResults = null;
        this.answerSubmitted = false;
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        // Clear form
        const registrationForm = document.getElementById('registrationForm');
        if (registrationForm) {
            registrationForm.reset();
        }
    }
}

// Suppress browser extension errors that try to read dataset from null elements
window.addEventListener('error', (event) => {
    // Filter out extension errors (minified files like 6.js, 5.js)
    const isExtensionError = event.filename && (
        event.filename.includes('extensions/') ||
        /\d+\.js:\d+$/.test(event.filename) ||
        event.message.includes('reading \'dataset\'')
    );
    
    if (isExtensionError) {
        event.preventDefault();
        return true; // Suppress the error
    }
}, true);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, starting app...');
    window.quizApp = new QuizApp();
});
