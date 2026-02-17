const TAU = Math.PI * 2;

const square = (value) => value * value;

const complexAdd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });

const complexMultiply = (a, b) => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

const complexScale = (a, scalar) => ({ re: a.re * scalar, im: a.im * scalar });

export const toDomainValue = (index, size) => {
  if (size <= 1) return 0;
  return (index / (size - 1)) * 2 - 1;
};

export const holomorphicSpectrumSample = ({ x1, x2, x3, x4, x5 }) => {
  const z1 = { re: x1, im: x2 };
  const z2 = { re: x3, im: x4 };
  const z1Squared = complexMultiply(z1, z1);
  const z2Squared = complexMultiply(z2, z2);
  const carrier = complexAdd(z1Squared, z2Squared);
  const phaseCarrier = complexAdd(carrier, { re: 0, im: x5 });
  const envelope = Math.exp(
    -(
      square(x1) +
      square(x2) +
      square(x3) +
      square(x4) +
      square(x5)
    )
  );
  return complexScale(phaseCarrier, envelope);
};

export const computeFourierSlice = ({
  resolution = 40,
  sampleCount = 6,
  slice = { k3: 0, k4: 0, k5: 0 },
} = {}) => {
  const values = new Float32Array(resolution * resolution);
  const k3 = toDomainValue(slice.k3, resolution);
  const k4 = toDomainValue(slice.k4, resolution);
  const k5 = toDomainValue(slice.k5, resolution);

  let min = Infinity;
  let max = -Infinity;

  for (let y = 0; y < resolution; y += 1) {
    const k2 = toDomainValue(y, resolution);
    for (let x = 0; x < resolution; x += 1) {
      const k1 = toDomainValue(x, resolution);
      let sumRe = 0;
      let sumIm = 0;

      for (let i1 = 0; i1 < sampleCount; i1 += 1) {
        const x1 = toDomainValue(i1, sampleCount);
        for (let i2 = 0; i2 < sampleCount; i2 += 1) {
          const x2 = toDomainValue(i2, sampleCount);
          for (let i3 = 0; i3 < sampleCount; i3 += 1) {
            const x3 = toDomainValue(i3, sampleCount);
            for (let i4 = 0; i4 < sampleCount; i4 += 1) {
              const x4 = toDomainValue(i4, sampleCount);
              for (let i5 = 0; i5 < sampleCount; i5 += 1) {
                const x5 = toDomainValue(i5, sampleCount);
                const sample = holomorphicSpectrumSample({
                  x1,
                  x2,
                  x3,
                  x4,
                  x5,
                });
                const phase =
                  TAU *
                  (k1 * x1 + k2 * x2 + k3 * x3 + k4 * x4 + k5 * x5);
                const cosPhase = Math.cos(phase);
                const sinPhase = Math.sin(phase);
                sumRe += sample.re * cosPhase + sample.im * sinPhase;
                sumIm += sample.im * cosPhase - sample.re * sinPhase;
              }
            }
          }
        }
      }

      const magnitude = Math.sqrt(sumRe * sumRe + sumIm * sumIm);
      const idx = y * resolution + x;
      values[idx] = magnitude;
      if (magnitude < min) min = magnitude;
      if (magnitude > max) max = magnitude;
    }
  }

  const range = max - min || 1;
  for (let i = 0; i < values.length; i += 1) {
    values[i] = (values[i] - min) / range;
  }

  return { values, min, max };
};

export const buildSpectrumTexture = ({
  resolution = 40,
  sampleCount = 6,
  slice,
} = {}) => {
  const { values, min, max } = computeFourierSlice({
    resolution,
    sampleCount,
    slice,
  });

  const pixels = new Uint8Array(resolution * resolution * 4);
  for (let i = 0; i < values.length; i += 1) {
    const intensity = values[i];
    const r = Math.round(255 * Math.min(1, intensity * 1.4));
    const g = Math.round(255 * Math.pow(intensity, 0.6));
    const b = Math.round(255 * (1 - intensity * 0.85));
    const offset = i * 4;
    pixels[offset] = r;
    pixels[offset + 1] = g;
    pixels[offset + 2] = b;
    pixels[offset + 3] = 255;
  }

  return { pixels, min, max };
};
