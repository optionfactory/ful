import resolve from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";

export default [{
    input: 'src/client-errors.js',
    output: [{
        sourcemap: true,
        file: 'dist/ful-client-errors.iife.min.js',
        format: 'iife',
        plugins: [
            terser()
        ]
    },{
        sourcemap: true,
        file: 'dist/ful-client-errors.iife.js',
        format: 'iife'
    }],
    treeshake: true,
    plugins: [
        resolve()        
    ]
},{
    input: 'src/index.mjs',
    output: [{
        sourcemap: true,
        file: 'dist/ful.min.mjs',
        format: 'es',
        plugins: [
            terser()
        ]
    },{
        sourcemap: true,
        file: 'dist/ful.mjs',
        format: 'es'
    },{
        sourcemap: true,
        file: 'dist/ful.iife.min.js',
        name: 'ful',
        format: 'iife',
        plugins: [
            terser()
        ]
    },{
        sourcemap: true,
        file: 'dist/ful.iife.js',
        name: 'ful',
        format: 'iife'
    }],
    treeshake: true,
    plugins: [
        resolve()        
    ]
}];
