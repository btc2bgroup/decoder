import { describe, expect, it } from "vitest"
import {
  getInvoiceFromUrl,
  getVerifierParams,
  isPaymentHashVerifierRoute,
  isReservedAppRoute,
  normalizePathname,
} from "./app-routes"

describe("app route helpers", () => {
  it("normalizes leading and trailing slashes", () => {
    expect(normalizePathname("/verify/")).toBe("verify")
    expect(normalizePathname("//lnbc123//")).toBe("lnbc123")
  })

  it("reserves the /verify route", () => {
    expect(isReservedAppRoute("/verify")).toBe(true)
    expect(isPaymentHashVerifierRoute("/verify")).toBe(true)
  })

  it("does not treat reserved app routes as invoices", () => {
    expect(getInvoiceFromUrl("/verify")).toBeNull()
  })

  it("prefers q query invoices over path invoices", () => {
    expect(getInvoiceFromUrl("/anything", "?q=lnbc123")).toBe("lnbc123")
  })

  it("keeps backward-compatible path invoice loading", () => {
    expect(getInvoiceFromUrl("/lnurl1abc")).toBe("lnurl1abc")
  })

  it("extracts invoice and preimage from verifier query params", () => {
    expect(getVerifierParams("?q=lnbc123&preimage=abcd")).toEqual({
      invoice: "lnbc123",
      preimage: "abcd",
    })
  })

  it("returns nulls when no verifier params are present", () => {
    expect(getVerifierParams("")).toEqual({ invoice: null, preimage: null })
  })

  it("handles invoice-only deep links", () => {
    expect(getVerifierParams("?q=lnbc456")).toEqual({
      invoice: "lnbc456",
      preimage: null,
    })
  })
})
