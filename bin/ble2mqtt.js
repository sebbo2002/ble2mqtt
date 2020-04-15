#!/usr/bin/env node
'use strict';

if(process.argv.includes('--debug')) {
    console.log(' _______   __        ________   ______   __       __   ______   ________  ________');
    console.log('/       \\ /  |      /        | /      \\ /  \\     /  | /      \\ /        |/        |');
    console.log('$$$$$$$  |$$ |      $$$$$$$$/ /$$$$$$  |$$  \\   /$$ |/$$$$$$  |$$$$$$$$/ $$$$$$$$/');
    console.log('$$ |__$$ |$$ |      $$ |__    $$____$$ |$$$  \\ /$$$ |$$ |  $$ |   $$ |      $$ |');
    console.log('$$    $$< $$ |      $$    |    /    $$/ $$$$  /$$$$ |$$ |  $$ |   $$ |      $$ |');
    console.log('$$$$$$$  |$$ |      $$$$$/    /$$$$$$/  $$ $$ $$/$$ |$$ |_ $$ |   $$ |      $$ |');
    console.log('$$ |__$$ |$$ |_____ $$ |_____ $$ |_____ $$ |$$$/ $$ |$$ / \\$$ |   $$ |      $$ |');
    console.log('$$    $$/ $$       |$$       |$$       |$$ | $/  $$ |$$ $$ $$<    $$ |      $$ |');
    console.log('$$$$$$$/  $$$$$$$$/ $$$$$$$$/ $$$$$$$$/ $$/      $$/  $$$$$$  |   $$/       $$/');
    console.log('                                                          $$$/\n');
}

const BluetoothLE2MQTT = require('../lib/ble2mqtt');
const bluetoothLE2MQTT = new BluetoothLE2MQTT({
    debug: process.argv.includes('--debug'),
    brokerUrl: process.env.BROKER_URL,
    topicPrefix: process.env.TOPIC_PREFIX,
    cacheTTL: process.env.CACHE_TTL,
    retainFlag: !!process.env.RETAIN_FLAG,
    whitelist: process.env.WHITELIST ? process.env.WHITELIST.split(',') : null
});

bluetoothLE2MQTT.start().catch(error => {
    console.log('Unable to start ble2mqtt:');
    console.log(error);
    process.exit(1);
});
