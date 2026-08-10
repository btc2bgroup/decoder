import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { Separator } from "./ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"
import { parseInvoice } from "../utils/invoices"
import { PAYMENT_HASH_VERIFIER_ROUTE } from "../utils/app-routes"
import { ArrowLeft, CheckCircle2, XCircle, Shield, Copy, Zap, Share2 } from "lucide-react"

export interface VerifierInitialData {
  invoice?: string
  preimage?: string
  autoRun?: boolean
}

export interface PaymentHashVerifierProps {
  onNavigateHome?: () => void
  className?: string
  initialData?: VerifierInitialData
}

// Helper to hash a preimage using SHA-256.
// Lightning preimages are 32 raw bytes. When the input is a hex string we must
// decode it to those raw bytes BEFORE hashing — hashing the ASCII hex characters
// produces the wrong digest. Non-hex (plain text) input is hashed as UTF-8.
async function sha256(message: string): Promise<string> {
  const trimmed = message.trim()
  let data: Uint8Array
  const isHex = /^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0
  if (isHex) {
    data = new Uint8Array(trimmed.length / 2)
    for (let i = 0; i < trimmed.length; i += 2) {
      data[i / 2] = parseInt(trimmed.slice(i, i + 2), 16)
    }
  } else {
    data = new TextEncoder().encode(trimmed)
  }
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Helper to extract payment hash from decoded invoice data
function extractPaymentHash(data: Record<string, any>): string | null {
  if (!data) return null

  // BOLT11: check top-level payment_hash
  if (data.payment_hash) {
    const ph = data.payment_hash
    if (typeof ph === "string") return ph
    if (ph && typeof ph.toString === "function") return ph.toString("hex")
    return String(ph)
  }

  // BOLT11: check tags array
  if (data.tags && Array.isArray(data.tags)) {
    const paymentHashTag = data.tags.find(
      (tag: any) => tag.tagName === "payment_hash" || tag.tagName === "paymentHash"
    )
    if (paymentHashTag && paymentHashTag.data) {
      const ph = paymentHashTag.data
      if (typeof ph === "string") return ph
      if (ph && typeof ph.toString === "function") return ph.toString("hex")
      return String(ph)
    }
  }

  // BOLT12: check top-level paymentHash
  if (data.paymentHash) {
    const ph = data.paymentHash
    if (typeof ph === "string") return ph
    if (ph && typeof ph.toString === "function") return ph.toString("hex")
    return String(ph)
  }

  return null
}

const PaymentHashVerifier: React.FC<PaymentHashVerifierProps> = ({
  onNavigateHome,
  className,
  initialData,
}) => {
  const [invoiceInput, setInvoiceInput] = useState(initialData?.invoice ?? "")
  const [paymentHash, setPaymentHash] = useState<string | null>(null)
  const [preimageInput, setPreimageInput] = useState(initialData?.preimage ?? "")
  const [verificationResult, setVerificationResult] = useState<"match" | "no-match" | null>(null)
  const [computedHash, setComputedHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const preimageRef = useRef<HTMLInputElement>(null)

  // Decode an invoice and return its payment hash, or null on failure.
  // Accepts an optional override so callers (deep-link auto-run) can decode
  // before state has propagated.
  const handleDecodeInvoice = async (rawInvoice?: string): Promise<string | null> => {
    const invoice = (rawInvoice ?? invoiceInput).trim()
    if (!invoice) {
      setError("Please enter a Lightning invoice")
      return null
    }

    setIsLoading(true)
    setError(null)
    setPaymentHash(null)
    setVerificationResult(null)
    setComputedHash(null)

    try {
      const result = await parseInvoice(invoice)

      if (result?.error) {
        setError(result.error)
        return null
      }

      if (!result?.data) {
        setError("Could not decode this invoice")
        return null
      }

      const hash = extractPaymentHash(result.data)
      if (!hash) {
        setError("No payment hash found in this invoice. Make sure it is a BOLT11 or BOLT12 invoice.")
        return null
      }

      setPaymentHash(hash)
      // Focus on preimage input after successful decode
      setTimeout(() => preimageRef.current?.focus(), 100)
      return hash
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decode invoice")
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Verify a preimage against a payment hash. Accepts optional overrides so
  // the deep-link auto-run can chain directly with the hash just returned by
  // handleDecodeInvoice, without waiting for React state to settle.
  const handleVerify = async (rawPreimage?: string, overrideHash?: string): Promise<void> => {
    const preimage = (rawPreimage ?? preimageInput).trim()
    const hashToCompare = overrideHash ?? paymentHash

    if (!preimage) {
      setError("Please enter a preimage")
      return
    }

    if (!hashToCompare) {
      setError("Please decode an invoice first")
      return
    }

    setIsVerifying(true)
    setError(null)
    setVerificationResult(null)
    setComputedHash(null)

    try {
      const hash = await sha256(preimage)
      setComputedHash(hash)

      // Normalize payment hash for comparison (remove spaces, lowercase)
      const normalizedPaymentHash = hashToCompare.replace(/\s/g, "").toLowerCase()
      const normalizedComputedHash = hash.toLowerCase()

      if (normalizedComputedHash === normalizedPaymentHash) {
        setVerificationResult("match")
      } else {
        setVerificationResult("no-match")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compute hash")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCopyHash = () => {
    if (paymentHash) {
      navigator.clipboard.writeText(paymentHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClear = () => {
    setInvoiceInput("")
    setPaymentHash(null)
    setPreimageInput("")
    setVerificationResult(null)
    setComputedHash(null)
    setError(null)
  }

  // Build a shareable deep-link that reproduces this verification state.
  const buildShareLink = useCallback(() => {
    const params = new URLSearchParams()
    if (invoiceInput.trim()) params.set("q", invoiceInput.trim())
    if (preimageInput.trim()) params.set("preimage", preimageInput.trim())
    const base = `${window.location.origin}/${PAYMENT_HASH_VERIFIER_ROUTE}`
    return qs ? `${base}?${qs}` : base
  }, [invoiceInput, preimageInput])

  const handleShareLink = async () => {
    const link = buildShareLink()
    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
 // clipboard unavailable — still surface the link so the user can copy manually
      window.prompt("Copy this link:", link)
    }
  }

  // Deep-link auto-run: when initialData.autoRun is set, decode the invoice
  // then verify the preimage immediately so the shareable link lands on the
  // result without an extra click.
  useEffect(() => {
 if (!initialData?.autoRun) return
 if (!initialData.invoice || !initialData.preimage) return
 const invoice = initialData.invoice
 const preimage = initialData.preimage
 setInvoiceInput(invoice)
 setPreimageInput(preimage)
 void (async () => {
 const hash = await handleDecodeInvoice(invoice)
 if (hash) await handleVerify(preimage, hash)
 })()
 // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Payment Hash Verifier
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Verify that a preimage hashes to a payment hash
          </p>
        </div>
        <Button variant="ghost" onClick={onNavigateHome} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Decoder
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Step 1: Decode Invoice */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Step 1</Badge>
              <CardTitle className="text-lg">Enter Invoice</CardTitle>
            </div>
            <CardDescription>
              Paste a BOLT11 or BOLT12 invoice to extract its payment hash
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value)}
                placeholder="Paste a Lightning invoice (BOLT11 or BOLT12)"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleDecodeInvoice()}
              />
              <Button
                onClick={handleDecodeInvoice}
                disabled={isLoading || !invoiceInput.trim()}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                {isLoading ? "Decoding..." : "Decode"}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {paymentHash && (
              <div className="space-y-2">
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">Payment Hash</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyHash}
                          className="gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy payment hash to clipboard</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <code className="block text-xs bg-muted p-3 rounded font-mono break-all">
                  {paymentHash}
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Verify Preimage */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Step 2</Badge>
              <CardTitle className="text-lg">Enter Preimage</CardTitle>
            </div>
            <CardDescription>
              Enter the preimage to verify it matches the payment hash
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                ref={preimageRef}
                value={preimageInput}
                onChange={(e) => setPreimageInput(e.target.value)}
                placeholder="Paste the preimage (hex or plain text)"
                className="flex-1"
                disabled={!paymentHash}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
              <Button
                onClick={handleVerify}
                disabled={isVerifying || !paymentHash || !preimageInput.trim()}
                variant={verificationResult === "match" ? "default" : "secondary"}
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>
            </div>

            {/* Result Display */}
            {verificationResult && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center gap-3">
                  {verificationResult === "match" ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                      <div>
                        <p className="font-medium text-green-600">Preimage is valid!</p>
                        <p className="text-sm text-muted-foreground">
                          The SHA-256 hash of the preimage matches the payment hash.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-500" />
                      <div>
                        <p className="font-medium text-red-600">Preimage does not match</p>
                        <p className="text-sm text-muted-foreground">
                          The SHA-256 hash of the preimage does not match the payment hash.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Invoice Payment Hash</span>
                    <code className="text-xs font-mono">{paymentHash}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Computed SHA-256 Hash</span>
                    <code className="text-xs font-mono">{computedHash}</code>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleShareLink}
            disabled={!invoiceInput.trim() && !preimageInput.trim()}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            {linkCopied ? "Link copied!" : "Share Link"}
          </Button>
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
        </div>
      </div>
    </div>
  )
}

export { PaymentHashVerifier }
