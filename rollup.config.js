import shebang from 'rollup-plugin-preserve-shebang';

const plugins = [
    shebang()
];

export default [
    {
        input: 'src/bin/cli.js',
        output: {
            file: 'dist/bin/cli.js',
            format: 'cjs'
        },
        plugins
    },
    {
        input: 'src/bin/start.js',
        output: {
            file: 'dist/bin/start.js',
            format: 'cjs'
        },
        external: [ 'express' ],
        plugins
    },
    {
        input: 'src/lib/index.js',
        output: {
            file: 'dist/lib/index.js',
            format: 'cjs',
            exports: 'auto'
        },
        plugins
    }
];
