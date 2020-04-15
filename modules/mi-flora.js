'use strict';

const MiFloraServiceUUID = 'fe95';
const MiFloraSensorTypes = {
    '04': 'temperature',
    '07': 'illuminance',
    '08': 'moisture',
    '09': 'fertility'
};

module.exports = class MiFloraSensorModule {
    static getModuleDescription () {
        return {
            name: 'mi-flora',
            serviceUUIDs: [MiFloraServiceUUID]
        };
    }

    static handleAdvertisement ({debug, serviceData}) {
        const dataObj = serviceData.find(({uuid}) => uuid === MiFloraServiceUUID);
        if(!dataObj) {
            debug(`Got an advertisement, but there's no service data attached. Ignore it.`);
            return;
        }

        const data = dataObj.data;
        if(data.length < 14) {
            debug(`Got an advertisement, but service data is too short. Do you have the current firmware installed?`);
            return;
        }

        const type = data.toString('hex', 12, 13);
        if(!['04', '07', '08', '09'].includes(type)) {
            debug(`Got an advertisement, but service data seems to be invalid (not a known type)`);
            return;
        }

        const valueLength = parseInt(data.toString('hex', 14, 15));
        if(data.length - valueLength !== 15) {
            debug(`Got an advertisement, but service data seems to be invalid (not a known length)`);
            return;
        }

        const reversedBuffer = new Buffer.from(
            data.toString('hex', 15, 15 + valueLength)
                .match(/.{1,2}/g)
                .reverse()
                .join(''),
            'hex'
        );

        const value = parseInt(reversedBuffer.toString('hex'), 16);
        return {
            [MiFloraSensorTypes[type]]: (type === '04' ? (value * 0.1).toFixed(1) : value)
        };
    }
};
