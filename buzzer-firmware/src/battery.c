/**
 * Battery monitoring implementation for 18650 Li-ion battery
 * 
 * Uses nRF52840 SAADC to measure battery voltage through a voltage divider.
 * Wiring: VBAT+ -> 1M resistor -> P0.31 (AIN7) -> 1M resistor -> GND
 * 
 * This gives VBAT/2 at the ADC input, keeping it within safe range.
 */

#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/devicetree.h>
#include <zephyr/drivers/adc.h>
#include <zephyr/bluetooth/services/bas.h>

#include "config.h"
#include "battery.h"

/* ADC configuration from device tree */
#define ADC_NODE DT_NODELABEL(adc)

#if DT_NODE_EXISTS(ADC_NODE)
static const struct device *adc_dev = DEVICE_DT_GET(ADC_NODE);
#else
static const struct device *adc_dev = NULL;
#endif

/* ADC channel configuration */
static const struct adc_channel_cfg channel_cfg = {
    .gain = ADC_GAIN_1_6,
    .reference = ADC_REF_INTERNAL,  /* 0.6V internal reference */
    .acquisition_time = ADC_ACQ_TIME(ADC_ACQ_TIME_MICROSECONDS, 40),
    .channel_id = BATTERY_ADC_CHANNEL,
#if defined(CONFIG_ADC_NRFX_SAADC)
    .input_positive = SAADC_CH_PSELP_PSELP_AnalogInput7,  /* AIN7 = P0.31 */
#endif
};

/* ADC sample buffer and sequence */
static int16_t adc_sample_buffer[1];
static struct adc_sequence sequence = {
    .buffer = adc_sample_buffer,
    .buffer_size = sizeof(adc_sample_buffer),
    .resolution = 12,
    .channels = BIT(BATTERY_ADC_CHANNEL),
};

/* State */
static uint8_t battery_level = 100;
static int64_t last_update_time = 0;
static bool adc_initialized = false;

/**
 * Convert ADC reading to battery millivolts
 * 
 * ADC config: 12-bit, 1/6 gain, 0.6V reference
 * Max measurable voltage at ADC pin: 0.6V * 6 = 3.6V
 * ADC value range: 0-4095 (12-bit)
 * 
 * Formula: V_adc = (adc_value / 4096) * 3.6V
 * V_batt = V_adc * BATTERY_DIVIDER_RATIO
 */
static int32_t adc_to_millivolts(int16_t adc_value)
{
    /* Handle negative values (noise) */
    if (adc_value < 0) {
        adc_value = 0;
    }
    
    /* Convert to millivolts at ADC input
     * With 1/6 gain and 0.6V reference, full scale = 3.6V
     * mv = (adc_value * 3600) / 4096
     */
    int32_t mv_at_adc = (adc_value * 3600) / 4096;
    
    /* Scale up by voltage divider ratio to get actual battery voltage */
    int32_t mv_battery = mv_at_adc * BATTERY_DIVIDER_RATIO;
    
    return mv_battery;
}

/**
 * Convert battery millivolts to percentage (0-100%)
 * Uses Li-ion discharge curve approximation
 */
static uint8_t millivolts_to_percent(int32_t mv)
{
    if (mv >= BATTERY_FULL_MV) {
        return 100;
    }
    if (mv <= BATTERY_EMPTY_MV) {
        return 0;
    }
    
    /* Li-ion discharge curve is not linear, but we use piecewise linear approximation:
     * 4.2V - 4.0V: 100% - 80% (rapid initial drop)
     * 4.0V - 3.7V: 80% - 50%  (gradual decline)
     * 3.7V - 3.4V: 50% - 20%  (plateau region)
     * 3.4V - 3.0V: 20% - 0%   (rapid end drop)
     */
    
    if (mv >= 4000) {
        /* 4.0V - 4.2V: 80% - 100% */
        return 80 + ((mv - 4000) * 20) / (BATTERY_FULL_MV - 4000);
    } else if (mv >= 3700) {
        /* 3.7V - 4.0V: 50% - 80% */
        return 50 + ((mv - 3700) * 30) / 300;
    } else if (mv >= 3400) {
        /* 3.4V - 3.7V: 20% - 50% */
        return 20 + ((mv - 3400) * 30) / 300;
    } else {
        /* 3.0V - 3.4V: 0% - 20% */
        return ((mv - BATTERY_EMPTY_MV) * 20) / (3400 - BATTERY_EMPTY_MV);
    }
}

int battery_init(void)
{
#if DT_NODE_EXISTS(ADC_NODE)
    if (!device_is_ready(adc_dev)) {
        printk("ADC device not ready, battery monitoring disabled\n");
        adc_dev = NULL;
        battery_level = 100;
        return 0;  /* Non-critical, continue without ADC */
    }

    int err = adc_channel_setup(adc_dev, &channel_cfg);
    if (err) {
        printk("ADC channel setup failed (err %d)\n", err);
        adc_dev = NULL;
        battery_level = 100;
        return 0;  /* Non-critical */
    }

    adc_initialized = true;
    printk("Battery monitoring initialized (18650 Li-ion, AIN7/P0.31)\n");
    
    /* Force initial battery reading */
    last_update_time = 0;
    battery_update();
    
    return 0;
#else
    printk("ADC not available in device tree, battery monitoring disabled\n");
    battery_level = 100;
    return 0;
#endif
}

void battery_update(void)
{
    /* Rate limit updates to save power */
    int64_t now = k_uptime_get();
    if ((now - last_update_time) < BATTERY_UPDATE_INTERVAL_MS && last_update_time != 0) {
        return;
    }
    last_update_time = now;

    if (!adc_initialized || adc_dev == NULL) {
        /* ADC not available, just update BLE with current level */
        bt_bas_set_battery_level(battery_level);
        return;
    }

    /* Perform ADC read */
    int err = adc_read(adc_dev, &sequence);
    if (err) {
        printk("ADC read failed (err %d)\n", err);
        return;
    }

    int16_t adc_value = adc_sample_buffer[0];
    int32_t battery_mv = adc_to_millivolts(adc_value);
    uint8_t new_level = millivolts_to_percent(battery_mv);
    
    /* Only update if changed by at least 1% to reduce BLE notifications */
    if (new_level != battery_level) {
        battery_level = new_level;
        
        /* Update BLE Battery Service */
        bt_bas_set_battery_level(battery_level);
        
        printk("Battery: %d%% (%dmV, ADC=%d)\n", battery_level, (int)battery_mv, adc_value);
        
        /* Low battery warning */
        if (battery_mv <= BATTERY_LOW_MV && battery_mv > BATTERY_EMPTY_MV) {
            printk("WARNING: Low battery! Consider charging.\n");
        } else if (battery_mv <= BATTERY_EMPTY_MV) {
            printk("CRITICAL: Battery empty! Please charge immediately.\n");
        }
    }
}

uint8_t battery_get_level(void)
{
    return battery_level;
}

/**
 * Get raw battery voltage in millivolts (for debugging)
 */
int32_t battery_get_voltage_mv(void)
{
    if (!adc_initialized || adc_dev == NULL) {
        return -1;
    }
    
    int err = adc_read(adc_dev, &sequence);
    if (err) {
        return -1;
    }
    
    return adc_to_millivolts(adc_sample_buffer[0]);
}
