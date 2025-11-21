# Quick Start Guide - Building Physical Buzzers

This guide will help you quickly build and deploy the buzzer firmware to your NRF52840 boards.

## Prerequisites Checklist

- [ ] Two NRF52840 development boards
- [ ] USB cables for programming
- [ ] 2x Push buttons (momentary)
- [ ] 2x LEDs (one with green plastic diffuser, one with red plastic diffuser)
- [ ] 2x 220Ω resistors (for LEDs)
- [ ] **nRF Connect SDK installed** (see Setup section below)
- [ ] Supported browser (Chrome/Edge/Opera)

## Setup nRF Connect SDK (First Time Only)

### Using VS Code nRF Connect Extension (Recommended ✨)

The **nRF Connect for VS Code** extension is the modern, streamlined way to develop nRF applications.

1. **Install VS Code** (if not already installed)
   - Download from [code.visualstudio.com](https://code.visualstudio.com/)

2. **Install nRF Connect Extension**
   - Open VS Code
   - Go to Extensions (⌘+Shift+X on macOS, Ctrl+Shift+X on Windows/Linux)
   - Search for "nRF Connect for VS Code"
   - Click Install
   - Follow the extension's setup wizard

3. **Install Toolchain**
   - The extension will prompt you to install the toolchain
   - Click "Install Toolchain" in the welcome screen
   - Select the latest version (e.g., v2.7.0 or newer)

4. **Install SDK**
   - After toolchain installation, click "Install SDK"
   - Select the latest nRF Connect SDK version

That's it! The extension handles all dependencies and environment setup automatically. ✅

## Quick Build Steps with VS Code

### 1. Hardware Assembly (per buzzer)

**Connect components to NRF52840:**

```
Button:
  - One leg → P0.11
  - Other leg → GND

LED (standard 2-pin LED with colored plastic):
  - Anode (long leg, +) → 220Ω resistor → P0.13
  - Cathode (short leg, -) → GND

Note: The firmware uses P0.13 for LED control.
The LED color doesn't matter - use green plastic for Green buzzer,
red plastic for Red buzzer.
```

### 2. Open Project in VS Code

1. **Open the buzzer-firmware folder** in VS Code
   ```bash
   cd /path/to/Gravitee-API-Masters-Quiz-Game
   code buzzer-firmware
   ```

2. **Create Build Configuration** (first time only)
   - Click on the nRF Connect icon in the left sidebar
   - In the "Applications" section, click "Add build configuration" (or the "+" button)
   - **Board**: Select based on your hardware:
     - **Pro Micro nRF52840 / SuperMini nRF52840 / Nice!Nano**: `promicro_nrf52840`
     - **Adafruit Feather/ItsyBitsy nRF52840**: `adafruit_feather_nrf52840`
     - **Nordic nRF52840 DK**: `nrf52840dk_nrf52840`
   - **Configuration**: Leave as default or select "prj.conf"
   - Click "Build Configuration" to create it
   - The build configuration will now appear in the sidebar

   **Troubleshooting:** If you don't see "Add build configuration":
   - Make sure you have `CMakeLists.txt` and `prj.conf` in the project root
   - Try: Command Palette (⌘+Shift+P) → "nRF Connect: Add Build Configuration"
   - If still not working, close and reopen the folder in VS Code

### 3. Flash GREEN Buzzer

1. **Edit config.h**
   - Open `src/config.h`
   - Change line 12 to: `#define BUZZER_ID 1`
   - Save the file (⌘+S)

2. **Build the project**
   - Make sure your build configuration is selected (it should appear in the nRF Connect sidebar)
   - Click the "Build" button next to your configuration
   - Or use Command Palette (⌘+Shift+P) → "nRF Connect: Build"
   - Wait for build to complete

3. **Flash to device**
   
   **For Pro Micro / SuperMini / Nice!Nano / Adafruit boards:**
   - **Double-tap the RESET button** on the board (or short RST to GND twice quickly)
   - A USB drive will appear (e.g., "NICENANO", "FTHR840BOOT", or similar)
   - **Drag and drop** `build/buzzer-firmware/zephyr/zephyr.uf2` onto the drive
   - The board will automatically reboot with your firmware
   
   **For Nordic DK:**
   - Plug in the board via USB
   - In the nRF Connect sidebar, click "Flash" button
   - Or use Command Palette → "nRF Connect: Flash"
   - Wait for flashing to complete

5. **Verify**
   - LED should flash GREEN on startup
   - Check serial output if needed (click "Serial Terminal" in nRF Connect sidebar)

### 4. Flash RED Buzzer

1. **Edit config.h**
   - Open `src/config.h`
   - Change line 12 to: `#define BUZZER_ID 2`
   - Save the file (⌘+S)

2. **Pristine Build** (recommended when changing config)
   - In nRF Connect sidebar, click "Pristine Build"
   - Or use Command Palette → "nRF Connect: Pristine Build"
   - This ensures a clean rebuild

3. **Connect second board**
   - Unplug first board
   - Plug in the second NRF52840 board via USB

4. **Flash to device**
   - Click "Flash" button in nRF Connect sidebar
   - Wait for flashing to complete

5. **Verify**
   - LED should flash RED on startup
   - Board should advertise as "Gravitee-Buzzer-Red"

### 5. Test Buzzers

**Power on both buzzers:**
- Green buzzer: LED flashes briefly on startup
- Red buzzer: LED flashes briefly on startup
- Both should be advertising (visible to Bluetooth scanner)

**LED Behavior During Game:**
1. **Game Start**: Both buzzers' LEDs turn ON
2. **Answer Given**: 
   - Pressed buzzer: LED blinks 3 times rapidly
   - Other buzzer: LED turns OFF
3. **Next Question**: Both LEDs turn ON again
4. **Game End**: Both LEDs turn OFF

**Debug with Serial Terminal (optional):**
- In VS Code, click "Serial Terminal" in nRF Connect sidebar
- Select the COM port for your device
- Press the button and see debug messages

### 6. Connect to Game

1. Open game in Chrome/Edge/Opera
2. Click Bluetooth icon (bottom-right)
3. Click "Connect" for Green Buzzer
   - Select "Gravitee-Buzzer-Green" from dialog
   - Wait for confirmation
4. Click "Connect" for Red Buzzer
   - Select "Gravitee-Buzzer-Red" from dialog
   - Wait for confirmation
5. Click "Test Buzzers" to see LED animation
6. Start playing!

## Common Issues

### VS Code Extension Issues

**Extension not loading:**
1. Restart VS Code
2. Check if Python is installed: `python3 --version`
3. Reinstall the extension if needed

**Toolchain/SDK installation fails:**
1. Check internet connection
2. Make sure you have enough disk space (~5GB)
3. Try installing from nRF Connect sidebar → Toolchain Manager

**Build configuration missing:**
- Make sure you ran "Create a new application" step
- Check that `build` folder exists in your project
- Try "Add Build Configuration" from Command Palette

### Device not found during flash

**Solutions:**
1. Check USB cable connection
2. Install J-Link drivers
3. Try: `west flash --recover`
4. Check device permissions (Linux): `sudo usermod -a -G dialout $USER`

### LED doesn't light up

**Checks:**
1. Verify LED polarity (long leg/anode to resistor, short leg/cathode to GND)
2. Check resistor value (220Ω)
3. Test LED with multimeter or 3V battery
4. Verify LED is connected to P0.13
5. Make sure the LED isn't burned out

### Button doesn't work

**Checks:**
1. Verify button is connected to P0.11 and GND
2. Test button continuity with multimeter
3. Check if button is normally open (not normally closed)

### Can't find buzzer in browser

**Checks:**
1. Is buzzer powered on?
2. Is Bluetooth enabled on computer?
3. Using Chrome/Edge/Opera?
4. Try power cycling the buzzer
5. Check distance (within 10 meters)

## Customization Examples

### Change LED Pin

Edit `src/config.h`:

```c
#define LED_RED_PIN  13  // Change to your desired pin for LED
```

Note: Since we're using simple on/off LEDs (not RGB), the firmware just turns
the LED on P0.13 on or off. The RGB values sent from the game are converted
to simple on/off (any color value > 128 = LED on).

### Change Button Pin

Edit `src/config.h`:

```c
#define BUTTON_PIN  11  // Change to your desired pin
```

### Disable Auto-off

Edit `src/config.h`:

```c
// Comment out this line:
// #define LED_AUTO_OFF_TIMEOUT_MS  5000
```

## Advanced: Debug Mode

Enable logging for troubleshooting:

1. Edit `prj.conf`:
```conf
CONFIG_LOG=y
CONFIG_LOG_DEFAULT_LEVEL=3
CONFIG_BT_DEBUG_LOG=y
CONFIG_PRINTK=y
CONFIG_CONSOLE=y
CONFIG_UART_CONSOLE=y
```

2. Rebuild and flash:
```bash
west build -b nrf52840dk_nrf52840
west flash
```

3. View serial output:
```bash
# macOS/Linux
screen /dev/ttyACM0 115200

# Windows (use PuTTY or similar)
# Connect to COM port at 115200 baud
```

## Next Steps

✅ Both buzzers working? Great!

Now you can:
- Customize LED patterns in `src/main.c`
- Adjust power settings in `src/config.h`
- Add additional button actions
- Implement haptic feedback (if hardware supports)
- Design a custom enclosure

## Support

- **Firmware Issues**: Check `buzzer-firmware/README.md`
- **Web Integration**: Check `BUZZER_INTEGRATION.md`
- **General Help**: Open an issue on GitHub

Happy buzzing! 🎮
