/**
 * Real-time Scoreboard using Server-Sent Events (SSE)
 */

// Get API URL from environment or use default
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api';

class ScoreboardApp {
    constructor() {
        this.eventSource = null;
        this.currentScores = [];
        this.isInitialized = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 3000; // Start with 3 seconds
        this.isConnecting = false;
        this.init();
    }
    
    init() {
        console.log('Initializing Scoreboard');
        this.connectToSSE();
        
        // Fallback: reload if SSE connection drops
        window.addEventListener('online', () => {
            console.log('Network back online, reconnecting...');
            this.reconnectAttempts = 0;
            this.reconnectDelay = 3000;
            this.reconnect();
        });
    }
    
    /**
     * Connect to Server-Sent Events stream for real-time updates
     */
    connectToSSE() {
        if (this.isConnecting) {
            console.log('Already attempting to connect, skipping...');
            return;
        }
        
        this.isConnecting = true;
        console.log('Connecting to SSE stream...');
        this.showLoading();
        
        try {
            this.eventSource = new EventSource(`${API_BASE_URL}/scoreboard/stream`);
            
            this.eventSource.onmessage = (event) => {
                console.log('Received scoreboard update');
                this.reconnectAttempts = 0; // Reset on successful message
                this.reconnectDelay = 3000;
                
                try {
                    const scores = JSON.parse(event.data);
                    this.updateScoreboard(scores);
                } catch (err) {
                    console.error('Error parsing scoreboard data:', err);
                }
            };
            
            this.eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                this.isConnecting = false;
                
                if (this.eventSource) {
                    this.eventSource.close();
                    this.eventSource = null;
                }
                
                // Attempt to reconnect with exponential backoff
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
                    
                    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    this.showReconnecting(this.reconnectAttempts, delay);
                    
                    setTimeout(() => {
                        this.reconnect();
                    }, delay);
                } else {
                    console.error('Max reconnection attempts reached');
                    this.showMaxReconnectError();
                }
            };
            
            this.eventSource.onopen = () => {
                console.log('SSE connection established');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                // Don't hide loading yet - wait for first data message
            };
            
        } catch (error) {
            console.error('Failed to connect to SSE:', error);
            this.isConnecting = false;
            this.showError();
            
            // Retry connection
            setTimeout(() => {
                this.reconnect();
            }, this.reconnectDelay);
        }
    }
    
    /**
     * Reconnect to SSE stream
     */
    reconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnecting = false;
        this.connectToSSE();
    }
    
    /**
     * Update scoreboard display with new data
     */
    updateScoreboard(scores) {
        console.log('Updating scoreboard with', scores.length, 'entries');
        
        if (scores.length === 0) {
            this.showNoData();
            return;
        }
        
        this.hideLoading();
        this.hideNoData();
        
        // Check if DOM is empty (happens after reconnection when showLoading cleared it)
        const podium = document.getElementById('podium');
        const isDOMEmpty = podium.children.length === 0;
        
        // Check if this is first render or if data has actually changed
        const hasChanged = JSON.stringify(this.currentScores) !== JSON.stringify(scores);
        
        // Skip update only if data hasn't changed AND DOM is not empty
        if (!hasChanged && this.isInitialized && !isDOMEmpty) {
            console.log('No changes detected and DOM has content, skipping update');
            return;
        }
        
        // Check for new entries
        const newEntryIds = scores
            .filter(s => !this.currentScores.find(cs => cs.player_name === s.player_name && cs.score === s.score))
            .map(s => `${s.player_name}-${s.score}`);
        
        this.currentScores = scores;
        
        // Display top 3 in podium
        if (scores.length >= 1) {
            // Don't skip animation if DOM was empty (reconnection case)
            this.updatePodium(scores.slice(0, 3), this.isInitialized && !isDOMEmpty);
        }
        
        // Display remaining in list
        if (scores.length > 3) {
            this.updateList(scores.slice(3), newEntryIds, this.isInitialized && !isDOMEmpty);
        } else {
            document.getElementById('scoreboardList').innerHTML = '';
        }
        
        this.isInitialized = true;
    }
    
    /**
     * Update podium display (top 3)
     */
    updatePodium(topThree, skipAnimation) {
        const podium = document.getElementById('podium');
        
        // Create podium places (order: 2nd, 1st, 3rd)
        topThree.forEach((entry, index) => {
            const place = index + 1;
            const placeClass = place === 1 ? 'first' : place === 2 ? 'second' : 'third';
            const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
            const entryId = `podium-${place}`;
            
            let podiumPlace = document.getElementById(entryId);
            
            if (!podiumPlace) {
                // Create new element
                podiumPlace = document.createElement('div');
                podiumPlace.id = entryId;
                podiumPlace.className = `podium-place ${placeClass}`;
                if (skipAnimation) {
                    podiumPlace.classList.add('no-animation');
                }
                podium.appendChild(podiumPlace);
            }
            
            // Update content
            podiumPlace.innerHTML = `
                <div class="rank-badge">${medal}</div>
                <div class="player-name">${this.escapeHtml(entry.player_name)}</div>
                <div class="player-score">${entry.score}</div>
                <div class="player-stats">
                    ${entry.correct_answers} correct · ${entry.wrong_answers} wrong
                </div>
            `;
        });
        
        // Remove extra podium places if any
        for (let i = topThree.length + 1; i <= 3; i++) {
            const extraPlace = document.getElementById(`podium-${i}`);
            if (extraPlace) {
                extraPlace.remove();
            }
        }
    }
    
    /**
     * Update list display (4th place and below)
     */
    updateList(scores, newEntryIds, skipAnimation) {
        const list = document.getElementById('scoreboardList');
        const existingItems = new Map();
        
        // Keep track of existing items
        Array.from(list.children).forEach(item => {
            const id = item.dataset.entryId;
            if (id) {
                existingItems.set(id, item);
            }
        });
        
        // Clear list
        list.innerHTML = '';
        
        scores.forEach((entry, index) => {
            const rank = index + 4; // Starts at 4th place
            const entryId = `${entry.player_name}-${entry.score}`;
            const isNew = newEntryIds.includes(entryId);
            
            let item = existingItems.get(entryId);
            
            if (!item) {
                // Create new item
                item = document.createElement('div');
                item.dataset.entryId = entryId;
                item.className = `scoreboard-item ${isNew && !skipAnimation ? 'new-entry' : ''}`;
                if (skipAnimation) {
                    item.classList.add('no-animation');
                }
            } else {
                // Remove animation classes from existing item
                item.className = 'scoreboard-item';
            }
            
            // Update content
            item.innerHTML = `
                <div class="item-rank">#${rank}</div>
                <div class="item-player">${this.escapeHtml(entry.player_name)}</div>
                <div class="item-stats">
                    ${entry.correct_answers} / ${entry.correct_answers + entry.wrong_answers} correct
                </div>
                <div class="item-score">${entry.score}</div>
            `;
            
            list.appendChild(item);
        });
    }
    
    /**
     * Show loading state
     */
    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('noData').style.display = 'none';
        document.getElementById('podium').innerHTML = '';
        document.getElementById('scoreboardList').innerHTML = '';
    }
    
    /**
     * Hide loading state
     */
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }
    
    /**
     * Show no data message
     */
    showNoData() {
        document.getElementById('noData').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('podium').innerHTML = '';
        document.getElementById('scoreboardList').innerHTML = '';
    }
    
    /**
     * Hide no data message
     */
    hideNoData() {
        document.getElementById('noData').style.display = 'none';
    }
    
    /**
     * Show reconnecting state
     */
    showReconnecting(attempt, delay) {
        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        loading.innerHTML = `
            <p style="color: #ff9800;">Connection lost. Reconnecting...</p>
            <p style="font-size: 0.9rem; color: var(--text-secondary);">Attempt ${attempt} - Retry in ${(delay/1000).toFixed(0)}s</p>
            <div class="spinner"></div>
        `;
    }
    
    /**
     * Show error state
     */
    showError() {
        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        loading.innerHTML = `
            <p style="color: #f44336;">Connection error. Retrying...</p>
            <div class="spinner"></div>
        `;
    }
    
    /**
     * Show max reconnect error
     */
    showMaxReconnectError() {
        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        loading.innerHTML = `
            <p style="color: #f44336;">Unable to connect to server</p>
            <p style="font-size: 0.9rem; color: var(--text-secondary);">Please check your connection and refresh the page</p>
            <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Kanit', sans-serif; font-size: 1rem;">
                Refresh Page
            </button>
        `;
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Cleanup on page unload
     */
    destroy() {
        if (this.eventSource) {
            console.log('Closing SSE connection');
            this.eventSource.close();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, starting scoreboard app...');
    window.scoreboardApp = new ScoreboardApp();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.scoreboardApp) {
        window.scoreboardApp.destroy();
    }
});
