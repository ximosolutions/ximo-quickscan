import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ContractError, parseJson, validateInventory, compareCompanyNames,
  toCustomerOpportunity, CHAPTERS
} from '../src/contracts.js';

const inventory = {schema:'ximo-inventarisatie',version:1,values:{company:'Voorbeeld BV',processes:[]},visited:[0]};

test('existing inventory v1 export is supported', () => {
  assert.equal(validateInventory(inventory).company, 'Voorbeeld BV');
});

test('unknown schema version fails safely', () => {
  assert.throws(() => validateInventory({...inventory,version:2}), e => e instanceof ContractError && e.code === 'UNSUPPORTED_VERSION');
});

test('invalid JSON has a clear error', () => {
  assert.throws(() => parseJson('{'), e => e.code === 'INVALID_JSON');
});

test('matching legal-name spelling is accepted', () => {
  assert.equal(compareCompanyNames('Voorbeeld B.V.', 'voorbeeld bv').status, 'match');
});

test('different names require review rather than false certainty', () => {
  assert.equal(compareCompanyNames('Handelsnaam', 'Juridische Naam B.V.').status, 'uncertain');
});

test('internal solution details never enter customer data', () => {
  const source = {id:'k1',title:'Communicatie',benefits:'Minder overdrachten',internalSolution:'Gebruik tool X',integrations:['CRM']};
  const customer = toCustomerOpportunity(source);
  assert.equal(customer.title, 'Communicatie');
  assert.equal('internalSolution' in customer, false);
  assert.equal('integrations' in customer, false);
});

test('reports use exactly six fixed chapters', () => assert.equal(CHAPTERS.length, 6));
