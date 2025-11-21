/**
 * Configuration file for Quiz Buzzer Firmware
 * 
 * Modify these settings based on your hardware setup and requirements
 */

#ifndef CONFIG_H
#define CONFIG_H

/* ==================== BUZZER IDENTIFICATION ==================== */
/**
 * Set buzzer ID: 1 for Green, 2 for Red
 * IMPORTANT: Flash different IDs to each buzzer
 */
#define BUZZER_ID 1  // Change to 2 for Red buzzer

/* Device name will be "Gravitee-Buzzer-Green" or "Gravitee-Buzzer-Red" */
#define DEVICE_NAME_GREEN "Gravitee-Buzzer-Green"
#define DEVICE_NAME_RED   "Gravitee-Buzzer-Red"

/* ==================== GPIO PIN CONFIGURATION ==================== */
/* Adjust these based on your actual hardware connections */

#define BUTTON_PIN          11  // P0.11 - Button input (active low)
#define BUTTON_DEBOUNCE_MS  50  // Debounce time in milliseconds

#define LED_RED_PIN         13  // P0.13 - Red LED
#define LED_GREEN_PIN       14  // P0.14 - Green LED
#define LED_BLUE_PIN        15  // P0.15 - Blue LED

/* ==================== BLE CONFIGURATION ==================== */

/* Custom Quiz Buzzer Service UUID: 6E400001-B5A3-F393-E0A9-E50E24DCCA9E */
#define BT_UUID_BUZZER_SERVICE_VAL \
    BT_UUID_128_ENCODE(0x6e400001, 0xb5a3, 0xf393, 0xe0a9, 0xe50e24dcca9e)

/* Button State Characteristic UUID: 6E400002-B5A3-F393-E0A9-E50E24DCCA9E */
#define BT_UUID_BUTTON_STATE_VAL \
    BT_UUID_128_ENCODE(0x6e400002, 0xb5a3, 0xf393, 0xe0a9, 0xe50e24dcca9e)

/* LED Control Characteristic UUID: 6E400003-B5A3-F393-E0A9-E50E24DCCA9E */
#define BT_UUID_LED_CONTROL_VAL \
    BT_UUID_128_ENCODE(0x6e400003, 0xb5a3, 0xf393, 0xe0a9, 0xe50e24dcca9e)

/* Buzzer ID Characteristic UUID: 6E400004-B5A3-F393-E0A9-E50E24DCCA9E */
#define BT_UUID_BUZZER_ID_VAL \
    BT_UUID_128_ENCODE(0x6e400004, 0xb5a3, 0xf393, 0xe0a9, 0xe50e24dcca9e)

/* BLE advertising interval (in 0.625ms units) */
#define ADV_INTERVAL_MIN    0x0020  // 20ms
#define ADV_INTERVAL_MAX    0x0040  // 40ms

/* Connection interval for low latency (in 1.25ms units) */
#define CONN_INTERVAL_MIN   8   // 10ms
#define CONN_INTERVAL_MAX   12  // 15ms

/* ==================== POWER MANAGEMENT ==================== */

/* LED timeout - automatically turn off LED after this time (ms) */
#define LED_AUTO_OFF_TIMEOUT_MS  5000  // 5 seconds

/* Battery level update interval (ms) */
#define BATTERY_UPDATE_INTERVAL_MS  60000  // 1 minute

/* Button press notification timeout (ms) */
#define BUTTON_NOTIFICATION_TIMEOUT_MS  100  // 100ms

/* ==================== BATTERY MONITORING ==================== */

/* ADC channel for battery voltage measurement */
#define BATTERY_ADC_CHANNEL  0

/* Battery voltage thresholds (in millivolts) */
#define BATTERY_FULL_MV     3000  // 3.0V (CR2032)
#define BATTERY_EMPTY_MV    2000  // 2.0V (cutoff)

#endif /* CONFIG_H */
