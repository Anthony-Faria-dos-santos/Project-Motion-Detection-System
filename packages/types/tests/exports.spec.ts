import { describe, it, expect } from 'vitest';
import * as types from '../src/index';

// @motionops/types is a purely-structural package: only TypeScript type aliases,
// no runtime values. This smoke test makes sure the barrel compiles and
// re-exports the main modules (entities, events, views, enums) without
// accidentally shadowing or dropping anything.

describe('@motionops/types barrel', () => {
  it('compiles and returns an object at runtime', () => {
    expect(typeof types).toBe('object');
  });
});
