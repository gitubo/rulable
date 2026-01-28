import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
      preserveModules: false 
    },
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'DAGWidget',
      sourcemap: true,
      globals: {
        'd3': 'd3'
      }
    }
  ],
  external: ['d3'],
  plugins: [
    resolve({
      extensions: ['.js', '.ts'],
      browser: true,
      preferBuiltins: false
    }),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
      inlineSources: true,
      declaration: true,
      declarationDir: './dist',
      outDir: './dist'
    })
  ]
};