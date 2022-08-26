'use strict';

const SwitchBotServiceUUIDs = ['0d00', 'fd3d'];

export default class SwitchBotModule {
    static getModuleDescription () {
        return {
            name: 'switchbot',
            serviceUUIDs: SwitchBotServiceUUIDs
        };
    }

    static handleAdvertisement ({debug, serviceData}) {
        const dataObj = serviceData.find(({uuid}) => SwitchBotServiceUUIDs.includes(uuid));
        if (!dataObj) {
            debug('Got an advertisement, but there\'s no service data attached. Ignore it.');
            return;
        }

        const data = dataObj.data;
        if (data.length < 3) {
            debug(`Got an advertisement, but service data is too short (${data.length}).`);
            return;
        }

        const model = data.slice(0, 1).toString('utf8');
        if (model === 'H') {
            // WoHand
            return this.handleAdvertisementForWoHand({debug, data});
        }
        else if (model === 'T') {
            // WoSensorTH
            return this.handleAdvertisementForWoSensorTH({debug, data});
        }
        else if (model === 'c') {
            // WoCurtain
            return this.handleAdvertisementForWoCurtain({debug, data});
        }
    }

    static handleAdvertisementForWoHand({debug, data}) {
        if (data.length !== 3) {
            debug(`Got an advertisement for WoHand, but service data length is incorrect (${data.length} is not 3).`);
            return;
        }

        const byte1 = data.readUInt8(1);
        const byte2 = data.readUInt8(2);

        return {
            switchAddOnUsed: !!(byte1 & 0b10000000), // light switch add-on used or not
            state: !!(byte1 & 0b01000000), // switch status (on/off)
            battery: byte2 & 0b0111111
        };
    }

    static handleAdvertisementForWoSensorTH({debug, data}) {
        if (data.length !== 6) {
            debug(`Got an advertisement for WoSensorTH, but service data length is incorrect (${data.length} is not 6).`);
            return;
        }

        const byte2 = data.readUInt8(2);
        const byte3 = data.readUInt8(3);
        const byte4 = data.readUInt8(4);
        const byte5 = data.readUInt8(5);
        const tempSign = (byte4 & 0b10000000) ? 1 : -1;

        return {
            temperature: tempSign * ((byte4 & 0b01111111) + (byte3 / 10)),
            humidity: byte5 & 0b01111111,
            battery: (byte2 & 0b01111111)
        };
    }

    static handleAdvertisementForWoCurtain({debug, data}) {
        if (data.length < 5) {
            debug(`Got an advertisement for WoCurtain, but service data length is incorrect (${data.length} is < 5).`);
            return null;
        }

        const byte1 = data.readUInt8(1);
        const byte2 = data.readUInt8(2);
        const byte3 = data.readUInt8(3);
        const byte4 = data.readUInt8(4);

        return {
            calibrated: !!(byte1 & 0b01000000),
            battery: byte2 & 0b01111111, // %
            moving: !!(byte3 & 0b10000000),
            position: byte3 & 0b01111111, // %
            lightLevel: (byte4 >> 4) & 0b00001111 // light sensor level (1-10)
        };
    }
}
