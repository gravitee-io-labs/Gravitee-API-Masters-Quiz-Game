/**
 * Buzzer UI Integration
 * Handles UI for buzzer settings modal and connection status
 */

class BuzzerUI {
    constructor(app, buzzerManager) {
        this.app = app;
        this.buzzer = buzzerManager;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateUI();
        
        // Check if Web Bluetooth is supported
        if (!this.buzzer.isSupported) {
            this.showNotSupported();
        }
        
        // Listen to buzzer status changes
        this.buzzer.onStatusChange((status) => {
            this.updateUI();
        });
        
        // Listen to button presses
        this.buzzer.onButtonPress((color) => {
            this.handleBuzzerPress(color);
        });
    }
    
    setupEventListeners() {
        // Settings button
        const settingsButton = document.getElementById('buzzerSettingsButton');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                this.openModal();
            });
        }
        
        // Modal close
        const closeButton = document.getElementById('closeBuzzerModal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // Click outside modal to close
        const modal = document.getElementById('buzzerModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
        
        // Connect buttons
        const connectGreen = document.getElementById('connectGreenBuzzer');
        if (connectGreen) {
            connectGreen.addEventListener('click', async () => {
                await this.connectBuzzer('green');
            });
        }
        
        const connectRed = document.getElementById('connectRedBuzzer');
        if (connectRed) {
            connectRed.addEventListener('click', async () => {
                await this.connectBuzzer('red');
            });
        }
        
        // Disconnect buttons
        const disconnectGreen = document.getElementById('disconnectGreenBuzzer');
        if (disconnectGreen) {
            disconnectGreen.addEventListener('click', async () => {
                await this.buzzer.disconnectBuzzer('green');
            });
        }
        
        const disconnectRed = document.getElementById('disconnectRedBuzzer');
        if (disconnectRed) {
            disconnectRed.addEventListener('click', async () => {
                await this.buzzer.disconnectBuzzer('red');
            });
        }
        
        // Test buzzers
        const testButton = document.getElementById('testBuzzers');
        if (testButton) {
            testButton.addEventListener('click', async () => {
                await this.testBuzzers();
            });
        }
        
        // Disconnect all
        const disconnectAllButton = document.getElementById('disconnectAllBuzzers');
        if (disconnectAllButton) {
            disconnectAllButton.addEventListener('click', async () => {
                await this.buzzer.disconnectAll();
            });
        }
    }
    
    openModal() {
        const modal = document.getElementById('buzzerModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    }
    
    closeModal() {
        const modal = document.getElementById('buzzerModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    }
    
    showNotSupported() {
        const warning = document.getElementById('bluetoothNotSupported');
        if (warning) {
            warning.style.display = 'flex';
        }
    }
    
    async connectBuzzer(color) {
        try {
            await this.buzzer.connectBuzzer(color);
            this.app.showToast(`${color.charAt(0).toUpperCase() + color.slice(1)} buzzer connected!`, 'success');
        } catch (error) {
            console.error(`Failed to connect ${color} buzzer:`, error);
            if (error.message && error.message.includes('User cancelled')) {
                // User cancelled the pairing dialog, don't show error
                return;
            }
            this.app.showError(`Failed to connect ${color} buzzer. Please try again.`);
        }
    }
    
    async testBuzzers() {
        const testButton = document.getElementById('testBuzzers');
        if (testButton) {
            testButton.disabled = true;
            testButton.textContent = 'Testing...';
        }
        
        try {
            await this.buzzer.testBuzzers();
        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            if (testButton) {
                testButton.disabled = false;
                const lang = i18n.currentLanguage;
                testButton.textContent = lang === 'fr' ? 'Tester' : 'Test Buzzers';
            }
        }
    }
    
    updateUI() {
        const status = this.buzzer.getStatus();
        
        // Update indicator
        this.updateIndicator(status);
        
        // Update green buzzer status
        this.updateBuzzerStatus('green', status.green);
        
        // Update red buzzer status
        this.updateBuzzerStatus('red', status.red);
        
        // Update action buttons
        this.updateActionButtons(status);
    }
    
    updateIndicator(status) {
        const indicator = document.getElementById('buzzerIndicator');
        if (!indicator) return;
        
        indicator.classList.remove('connected-one', 'connected-all');
        
        const connectedCount = (status.green.connected ? 1 : 0) + (status.red.connected ? 1 : 0);
        
        if (connectedCount === 2) {
            indicator.classList.add('connected-all');
        } else if (connectedCount === 1) {
            indicator.classList.add('connected-one');
        }
    }
    
    updateBuzzerStatus(color, status) {
        const statusEl = document.getElementById(`${color}BuzzerStatus`);
        const connectBtn = document.getElementById(`connect${color.charAt(0).toUpperCase() + color.slice(1)}Buzzer`);
        const disconnectBtn = document.getElementById(`disconnect${color.charAt(0).toUpperCase() + color.slice(1)}Buzzer`);
        const batteryEl = document.getElementById(`${color}BuzzerBattery`);
        const batteryLevelEl = document.getElementById(`${color}BuzzerBatteryLevel`);
        
        if (statusEl) {
            const lang = i18n.currentLanguage;
            statusEl.textContent = status.connected ? 
                (lang === 'fr' ? 'Connecté' : 'Connected') : 
                (lang === 'fr' ? 'Déconnecté' : 'Disconnected');
            statusEl.classList.toggle('connected', status.connected);
        }
        
        if (connectBtn) {
            connectBtn.style.display = status.connected ? 'none' : 'block';
        }
        
        if (disconnectBtn) {
            disconnectBtn.style.display = status.connected ? 'block' : 'none';
        }
        
        if (batteryEl && batteryLevelEl) {
            if (status.connected && status.battery !== null) {
                batteryEl.style.display = 'flex';
                batteryLevelEl.textContent = status.battery;
                
                // Update battery icon based on level
                const batteryIcon = batteryEl.querySelector('i');
                if (batteryIcon) {
                    if (status.battery > 75) {
                        batteryIcon.className = 'ph ph-battery-high';
                    } else if (status.battery > 50) {
                        batteryIcon.className = 'ph ph-battery-medium';
                    } else if (status.battery > 25) {
                        batteryIcon.className = 'ph ph-battery-low';
                    } else {
                        batteryIcon.className = 'ph ph-battery-warning';
                    }
                }
            } else {
                batteryEl.style.display = 'none';
            }
        }
    }
    
    updateActionButtons(status) {
        const testBtn = document.getElementById('testBuzzers');
        const disconnectAllBtn = document.getElementById('disconnectAllBuzzers');
        
        const anyConnected = status.green.connected || status.red.connected;
        const bothConnected = status.green.connected && status.red.connected;
        
        if (testBtn) {
            testBtn.disabled = !bothConnected;
        }
        
        if (disconnectAllBtn) {
            disconnectAllBtn.disabled = !anyConnected;
        }
    }
    
    handleBuzzerPress(color) {
        console.log(`Buzzer press received: ${color}`);
        
        // Only handle if we're on the game page
        const gamePage = document.getElementById('gamePage');
        if (!gamePage || !gamePage.classList.contains('active')) {
            console.log('Not on game page, ignoring buzzer press');
            return;
        }
        
        // Submit answer through the app
        this.app.submitAnswer(color);
    }
    
    /**
     * Provide visual feedback through buzzer LEDs
     */
    async provideFeedback(color, isCorrect) {
        if (!this.buzzer.connectionStatus[color] === 'connected') {
            return;
        }
        
        if (isCorrect) {
            // Green flash for correct answer
            await this.buzzer.flashLED(color, [0, 255, 0], 500);
        } else {
            // Red flash for wrong answer
            await this.buzzer.flashLED(color, [255, 0, 0], 500);
        }
    }
    
    /**
     * Turn off all LEDs
     */
    async turnOffAllLEDs() {
        const promises = [];
        
        if (this.buzzer.connectionStatus.green === 'connected') {
            promises.push(this.buzzer.turnOffLED('green'));
        }
        
        if (this.buzzer.connectionStatus.red === 'connected') {
            promises.push(this.buzzer.turnOffLED('red'));
        }
        
        await Promise.all(promises);
    }
}

// Make available globally
window.BuzzerUI = BuzzerUI;
