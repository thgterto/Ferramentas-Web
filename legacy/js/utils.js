export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export function fmt(n, d=2) {
  if(isNaN(n) || !isFinite(n)) return '--';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function parseLocaleNumber(stringVal) {
  if (typeof stringVal === 'number') return stringVal;
  if (!stringVal) return NaN;
  let str = stringVal.toString().trim().replace(/^[^\d\-\.,]+/, '');
  if (str.indexOf(',') > -1 && str.indexOf('.') > -1) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) { str = str.replace(/\./g, '').replace(',', '.'); }
      else { str = str.replace(/,/g, ''); }
  } else if (str.indexOf(',') > -1) { str = str.replace(',', '.'); }
  return parseFloat(str);
}

export function downsamplePairs(idx, data, threshold) {
  if (threshold >= data.length || threshold === 0) return { idx, data };
  const sampledIdx = [], sampledData = [];
  const step = Math.floor(data.length / threshold);
  const len = data.length;
  for (let i = 0; i < len; i += step) {
    const end = (i + step > len) ? len : i + step;
    let minVal = Infinity, maxVal = -Infinity, minI = -1, maxI = -1;
    for(let j = i; j < end; j++) {
      if (data[j] < minVal) { minVal = data[j]; minI = idx[j]; }
      if (data[j] > maxVal) { maxVal = data[j]; maxI = idx[j]; }
    }
    if(minI === maxI) { sampledIdx.push(minI); sampledData.push(minVal); }
    else if (minI < maxI) { sampledIdx.push(minI, maxI); sampledData.push(minVal, maxVal); }
    else { sampledIdx.push(maxI, minI); sampledData.push(maxVal, minVal); }
  }
  return { idx: sampledIdx, data: sampledData };
}
