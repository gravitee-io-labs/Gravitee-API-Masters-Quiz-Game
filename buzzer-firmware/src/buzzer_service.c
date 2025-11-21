/**
 * BLE GATT Service Implementation for Quiz Buzzer
 */

#include <zephyr/kernel.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/conn.h>
#include <zephyr/bluetooth/gatt.h>
#include <zephyr/bluetooth/uuid.h>

#include "config.h"
#include "buzzer_service.h"
#include "led.h"

/* Service UUID */
static struct bt_uuid_128 buzzer_service_uuid = BT_UUID_INIT_128(
    BT_UUID_BUZZER_SERVICE_VAL);

/* Characteristic UUIDs */
static struct bt_uuid_128 button_state_uuid = BT_UUID_INIT_128(
    BT_UUID_BUTTON_STATE_VAL);

static struct bt_uuid_128 led_control_uuid = BT_UUID_INIT_128(
    BT_UUID_LED_CONTROL_VAL);

static struct bt_uuid_128 buzzer_id_uuid = BT_UUID_INIT_128(
    BT_UUID_BUZZER_ID_VAL);

/* Characteristic values */
static uint8_t button_state = 0;
static uint8_t led_rgb[3] = {0, 0, 0};
static uint8_t buzzer_id = BUZZER_ID;

/* CCC (Client Characteristic Configuration) for notifications */
static uint8_t button_state_notify_enabled = 0;

/* Button state CCC changed callback */
static void button_state_ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
    button_state_notify_enabled = (value == BT_GATT_CCC_NOTIFY);
    printk("Button state notifications %s\n", 
           button_state_notify_enabled ? "enabled" : "disabled");
}

/* Button state read callback */
static ssize_t read_button_state(struct bt_conn *conn,
                                  const struct bt_gatt_attr *attr,
                                  void *buf, uint16_t len, uint16_t offset)
{
    return bt_gatt_attr_read(conn, attr, buf, len, offset, 
                            &button_state, sizeof(button_state));
}

/* LED control write callback */
static ssize_t write_led_control(struct bt_conn *conn,
                                  const struct bt_gatt_attr *attr,
                                  const void *buf, uint16_t len,
                                  uint16_t offset, uint8_t flags)
{
    if (offset != 0) {
        return BT_GATT_ERR(BT_ATT_ERR_INVALID_OFFSET);
    }

    if (len != 3) {
        return BT_GATT_ERR(BT_ATT_ERR_INVALID_ATTRIBUTE_LEN);
    }

    memcpy(led_rgb, buf, 3);
    
    /* Update LED */
    led_set_rgb(led_rgb[0], led_rgb[1], led_rgb[2]);
    
    printk("LED updated: R=%d G=%d B=%d\n", led_rgb[0], led_rgb[1], led_rgb[2]);

    return len;
}

/* LED control read callback */
static ssize_t read_led_control(struct bt_conn *conn,
                                 const struct bt_gatt_attr *attr,
                                 void *buf, uint16_t len, uint16_t offset)
{
    return bt_gatt_attr_read(conn, attr, buf, len, offset, 
                            led_rgb, sizeof(led_rgb));
}

/* Buzzer ID read callback */
static ssize_t read_buzzer_id(struct bt_conn *conn,
                               const struct bt_gatt_attr *attr,
                               void *buf, uint16_t len, uint16_t offset)
{
    return bt_gatt_attr_read(conn, attr, buf, len, offset, 
                            &buzzer_id, sizeof(buzzer_id));
}

/* GATT Service Definition */
BT_GATT_SERVICE_DEFINE(buzzer_service,
    BT_GATT_PRIMARY_SERVICE(&buzzer_service_uuid),
    
    /* Button State Characteristic */
    BT_GATT_CHARACTERISTIC(&button_state_uuid.uuid,
                          BT_GATT_CHRC_READ | BT_GATT_CHRC_NOTIFY,
                          BT_GATT_PERM_READ,
                          read_button_state, NULL, NULL),
    BT_GATT_CCC(button_state_ccc_changed, BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),
    
    /* LED Control Characteristic */
    BT_GATT_CHARACTERISTIC(&led_control_uuid.uuid,
                          BT_GATT_CHRC_READ | BT_GATT_CHRC_WRITE,
                          BT_GATT_PERM_READ | BT_GATT_PERM_WRITE,
                          read_led_control, write_led_control, NULL),
    
    /* Buzzer ID Characteristic */
    BT_GATT_CHARACTERISTIC(&buzzer_id_uuid.uuid,
                          BT_GATT_CHRC_READ,
                          BT_GATT_PERM_READ,
                          read_buzzer_id, NULL, NULL),
);

int buzzer_service_init(void)
{
    printk("Buzzer service initialized\n");
    return 0;
}

int buzzer_service_send_button_state(bool pressed)
{
    button_state = pressed ? 1 : 0;
    
    if (!button_state_notify_enabled) {
        return -EACCES;
    }

    int err = bt_gatt_notify(NULL, &buzzer_service.attrs[1], 
                            &button_state, sizeof(button_state));
    if (err) {
        printk("Failed to send button notification (err %d)\n", err);
    }
    
    return err;
}
