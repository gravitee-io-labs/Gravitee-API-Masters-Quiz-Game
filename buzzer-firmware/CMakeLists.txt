# CMakeLists.txt for Quiz Buzzer Firmware
cmake_minimum_required(VERSION 3.20.0)

find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(quiz_buzzer_firmware)

target_sources(app PRIVATE 
    src/main.c
    src/buzzer_service.c
    src/button.c
    src/led.c
    src/battery.c
)

target_include_directories(app PRIVATE src)
