import shebang from 'rollup-plugin-preserve-shebang';

const external = [
    'mqtt',
    '@abandonware/noble',
    '@sentry/node'
];

export default [
    {
        input: 'src/bin/ble2mqtt.js',
        output: {
            file: 'dist/bin/ble2mqtt.js',
            format: 'cjs'
        },
        plugins: [shebang()],
        external
    },
    {
        input: 'src/lib/ble2mqtt.js',
        output: {
            file: 'dist/lib/ble2mqtt.js',
            format: 'cjs',
            exports: 'auto'
        },
        external
    }
];
