/**
 * Battery monitoring implementation
 */

#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/drivers/adc.h>
#include <zephyr/bluetooth/services/bas.h>

#include "config.h"
#include "battery.h"

/* ADC configuration */
#define ADC_NODE DT_NODELABEL(adc)
#define ADC_RESOLUTION 12
#define ADC_GAIN ADC_GAIN_1_6
#define ADC_REFERENCE ADC_REF_INTERNAL
#define ADC_ACQUISITION_TIME ADC_ACQ_TIME_DEFAULT

static uint8_t battery_level = 100;
static int64_t last_update_time = 0;
static const struct device *adc_dev = NULL;

#if DT_NODE_EXISTS(ADC_NODE) && 0  /* Disabled - ADC code for future use */

static const struct adc_channel_cfg channel_cfg = {
    .gain = ADC_GAIN,
    .reference = ADC_REFERENCE,
    .acquisition_time = ADC_ACQUISITION_TIME,
    .channel_id = BATTERY_ADC_CHANNEL,
#ifdef CONFIG_ADC_NRFX_SAADC
    .input_positive = SAADC_CH_PSELP_PSELP_VDD,
#endif
};

static int16_t adc_sample_buffer[1];
static struct adc_sequence sequence = {
    .buffer = adc_sample_buffer,
    .buffer_size = sizeof(adc_sample_buffer),
    .resolution = ADC_RESOLUTION,
};

static uint8_t calculate_battery_percentage(int16_t adc_value)
{
    /* Convert ADC value to millivolts */
    int32_t mv = adc_value;
    
    /* Scale based on ADC reference and gain */
    /* For nRF52840 with internal reference (0.6V) and gain 1/6 */
    /* VDD is measured, range is typically 1.7V - 3.6V */
    mv = (mv * 3600) / 4096;  // Simplified conversion
    
    /* Calculate percentage based on thresholds */
    if (mv >= BATTERY_FULL_MV) {
        return 100;
    } else if (mv <= BATTERY_EMPTY_MV) {
        return 0;
    } else {
        return (uint8_t)(((mv - BATTERY_EMPTY_MV) * 100) / 
                        (BATTERY_FULL_MV - BATTERY_EMPTY_MV));
    }
}

#endif  /* Disabled ADC code */

int battery_init(void)
{
    /* Temporarily disable ADC due to device tree issues in SDK v3.1.1 */
    /* TODO: Re-enable when ADC device tree is properly configured */
    printk("Battery monitoring disabled (using stub mode)\n");
    battery_level = 100;  // Assume full battery
    adc_dev = NULL;
    return 0;

#if 0  // Disabled ADC code
#if DT_NODE_EXISTS(ADC_NODE)
    adc_dev = DEVICE_DT_GET(ADC_NODE);
    if (!device_is_ready(adc_dev)) {
        printk("ADC device not ready, using stub mode\n");
        adc_dev = NULL;
        battery_level = 100;
        return 0;  // Non-critical, continue without ADC
    }

    int err = adc_channel_setup(adc_dev, &channel_cfg);
    if (err) {
        printk("ADC channel setup failed (err %d)\n", err);
        return err;
    }

    sequence.channels = BIT(BATTERY_ADC_CHANNEL);

    printk("Battery monitoring initialized\n");
    
    /* Initial battery reading */
    battery_update();
    
    return 0;
#else
    printk("ADC not available, battery monitoring disabled\n");
    /* Not a critical error, system can continue without battery monitoring */
    battery_level = 100;  // Assume full battery
    return 0;
#endif
#endif  // Disabled ADC code
}

void battery_update(void)
{
    /* Rate limit updates */
    int64_t now = k_uptime_get();
    if ((now - last_update_time) < BATTERY_UPDATE_INTERVAL_MS) {
        return;
    }
    last_update_time = now;

    /* ADC disabled - use stub mode */
    bt_bas_set_battery_level(battery_level);

#if 0  // Disabled ADC code
#if DT_NODE_EXISTS(ADC_NODE)
    if (!adc_dev) {
        /* ADC not available, simulate stable battery */
        bt_bas_set_battery_level(battery_level);
        return;
    }
    
    int err = adc_read(adc_dev, &sequence);
    if (err) {
        printk("ADC read failed (err %d)\n", err);
        return;
    }

    int16_t adc_value = adc_sample_buffer[0];
    uint8_t new_level = calculate_battery_percentage(adc_value);
    
    /* Only update if changed by at least 1% to reduce BLE notifications */
    if (new_level != battery_level) {
        battery_level = new_level;
        
        /* Update BLE Battery Service */
        bt_bas_set_battery_level(battery_level);
        
        printk("Battery level: %d%% (ADC: %d)\n", battery_level, adc_value);
        
        /* Optional: Low battery warning */
        if (battery_level <= 10) {
            printk("WARNING: Low battery!\n");
        }
    }
#else
    /* Without ADC, simulate stable battery */
    bt_bas_set_battery_level(battery_level);
#endif
#endif  // Disabled ADC code
}

uint8_t battery_get_level(void)
{
    return battery_level;
}
