/**
 * Battery monitoring implementation for Nice!Nano / Pro Micro nRF52840
 * 
 * Uses the nRF52840's internal VDDHDIV5 channel which measures VDDH/5.
 * This is the correct approach for boards where the battery connects
 * directly to VDDH (like Nice!Nano V2).
 * 
 * Based on ZMK's battery_nrf_vddh driver:
 * https://github.com/zmkfirmware/zmk/blob/main/app/module/drivers/sensor/battery/battery_nrf_vddh.c
 */

#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/devicetree.h>
#include <zephyr/drivers/adc.h>
#include <zephyr/bluetooth/services/bas.h>

#include "config.h"
#include "battery.h"

/* VDDHDIV5: internal channel that measures VDDH divided by 5 */
#define VDDHDIV 5

/* ADC device */
#define ADC_NODE DT_NODELABEL(adc)
static const struct device *adc_dev = DEVICE_DT_GET(ADC_NODE);

/* ADC channel configuration for VDDHDIV5
 * Using 1/2 gain with internal 0.6V reference:
 * Full scale = 0.6V * 2 = 1.2V at ADC input
 * VDDHDIV5 input = VDDH / 5
 * So max VDDH we can measure = 1.2V * 5 = 6V (plenty for 4.2V Li-ion)
 */
static struct adc_channel_cfg adc_cfg = {
    .gain = ADC_GAIN_1_2,
    .reference = ADC_REF_INTERNAL,
    .acquisition_time = ADC_ACQ_TIME(ADC_ACQ_TIME_MICROSECONDS, 40),
    .channel_id = 0,  /* VDDHDIV5 uses channel 0 */
#if defined(CONFIG_ADC_NRFX_SAADC)
    .input_positive = SAADC_CH_PSELN_PSELN_VDDHDIV5,
#endif
};

/* ADC sample buffer and sequence */
static int16_t adc_raw;
static struct adc_sequence adc_seq = {
    .channels = BIT(0),
    .buffer = &adc_raw,
    .buffer_size = sizeof(adc_raw),
    .resolution = 12,
    .oversampling = 4,  /* 4x oversampling for better accuracy */
    .calibrate = true,  /* Calibrate on first read */
};

/* State */
static uint8_t battery_level = 100;
static int32_t battery_mv = 0;
static int64_t last_update_time = 0;
static bool adc_initialized = false;
static bool first_reading = true;

/**
 * Convert battery millivolts to percentage (0-100%)
 * Uses Li-ion discharge curve based on ZMK's implementation
 */
static uint8_t lithium_ion_mv_to_pct(int16_t bat_mv)
{
    /* Li-ion voltage thresholds */
    if (bat_mv >= 4200) {
        return 100;
    } else if (bat_mv <= 3450) {
        return 0;
    }

    /* Piece-wise linear approximation of Li-ion discharge curve */
    if (bat_mv >= 4100) {
        /* 4100-4200mV: 90-100% */
        return 90 + (bat_mv - 4100) / 10;
    } else if (bat_mv >= 4000) {
        /* 4000-4100mV: 70-90% */
        return 70 + (bat_mv - 4000) / 5;
    } else if (bat_mv >= 3850) {
        /* 3850-4000mV: 40-70% */
        return 40 + (bat_mv - 3850) * 30 / 150;
    } else if (bat_mv >= 3700) {
        /* 3700-3850mV: 20-40% */
        return 20 + (bat_mv - 3700) * 20 / 150;
    } else if (bat_mv >= 3550) {
        /* 3550-3700mV: 5-20% */
        return 5 + (bat_mv - 3550) * 15 / 150;
    } else {
        /* 3450-3550mV: 0-5% */
        return (bat_mv - 3450) * 5 / 100;
    }
}

int battery_init(void)
{
    int rc;
    
    if (!device_is_ready(adc_dev)) {
        printk("ADC device not ready, battery monitoring disabled\n");
        battery_level = 100;
        return 0;  /* Non-critical, continue without ADC */
    }

    /* Setup ADC channel for VDDHDIV5 */
    rc = adc_channel_setup(adc_dev, &adc_cfg);
    if (rc) {
        printk("ADC channel setup failed (err %d)\n", rc);
        battery_level = 100;
        return 0;  /* Non-critical */
    }

    adc_initialized = true;
    printk("Battery monitoring initialized (VDDHDIV5 internal channel)\n");
    printk("ADC: 1/2 gain, internal 0.6V ref, 12-bit, 4x oversampling\n");
    printk("VDDH range: 0-6V (divider=5), suitable for Li-ion 3.0-4.2V\n");
    
    /* Small delay for ADC to stabilize */
    k_sleep(K_MSEC(10));
    
    /* Force initial battery reading */
    last_update_time = 0;
    battery_update();
    
    printk("Initial battery: %dmV, %d%%\n", battery_mv, battery_level);
    
    return 0;
}

void battery_update(void)
{
    int rc;
    int64_t now = k_uptime_get();
    
    /* Skip if ADC not initialized */
    if (!adc_initialized) {
        return;
    }
    
    /* Rate limit updates (except for first reading) */
    if (!first_reading && 
        (now - last_update_time) < BATTERY_UPDATE_INTERVAL_MS) {
        return;
    }
    
    last_update_time = now;
    
    /* Perform ADC read */
    rc = adc_read(adc_dev, &adc_seq);
    
    /* Disable calibration after first read */
    adc_seq.calibrate = false;
    
    if (rc < 0) {
        printk("ADC read failed (err %d)\n", rc);
        return;
    }

    /* Convert raw ADC value to millivolts
     * 
     * Using adc_raw_to_millivolts() which:
     * 1. Takes the reference voltage (600mV internal)
     * 2. Accounts for the gain (1/2 gain -> multiply by 2)
     * 3. Converts based on resolution (12-bit = 4096)
     */
    int32_t val = adc_raw;
    rc = adc_raw_to_millivolts(adc_ref_internal(adc_dev), 
                               adc_cfg.gain,
                               adc_seq.resolution, 
                               &val);
    if (rc < 0) {
        printk("ADC conversion failed (err %d)\n", rc);
        return;
    }

    /* Multiply by VDDHDIV to get actual VDDH voltage */
    battery_mv = val * VDDHDIV;
    
    /* Convert to percentage */
    uint8_t new_level = lithium_ion_mv_to_pct(battery_mv);
    
    /* Apply some hysteresis to avoid constant small changes */
    int diff = (int)new_level - (int)battery_level;
    if (first_reading || diff >= 2 || diff <= -2) {
        battery_level = new_level;
    }
    
    /* Update BLE Battery Service */
    rc = bt_bas_set_battery_level(battery_level);
    if (rc && rc != -ENOTCONN) {
        printk("Failed to update BAS (err %d)\n", rc);
    }
    
    /* Debug output */
    printk("Battery: raw=%d, adc_mv=%d, vddh_mv=%d, level=%d%%\n",
           adc_raw, val, battery_mv, battery_level);
    
    first_reading = false;
}

uint8_t battery_get_level(void)
{
    return battery_level;
}

int32_t battery_get_voltage_mv(void)
{
    return battery_mv;
}
