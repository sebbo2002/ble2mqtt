'use strict';

const ServiceUUID = 'fe95';

module.exports = class MiFloraSensorModule {
    static getModuleDescription () {
        return {
            name: 'xiaomi-bluetooth',
            serviceUUIDs: [ServiceUUID]
        };
    }

    static handleAdvertisement ({debug, serviceData}) {
        const dataObj = serviceData.find(({uuid}) => uuid === ServiceUUID);
        if (!dataObj) {
            debug('Got an advertisement, but there\'s no service data attached. Ignore it');
            return;
        }

        const data = dataObj.data;
        if (data.length < 14) {
            debug(`Got an advertisement, but service data is too short (${data.length})`);
            return;
        }

        const type = data.toString('hex', 11, 12);
        if (!['0d', '0a', '06', '04'].includes(type) || data.toString('hex', 12, 13) !== '10') {
            debug(`Got an advertisement, but service data seems to be invalid (unknown type ${type})`);
            return;
        }

        if (type === '0d' && data.length === 18) {
            return {
                temperature: (data.readUInt16LE(14) / 10).toFixed(1),
                humidity: (data.readUInt16LE(16) / 10).toFixed(1)
            };
        }
        else if (type === '0d' && data.length === 16) {
            return {
                battery: data.readUInt8(14)
            };
        }
        else if (type === '04' && data.length === 16) {
            return {
                temperature: (data.readUInt16LE(14) / 10).toFixed(1)
            };
        }
        else if (type === '06' && data.length === 16) {
            return {
                humidity: (data.readUInt16LE(14) / 10).toFixed(1)
            };
        }
    }
};
