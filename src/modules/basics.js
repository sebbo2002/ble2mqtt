'use strict';

export default class BasicsModule {
    static getModuleDescription () {
        return {
            name: 'basics'
        };
    }

    static handleAdvertisement ({peripheral}) {
        return {
            name: peripheral.advertisement.localName,
            address: peripheral.address,
            uuid: peripheral.uuid,
            lastSeen: new Date(),
            rssi: peripheral.rssi
        };
    }
}
