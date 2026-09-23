export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
