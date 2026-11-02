import test from 'node:test';
import assert from 'node:assert/strict';
import {sameFormValues} from '../src/form-state.mjs';
const form=values=>{const f=new FormData();for(const [key,value]of values)f.append(key,value);return f;};
test('late confirmations can distinguish a submitted form from a newer text draft',()=>{
 const original=form([['minutes','30'],['note','Gut']]);
 assert.equal(sameFormValues(original,form([['minutes','30'],['note','Gut']])),true);
 assert.equal(sameFormValues(original,form([['minutes','45'],['note','Gut']])),false);
 assert.equal(sameFormValues(original,form([['minutes','30'],['note','Nächste Einheit']])),false);
});
test('toggling optional checkboxes while saving counts as a newer profile draft',()=>{
 const original=form([['birth_year','1986'],['motivation_enabled','on']]);
 assert.equal(sameFormValues(original,form([['birth_year','1986']])),false);
 assert.equal(sameFormValues(form([['birth_year','1986']]),original),false);
});
