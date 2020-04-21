'use strict';

const mqtt = require('mqtt');
const noble = require('@abandonware/noble');
const modules = require('../modules');
const SmartWatchdog = require('./watchdog');

class BluetoothLE2MQTT {

    /**
     * @param {object} [options]
     * @param {function|boolean} [options.debug]       Set to true to enable logging or pass a custom logging function
     * @param {function}         [options.onError]      Pass a function to get notified about errors, otherwise uses console.error
     * @param {string}           [options.brokerUrl]   MQTT broker url, defaults to mqtt://localhost
     * @param {string}           [options.topicPrefix] MQTT topic prefix, defaults to "home/ble2mqtt"
     * @param {boolean}          [options.retainFlag]  Set to true, to send all MQTT messages with retain flag
     * @param {number}           [options.cacheTTL]    Internal cache time-to-live in ms, defaults to 5000
     * @param {string}           [options.whitelist]   Whitelist, device addresses or local names, seperated with comma
     */
    constructor (options = {}) {
        if (typeof options.debug === 'function') {
            this._debug = options.debug;
        }
        else if (options.debug) {
            /* eslint-disable-next-line no-console */
            this._debug = str => console.log(str);
        }
        else {
            this._debug = () => {
            };
        }

        if (typeof options.onError === 'function') {
            this._error = options.onError;
        }
        else {
            /* eslint-disable-next-line no-console */
            this._error = error => console.error(error);
        }

        this._watchdog = new SmartWatchdog();
        this._brokerUrl = options.brokerUrl || 'mqtt://localhost';
        this._topicPrefix = options.topicPrefix || 'home/ble2mqtt';
        this._retainFlag = options.retainFlag || false;
        this._cacheTTL = parseInt(options.cacheTTL) || 5000;
        this._whitelist = options.whitelist || [];
        this._client = null;
        this._started = false;

        this._topicCache = {};

        this.debug('Hi there. Thanks for using ble2mqtt :)');
        this.debug(`I'll use this broker: ${this._brokerUrl}`);
        this.debug(`All my messages will use this prefix: ${this._topicPrefix}`);

        noble.on('stateChange', state => {
            if (this._started && state === 'poweredOn') {
                noble.startScanningAsync([], true)
                    .catch(error => this._error(error));
            }
        });

        noble.on('discover', peripheral => this.handleAdvertisement(peripheral));
        noble.on('warning', msg => this.debug(msg, 'noble'));
    }

    /**
     * Start ble2mqtt, resolves, when it's running
     *
     * @returns {Promise<void>}
     */
    async start () {
        this.debug('start()');

        if (this._client) {
            this.debug('start() - Seems like ble2mqtt is already running…');
            return;
        }

        this._client = mqtt.connect(this._brokerUrl);
        this._client.on('error', error => this._error(error));
        this.debug('start() - Started, wait for MQTT and bluetooth to be ready…');

        await Promise.all([
            new Promise(resolve => {
                this._client.once('connect', () => {
                    this.debug('start() - MQTT client connected');
                    resolve();
                });
            }),
            new Promise((resolve, reject) => {
                if (noble.state === 'poweredOn') {
                    this.debug('start() - Bluetooth already powered on');
                    return resolve();
                }

                noble.once('stateChange', state => {
                    if (state === 'poweredOn') {
                        this.debug('start() - Bluetooth powered on');
                        resolve();
                    }
                    else {
                        reject(new Error(`Unable to start ble2mqtt: noble was unable to start scanning: state = ${state}`));
                    }
                });
            })
        ]);

        setInterval(() => this.clearMessageCache(), 15000);
        noble.startScanningAsync([], true).catch(error => this._error(error));
        this._started = true;

        this.debug('start() - Connections established, thanks…');

        this.sendCoreValues().catch(this._error);

        this._watchdog.addHandler(() => {
            this.debug('Watchdog triggert, try to restart scanning…');

            noble.stopScanning(() => {
                noble.startScanningAsync([], true).catch(error => this._error(error));
            });

            return 20000;
        });

        this._watchdog.tick();
    }

    /**
     * Internal function to generate log messages
     *
     * @param {string} message
     * @param {string} [module]
     * @param {string} [address]
     */
    debug (message, module = 'core', address = null) {
        this._debug(`[${new Date().toJSON()}]${address ? `[${address}]` : ''}${address ? `[${module}]` : ''} ${message}`);
    }

    /**
     * Internal function which is called for every advertisement
     * noble can get out of our bluetooth adapter. Check the noble
     * documentation for details about the peripheral object.
     *
     * @see https://github.com/abandonware/noble#event-peripheral-discovered
     * @param {object} peripheral
     */
    handleAdvertisement (peripheral) {
        this._watchdog.tick();

        if(!peripheral.address || !peripheral.advertisement.localName) {
            return;
        }
        if(
            this._whitelist.length &&
            !this._whitelist.includes(peripheral.address) &&
            !this._whitelist.includes(peripheral.advertisement.localName)
        ) {
            this.debug(`Got advertisement from ${peripheral.advertisement.localName || 'unknown device'}, but device is not on whitelist.`, 'core', peripheral.address);
            return;
        }

        const responsibleModules = modules.filter(module => {
            const description = module.getModuleDescription();
            return !description.serviceUUIDs || !!description.serviceUUIDs.find(uuid => {
                return (
                    (peripheral.advertisement.serviceUuids && peripheral.advertisement.serviceUuids.includes(uuid)) ||
                    (peripheral.advertisement.serviceData && peripheral.advertisement.serviceData.find(d => d.uuid === uuid))
                );
            });
        });

        this.debug(`Got advertisement from ${peripheral.advertisement.localName || 'unknown device'}`, 'core', peripheral.address);
        if(peripheral.advertisement.serviceData && peripheral.advertisement.serviceData.length) {
            this.debug(
                'Advertisement has service data attached for these services: '+
                peripheral.advertisement.serviceData.map(d => d.uuid).join(', '),
                'core',
                peripheral.address
            );
        }

        if (!responsibleModules.length) {
            return;
        }

        const names = responsibleModules.map(m => m.getModuleDescription().name);
        this.debug(`Pass advertisement to these module${responsibleModules.length > 1 ? 's' : ''}: ${names.join(', ')}`, 'core', peripheral.address);

        responsibleModules.forEach(module => this.handleAdvertisementWithModule(peripheral, module));
    }

    /**
     * Internal function which is called every time a received advertisement
     * may be handled by a module. The function forwards the message to it's
     * `handleAdvertisement` method of the module, checks the response and
     * generates MQTT messages if required.
     *
     * @param {object} peripheral
     * @param {object} module
     */
    handleAdvertisementWithModule (peripheral, module) {
        const name = module.getModuleDescription().name;
        const debug = str => this.debug(str, name, peripheral.address);

        (async () => {
            const values = module.handleAdvertisement({
                peripheral,
                debug,
                serviceData: peripheral.advertisement.serviceData || []
            });
            if(typeof values !== 'object' || Object.keys(values).length === 0) {
                return;
            }

            await Promise.all(Object.entries(values).map(async ([key, value]) => this.handleValue(
                debug,
                peripheral.address,
                key,
                value
            )));
        })().catch(error => {
            debug(`Unable to run module: ${error.stack}`);
            this._error(error);
        });
    }

    /**
     * Internal function to handle a single value. Is called for every data
     * point which is parsed by a module.
     *
     * @param {function} debug
     * @param {string} address
     * @param {string} key
     * @param {*} value
     * @returns {Promise<void>}
     */
    async handleValue (debug, address, key, value) {
        const topic = `${this._topicPrefix}/${address}/${key}`;
        const strValue = this.getStringForValue(value);

        if(this.shouldSendMessage(topic, strValue)) {
            this._client.publish(topic, strValue, {
                retain: this._retainFlag
            });
            debug(`-> ${topic} = ${strValue}`);
        } else {
            debug(`-> ${topic} already sent, ignore this advertisement`);
        }
    }

    /**
     * Function which generates a string representation from input
     *
     * @param {*} value
     * @returns {string}
     */
    getStringForValue (value) {
        if(value instanceof Date) {
            return value.toJSON();
        }
        else if(value === undefined || value === null) {
            return '';
        }
        else {
            return String(value);
        }
    }

    /**
     * Internal function which checks if a MQQT message should be
     * sent or not by checking the tiny internal cache. Returns
     * true if caller should sent the message, false if not.
     *
     * @param {string} topic
     * @param {string} value
     * @returns {boolean}
     */
    shouldSendMessage (topic, value) {
        if(
            this._topicCache[topic] &&
            this._topicCache[topic][0] === value &&
            this._topicCache[topic][1] >= new Date().getTime() - this._cacheTTL
        ) {
            return false;
        }

        this._topicCache[topic] = [value, new Date().getTime()];
        return true;
    }

    /**
     * Function which checks the internal cache object and removes entries
     * which are not required any more. This function is called by an interval
     * which is created in start()
     */
    clearMessageCache () {
        Object.entries(this._topicCache).forEach(([key, [ts]]) => {
            if(ts < new Date().getTime() - this._cacheTTL) {
                delete this._cacheTTL[key];
            }
        });
    }

    /**
     * Sends the core MQTT values like `pid` and `version`.
     * This is done once in start()
     * @returns {Promise<void>}
     */
    async sendCoreValues () {
        await this.handleValue (str => this.debug(str), 'core', 'pid', process.pid);

        try {
            const version = require('../package.json').version;
            if(version) {
                await this.handleValue (str => this.debug(str), 'core', 'version', version);
            }
        }
        catch(error) {
            this.debug(`Unable to send version to broker: ${error}`);
        }
    }
}

module.exports = BluetoothLE2MQTT;
