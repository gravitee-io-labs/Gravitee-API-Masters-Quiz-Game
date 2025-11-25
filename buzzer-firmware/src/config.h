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
#define DEVICE_NAME_GREEN "Gravitee Quiz Buzzer - Green"
#define DEVICE_NAME_RED   "Gravitee Quiz Buzzer - Red"

// Ensure the device name matches the buzzer ID
#if BUZZER_ID == 1
#define DEVICE_NAME DEVICE_NAME_GREEN
#elif BUZZER_ID == 2
#define DEVICE_NAME DEVICE_NAME_RED
#else
#error "Invalid BUZZER_ID. Must be 1 (Green) or 2 (Red)."
#endif

/* ==================== GPIO PIN CONFIGURATION ==================== */
/* Adjust these based on your actual hardware connections */

#define BUTTON_PIN          11  // P0.11 - Button input (active low)
#define BUTTON_DEBOUNCE_MS  50  // Debounce time in milliseconds

/* Status LED: Onboard blue LED on P0.15 (active low on Nice!Nano/promicro) */
#define STATUS_LED_PIN      15  // P0.15 - Onboard blue LED for connection status

/* Buzzer LED: External white LED for illuminating the buzzer button */
/* Connect: P0.06 (pin 1) -> 220 ohm resistor -> LED anode, LED cathode -> GND */
#define BUZZER_LED_PIN      6   // P0.06 - External white LED

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

/* BLE advertising interval (in 0.625ms units)
 * Slower advertising = lower power consumption
 * Fast advertising (20-40ms): ~1-2mA, good for quick discovery
 * Slow advertising (100-200ms): ~0.3-0.5mA, better for battery life
 * We use moderate interval for reasonable discovery time
 */
#define ADV_INTERVAL_MIN    0x0050  /* 50ms (80 * 0.625ms) */
#define ADV_INTERVAL_MAX    0x00A0  /* 100ms (160 * 0.625ms) */

/* Connection interval for low latency (in 1.25ms units) */
#define CONN_INTERVAL_MIN   8   // 10ms
#define CONN_INTERVAL_MAX   12  // 15ms

/* ==================== POWER MANAGEMENT ==================== */

/* LED timeout - automatically turn off LED after this time (ms) */
#define LED_AUTO_OFF_TIMEOUT_MS  5000  // 5 seconds

/* Button press notification timeout (ms) */
#define BUTTON_NOTIFICATION_TIMEOUT_MS  100  // 100ms

/* ==================== BATTERY MONITORING ==================== */
/* 18650 Li-ion battery with voltage divider (1M + 1M)
 * Battery voltage range: 3.0V (empty) to 4.2V (full)
 * After voltage divider: 1.5V to 2.1V at ADC input
 * ADC channel: AIN7 (P0.31)
 * 
 * Wiring: VBAT+ -> 1M resistor -> P0.31 -> 1M resistor -> GND
 */
#define BATTERY_ADC_CHANNEL     7       /* AIN7 = P0.31 */
#define BATTERY_DIVIDER_RATIO   2       /* Voltage divider 1:1 = ratio of 2 */

/* 18650 Li-ion voltage thresholds (in millivolts at battery) */
#define BATTERY_FULL_MV         4200    /* 4.2V = 100% (fully charged) */
#define BATTERY_NOMINAL_MV      3700    /* 3.7V = ~50% (nominal voltage) */
#define BATTERY_LOW_MV          3400    /* 3.4V = ~20% (low battery warning) */
#define BATTERY_EMPTY_MV        3000    /* 3.0V = 0% (cutoff to protect battery) */

/* Battery update interval - less frequent saves power */
#define BATTERY_UPDATE_INTERVAL_MS  300000  /* 5 minutes (was 1 minute) */

#endif /* CONFIG_H */
