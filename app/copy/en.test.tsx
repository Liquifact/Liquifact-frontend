import { copy } from "./en";

describe("copy dictionary — key presence", () => {
  describe("invest", () => {
    it("has all required keys", () => {
      expect(copy.invest.title).toBeDefined();
      expect(copy.invest.subtext).toBeDefined();
      expect(copy.invest.emptyState).toBeDefined();
      expect(copy.invest.exampleHeading).toBeDefined();
      expect(copy.invest.exampleDisclaimer).toBeDefined();
      expect(copy.invest.errorTitle).toBeDefined();
      expect(copy.invest.errorDescription).toBeDefined();
      expect(copy.invest.errorStatus).toBeDefined();
      expect(copy.invest.searchPlaceholder).toBeDefined();
      expect(copy.invest.filterSoonLabel).toBeDefined();
      expect(copy.invest.filterLegend).toBeDefined();
      expect(copy.invest.retryAction).toBeDefined();
      expect(copy.invest.noMatchFilter).toBeDefined();
      expect(copy.invest.listAriaLabel).toBeDefined();
      expect(copy.invest.loadMore).toBeDefined();
      expect(copy.invest.loadMoreAriaLabel).toBeDefined();
      expect(copy.invest.yieldDisclaimer).toBeDefined();
      expect(copy.invest.labelYield).toBeDefined();
      expect(copy.invest.labelMaturity).toBeDefined();
      expect(copy.invest.announceNoInvoices).toBeDefined();
      expect(copy.invest.announceNoMatch).toBeDefined();
      expect(copy.invest.announceFilteredCount).toBeDefined();
      expect(copy.invest.announceInvoicesLoaded).toBeDefined();
      expect(copy.invest.announceShowing).toBeDefined();
    });

    it("has non-empty string values for all keys", () => {
      const stringKeys = [
        "title",
        "subtext",
        "emptyState",
        "errorTitle",
        "errorDescription",
        "errorStatus",
        "searchPlaceholder",
        "filterSoonLabel",
        "filterLegend",
        "retryAction",
        "noMatchFilter",
        "listAriaLabel",
        "loadMore",
        "loadMoreAriaLabel",
        "yieldDisclaimer",
        "labelYield",
        "labelMaturity",
        "announceNoInvoices",
        "announceNoMatch",
        "announceFilteredCount",
        "announceInvoicesLoaded",
        "announceShowing",
      ];
      for (const key of stringKeys) {
        expect(typeof copy.invest[key]).toBe("string");
        expect(copy.invest[key].length).toBeGreaterThan(0);
      }
    });
  });

  describe("uploadZone", () => {
    it("has all required keys including error messages", () => {
      expect(copy.uploadZone.requirementsTitle).toBeDefined();
      expect(copy.uploadZone.badgePdfOnly).toBeDefined();
      expect(copy.uploadZone.badgeMaxSize).toBeDefined();
      expect(copy.uploadZone.badgeOneFile).toBeDefined();
      expect(copy.uploadZone.requirementsBody).toBeDefined();
      expect(copy.uploadZone.dropZoneLabel).toBeDefined();
      expect(copy.uploadZone.fileInputLabel).toBeDefined();
      expect(copy.uploadZone.dragDropPrompt).toBeDefined();
      expect(copy.uploadZone.browsePrompt).toBeDefined();
      expect(copy.uploadZone.changeFile).toBeDefined();
      expect(copy.uploadZone.submitIdle).toBeDefined();
      expect(copy.uploadZone.submitUploading).toBeDefined();
      expect(copy.uploadZone.submitTokenizing).toBeDefined();
      expect(copy.uploadZone.statusUploading).toBeDefined();
      expect(copy.uploadZone.statusTokenizing).toBeDefined();
      expect(copy.uploadZone.statusSuccess).toBeDefined();
      expect(copy.uploadZone.spinnerLabel).toBeDefined();
      expect(copy.uploadZone.errorNoFile).toBeDefined();
      expect(copy.uploadZone.errorInvalidType).toBeDefined();
      expect(copy.uploadZone.errorOversize).toBeDefined();
      expect(copy.uploadZone.errorEmpty).toBeDefined();
      expect(copy.uploadZone.errorInvalidPdf).toBeDefined();
      expect(copy.uploadZone.errorReadFailed).toBeDefined();
      expect(copy.uploadZone.errorUploadFailed).toBeDefined();
      expect(copy.uploadZone.errorUploadStatus).toBeDefined();
    });
  });

  describe("wallet", () => {
    it("has all required keys including announcement strings", () => {
      expect(copy.wallet.connectButton).toBeDefined();
      expect(copy.wallet.connectingButton).toBeDefined();
      expect(copy.wallet.disconnectButton).toBeDefined();
      expect(copy.wallet.retryButton).toBeDefined();
      expect(copy.wallet.switchNetworkButton).toBeDefined();
      expect(copy.wallet.installWalletButton).toBeDefined();
      expect(copy.wallet.copyAddressButton).toBeDefined();
      expect(copy.wallet.helperDisconnected).toBeDefined();
      expect(copy.wallet.helperConnecting).toBeDefined();
      expect(copy.wallet.helperConnected).toBeDefined();
      expect(copy.wallet.helperError).toBeDefined();
      expect(copy.wallet.helperWrongNetwork).toBeDefined();
      expect(copy.wallet.helperNoWallet).toBeDefined();
      expect(copy.wallet.installWalletUrl).toBeDefined();
      expect(copy.wallet.toastCopySuccessTitle).toBeDefined();
      expect(copy.wallet.toastCopySuccessMsg).toBeDefined();
      expect(copy.wallet.toastCopyErrorTitle).toBeDefined();
      expect(copy.wallet.toastCopyErrorMsg).toBeDefined();
      expect(copy.wallet.announceConnected).toBeDefined();
      expect(copy.wallet.announceDisconnected).toBeDefined();
      expect(copy.wallet.announceError).toBeDefined();
      expect(copy.wallet.announceWrongNetwork).toBeDefined();
      expect(copy.wallet.announceNoWallet).toBeDefined();
    });

    it("announcement strings match expected values (byte-identical)", () => {
      expect(copy.wallet.announceConnected).toBe("Wallet connected.");
      expect(copy.wallet.announceDisconnected).toBe("Wallet disconnected.");
      expect(copy.wallet.announceError).toBe("Wallet connection failed.");
      expect(copy.wallet.announceWrongNetwork).toBe("Wallet connected to wrong network.");
      expect(copy.wallet.announceNoWallet).toBe("No wallet detected.");
    });
  });

  describe("home", () => {
    it("has required keys", () => {
      expect(copy.home.heroTitle).toBeDefined();
      expect(copy.home.heroSub).toBeDefined();
      expect(copy.home.apiStatus).toBeDefined();
      expect(copy.home.checkApiHealth).toBeDefined();
      expect(copy.home.checking).toBeDefined();
    });
  });

  describe("error", () => {
    it("has required keys", () => {
      expect(copy.error.title).toBeDefined();
      expect(copy.error.description).toBeDefined();
      expect(copy.error.actionLabel).toBeDefined();
    });
  });

  describe("notFound", () => {
    it("has required keys", () => {
      expect(copy.notFound.heading).toBeDefined();
      expect(copy.notFound.description).toBeDefined();
      expect(copy.notFound.homeLabel).toBeDefined();
      expect(copy.notFound.statusLabel).toBeDefined();
    });
  });

  describe("globalError", () => {
    it("has required keys", () => {
      expect(copy.globalError.heading).toBeDefined();
      expect(copy.globalError.description).toBeDefined();
      expect(copy.globalError.reloadLabel).toBeDefined();
      expect(copy.globalError.homeLabel).toBeDefined();
    });
  });

  describe("footer", () => {
    it("has required keys", () => {
      expect(copy.footer.docs).toBeDefined();
      expect(copy.footer.status).toBeDefined();
      expect(copy.footer.contact).toBeDefined();
    });
  });
});

describe("copy dictionary — template placeholder consistency", () => {
  it("invest announcement templates use {count}, {matched}, {total}, {shown} placeholders", () => {
    // Verify placeholders resolve to readable strings
    expect(copy.invest.announceInvoicesLoaded.replace("{count}", "5")).toBe(
      "5 investable invoices loaded"
    );
    expect(
      copy.invest.announceFilteredCount.replace("{matched}", "3").replace("{total}", "10")
    ).toBe("3 of 10 invoices match");
    expect(copy.invest.announceShowing.replace("{shown}", "5").replace("{total}", "20")).toBe(
      "Showing 5 of 20 investable invoices"
    );
  });

  it("uploadZone error templates use {type}, {sizeMb}, {maxSizeMb}, {status} placeholders", () => {
    expect(copy.uploadZone.errorInvalidType.replace("{type}", "text/plain")).toContain(
      'Invalid file type "text/plain"'
    );
    expect(
      copy.uploadZone.errorOversize.replace("{sizeMb}", "5.3").replace("{maxSizeMb}", "5")
    ).toContain("File is 5.3 MB");
    expect(copy.uploadZone.errorUploadStatus.replace("{status}", "500")).toContain(
      "Upload failed (500)"
    );
  });

  it("wallet helperConnected uses {network} placeholder", () => {
    expect(copy.wallet.helperConnected.replace("{network}", "testnet")).toContain(
      "Connected to Stellar testnet"
    );
  });
});

describe("copy dictionary — snapshot of full dictionary", () => {
  it("matches the full copy dictionary snapshot", () => {
    expect(copy).toMatchSnapshot();
  });
});
