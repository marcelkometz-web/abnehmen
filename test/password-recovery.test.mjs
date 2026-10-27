import test from 'node:test';import assert from 'node:assert/strict';
import {recoveryLinkState,recoveryRedirect,newPassword,clearRecoveryURL}from '../src/password-recovery.mjs';
test('recovery redirects stay in the originating app and discard untrusted return URLs',()=>{
 for(const app of ['garten','rezepte','abnehmen'])assert.equal(recoveryRedirect(`https://example.test/${app}/?next=https://evil.invalid`),`https://example.test/${app}/`);
 assert.throws(()=>recoveryRedirect('https://example.test/elsewhere/'));
});
test('PKCE recovery, expired links and other auth callbacks are distinguished',()=>{
 assert.deepEqual(recoveryLinkState('https://example.test/abnehmen/?code=one','test/PASSWORD_RECOVERY'),{requested:true,failed:false});
 assert.equal(recoveryLinkState('https://example.test/abnehmen/?code=one','test').requested,false);
 assert.equal(recoveryLinkState('https://example.test/abnehmen/?code=one').failed,true);
 assert.equal(recoveryLinkState('https://example.test/abnehmen/#error=access_denied&error_code=otp_expired').failed,true);
 assert.equal(clearRecoveryURL('https://example.test/rezepte/?recipe=5&code=one#access_token=secret'),'/rezepte/?recipe=5');
});
test('new passwords need confirmation and preserve intentional spaces',()=>{
 const f=new FormData();f.set('password','long pass phrase');f.set('confirm_password','long pass phrase');assert.equal(newPassword(f),'long pass phrase');
 f.set('confirm_password','different phrase');assert.throws(()=>newPassword(f),/nicht überein/);f.set('password','short');assert.throws(()=>newPassword(f),/12 bis 128/);
});
