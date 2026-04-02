const SUBMERGED_TERMS = [
  'submerged',
  'underwater',
  'below water',
  'below-waterline',
  'waterline below'
];

const ABOVE_WATERLINE_TERMS = [
  'above waterline',
  'above-waterline',
  'above the waterline'
];

// Detect use case from text
export function detectUseCase(text) {
  const lower = String(text || '').toLowerCase();

  if (SUBMERGED_TERMS.some((term) => lower.includes(term))) {
    return 'submerged';
  }

  if (ABOVE_WATERLINE_TERMS.some((term) => lower.includes(term))) {
    return 'above_waterline';
  }

  return null;
}

// Main guardrail function
export function evaluateProductConstraint(product, useCaseText) {
  if (!product) {
    return {
      allowed: false,
      code: 'NO_PRODUCT',
      reason: 'No product matched'
    };
  }

  const useCase = useCaseText || null;

  // Critical test case: above-waterline-only cannot be submerged
  if (product.above_waterline_only && useCase === 'submerged') {
    return {
      allowed: false,
      code: 'CONSTRAINT_ABOVE_WATERLINE_ONLY',
      reason: `${product.sku} is above-waterline only and cannot be used for submerged applications.`
    };
  }

  // Important: if the product is above-waterline-only and the use case is missing,
  // do not allow a final quote. Ask for clarification instead.
  if (product.above_waterline_only && !useCase) {
    return {
      allowed: false,
      code: 'NEED_USECASE',
      reason: `${product.sku} is above-waterline only. Please confirm the application before I can proceed.`
    };
  }

  return {
    allowed: true,
    code: 'OK',
    reason: 'Product constraints satisfied'
  };
}

// Optional escalation helper
export function shouldEscalate(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { escalate: true, reason: 'Invalid parsed data' };
  }

  if (!parsed.sku) {
    return { escalate: true, reason: 'SKU missing or unclear' };
  }

  const confidence =
    typeof parsed.confidence === 'number' ? parsed.confidence : 0.6;

  if (confidence < 0.5) {
    return { escalate: true, reason: 'Low parsing confidence' };
  }

  return { escalate: false, reason: null };
}