/**
 * Button handling implementation with debouncing
 */

#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/drivers/gpio.h>

#include "config.h"
#include "button.h"

#define BUTTON_NODE DT_ALIAS(sw0)

#if !DT_NODE_EXISTS(BUTTON_NODE)
/* Fallback to manual GPIO configuration if device tree alias doesn't exist */
#define BUTTON_GPIO_LABEL "GPIO_0"
#define BUTTON_GPIO_PIN BUTTON_PIN
#define BUTTON_GPIO_FLAGS (GPIO_INPUT | GPIO_PULL_UP)
#else
static const struct gpio_dt_spec button = GPIO_DT_SPEC_GET(BUTTON_NODE, gpios);
#endif

static struct gpio_callback button_cb_data;
static button_callback_t user_callback = NULL;

/* Debounce timer */
static struct k_timer debounce_timer;
static bool last_button_state = false;
static bool debounce_in_progress = false;

/* Debounce timer expiry callback */
static void debounce_timer_handler(struct k_timer *timer)
{
    ARG_UNUSED(timer);
    
    debounce_in_progress = false;
    
    /* Read actual button state after debounce period */
#if DT_NODE_EXISTS(BUTTON_NODE)
    bool current_state = !gpio_pin_get_dt(&button);  // Active low
#else
    const struct device *gpio_dev = device_get_binding(BUTTON_GPIO_LABEL);
    bool current_state = !gpio_pin_get(gpio_dev, BUTTON_GPIO_PIN);
#endif
    
    /* Only trigger callback if state actually changed */
    if (current_state != last_button_state) {
        last_button_state = current_state;
        
        if (user_callback) {
            user_callback(current_state);
        }
    }
}

/* GPIO interrupt handler */
static void button_pressed_handler(const struct device *dev, 
                                   struct gpio_callback *cb, 
                                   uint32_t pins)
{
    ARG_UNUSED(dev);
    ARG_UNUSED(cb);
    ARG_UNUSED(pins);
    
    /* Start debounce timer if not already in progress */
    if (!debounce_in_progress) {
        debounce_in_progress = true;
        k_timer_start(&debounce_timer, K_MSEC(BUTTON_DEBOUNCE_MS), K_NO_WAIT);
    }
}

int button_init(button_callback_t callback)
{
    int ret;
    
    if (!callback) {
        return -EINVAL;
    }
    
    user_callback = callback;

#if DT_NODE_EXISTS(BUTTON_NODE)
    /* Use device tree configuration */
    if (!device_is_ready(button.port)) {
        printk("Button device not ready\n");
        return -ENODEV;
    }

    ret = gpio_pin_configure_dt(&button, GPIO_INPUT);
    if (ret < 0) {
        printk("Failed to configure button pin\n");
        return ret;
    }

    ret = gpio_pin_interrupt_configure_dt(&button, GPIO_INT_EDGE_BOTH);
    if (ret < 0) {
        printk("Failed to configure button interrupt\n");
        return ret;
    }

    gpio_init_callback(&button_cb_data, button_pressed_handler, BIT(button.pin));
    gpio_add_callback(button.port, &button_cb_data);
#else
    /* Manual GPIO configuration */
    const struct device *gpio_dev = device_get_binding(BUTTON_GPIO_LABEL);
    if (!gpio_dev) {
        printk("GPIO device not found\n");
        return -ENODEV;
    }

    ret = gpio_pin_configure(gpio_dev, BUTTON_GPIO_PIN, BUTTON_GPIO_FLAGS);
    if (ret < 0) {
        printk("Failed to configure button pin\n");
        return ret;
    }

    ret = gpio_pin_interrupt_configure(gpio_dev, BUTTON_GPIO_PIN, GPIO_INT_EDGE_BOTH);
    if (ret < 0) {
        printk("Failed to configure button interrupt\n");
        return ret;
    }

    gpio_init_callback(&button_cb_data, button_pressed_handler, BIT(BUTTON_GPIO_PIN));
    gpio_add_callback(gpio_dev, &button_cb_data);
#endif

    /* Initialize debounce timer */
    k_timer_init(&debounce_timer, debounce_timer_handler, NULL);

#if DT_NODE_EXISTS(BUTTON_NODE)
    printk("Button initialized on pin %d\n", button.pin);
#else
    printk("Button initialized on pin %d\n", BUTTON_GPIO_PIN);
#endif
    
    return 0;
}
