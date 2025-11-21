/**
 * Bluetooth Buzzer Manager
 * Handles Web Bluetooth API connection to physical quiz buzzers
 */

class BuzzerManager {
    constructor() {
        // BLE Service and Characteristic UUIDs (must match firmware)
        this.BUZZER_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
        this.BUTTON_STATE_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
        this.LED_CONTROL_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
        this.BUZZER_ID_UUID = '6e400004-b5a3-f393-e0a9-e50e24dcca9e';
        this.BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
        this.BATTERY_LEVEL_UUID = '00002a19-0000-1000-8000-00805f9b34fb';
        
        // Connected devices
        this.greenBuzzer = null;
        this.redBuzzer = null;
        
        // Device objects
        this.greenDevice = null;
        this.redDevice = null;
        
        // Connection status
        this.connectionStatus = {
            green: 'disconnected',
            red: 'disconnected'
        };
        
        // Battery levels
        this.batteryLevels = {
            green: null,
            red: null
        };
        
        // Button press callbacks
        this.buttonPressCallbacks = [];
        
        // Status change callbacks
        this.statusChangeCallbacks = [];
        
        // Check Web Bluetooth availability
        this.isSupported = this.checkSupport();
        
        console.log('BuzzerManager initialized', { supported: this.isSupported });
    }
    
    /**
     * Check if Web Bluetooth is supported
     */
    checkSupport() {
        if (!navigator.bluetooth) {
            console.warn('Web Bluetooth API is not supported in this browser');
            return false;
        }
        return true;
    }
    
    /**
     * Connect to a buzzer device
     * @param {string} color - 'green' or 'red'
     */
    async connectBuzzer(color) {
        if (!this.isSupported) {
            throw new Error('Web Bluetooth is not supported in this browser');
        }
        
        try {
            console.log(`Connecting to ${color} buzzer...`);
            
            // Request device with filters
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { 
                        namePrefix: 'Gravitee-Buzzer',
                        services: [this.BUZZER_SERVICE_UUID]
                    }
                ],
                optionalServices: [this.BATTERY_SERVICE_UUID]
            });
            
            // Connect to GATT server
            const server = await device.gatt.connect();
            console.log(`Connected to ${device.name}`);
            
            // Get buzzer service
            const service = await server.getPrimaryService(this.BUZZER_SERVICE_UUID);
            
            // Get characteristics
            const buttonChar = await service.getCharacteristic(this.BUTTON_STATE_UUID);
            const ledChar = await service.getCharacteristic(this.LED_CONTROL_UUID);
            const idChar = await service.getCharacteristic(this.BUZZER_ID_UUID);
            
            // Read buzzer ID to verify which buzzer this is
            const idValue = await idChar.readValue();
            const buzzerId = idValue.getUint8(0);
            const buzzerColor = buzzerId === 1 ? 'green' : 'red';
            
            console.log(`Buzzer ID: ${buzzerId} (${buzzerColor})`);
            
            // Store device and characteristics
            const buzzerObj = {
                device,
                server,
                service,
                buttonChar,
                ledChar,
                idChar,
                buzzerId,
                color: buzzerColor
            };
            
            // Try to get battery service (optional)
            try {
                const batteryService = await server.getPrimaryService(this.BATTERY_SERVICE_UUID);
                const batteryChar = await batteryService.getCharacteristic(this.BATTERY_LEVEL_UUID);
                buzzerObj.batteryChar = batteryChar;
                
                // Read initial battery level
                const batteryValue = await batteryChar.readValue();
                const batteryLevel = batteryValue.getUint8(0);
                this.batteryLevels[buzzerColor] = batteryLevel;
                console.log(`${buzzerColor} battery: ${batteryLevel}%`);
                
                // Subscribe to battery notifications
                await batteryChar.startNotifications();
                batteryChar.addEventListener('characteristicvaluechanged', (event) => {
                    const level = event.target.value.getUint8(0);
                    this.batteryLevels[buzzerColor] = level;
                    console.log(`${buzzerColor} battery updated: ${level}%`);
                    this.notifyStatusChange();
                });
            } catch (err) {
                console.warn('Battery service not available:', err);
            }
            
            // Subscribe to button notifications
            await buttonChar.startNotifications();
            buttonChar.addEventListener('characteristicvaluechanged', (event) => {
                const pressed = event.target.value.getUint8(0) === 1;
                console.log(`${buzzerColor} button ${pressed ? 'pressed' : 'released'}`);
                if (pressed) {
                    this.handleButtonPress(buzzerColor);
                }
            });
            
            // Handle disconnect
            device.addEventListener('gattserverdisconnected', () => {
                console.log(`${buzzerColor} buzzer disconnected`);
                this.handleDisconnect(buzzerColor);
            });
            
            // Store buzzer object
            if (buzzerColor === 'green') {
                this.greenBuzzer = buzzerObj;
                this.greenDevice = device;
                this.connectionStatus.green = 'connected';
            } else {
                this.redBuzzer = buzzerObj;
                this.redDevice = device;
                this.connectionStatus.red = 'connected';
            }
            
            // Flash LED to confirm connection
            await this.flashLED(buzzerColor, buzzerColor === 'green' ? [0, 255, 0] : [255, 0, 0]);
            
            this.notifyStatusChange();
            
            return buzzerObj;
            
        } catch (error) {
            console.error(`Failed to connect ${color} buzzer:`, error);
            throw error;
        }
    }
    
    /**
     * Disconnect a buzzer
     * @param {string} color - 'green' or 'red'
     */
    async disconnectBuzzer(color) {
        const device = color === 'green' ? this.greenDevice : this.redDevice;
        
        if (device && device.gatt.connected) {
            await device.gatt.disconnect();
        }
        
        if (color === 'green') {
            this.greenBuzzer = null;
            this.greenDevice = null;
            this.connectionStatus.green = 'disconnected';
            this.batteryLevels.green = null;
        } else {
            this.redBuzzer = null;
            this.redDevice = null;
            this.connectionStatus.red = 'disconnected';
            this.batteryLevels.red = null;
        }
        
        this.notifyStatusChange();
    }
    
    /**
     * Handle buzzer disconnection
     * @param {string} color - 'green' or 'red'
     */
    handleDisconnect(color) {
        if (color === 'green') {
            this.greenBuzzer = null;
            this.greenDevice = null;
            this.connectionStatus.green = 'disconnected';
            this.batteryLevels.green = null;
        } else {
            this.redBuzzer = null;
            this.redDevice = null;
            this.connectionStatus.red = 'disconnected';
            this.batteryLevels.red = null;
        }
        
        this.notifyStatusChange();
    }
    
    /**
     * Set LED color on a buzzer
     * @param {string} color - 'green' or 'red'
     * @param {Array} rgb - [r, g, b] values (0-255)
     */
    async setLED(color, rgb) {
        const buzzer = color === 'green' ? this.greenBuzzer : this.redBuzzer;
        
        if (!buzzer || !buzzer.ledChar) {
            console.warn(`Cannot set LED: ${color} buzzer not connected`);
            return;
        }
        
        try {
            const data = new Uint8Array(rgb);
            await buzzer.ledChar.writeValue(data);
        } catch (error) {
            console.error(`Failed to set LED on ${color} buzzer:`, error);
        }
    }
    
    /**
     * Flash LED briefly
     * @param {string} color - 'green' or 'red'
     * @param {Array} rgb - [r, g, b] values (0-255)
     * @param {number} duration - Flash duration in ms
     */
    async flashLED(color, rgb, duration = 200) {
        await this.setLED(color, rgb);
        setTimeout(async () => {
            await this.setLED(color, [0, 0, 0]);
        }, duration);
    }
    
    /**
     * Turn off LED
     * @param {string} color - 'green' or 'red'
     */
    async turnOffLED(color) {
        await this.setLED(color, [0, 0, 0]);
    }
    
    /**
     * Handle button press
     * @param {string} color - 'green' or 'red'
     */
    handleButtonPress(color) {
        // Notify all registered callbacks
        this.buttonPressCallbacks.forEach(callback => {
            try {
                callback(color);
            } catch (error) {
                console.error('Error in button press callback:', error);
            }
        });
    }
    
    /**
     * Register a callback for button presses
     * @param {Function} callback - Function to call when button is pressed
     */
    onButtonPress(callback) {
        this.buttonPressCallbacks.push(callback);
    }
    
    /**
     * Remove a button press callback
     * @param {Function} callback - Callback to remove
     */
    offButtonPress(callback) {
        this.buttonPressCallbacks = this.buttonPressCallbacks.filter(cb => cb !== callback);
    }
    
    /**
     * Register a callback for status changes
     * @param {Function} callback - Function to call when status changes
     */
    onStatusChange(callback) {
        this.statusChangeCallbacks.push(callback);
    }
    
    /**
     * Remove a status change callback
     * @param {Function} callback - Callback to remove
     */
    offStatusChange(callback) {
        this.statusChangeCallbacks = this.statusChangeCallbacks.filter(cb => cb !== callback);
    }
    
    /**
     * Notify status change callbacks
     */
    notifyStatusChange() {
        const status = this.getStatus();
        this.statusChangeCallbacks.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.error('Error in status change callback:', error);
            }
        });
    }
    
    /**
     * Get current connection status
     */
    getStatus() {
        return {
            supported: this.isSupported,
            green: {
                connected: this.connectionStatus.green === 'connected',
                battery: this.batteryLevels.green
            },
            red: {
                connected: this.connectionStatus.red === 'connected',
                battery: this.batteryLevels.red
            }
        };
    }
    
    /**
     * Check if both buzzers are connected
     */
    areBothConnected() {
        return this.connectionStatus.green === 'connected' && 
               this.connectionStatus.red === 'connected';
    }
    
    /**
     * Disconnect all buzzers
     */
    async disconnectAll() {
        const promises = [];
        
        if (this.connectionStatus.green === 'connected') {
            promises.push(this.disconnectBuzzer('green'));
        }
        
        if (this.connectionStatus.red === 'connected') {
            promises.push(this.disconnectBuzzer('red'));
        }
        
        await Promise.all(promises);
    }
    
    /**
     * Test buzzers with LED pattern
     */
    async testBuzzers() {
        const pattern = [
            { color: 'green', rgb: [0, 255, 0], duration: 300 },
            { color: 'red', rgb: [255, 0, 0], duration: 300 },
            { color: 'green', rgb: [0, 255, 0], duration: 300 },
            { color: 'red', rgb: [255, 0, 0], duration: 300 }
        ];
        
        for (const step of pattern) {
            await this.flashLED(step.color, step.rgb, step.duration);
            await new Promise(resolve => setTimeout(resolve, step.duration + 100));
        }
    }
}

// Export as global
window.BuzzerManager = BuzzerManager;
