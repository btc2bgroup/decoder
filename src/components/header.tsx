import * as React from "react"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet"
import { cn } from "../lib/utils"
import { Menu, Shield, QrCode } from "lucide-react"

const GithubIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

export interface HeaderProps {
  appName?: string
  tagline?: string
  subTagline?: string
  githubUrl?: string
  onClearResults?: () => void
  onNavigateToVerifier?: () => void
  onOpenQRScanner?: () => void
  className?: string
}

const Header: React.FC<HeaderProps> = ({
  appName = "Lightning Decoder",
  tagline = "Decode Lightning Network Requests",
  subTagline = "Lightning Address, LNURL, BOLT11 & BOLT12",
  githubUrl = "https://github.com/andrerfneves/lightning-decoder",
  onClearResults,
  onNavigateToVerifier,
  onOpenQRScanner,
  className,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const handleMobileAction = (action?: () => void) => {
    setMobileMenuOpen(false)
    action?.()
  }

  return (
    <header className={cn("w-full", className)}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <a
            href="https://btc2bgroup.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-5 inline-flex items-center gap-3"
          >
            <img src="/btc2b-logo.png" alt="BTC2B Group" className="h-9 w-9 sm:h-10 sm:w-10" />
            <span className="font-heading text-sm font-extrabold tracking-tight text-white sm:text-base">
              BTC2B <span className="font-bold text-white/70">Group</span>
            </span>
          </a>

          <p className="eyebrow mb-3">Lightning tools</p>

          <h1 className="font-heading text-3xl font-extrabold leading-[1.05] tracking-[-0.025em] text-white sm:text-5xl">
            {onClearResults ? (
              <button
                type="button"
                className="text-left"
                onClick={onClearResults}
              >
                {appName}
                <span className="text-orange">.</span>
              </button>
            ) : (
              <span>
                {appName}
                <span className="text-orange">.</span>
              </span>
            )}
          </h1>
          <p className="mt-3 text-base text-white/80 sm:text-lg">{tagline}</p>
          <p className="mt-1 font-heading text-[11px] font-bold uppercase tracking-[0.18em] text-white/55 sm:text-xs">{subTagline}</p>
        </div>

        <div className="sm:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border-white/60 text-white hover:border-orange hover:bg-orange"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="bg-popover pb-8 text-popover-foreground"
            >
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Tools</div>
                  <Button
                    variant="ghost"
                    className="h-12 w-full justify-start gap-3 px-0 text-base"
                    onClick={() => handleMobileAction(onNavigateToVerifier)}
                  >
                    <Shield className="h-5 w-5" />
                    Payment Hash Verifier
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-12 w-full justify-start gap-3 px-0 text-base"
                    onClick={() => handleMobileAction(onOpenQRScanner)}
                  >
                    <QrCode className="h-5 w-5" />
                    Scan QR Code
                  </Button>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="text-sm font-medium text-muted-foreground">Resources</div>
                  <Button
                    asChild
                    variant="ghost"
                    className="h-12 w-full justify-start gap-3 px-0 text-base"
                  >
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <GithubIcon />
                      GitHub
                    </a>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden sm:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 gap-2 border-white/60 px-3 text-white hover:border-orange hover:bg-orange"
              >
                <Menu className="h-5 w-5" />
                <span>Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 bg-popover text-popover-foreground"
            >
              <DropdownMenuLabel>Tools</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={onNavigateToVerifier}
                className="gap-2 whitespace-nowrap"
              >
                <Shield className="h-4 w-4" />
                Payment Hash Verifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenQRScanner}
                className="gap-2 whitespace-nowrap"
              >
                <QrCode className="h-4 w-4" />
                Scan QR Code
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Resources</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2 w-full cursor-pointer"
                >
                  <GithubIcon />
                  GitHub
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export { Header }
