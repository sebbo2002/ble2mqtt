'use strict';

import Magic from '../../dist/lib';
import assert from 'assert';

describe('Example', function () {
    it('should work with integers', function () {
        assert.strictEqual(Magic.double(2), 4);
    });
});
