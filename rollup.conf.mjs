import resolve from '@rollup/plugin-node-resolve';
import terser from "@rollup/plugin-terser";
import postcss from "rollup-plugin-postcss";

export default [{
    input: 'src/client-errors.js',
    output: [{
        sourcemap: true,
        file: 'dist/ful-client-errors.iife.min.js',
        format: 'iife',
        plugins: [
            terser()
        ]
    }, {
        sourcemap: true,
        file: 'dist/ful-client-errors.iife.js',
        format: 'iife'
    }],
    treeshake: true,
    plugins: [
        resolve()
    ]
}, {
    input: 'src/index.mjs',
    external: ['@optionfactory/ftl', 'tom-select'],
    output: [{
        sourcemap: true,
        file: 'dist/ful.min.mjs',
        format: 'es',
        plugins: [
            terser()
        ]
    }, {
        sourcemap: true,
        file: 'dist/ful.mjs',
        format: 'es'
    }, {
        sourcemap: true,
        file: 'dist/ful.iife.min.js',
        name: 'ful',
        format: 'iife',
        globals: {
            '@optionfactory/ftl': 'ftl',
            'tom-select': 'TomSelect'
        },
        plugins: [
            terser()
        ]
    }, {
        sourcemap: true,
        file: 'dist/ful.iife.js',
        name: 'ful',
        format: 'iife',
        globals: {
            '@optionfactory/ftl': 'ftl',
            'tom-select': 'TomSelect'
        },
    }],
    treeshake: true,
    plugins: [
        resolve(),
        postcss({
            extract: 'ful.css',
            inject: false,
            minimize: true,
            sourceMap: true
        }),
    ]
}];
