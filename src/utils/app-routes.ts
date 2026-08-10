export const PAYMENT_HASH_VERIFIER_ROUTE = "verify"

const RESERVED_ROUTES: Record<string, true> = { [PAYMENT_HASH_VERIFIER_ROUTE]: true }

export function normalizePathname(pathname: string): string {
  return pathname.replace(/^\/+|\/+$/g, "")
}

export function isReservedAppRoute(pathname: string): boolean {
  return RESERVED_ROUTES[normalizePathname(pathname)] === true
}

export function isPaymentHashVerifierRoute(pathname: string): boolean {
  return normalizePathname(pathname) === PAYMENT_HASH_VERIFIER_ROUTE
}

export function getVerifierParams(search: string): {
  invoice: string | null
  preimage: string | null
} {
  const params = new URLSearchParams(search)
  const invoice = params.get("q")
  const preimage = params.get("preimage")
  return { invoice, preimage }
}

export function getInvoiceFromUrl(pathname: string, search = ""): string | null {
  const queryInvoice = new URLSearchParams(search).get("q")
  if (queryInvoice) {
    return queryInvoice
  }

  if (isReservedAppRoute(pathname)) {
    return null
  }

  return normalizePathname(pathname) || null
}
