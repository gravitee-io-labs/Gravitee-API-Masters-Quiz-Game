/**
 * LED control module
 */

#ifndef LED_H
#define LED_H

#include <zephyr/types.h>

/**
 * Initialize LED GPIO pins
 * 
 * @return 0 on success, negative errno on failure
 */
int led_init(void);

/**
 * Turn on LED
 */
void led_on(void);

/**
 * Turn off LED
 */
void led_off(void);

#endif /* LED_H */
