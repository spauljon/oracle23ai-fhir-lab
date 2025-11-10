import { describe, expect, it } from 'vitest';
import { familyName, firstGivenName } from '../../fhir/humanName';

describe('human name tests', () => {
  it('no human names', async () => {
    expect(firstGivenName(undefined)).toBeNull();
  });
  it('human name, no given', async () => {
    const actual = [{
      text: 'some funky name'
    }];
    expect(firstGivenName(actual)).toBeNull();
  });
  it('human name, 1 given', async () => {
    const actual = [{
      given: ['henry']
    }];
    expect(firstGivenName(actual)).toBe('henry');
  });
  it('human name, 2 given', async () => {
    const actual = [{
      given: ['henry', 'spenry']
    }];
    expect(firstGivenName(actual)).toBe('henry');
  });
  it('human name, no family', async () => {
    const actual = [{
      given: ['henry', 'spenry']
    }];
    expect(familyName(actual)).toBeNull();
  });
  it('human name, family', async () => {
    const actual = [{
      family: 'winkler'
    }];
    expect(familyName(actual)).toBe('winkler');
  });
});
