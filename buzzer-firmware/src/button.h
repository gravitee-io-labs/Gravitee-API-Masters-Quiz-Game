/**
 * Button handling module
 */

#ifndef BUTTON_H
#define BUTTON_H

#include <zephyr/types.h>

/**
 * Button press callback function type
 * 
 * @param pressed true when button is pressed, false when released
 */
typedef void (*button_callback_t)(bool pressed);

/**
 * Initialize button GPIO and configure interrupt
 * 
 * @param callback Function to call when button state changes
 * @return 0 on success, negative errno on failure
 */
int button_init(button_callback_t callback);

#endif /* BUTTON_H */
