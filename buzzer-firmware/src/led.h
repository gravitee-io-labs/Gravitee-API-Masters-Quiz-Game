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
 * Set LED color using RGB values
 * 
 * @param red Red component (0-255)
 * @param green Green component (0-255)
 * @param blue Blue component (0-255)
 */
void led_set_rgb(uint8_t red, uint8_t green, uint8_t blue);

/**
 * Turn off LED
 */
void led_off(void);

#endif /* LED_H */
