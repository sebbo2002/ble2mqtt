'use strict';

import SmartWatchdog from '../../src/lib/watchdog.js';
import modules from '../../src/modules/index.js';
import assert from 'assert';

describe('Watchdog', function () {
    it('should load without any errors', function () {
        assert.ok(SmartWatchdog);
    });
});

describe('Modules', function () {
    it('should be there', function () {
        assert.ok(modules.length > 0);
    });
});
