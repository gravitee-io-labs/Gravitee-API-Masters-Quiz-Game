/**
 * Main firmware file for Quiz Buzzer
 * NRF52840 BLE Controller
 */

#include <zephyr/kernel.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/conn.h>
#include <zephyr/bluetooth/gatt.h>
#include <zephyr/bluetooth/uuid.h>
#include <zephyr/device.h>
#include <zephyr/drivers/gpio.h>

#include "config.h"
#include "buzzer_service.h"
#include "button.h"
#include "led.h"
#include "battery.h"

#define LED_FLASH_DURATION_MS    50   /* Short flash duration */
#define LED_BLINK_DISCONNECTED_MS 1000  /* 1 second when disconnected */
#define LED_BLINK_CONNECTED_MS   3000  /* 3 seconds when connected */

/* Connection handle */
static struct bt_conn *current_conn = NULL;

/* Advertising data */
static const struct bt_data ad[] = {
    BT_DATA_BYTES(BT_DATA_FLAGS, (BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR)),
    BT_DATA_BYTES(BT_DATA_UUID128_ALL, BT_UUID_BUZZER_SERVICE_VAL),
};

/* Status LED (onboard blue LED on P0.15) */
static const struct gpio_dt_spec status_led = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);

/* Buzzer LED (external white LED on P0.06) */
static const struct gpio_dt_spec buzzer_led = GPIO_DT_SPEC_GET(DT_ALIAS(led1), gpios);

/* Timer for LED blinking */
static struct k_timer led_timer;
static bool connection_status = false;

/* Work queue for LED flash (can't use k_sleep in timer handler) */
static struct k_work led_flash_work;

/* Work queue for advertising restart (can't do BT ops in disconnect callback) */
static struct k_work adv_restart_work;

/* Forward declarations */
static void update_connection_status(bool connected);
static int start_advertising(void);

/* Connection callbacks */
static void connected(struct bt_conn *conn, uint8_t err)
{
    if (err) {
        printk("Connection failed (err %u)\n", err);
        return;
    }

    printk("Connected\n");
    current_conn = bt_conn_ref(conn);
    update_connection_status(true);
    
    /* Flash buzzer LED to indicate connection */
    gpio_pin_set_dt(&buzzer_led, 1);
    k_sleep(K_MSEC(200));
    gpio_pin_set_dt(&buzzer_led, 0);
}

static void disconnected(struct bt_conn *conn, uint8_t reason)
{
    printk("Disconnected (reason %u)\n", reason);

    if (current_conn) {
        bt_conn_unref(current_conn);
        current_conn = NULL;
    }

    update_connection_status(false);

    /* Schedule advertising restart - must be done outside BT callback context */
    k_work_submit(&adv_restart_work);
}

BT_CONN_CB_DEFINE(conn_callbacks) = {
    .connected = connected,
    .disconnected = disconnected,
};

/* Work handler for advertising restart */
static void adv_restart_work_handler(struct k_work *work)
{
    ARG_UNUSED(work);
    int err;

    printk("Restarting advertising from work queue...\n");
    
    /* Flash buzzer LED to indicate disconnection */
    gpio_pin_set_dt(&buzzer_led, 1);
    k_sleep(K_MSEC(200));
    gpio_pin_set_dt(&buzzer_led, 0);

    /* Small delay to let BT stack settle */
    k_sleep(K_MSEC(100));
    
    err = start_advertising();
    if (err && err != -EALREADY) {
        printk("Failed to restart advertising (err %d)\n", err);
    } else {
        printk("Advertising restarted successfully\n");
    }
}

/* Start advertising */
static int start_advertising(void)
{
    struct bt_le_adv_param adv_param = {
        .id = BT_ID_DEFAULT,
        .options = BT_LE_ADV_OPT_CONN | BT_LE_ADV_OPT_USE_NAME,
        .interval_min = ADV_INTERVAL_MIN,
        .interval_max = ADV_INTERVAL_MAX,
    };

    int err = bt_le_adv_start(&adv_param, ad, ARRAY_SIZE(ad), NULL, 0);
    if (err == -EALREADY) {
        printk("Advertising already active\n");
        return 0;
    }
    if (err) {
        printk("Advertising failed to start (err %d)\n", err);
        return err;
    }

    printk("Advertising started\n");
    return 0;
}

/* Button press callback */
static void button_pressed_callback(bool pressed)
{
    printk("Button %s\n", pressed ? "PRESSED" : "RELEASED");
    
    /* Flash buzzer LED on any button event for visual feedback */
    if (pressed) {
        gpio_pin_set_dt(&buzzer_led, 1);
        printk("Buzzer LED ON\n");
    } else {
        gpio_pin_set_dt(&buzzer_led, 0);
        printk("Buzzer LED OFF\n");
    }
    
    if (current_conn) {
        printk("Sending button state to BLE client\n");
        buzzer_service_send_button_state(pressed);
    } else {
        printk("No BLE connection - button event not sent\n");
    }
}

/* LED flash work handler - runs in system workqueue context where k_sleep is allowed */
static void led_flash_work_handler(struct k_work *work)
{
    ARG_UNUSED(work);
    
    /* Short flash */
    gpio_pin_set_dt(&status_led, 1);
    k_sleep(K_MSEC(LED_FLASH_DURATION_MS));
    gpio_pin_set_dt(&status_led, 0);
}

/* LED timer handler - just schedules work, can't sleep in timer context */
static void led_timer_handler(struct k_timer *timer)
{
    ARG_UNUSED(timer);
    
    /* Schedule the flash work - this runs in thread context where k_sleep is OK */
    k_work_submit(&led_flash_work);
}

static void update_connection_status(bool connected)
{
    connection_status = connected;
    
    /* Stop current timer and restart with appropriate interval */
    k_timer_stop(&led_timer);
    
    if (connected) {
        /* Slow blink when connected (every 3 seconds) */
        k_timer_start(&led_timer, K_MSEC(LED_BLINK_CONNECTED_MS), K_MSEC(LED_BLINK_CONNECTED_MS));
        printk("Status LED: connected mode (3s interval)\n");
    } else {
        /* Fast blink when disconnected (every 1 second) */
        k_timer_start(&led_timer, K_MSEC(LED_BLINK_DISCONNECTED_MS), K_MSEC(LED_BLINK_DISCONNECTED_MS));
        printk("Status LED: disconnected mode (1s interval)\n");
    }
}

/* Set Bluetooth device name based on buzzer ID - must be called AFTER bt_enable() */
static void set_bt_device_name(void)
{
    int err = bt_set_name(DEVICE_NAME);
    if (err) {
        printk("Failed to set Bluetooth device name: %d\n", err);
    } else {
        printk("Bluetooth device name set to: %s\n", DEVICE_NAME);
        const char *current_name = bt_get_name();
        printk("Current Bluetooth device name: %s\n", current_name);
    }
}

/* Main function */
int main(void)
{
    int err;

    printk("Starting Quiz Buzzer Firmware (Buzzer ID: %d)\n", BUZZER_ID);

    /* Initialize status LED first (onboard blue LED) */
    if (!device_is_ready(status_led.port)) {
        printk("Status LED device not ready\n");
        return -1;
    }
    gpio_pin_configure_dt(&status_led, GPIO_OUTPUT_ACTIVE);
    printk("Status LED initialized on P0.15\n");

    /* Initialize buzzer LED (external white LED) */
    if (!device_is_ready(buzzer_led.port)) {
        printk("Buzzer LED device not ready\n");
        return -1;
    }
    gpio_pin_configure_dt(&buzzer_led, GPIO_OUTPUT_INACTIVE);
    printk("Buzzer LED initialized on P0.06\n");

    /* Initialize LED module (for led_on/led_off functions) */
    err = led_init();
    if (err) {
        printk("LED init failed (err %d)\n", err);
        return err;
    }

    /* Test buzzer LED at startup */
    printk("Testing Buzzer LED...\n");
    gpio_pin_set_dt(&buzzer_led, 1);
    k_sleep(K_MSEC(500));
    gpio_pin_set_dt(&buzzer_led, 0);
    printk("Buzzer LED test complete\n");

    /* Startup LED sequence - blink status LED 5 times to confirm flash worked */
    printk("Startup LED sequence...\n");
    for (int i = 0; i < 5; i++) {
        gpio_pin_set_dt(&status_led, 1);
        k_sleep(K_MSEC(100));
        gpio_pin_set_dt(&status_led, 0);
        k_sleep(K_MSEC(100));
    }
    printk("Startup LED sequence complete\n");

    /* Initialize button */
    err = button_init(button_pressed_callback);
    if (err) {
        printk("Button init failed (err %d) - continuing without button\n", err);
    }

    /* Initialize battery monitoring */
    err = battery_init();
    if (err) {
        printk("Battery init failed (err %d) - continuing without battery monitoring\n", err);
    }

    /* Enable Bluetooth */
    err = bt_enable(NULL);
    if (err) {
        printk("Bluetooth init failed (err %d)\n", err);
        return err;
    }

    printk("Bluetooth initialized\n");

    /* Set Bluetooth device name - MUST be called AFTER bt_enable() */
    set_bt_device_name();

    /* Initialize buzzer service */
    err = buzzer_service_init();
    if (err) {
        printk("Buzzer service init failed (err %d)\n", err);
        return err;
    }

    /* Start advertising */
    err = start_advertising();
    if (err) {
        return err;
    }

    /* Initialize work queues and LED timer */
    k_work_init(&led_flash_work, led_flash_work_handler);
    k_work_init(&adv_restart_work, adv_restart_work_handler);
    k_timer_init(&led_timer, led_timer_handler, NULL);
    k_timer_start(&led_timer, K_MSEC(LED_BLINK_DISCONNECTED_MS), K_MSEC(LED_BLINK_DISCONNECTED_MS));

    printk("Quiz Buzzer ready - advertising as: %s\n", bt_get_name());

    /* Main loop */
    while (1) {
        k_sleep(K_SECONDS(1));
        
        /* Update battery level periodically */
        if (current_conn) {
            battery_update();
        }
    }

    return 0;
}
