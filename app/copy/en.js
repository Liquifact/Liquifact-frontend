/**
 * @typedef {Object} CopyDictionary
 * @property {Object} home - Home page copy
 * @property {string} home.heroTitle
 * @property {string} home.heroSub
 * @property {string} home.boxBusinessTitle
 * @property {string} home.boxBusinessSub
 * @property {string} home.boxBusinessAriaLabel
 * @property {string} home.boxInvestTitle
 * @property {string} home.boxInvestSub
 * @property {string} home.boxInvestAriaLabel
 * @property {string} home.apiStatus
 * @property {string} home.checkApiHealth
 * @property {string} home.checking
 * @property {{ connected: string, degraded: string, unreachable: string, rawResponse: string }} home.healthStatus
 * @property {Object} invest - Invest page copy
 * @property {string} invest.title
 * @property {string} invest.subtext
 * @property {string} invest.emptyState
 * @property {string} invest.exampleHeading
 * @property {string} invest.exampleDisclaimer
 * @property {string} invest.errorTitle
 * @property {string} invest.errorDescription
 * @property {string} invest.errorStatus
 * @property {string} invest.searchPlaceholder
 * @property {string} invest.filterSoonLabel
 * @property {string} invest.filterLegend
 * @property {string} invest.retryAction
 * @property {string} invest.noMatchFilter
 * @property {string} invest.listAriaLabel
 * @property {string} invest.loadMore
 * @property {string} invest.loadMoreAriaLabel
 * @property {string} invest.yieldDisclaimer
 * @property {string} invest.labelYield
 * @property {string} invest.labelMaturity
 * @property {string} invest.announceNoInvoices
 * @property {string} invest.announceNoMatch
 * @property {string} invest.announceFilteredCount
 * @property {string} invest.announceInvoicesLoaded
 * @property {string} invest.announceShowing
 * @property {Object} invest.fundAmount - Partial funding input copy
 * @property {string} invest.fundAmount.label
 * @property {string} invest.fundAmount.placeholder
 * @property {string} invest.fundAmount.helper
 * @property {string} invest.fundAmount.expectedYieldLabel
 * @property {string} invest.fundAmount.errorRequired
 * @property {string} invest.fundAmount.errorPositive
 * @property {string} invest.fundAmount.errorExceedsBalance
 * @property {string} invest.fundAmount.errorPrecision
 * @property {string} invest.fundAmount.submitLabel
 * @property {string} invest.fundAmount.submittingLabel
 * @property {Object} invest.detail - Invoice detail page copy
 * @property {string} invest.detail.pageTitle
 * @property {string} invest.detail.pageSub
 * @property {string} invest.detail.backToMarketplace
 * @property {string} invest.detail.backToMarketplaceLabel
 * @property {string} invest.detail.backToHome
 * @property {string} invest.detail.summaryHeading
 * @property {string} invest.detail.labelIssuer
 * @property {string} invest.detail.labelAmount
 * @property {string} invest.detail.labelYield
 * @property {string} invest.detail.labelMaturity
 * @property {string} invest.detail.labelStatus
 * @property {string} invest.detail.fundButton
 * @property {string} invest.detail.fundButtonLabel
 * @property {string} invest.detail.copyLinkButton
 * @property {string} invest.detail.copyLinkButtonLabel
 * @property {string} invest.detail.printButton
 * @property {string} invest.detail.printButtonLabel
 * @property {string} invest.detail.disclaimerNote
 * @property {string} invest.detail.copySuccessMsg
 * @property {string} invest.detail.copySuccessTitle
 * @property {string} invest.detail.copyErrorMsg
 * @property {string} invest.detail.copyErrorTitle
 * @property {string} invest.detail.loadErrorMsg
 * @property {string} invest.detail.loadErrorTitle
 * @property {Object} invoices - Invoices page copy
 * @property {string} invoices.title
 * @property {string} invoices.subtext
 * @property {string} invoices.emptyState
 * @property {string} invoices.errorTitle
 * @property {string} invoices.errorDescription
 * @property {string} invoices.backToHome
 * @property {string} invoices.connectWallet
 * @property {Object} layout - Layout copy
 * @property {string} layout.backToHome
 * @property {string} layout.connectWallet
 * @property {Object} footer - Footer copy
 * @property {string} footer.docs
 * @property {string} footer.docsUrl
 * @property {string} footer.status
 * @property {string} footer.statusUrl
 * @property {string} footer.contact
 * @property {string} footer.contactUrl
 * @property {string} footer.discord
 * @property {string} footer.discordUrl
 * @property {Object} uploadZone - Upload zone copy
 * @property {string} uploadZone.requirementsTitle
 * @property {string} uploadZone.badgePdfOnly
 * @property {string} uploadZone.badgeMaxSize
 * @property {string} uploadZone.badgeOneFile
 * @property {string} uploadZone.requirementsBody
 * @property {string} uploadZone.dropZoneLabel
 * @property {string} uploadZone.fileInputLabel
 * @property {string} uploadZone.dragDropPrompt
 * @property {string} uploadZone.browsePrompt
 * @property {string} uploadZone.changeFile
 * @property {string} uploadZone.submitIdle
 * @property {string} uploadZone.submitUploading
 * @property {string} uploadZone.submitTokenizing
 * @property {string} uploadZone.statusUploading
 * @property {string} uploadZone.statusTokenizing
 * @property {string} uploadZone.statusSuccess
 * @property {string} uploadZone.spinnerLabel
 * @property {string} uploadZone.errorNoFile
 * @property {string} uploadZone.errorInvalidType
 * @property {string} uploadZone.errorOversize
 * @property {string} uploadZone.errorEmpty
 * @property {string} uploadZone.errorInvalidPdf
 * @property {string} uploadZone.errorReadFailed
 * @property {string} uploadZone.errorUploadFailed
 * @property {string} uploadZone.errorUploadStatus
 * @property {string} uploadZone.resetAction
 * @property {string} uploadZone.resetAriaLabel
 * @property {Object} wallet - Wallet copy
 * @property {string} wallet.connectButton
 * @property {string} wallet.connectingButton
 * @property {string} wallet.disconnectButton
 * @property {string} wallet.retryButton
 * @property {string} wallet.switchNetworkButton
 * @property {string} wallet.installWalletButton
 * @property {string} wallet.copyAddressButton
 * @property {string} wallet.helperDisconnected
 * @property {string} wallet.helperConnecting
 * @property {string} wallet.helperConnected
 * @property {string} wallet.helperError
 * @property {string} wallet.helperWrongNetwork
 * @property {string} wallet.helperNoWallet
 * @property {string} wallet.installWalletUrl
 * @property {string} wallet.toastConnectedTitle
 * @property {string} wallet.toastConnectedMsg
 * @property {string} wallet.toastErrorTitle
 * @property {string} wallet.toastErrorMsg
 * @property {string} wallet.toastWrongNetworkTitle
 * @property {string} wallet.toastWrongNetworkMsg
 * @property {string} wallet.toastCopySuccessTitle
 * @property {string} wallet.toastCopySuccessMsg
 * @property {string} wallet.toastCopyErrorTitle
 * @property {string} wallet.toastCopyErrorMsg
 * @property {string} wallet.errorConnect
 * @property {string} wallet.errorWrongNetwork
 * @property {string} wallet.announceConnected
 * @property {string} wallet.announceDisconnected
 * @property {string} wallet.announceError
 * @property {string} wallet.announceWrongNetwork
 * @property {string} wallet.announceNoWallet
 * @property {Object} error - Error page copy
 * @property {string} error.title
 * @property {string} error.description
 * @property {string} error.actionLabel
 * @property {string} error.previewLabel
 * @property {Object} notFound - Not found page copy
 * @property {string} notFound.heading
 * @property {string} notFound.description
 * @property {string} notFound.homeLabel
 * @property {string} notFound.statusLabel
 * @property {Object} globalError - Global error page copy
 * @property {string} globalError.heading
 * @property {string} globalError.description
 * @property {string} globalError.reloadLabel
 * @property {string} globalError.homeLabel
 * @property {Object} invoiceTimeline - Invoice lifecycle timeline copy
 * @property {string} invoiceTimeline.heading
 * @property {string} invoiceTimeline.stageUploaded
 * @property {string} invoiceTimeline.stageVerified
 * @property {string} invoiceTimeline.stageListed
 * @property {string} invoiceTimeline.stageFunded
 * @property {string} invoiceTimeline.stageSettled
 * @property {string} invoiceTimeline.statusCompleted
 * @property {string} invoiceTimeline.statusCurrent
 * @property {string} invoiceTimeline.statusPending
 */

/** @type {CopyDictionary} */
export const copy = {
  home: {
    heroTitle: "Global Invoice Liquidity Network on Stellar",
    heroSub:
      "Unlock liquidity from unpaid invoices instantly. SMEs get working capital; investors earn yield. Tokenized invoices, escrow on Soroban.",
    boxBusinessTitle: "For Businesses",
    boxBusinessSub: "Upload invoices, get instant stablecoin liquidity.",
    boxBusinessAriaLabel:
      "For Businesses \u2013 upload invoices and get instant stablecoin liquidity",
    boxInvestTitle: "For Investors",
    boxInvestSub: "Fund tokenized invoices and earn yield at maturity.",
    boxInvestAriaLabel: "For Investors \u2013 fund tokenized invoices and earn yield at maturity",
    apiStatus: "API status",
    checkApiHealth: "Check backend health",
    checking: "Checking\u2026",
    // Health status states - maps to getHealth return values
    healthStatus: {
      connected: "Connected",
      degraded: "Degraded",
      unreachable: "Unreachable",
      rawResponse: "Raw response",
    },
  },
  invest: {
    title: "Invest",
    subtext:
      "Browse tokenized invoices and fund them. Estimated yield is shown for educational purposes; actual payment is received at invoice maturity.",
    emptyState: "No investable invoices. Connect wallet to see the marketplace.",
    exampleHeading: "Example Marketplace Invoice",
    exampleDisclaimer: "EXAMPLE ONLY. NOT A LIVE OFFERING.",
    errorTitle: "Unable to load investable invoices",
    errorDescription: "Unable to load investable invoices right now.",
    errorStatus: "Unable to load investable invoices.",
    searchPlaceholder: "Search by issuer name",
    filterSoonLabel: "Soon: These filter controls are currently unavailable.",
    filterLegend: "Marketplace Filters",
    retryAction: "Try again",
    noMatchFilter: "No invoices match your filters.",
    listAriaLabel: "Investable invoices",
    loadMore: "Load more",
    loadMoreAriaLabel: "Load more invoices",
    yieldDisclaimer:
      "Note: Yield references are educational only and reflect on-chain basis-point assumptions. Invoice contracts settle at maturity.",
    labelYield: "Est. yield\u00A0",
    labelMaturity: "Maturity\u00A0",
    announceNoInvoices: "No invoices available",
    announceNoMatch: "No invoices match",
    announceFilteredCount: "{matched} of {total} invoices match",
    announceInvoicesLoaded: "{count} investable invoices loaded",
    announceShowing: "Showing {shown} of {total} investable invoices",
    fundAmount: {
      label: "Funding amount",
      placeholder: "e.g. 1000",
      helper: "Enter an amount between 1 and {max} {currency}.",
      expectedYieldLabel: "Expected yield:",
      errorRequired: "Please enter an amount.",
      errorPositive: "Amount must be greater than zero.",
      errorExceedsBalance: "Amount cannot exceed the remaining balance of {max} {currency}.",
      errorPrecision: "Amount must not exceed {decimals} decimal places for {currency}.",
      submitLabel: "Fund this invoice",
      submittingLabel: "Submitting\u2026",
    },
    detail: {
      pageTitle: "Invoice details",
      pageSub: "Review the invoice terms before funding.",
      backToMarketplace: "\u2190 Back to marketplace",
      backToMarketplaceLabel: "Back to marketplace",
      backToHome: "\u2190 LiquiFact",
      summaryHeading: "{issuer}",
      labelIssuer: "Issuer",
      labelAmount: "Amount",
      labelYield: "Estimated yield",
      labelMaturity: "Maturity date",
      labelStatus: "Status",
      fundButton: "Fund this invoice",
      fundButtonLabel: "Fund this invoice",
      copyLinkButton: "Copy link",
      copyLinkButtonLabel: "Copy invoice link to clipboard",
      printButton: "Print / Save PDF",
      printButtonLabel: "Print or save this invoice as PDF",
      disclaimerNote:
        "Note: Yield references are educational only and reflect on-chain basis-point assumptions. Invoice contracts settle at maturity. Funding commits principal and is subject to wallet approval.",
      copySuccessMsg: "Invoice link copied to clipboard.",
      copySuccessTitle: "Link copied",
      copyErrorMsg: "Could not copy link to clipboard.",
      copyErrorTitle: "Copy failed",
      loadErrorMsg: "Unable to load invoice details right now.",
      loadErrorTitle: "Unable to load invoice details",
    },
  },
  invoices: {
    title: "Invoices",
    subtext: "Upload and tokenize invoices. List will be wired to the API and Stellar.",
    emptyState: "No invoices yet. Connect wallet and upload your first invoice.",
    errorTitle: "Unable to load invoices",
    errorDescription: "There was a problem loading your invoices. Please try again later.",
    backToHome: "\u2190 LiquiFact",
    connectWallet: "Connect Wallet",
  },
  layout: {
    backToHome: "\u2190 LiquiFact",
    connectWallet: "Connect Wallet",
  },
  footer: {
    docs: "Documentation",
    docsUrl: "https://docs.liquifact.com",
    status: "System Status",
    statusUrl: "https://status.liquifact.com",
    contact: "Contact Support",
    contactUrl: "mailto:support@liquifact.com",
    discord: "Discord Community",
    discordUrl: "https://discord.gg/JrGPH4V3",
  },
  uploadZone: {
    requirementsTitle: "Upload requirements",
    badgePdfOnly: "PDF only",
    badgeMaxSize: "Max {maxSizeMb} MB",
    badgeOneFile: "One file per invoice",
    requirementsBody:
      "Only PDF documents are accepted. Files larger than {maxSizeMb} MB will be rejected. Ensure your invoice is complete and legible before uploading.",
    dropZoneLabel: "Drop PDF invoice here or press Enter to browse files",
    fileInputLabel: "Select PDF invoice file",
    dragDropPrompt: "Drag & drop your invoice PDF here",
    browsePrompt: "or click to browse",
    changeFile: "Click to choose a different file",
    submitIdle: "Upload & Tokenize Invoice",
    submitUploading: "Uploading invoice...",
    submitTokenizing: "Tokenizing invoice...",
    statusUploading: "Uploading invoice...",
    statusTokenizing: "Invoice uploaded. Pending tokenization...",
    statusSuccess: "Invoice queued for tokenization. Blockchain confirmation pending.",
    spinnerLabel: "Loading",
    errorNoFile: "No file selected.",
    errorInvalidType: 'Invalid file type "{type}". Only PDF files are accepted.',
    errorOversize: "File is {sizeMb} MB \u2014 exceeds the {maxSizeMb} MB limit.",
    errorEmpty: "File is empty (0 bytes). Please select a valid PDF file.",
    errorInvalidPdf: "The selected file does not appear to be a valid PDF.",
    errorReadFailed: "Unable to read file. Please try again.",
    errorUploadFailed: "Upload failed. Please try again.",
    errorUploadStatus: "Upload failed ({status})",
    resetAction: "Upload another invoice",
    resetAriaLabel: "Upload another invoice \u2014 clears current upload and starts fresh",
  },
  wallet: {
    connectButton: "Connect Wallet",
    connectingButton: "Connecting...",
    disconnectButton: "Disconnect",
    retryButton: "Retry Connection",
    switchNetworkButton: "Switch Network",
    installWalletButton: "Install Wallet",
    copyAddressButton: "Copy wallet address",
    helperDisconnected: "Connect your Stellar wallet to access the platform",
    helperConnecting: "Please approve the connection in your wallet",
    helperConnected: "Connected to Stellar {network}",
    helperError: "Connection failed. Please try again.",
    helperWrongNetwork: "Please switch to the Stellar public network",
    helperNoWallet: "No Stellar wallet detected. Install one to continue",
    installWalletUrl: "https://www.stellar.org/wallets",
    toastConnectedTitle: "Wallet connected",
    toastConnectedMsg: "Wallet connected successfully.",
    toastErrorTitle: "Connection failed",
    toastErrorMsg: "Failed to connect to wallet. Please try again.",
    toastWrongNetworkTitle: "Wrong network",
    toastWrongNetworkMsg: "Wallet is connected to testnet. Please switch to public network.",
    toastCopySuccessTitle: "Address copied",
    toastCopySuccessMsg: "Wallet address copied to clipboard.",
    toastCopyErrorTitle: "Copy failed",
    toastCopyErrorMsg: "Failed to copy wallet address to clipboard.",
    errorConnect: "Failed to connect to wallet. Please try again.",
    errorWrongNetwork: "Wallet is connected to testnet. Please switch to public network.",
    announceConnected: "Wallet connected.",
    announceDisconnected: "Wallet disconnected.",
    announceError: "Wallet connection failed.",
    announceWrongNetwork: "Wallet connected to wrong network.",
    announceNoWallet: "No wallet detected.",
  },
  error: {
    title: "Something went wrong",
    description: "An unexpected error occurred. We\u2019ve been notified and are looking into it.",
    actionLabel: "Try again",
    previewLabel: "Error boundary",
  },
  notFound: {
    heading: "Page not found",
    description: "The page you\u2019re looking for doesn\u2019t exist or has been moved.",
    homeLabel: "\u2190 Back to LiquiFact",
    statusLabel: "404",
  },
  globalError: {
    heading: "Critical error",
    description: "A layout-level error occurred. Please reload the page or return home.",
    reloadLabel: "Reload page",
    homeLabel: "\u2190 Back to LiquiFact",
  },
  invoiceTimeline: {
    heading: "Invoice lifecycle",
    stageUploaded: "Uploaded",
    stageVerified: "Verified",
    stageListed: "Listed",
    stageFunded: "Funded",
    stageSettled: "Settled",
    statusCompleted: "Completed",
    statusCurrent: "Current",
    statusPending: "Pending",
  },
};
