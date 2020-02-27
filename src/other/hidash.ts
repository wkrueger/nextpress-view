export function _mapValues<T extends Record<string, any>, R>(
  inp: T,
  mapper: (key: keyof T, val: T[keyof T]) => R
) {
  const out = {} as Record<string, R>;
  Object.entries(inp).map(([k, v]) => {
    out[k] = mapper(k, v);
  });
  return out;
}

export function _groupBy<T>(inp: T[], getKey: (ln: T) => any) {
  const out = {} as Record<string, T[]>;
  for (let x = 0; x < inp.length; x++) {
    const line = inp[x];
    const key = getKey(line);
    out[key] = out[key] || [];
    out[key].push(line);
  }

  return out;
}

export function _camelCase(str: string) {
  const cc = require("lodash.camelcase");
  return cc(str);
}
