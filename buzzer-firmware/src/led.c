/**
 * LED control implementation
 * Simple on/off control using a single GPIO pin (P0.13)
 */

#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/drivers/gpio.h>

#include "config.h"
#include "led.h"

/* Use direct GPIO reference */
#define LED_GPIO_PORT DT_NODELABEL(gpio0)
static const struct device *gpio_dev = NULL;

/* Auto-off timer for power saving */
static struct k_timer led_auto_off_timer;
/* Commented out unused variable to suppress warning */
// static bool auto_off_enabled = false;

/* Timer callback to turn off LED */
static void led_auto_off_handler(struct k_timer *timer)
{
    ARG_UNUSED(timer);
    led_off();
}

int led_init(void)
{
    int ret;

    /* Get GPIO device */
    gpio_dev = DEVICE_DT_GET(LED_GPIO_PORT);
    if (!device_is_ready(gpio_dev)) {
        printk("GPIO device not ready\n");
        return -ENODEV;
    }

    /* Configure LED pin as output, initially off */
    ret = gpio_pin_configure(gpio_dev, BUZZER_LED_PIN, GPIO_OUTPUT_INACTIVE);
    if (ret < 0) {
        printk("Failed to configure LED pin %d\n", BUZZER_LED_PIN);
        return ret;
    }

    /* Initialize auto-off timer */
    k_timer_init(&led_auto_off_timer, led_auto_off_handler, NULL);

    printk("LED initialized on pin P0.%d\n", BUZZER_LED_PIN);
    return 0;
}

void led_on(void)
{
    if (gpio_dev) {
        gpio_pin_set(gpio_dev, BUZZER_LED_PIN, 1);
    }
}

void led_off(void)
{
    if (gpio_dev) {
        gpio_pin_set(gpio_dev, BUZZER_LED_PIN, 0);
    }
}
