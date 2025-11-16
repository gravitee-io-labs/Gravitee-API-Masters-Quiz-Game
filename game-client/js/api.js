/**
 * API Client
 * Handles all communication with the backend API
 */

// Get API URL from environment or use default
// For production, set window.API_BASE_URL before loading this script
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api';

// Retry configuration for resilience
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // ms

/**
 * Utility function to make API requests with retry logic
 */
async function fetchWithRetry(url, options = {}, attempt = 1) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API request failed (attempt ${attempt}/${RETRY_ATTEMPTS}):`, error);
        
        if (attempt < RETRY_ATTEMPTS) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
            return fetchWithRetry(url, options, attempt + 1);
        }
        
        throw error;
    }
}

/**
 * API client object
 */
const api = {
    /**
     * Register a new player
     */
    async registerPlayer(firstName, lastName, email) {
        console.log('API: Registering player:', { firstName, lastName, email });
        return await fetchWithRetry(`${API_BASE_URL}/games/players`, {
            method: 'POST',
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: email,
            }),
        });
    },
    
    /**
     * Start a new game session
     */
    async startGame(playerId) {
        console.log('API: Starting game for player:', playerId);
        return await fetchWithRetry(`${API_BASE_URL}/games/start`, {
            method: 'POST',
            body: JSON.stringify({
                player_id: playerId,
            }),
        });
    },
    
    /**
     * Submit game answers
     */
    async submitGame(gameSessionId, answers) {
        console.log('API: Submitting game:', gameSessionId, answers);
        return await fetchWithRetry(`${API_BASE_URL}/games/${gameSessionId}/submit`, {
            method: 'POST',
            body: JSON.stringify({
                answers: answers,
            }),
        });
    },
    
    /**
     * Get scoreboard
     */
    async getScoreboard(limit = 10) {
        console.log('API: Fetching scoreboard');
        return await fetchWithRetry(`${API_BASE_URL}/scoreboard/?limit=${limit}`);
    },
    
    /**
     * Get game settings
     */
    async getSettings() {
        console.log('API: Fetching game settings');
        return await fetchWithRetry(`${API_BASE_URL}/settings/`);
    },
};
