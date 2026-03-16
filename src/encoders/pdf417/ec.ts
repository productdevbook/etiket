/**
 * PDF417 Reed-Solomon error correction over GF(929)
 * Based on ISO/IEC 15438
 *
 * The error correction uses polynomial arithmetic modulo 929 (a prime field).
 * EC levels 0-8 produce 2^(level+1) error correction codewords.
 */

const GF_MOD = 929;

/**
 * Get the number of EC codewords for a given EC level.
 * EC level L produces 2^(L+1) codewords.
 * Level 0 = 2, Level 1 = 4, ..., Level 8 = 512
 */
export function getECCount(ecLevel: number): number {
  if (ecLevel < 0 || ecLevel > 8) {
    throw new Error(`PDF417 EC level must be 0-8, got ${ecLevel}`);
  }
  return 1 << (ecLevel + 1);
}

/**
 * Generate the Reed-Solomon generator polynomial for a given EC level.
 * g(x) = (x - 3^0)(x - 3^1)(x - 3^2)...(x - 3^(k-1))
 * where k = 2^(ecLevel+1)
 *
 * All arithmetic is modulo 929.
 *
 * @param ecLevel - Error correction level (0-8)
 * @returns Coefficient array [g_k, g_{k-1}, ..., g_1, g_0] where g(x) = g_k*x^k + ... + g_0
 */
function buildGeneratorPolynomial(ecLevel: number): number[] {
  const k = getECCount(ecLevel);
  // Generator polynomial coefficients, highest degree first
  // Start with g(x) = 1 (i.e., [1])
  let gen = [1];

  for (let i = 0; i < k; i++) {
    // Multiply gen by (x - 3^i) = (x - alpha^i)
    const alpha = modPow(3, i, GF_MOD);
    const newGen = Array.from({ length: gen.length + 1 }, () => 0);

    for (let j = 0; j < gen.length; j++) {
      // x * gen[j]
      newGen[j] = (newGen[j]! + gen[j]!) % GF_MOD;
      // -alpha * gen[j]
      newGen[j + 1] = (newGen[j + 1]! + GF_MOD - ((gen[j]! * alpha) % GF_MOD)) % GF_MOD;
    }

    gen = newGen;
  }

  return gen;
}

/**
 * Compute base^exp mod modulus using modular exponentiation.
 */
function modPow(base: number, exp: number, modulus: number): number {
  let result = 1;
  base = base % modulus;
  while (exp > 0) {
    if (exp & 1) {
      result = (result * base) % modulus;
    }
    exp = exp >> 1;
    base = (base * base) % modulus;
  }
  return result;
}

// Cache generator polynomials per EC level
const generatorCache: Map<number, number[]> = new Map();

function getGenerator(ecLevel: number): number[] {
  let gen = generatorCache.get(ecLevel);
  if (!gen) {
    gen = buildGeneratorPolynomial(ecLevel);
    generatorCache.set(ecLevel, gen);
  }
  return gen;
}

/**
 * Generate error correction codewords for PDF417 data.
 *
 * Performs polynomial division of the data polynomial by the generator polynomial,
 * all modulo 929. The remainder coefficients are the EC codewords.
 *
 * @param dataCodewords - Array of data codewords (including symbol length descriptor)
 * @param ecLevel - Error correction level (0-8)
 * @returns Array of EC codewords
 */
export function generateECCodewords(dataCodewords: number[], ecLevel: number): number[] {
  const gen = getGenerator(ecLevel);
  const k = getECCount(ecLevel);

  // Polynomial long division
  // We compute: data * x^k mod generator
  const remainder = Array.from({ length: k }, () => 0);

  for (const cw of dataCodewords) {
    const t = (cw + remainder[0]!) % GF_MOD;
    // Shift remainder left by 1
    for (let j = 0; j < k - 1; j++) {
      remainder[j] = (remainder[j + 1]! + GF_MOD - ((t * gen[j + 1]!) % GF_MOD)) % GF_MOD;
    }
    remainder[k - 1] = (GF_MOD - ((t * gen[k]!) % GF_MOD)) % GF_MOD;
  }

  // Negate the remainder coefficients (mod 929)
  for (let i = 0; i < k; i++) {
    remainder[i] = remainder[i] === 0 ? 0 : GF_MOD - remainder[i]!;
  }

  return remainder;
}

/**
 * Recommended minimum EC level based on data codeword count.
 * From the PDF417 specification.
 */
export function recommendedECLevel(dataCodewords: number): number {
  if (dataCodewords <= 40) return 2;
  if (dataCodewords <= 160) return 3;
  if (dataCodewords <= 320) return 4;
  if (dataCodewords <= 863) return 5;
  return 6;
}
