import { fitBox } from './fitBox';

describe('fitBox', () => {
  it('keeps a square photo square', () => {
    expect(fitBox(300, 300, 1)).toEqual({ width: 300, height: 300 });
  });

  it('fills the width for a landscape photo', () => {
    expect(fitBox(300, 420, 0.75)).toEqual({ width: 300, height: 225 });
  });

  it('shrinks the width when a portrait photo would overflow the height', () => {
    expect(fitBox(300, 300, 2)).toEqual({ width: 150, height: 300 });
  });
});
