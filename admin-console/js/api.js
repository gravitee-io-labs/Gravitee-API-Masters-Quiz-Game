/**
 * Admin API Client
 */

// Get API URL from environment or use default
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api';
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

async function fetchWithRetry(url, options = {}, attempt = 1) {
    try {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        
        if (token && !url.includes('/auth/login')) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, {
            ...options,
            headers,
        });
        
        if (response.status === 401) {
            // Unauthorized - redirect to login
            localStorage.removeItem('authToken');
            if (window.adminApp) {
                window.adminApp.showLogin();
            }
            throw new Error('Unauthorized');
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Handle 204 No Content
        if (response.status === 204) {
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API request failed (attempt ${attempt}/${RETRY_ATTEMPTS}):`, error);
        
        if (attempt < RETRY_ATTEMPTS && error.message !== 'Unauthorized') {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
            return fetchWithRetry(url, options, attempt + 1);
        }
        
        throw error;
    }
}

const api = {
    // Authentication
    async login(username, password) {
        console.log('API: Login');
        const response = await fetchWithRetry(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        
        if (response.access_token) {
            localStorage.setItem('authToken', response.access_token);
        }
        
        return response;
    },
    
    async logout() {
        localStorage.removeItem('authToken');
        return { success: true };
    },
    
    // Questions
    async getQuestions(includeInactive = true) {
        console.log('API: Get questions');
        return await fetchWithRetry(`${API_BASE_URL}/questions/?include_inactive=${includeInactive}&limit=1000`);
    },
    
    async getQuestion(id) {
        console.log('API: Get question', id);
        return await fetchWithRetry(`${API_BASE_URL}/questions/${id}`);
    },
    
    async createQuestion(data) {
        console.log('API: Create question', data);
        return await fetchWithRetry(`${API_BASE_URL}/questions/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    
    async updateQuestion(id, data) {
        console.log('API: Update question', id, data);
        return await fetchWithRetry(`${API_BASE_URL}/questions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    
    async deleteQuestion(id) {
        console.log('API: Delete question', id);
        return await fetchWithRetry(`${API_BASE_URL}/questions/${id}`, {
            method: 'DELETE',
        });
    },
    
    // Results
    async getResults(limit = 100) {
        console.log('API: Get results');
        return await fetchWithRetry(`${API_BASE_URL}/results/?limit=${limit}`);
    },
    
    async getResult(id) {
        console.log('API: Get result', id);
        return await fetchWithRetry(`${API_BASE_URL}/results/${id}`);
    },
    
    async deleteResult(id) {
        console.log('API: Delete result', id);
        return await fetchWithRetry(`${API_BASE_URL}/results/${id}`, {
            method: 'DELETE',
        });
    },
    
    async updateScore(id, score) {
        console.log('API: Update score', id, score);
        return await fetchWithRetry(`${API_BASE_URL}/results/${id}/score`, {
            method: 'PATCH',
            body: JSON.stringify({ total_score: score }),
        });
    },
    
    // Settings
    async getSettings() {
        console.log('API: Get settings');
        return await fetchWithRetry(`${API_BASE_URL}/settings/`);
    },
    
    async updateSettings(data) {
        console.log('API: Update settings', data);
        return await fetchWithRetry(`${API_BASE_URL}/settings/`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
};
