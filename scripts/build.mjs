import { build } from 'esbuild';
await build({ entryPoints: ['src/app.mjs'], bundle: true, minify: true, format: 'esm', target: ['es2022'], outfile: 'app.js', legalComments: 'eof' });
