// Helpers for computing cubic meters (CBM) from dimensions
export const computeCBMFromDimensions = (
  length?: number | null,
  breadth?: number | null,
  height?: number | null,
  quantity?: number | null
): number => {
  const l = Number(length) || 0;
  const b = Number(breadth) || 0;
  const h = Number(height) || 0;
  const q = Number(quantity) || 0;

  if (l > 0 && b > 0 && h > 0 && q > 0) {
    // dimensions are assumed to be in centimeters; convert to cubic meters
    return (l * b * h * q) / 1000000;
  }

  return 0;
};

export const getItemCBM = (item: any): number => {
  const raw = Number(item?.cbm) || 0;
  if (raw > 0) return raw;
  return computeCBMFromDimensions(item?.length, item?.breadth, item?.height, item?.quantity);
};
