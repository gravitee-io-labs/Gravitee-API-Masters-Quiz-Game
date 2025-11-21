# Quiz Game Buzzer Firmware (NRF52840)

This firmware turns an NRF52840-based board into a Bluetooth Low Energy (BLE) quiz game buzzer with LED feedback.

## Features

- **BLE GATT Service**: Custom service for quiz buzzer functionality
- **Button Detection**: Instant button press notification via BLE
- **LED Control**: RGB LED control from game client
- **Battery Optimized**: Low power modes and efficient BLE usage
- **Two Buzzer Support**: Green and Red buzzer identification

## Hardware Requirements

- NRF52840 Development Board (2 units - one for Green, one for Red)
- Button connected to a GPIO pin
- RGB LED (or single color LED) connected to GPIO pins
- CR2032 battery or similar power source

## Pin Configuration

Default pin assignments (customize in `config.h`):

- **Button**: P0.11 (active low with internal pullup)
- **LED Red**: P0.13
- **LED Green**: P0.14
- **LED Blue**: P0.15

## BLE Service Specification

**Service UUID**: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` (Custom Quiz Buzzer Service)

### Characteristics:

1. **Button State** (UUID: `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`)
   - Properties: READ, NOTIFY
   - Value: 1 byte (0x00 = not pressed, 0x01 = pressed)

2. **LED Control** (UUID: `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`)
   - Properties: WRITE, READ
   - Value: 3 bytes (RGB values 0-255)

3. **Buzzer ID** (UUID: `6E400004-B5A3-F393-E0A9-E50E24DCCA9E`)
   - Properties: READ
   - Value: 1 byte (0x01 = Green, 0x02 = Red)

4. **Battery Level** (UUID: `00002A19-0000-1000-8000-00805F9B34FB`)
   - Properties: READ, NOTIFY
   - Value: 1 byte (0-100%)

## Building the Firmware

### Prerequisites

1. Install [nRF Connect SDK](https://www.nordicsemi.com/Products/Development-software/nRF-Connect-SDK)
2. Install [nRF Command Line Tools](https://www.nordicsemi.com/Products/Development-tools/nrf-command-line-tools)

### Build Steps

```bash
# Initialize the nRF Connect SDK environment
source ~/ncs/zephyr/zephyr-env.sh

# Navigate to firmware directory
cd buzzer-firmware

# Build for nRF52840 DK
west build -b nrf52840dk_nrf52840

# Flash to device
west flash
```

## Configuration

Edit `src/config.h` to customize:

- Pin assignments
- BLE device name
- Buzzer ID (Green/Red)
- Power management settings

## Power Consumption

The firmware is optimized for battery operation:

- **Advertising**: ~5-10 mA
- **Connected (idle)**: ~0.5-1 mA
- **Button press notification**: ~2-3 mA (brief)
- **LED on**: ~5-15 mA (depending on brightness)

Expected battery life with CR2032 (220mAh):
- With LED off most of the time: 200-300 hours
- With frequent LED usage: 15-50 hours

## Pairing Process

1. Power on the buzzer
2. Device will advertise as "Gravitee-Buzzer-Green" or "Gravitee-Buzzer-Red"
3. Connect from the game client settings page
4. LED will blink to confirm connection

## Troubleshooting

- **Device not advertising**: Check power supply and reset the board
- **Connection drops**: Ensure device is within 10m range
- **Button not responding**: Check pin configuration and wiring
- **LED not working**: Verify GPIO pins and current limiting resistors

## License

MIT License - See main project LICENSE file
