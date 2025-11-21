/**
 * BLE GATT Service for Quiz Buzzer
 */

#ifndef BUZZER_SERVICE_H
#define BUZZER_SERVICE_H

#include <zephyr/types.h>

/**
 * Initialize the buzzer GATT service
 * 
 * @return 0 on success, negative errno on failure
 */
int buzzer_service_init(void);

/**
 * Send button state notification to connected client
 * 
 * @param pressed true if button is pressed, false otherwise
 * @return 0 on success, negative errno on failure
 */
int buzzer_service_send_button_state(bool pressed);

#endif /* BUZZER_SERVICE_H */
