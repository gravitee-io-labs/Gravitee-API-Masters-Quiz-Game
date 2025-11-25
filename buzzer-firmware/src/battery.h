/**
 * Battery monitoring module for 18650 Li-ion battery
 * 
 * Measures battery voltage via ADC with voltage divider on P0.31 (AIN7)
 */

#ifndef BATTERY_H
#define BATTERY_H

#include <zephyr/types.h>

/**
 * Initialize battery monitoring
 * Sets up ADC for battery voltage measurement
 * 
 * @return 0 on success, negative errno on failure
 */
int battery_init(void);

/**
 * Update battery level
 * Reads ADC and updates BLE battery service
 * Rate-limited to save power (default: every 5 minutes)
 */
void battery_update(void);

/**
 * Get current battery level percentage
 * 
 * @return Battery level (0-100%)
 */
uint8_t battery_get_level(void);

/**
 * Get raw battery voltage in millivolts
 * Useful for debugging and calibration
 * 
 * @return Battery voltage in mV, or -1 if ADC not available
 */
int32_t battery_get_voltage_mv(void);

#endif /* BATTERY_H */
