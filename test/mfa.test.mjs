import test from 'node:test';import assert from 'node:assert/strict';
import {qrImageSource}from '../src/mfa.mjs';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><path fill="#000000" d="M0 0h10v10H0z"/></svg>';
test('QR handling accepts the actual supabase-js data URL and raw SVG without double encoding',()=>{
 const raw=qrImageSource(svg),sdk=qrImageSource('data:image/svg+xml;utf-8,'+svg),encoded=qrImageSource('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));
 assert.equal(raw,sdk);assert.equal(raw,encoded);assert.equal(decodeURIComponent(raw.split(',')[1]),svg);assert.ok(!decodeURIComponent(raw.split(',')[1]).startsWith('data:'));
});
test('QR loading never accepts an arbitrary URL or non-image payload',()=>{
 for(const value of ['https://outside.invalid/qr','javascript:alert(1)','not-svg',null])assert.throws(()=>qrImageSource(value));
});
