import { useState, useEffect, useRef } from "react"
import { Header } from "./components/header"
import { SearchInput } from "./components/search-input"
import { QRScanner } from "./components/qr-scanner"
import { InvoiceDetails } from "./components/invoice-details"
import { ErrorDisplay } from "./components/error-display"
import { PaymentHashVerifier } from "./components/payment-hash-verifier"
import { Dialog, DialogContent } from "./components/ui/dialog"
import { parseInvoice } from "./utils/invoices"
import {
  getInvoiceFromUrl,
  getVerifierParams,
  isPaymentHashVerifierRoute,
  PAYMENT_HASH_VERIFIER_ROUTE,
} from "./utils/app-routes"
import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import { Loader2 } from "lucide-react"

function App() {
  const [inputValue, setInputValue] = useState("")
  const [invoiceData, setInvoiceData] = useState<Record<string, any> | null>(null)
  const [invoiceType, setInvoiceType] = useState<"bolt11" | "lnurl" | "bolt12" | "lightning-address" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [paymentHashVerifierOpen, setPaymentHashVerifierOpen] = useState(false)
  const [verifierInitial, setVerifierInitial] = useState<{
    invoice?: string
    preimage?: string
    autoRun?: boolean
  } | null>(null)
  const [shouldLiftContent, setShouldLiftContent] = useState(false)
  const [idleTopOffset, setIdleTopOffset] = useState(128)
  const inputRef = useRef<HTMLInputElement>(null)
  const topModuleRef = useRef<HTMLDivElement>(null)
  const verifierReturnUrlRef = useRef("/")

  useEffect(() => {
    if (isPaymentHashVerifierRoute(window.location.pathname)) {
      setPaymentHashVerifierOpen(true)
      const { invoice, preimage } = getVerifierParams(window.location.search)
      if (invoice || preimage) {
        setVerifierInitial({ invoice, preimage, autoRun: !!invoice && !!preimage })
      }
      return
    }

    const invoiceToLoad = getInvoiceFromUrl(window.location.pathname, window.location.search)

    if (invoiceToLoad) {
      setInputValue(invoiceToLoad)
      setShouldLiftContent(true)
      handleDecode(invoiceToLoad)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setPaymentHashVerifierOpen(isPaymentHashVerifierRoute(window.location.pathname))
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    const updateIdleOffset = () => {
      if (window.innerWidth < 640) {
        setIdleTopOffset(32)
        return
      }

      const topModuleHeight = topModuleRef.current?.getBoundingClientRect().height ?? 0
      const centeredOffset = (window.innerHeight - topModuleHeight) / 2
      setIdleTopOffset(Math.max(32, centeredOffset))
    }

    updateIdleOffset()

    const observer = new ResizeObserver(updateIdleOffset)
    if (topModuleRef.current) {
      observer.observe(topModuleRef.current)
    }

    window.addEventListener("resize", updateIdleOffset)
    document.fonts?.ready.then(updateIdleOffset)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateIdleOffset)
    }
  }, [])

  const handleDecode = async (value?: string) => {
    const invoiceToDecode = value || inputValue
    if (!invoiceToDecode.trim()) {
      setShouldLiftContent(true)
      setError("Please enter a Lightning invoice, LNURL, or Lightning address")
      return
    }

    setShouldLiftContent(true)
    setIsLoading(true)
    setError(null)
    setInvoiceData(null)
    setInvoiceType(null)

    try {
      const result = await parseInvoice(invoiceToDecode)

      if (result.error) {
        setError(result.error)
        return
      }

      if (!result.data) {
        setError("Could not decode this invoice")
        return
      }

      if (result.isBOLT12) {
        setInvoiceType("bolt12")
      } else if (result.isLNURL) {
        setInvoiceType(result.isLNAddress ? "lightning-address" : "lnurl")
      } else {
        setInvoiceType("bolt11")
      }

      setInvoiceData(result.data)
      window.history.pushState({}, "", `/?q=${encodeURIComponent(invoiceToDecode)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while decoding")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setInputValue("")
    setInvoiceData(null)
    setInvoiceType(null)
    setError(null)
    window.history.pushState({}, "", "/")
    inputRef.current?.focus()
  }

  const handleQRScan = (data: string) => {
    setInputValue(data)
    setQrScannerOpen(false)
    handleDecode(data)
  }

  const handleOpenPaymentHashVerifier = () => {
    verifierReturnUrlRef.current = `${window.location.pathname}${window.location.search}${window.location.hash}`
    setPaymentHashVerifierOpen(true)
    window.history.pushState({}, "", `/${PAYMENT_HASH_VERIFIER_ROUTE}`)
  }

  const handlePaymentHashVerifierOpenChange = (open: boolean) => {
    setPaymentHashVerifierOpen(open)

    if (!open && isPaymentHashVerifierRoute(window.location.pathname)) {
      window.history.replaceState({}, "", verifierReturnUrlRef.current || "/")
    }
  }

  const handleNavigateHome = () => {
    handlePaymentHashVerifierOpenChange(false)
  }

  const handleOpenQRScanner = () => {
    setQrScannerOpen(true)
  }

  const hasActiveContent = isLoading || !!error || !!invoiceData
  const errorTone = error?.toLowerCase().includes("please enter") ? "warning" : "error"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LayoutGroup>
        <main className="container mx-auto w-full max-w-4xl px-4 pb-8">
          <motion.div
            aria-hidden="true"
            className="shrink-0"
            initial={false}
            animate={{ height: shouldLiftContent ? 32 : idleTopOffset }}
            transition={{ duration: 0.32, ease: "easeInOut" }}
          />

          <motion.section
            layout
            className="w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div ref={topModuleRef} className="btc2b-hero px-5 pb-8 pt-7 sm:px-10 sm:pb-10 sm:pt-9">
              <Header
                onClearResults={invoiceData ? handleClear : undefined}
                onNavigateToVerifier={handleOpenPaymentHashVerifier}
                onOpenQRScanner={handleOpenQRScanner}
              />

              <div className="mt-2">
                <SearchInput
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    if (error) {
                      setError(null)
                    }
                  }}
                  onSubmit={invoiceData ? handleClear : () => handleDecode()}
                  isLoading={isLoading}
                  hasResult={!!invoiceData}
                  placeholder="Enter invoice or address"
                  className="w-full [&_input]:h-14 [&_input]:border-white/25 [&_input]:bg-white/10 [&_input]:px-5 [&_input]:text-base [&_input]:text-white [&_input]:backdrop-blur-sm [&_input]:placeholder:text-white/50 [&_input]:focus-visible:border-orange [&_input]:focus-visible:ring-orange [&_input]:focus-visible:ring-offset-0 [&_button]:right-3 [&_button]:h-9 [&_button]:w-9 [&_button]:bg-orange [&_button]:text-white [&_button]:hover:bg-orange-light [&_button]:hover:text-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-6">
              <AnimatePresence
                mode="wait"
                initial={false}
                onExitComplete={() => {
                  if (!hasActiveContent) {
                    setShouldLiftContent(false)
                  }
                }}
              >
                {isLoading && (
                  <motion.div
                    key="loading"
                    layout
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-3 border border-border border-l-4 border-l-orange bg-card p-4 text-card-foreground shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-orange" />
                      <div>
                        <p className="text-sm font-medium">Decoding request</p>
                        <p className="text-xs text-muted-foreground">Checking the invoice or address details...</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!isLoading && error && (
                  <motion.div
                    key="error"
                    layout
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <ErrorDisplay message={error} tone={errorTone} />
                  </motion.div>
                )}

                {!isLoading && invoiceData && invoiceType && (
                  <motion.div
                    key="invoice"
                    layout
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <InvoiceDetails type={invoiceType} data={invoiceData} className="border-t-4 border-t-orange" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </main>
      </LayoutGroup>

      <footer className="container mx-auto w-full max-w-4xl px-4 pb-10">
        <div className="flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <a
            href="https://btc2bgroup.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-heading text-[11px] font-bold uppercase tracking-[0.2em] text-navy transition-colors hover:text-orange dark:text-white dark:hover:text-orange"
          >
            <img src="/btc2b-logo.png" alt="" className="h-5 w-5" />
            BTC2B Group
          </a>
          <span>Bridging Bitcoin to Business<span className="text-orange">.</span></span>
        </div>
      </footer>

      <QRScanner
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onScan={handleQRScan}
      />

      <Dialog
        open={paymentHashVerifierOpen}
        onOpenChange={handlePaymentHashVerifierOpenChange}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-[hsl(var(--background))] text-[hsl(var(--foreground))] sm:max-w-4xl">
          <PaymentHashVerifier
            onNavigateHome={handleNavigateHome}
            initialData={verifierInitial ?? undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
