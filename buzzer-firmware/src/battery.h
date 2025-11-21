/**
 * Battery monitoring module
 */

#ifndef BATTERY_H
#define BATTERY_H

#include <zephyr/types.h>

/**
 * Initialize battery monitoring
 * 
 * @return 0 on success, negative errno on failure
 */
int battery_init(void);

/**
 * Update battery level
 * Reads ADC and updates BLE battery service
 */
void battery_update(void);

/**
 * Get current battery level percentage
 * 
 * @return Battery level (0-100%)
 */
uint8_t battery_get_level(void);

#endif /* BATTERY_H */
