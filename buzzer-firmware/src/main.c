/**
 * Main firmware file for Quiz Buzzer
 * NRF52840 BLE Controller
 */

#include <zephyr/kernel.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/conn.h>
#include <zephyr/bluetooth/gatt.h>
#include <zephyr/bluetooth/uuid.h>

#include "config.h"
#include "buzzer_service.h"
#include "button.h"
#include "led.h"
#include "battery.h"

/* Connection handle */
static struct bt_conn *current_conn = NULL;

/* Advertising data */
static const struct bt_data ad[] = {
    BT_DATA_BYTES(BT_DATA_FLAGS, (BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR)),
    BT_DATA_BYTES(BT_DATA_UUID128_ALL, BT_UUID_BUZZER_SERVICE_VAL),
};

/* Scan response data with device name */
static const struct bt_data sd[] = {
#if BUZZER_ID == 1
    BT_DATA(BT_DATA_NAME_COMPLETE, DEVICE_NAME_GREEN, sizeof(DEVICE_NAME_GREEN) - 1),
#else
    BT_DATA(BT_DATA_NAME_COMPLETE, DEVICE_NAME_RED, sizeof(DEVICE_NAME_RED) - 1),
#endif
};

/* Connection callbacks */
static void connected(struct bt_conn *conn, uint8_t err)
{
    if (err) {
        printk("Connection failed (err %u)\n", err);
        return;
    }

    printk("Connected\n");
    current_conn = bt_conn_ref(conn);
    
    /* Flash LED to indicate connection */
    led_set_rgb(0, 255, 0);  // Green flash
    k_sleep(K_MSEC(200));
    led_set_rgb(0, 0, 0);
}

static void disconnected(struct bt_conn *conn, uint8_t reason)
{
    printk("Disconnected (reason %u)\n", reason);

    if (current_conn) {
        bt_conn_unref(current_conn);
        current_conn = NULL;
    }

    /* Flash LED to indicate disconnection */
    led_set_rgb(255, 0, 0);  // Red flash
    k_sleep(K_MSEC(200));
    led_set_rgb(0, 0, 0);
}

BT_CONN_CB_DEFINE(conn_callbacks) = {
    .connected = connected,
    .disconnected = disconnected,
};

/* Start advertising */
static int start_advertising(void)
{
    struct bt_le_adv_param adv_param = {
        .id = BT_ID_DEFAULT,
        .options = BT_LE_ADV_OPT_CONN | BT_LE_ADV_OPT_USE_NAME,
        .interval_min = ADV_INTERVAL_MIN,
        .interval_max = ADV_INTERVAL_MAX,
    };

    int err = bt_le_adv_start(&adv_param, ad, ARRAY_SIZE(ad), sd, ARRAY_SIZE(sd));
    if (err) {
        printk("Advertising failed to start (err %d)\n", err);
        return err;
    }

    printk("Advertising successfully started\n");
    return 0;
}

/* Button press callback */
static void button_pressed_callback(bool pressed)
{
    if (current_conn) {
        buzzer_service_send_button_state(pressed);
        
        if (pressed) {
            /* Brief LED feedback on button press */
#if BUZZER_ID == 1
            led_set_rgb(0, 255, 0);  // Green buzzer - green flash
#else
            led_set_rgb(255, 0, 0);  // Red buzzer - red flash
#endif
            k_sleep(K_MSEC(50));
            led_set_rgb(0, 0, 0);
        }
    }
}

/* Main function */
int main(void)
{
    int err;

    printk("Starting Quiz Buzzer Firmware (Buzzer ID: %d)\n", BUZZER_ID);

    /* Initialize LED */
    err = led_init();
    if (err) {
        printk("LED init failed (err %d)\n", err);
        return err;
    }

    /* Startup LED sequence - blink 5 times to confirm flash worked */
    for (int i = 0; i < 5; i++) {
#if BUZZER_ID == 1
        led_set_rgb(0, 255, 0);  // Green
#else
        led_set_rgb(255, 0, 0);  // Red
#endif
        k_sleep(K_MSEC(200));
        led_set_rgb(0, 0, 0);
        k_sleep(K_MSEC(200));
    }

    /* Initialize button */
    err = button_init(button_pressed_callback);
    if (err) {
        printk("Button init failed (err %d)\n", err);
        return err;
    }

    /* Initialize battery monitoring */
    err = battery_init();
    if (err) {
        printk("Battery init failed (err %d)\n", err);
        return err;
    }

    /* Enable Bluetooth */
    err = bt_enable(NULL);
    if (err) {
        printk("Bluetooth init failed (err %d)\n", err);
        return err;
    }

    printk("Bluetooth initialized\n");

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
