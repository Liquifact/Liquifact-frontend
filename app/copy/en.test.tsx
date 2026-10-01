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
      expect(copy.invest.invalidCursorTitle).toBeDefined();
      expect(copy.invest.invalidCursorDescription).toBeDefined();
      expect(copy.invest.endOfList).toBeDefined();
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
        "invalidCursorTitle",
        "invalidCursorDescription",
        "endOfList",
      ];
      for (const key of stringKeys) {
        expect(typeof copy.invest[key as keyof typeof copy.invest]).toBe("string");
        expect((copy.invest[key as keyof typeof copy.invest] as string).length).toBeGreaterThan(0);
      }
    });

    describe("filters", () => {
      it("has all required error keys", () => {
        expect(copy.invest.filters.errorYieldMin).toBeDefined();
        expect(copy.invest.filters.errorYieldMax).toBeDefined();
        expect(copy.invest.filters.errorYieldRange).toBeDefined();
        expect(copy.invest.filters.errorMaturityFrom).toBeDefined();
        expect(copy.invest.filters.errorMaturityTo).toBeDefined();
        expect(copy.invest.filters.errorMaturityRange).toBeDefined();
      });

      it("has non-empty string values for all error keys", () => {
        const keys = [
          "errorYieldMin",
          "errorYieldMax",
          "errorYieldRange",
          "errorMaturityFrom",
          "errorMaturityTo",
          "errorMaturityRange",
        ] as const;
        for (const key of keys) {
          expect(typeof copy.invest.filters[key]).toBe("string");
          expect(copy.invest.filters[key].length).toBeGreaterThan(0);
        }
      });
    });

    describe("fundAmount", () => {
      it("has all required keys", () => {
        expect(copy.invest.fundAmount.label).toBeDefined();
        expect(copy.invest.fundAmount.placeholder).toBeDefined();
        expect(copy.invest.fundAmount.helper).toBeDefined();
        expect(copy.invest.fundAmount.expectedYieldLabel).toBeDefined();
        expect(copy.invest.fundAmount.errorRequired).toBeDefined();
        expect(copy.invest.fundAmount.errorPositive).toBeDefined();
        expect(copy.invest.fundAmount.errorExceedsBalance).toBeDefined();
        expect(copy.invest.fundAmount.errorPrecision).toBeDefined();
        expect(copy.invest.fundAmount.submitLabel).toBeDefined();
        expect(copy.invest.fundAmount.submittingLabel).toBeDefined();
      });
    });

    describe("bulk", () => {
      it("has all required keys", () => {
        expect(copy.invest.bulk.toolbarLabel).toBeDefined();
        expect(copy.invest.bulk.selectAllLabel).toBeDefined();
        expect(copy.invest.bulk.selectAllAria).toBeDefined();
        expect(copy.invest.bulk.rowCheckboxAria).toBeDefined();
        expect(copy.invest.bulk.selectedCount).toBeDefined();
        expect(copy.invest.bulk.clearButton).toBeDefined();
        expect(copy.invest.bulk.exportButton).toBeDefined();
        expect(copy.invest.bulk.exportButtonAria).toBeDefined();
        expect(copy.invest.bulk.deleteButton).toBeDefined();
        expect(copy.invest.bulk.deleteButtonAria).toBeDefined();
        expect(copy.invest.bulk.rowSelectedAnnounced).toBeDefined();
        expect(copy.invest.bulk.rowClearedAnnounced).toBeDefined();
        expect(copy.invest.bulk.allSelectedAnnounced).toBeDefined();
        expect(copy.invest.bulk.exportSuccessTitle).toBeDefined();
        expect(copy.invest.bulk.exportSuccessMsg).toBeDefined();
        expect(copy.invest.bulk.exportEmptyMsg).toBeDefined();
        expect(copy.invest.bulk.deleteConfirmTitle).toBeDefined();
        expect(copy.invest.bulk.deleteConfirmBody).toBeDefined();
        expect(copy.invest.bulk.deleteConfirmConfirmLabel).toBeDefined();
        expect(copy.invest.bulk.deleteConfirmCancelLabel).toBeDefined();
        expect(copy.invest.bulk.deleteSuccessTitle).toBeDefined();
        expect(copy.invest.bulk.deleteSuccessMsg).toBeDefined();
        expect(copy.invest.bulk.deleteErrorTitle).toBeDefined();
        expect(copy.invest.bulk.deleteErrorMsg).toBeDefined();
      });
    });
  });

  describe("invest.detail", () => {
    it("has all required copy keys", () => {
      expect(copy.invest.detail.pageTitle).toBeDefined();
      expect(copy.invest.detail.pageSub).toBeDefined();
      expect(copy.invest.detail.backToMarketplace).toBeDefined();
      expect(copy.invest.detail.backToMarketplaceLabel).toBeDefined();
      expect(copy.invest.detail.backToHome).toBeDefined();
      expect(copy.invest.detail.summaryHeading).toBeDefined();
      expect(copy.invest.detail.labelIssuer).toBeDefined();
      expect(copy.invest.detail.labelAmount).toBeDefined();
      expect(copy.invest.detail.labelYield).toBeDefined();
      expect(copy.invest.detail.labelMaturity).toBeDefined();
      expect(copy.invest.detail.labelStatus).toBeDefined();
      expect(copy.invest.detail.fundButton).toBeDefined();
      expect(copy.invest.detail.fundButtonLabel).toBeDefined();
      expect(copy.invest.detail.copyLinkButton).toBeDefined();
      expect(copy.invest.detail.copyLinkButtonLabel).toBeDefined();
      expect(copy.invest.detail.printButton).toBeDefined();
      expect(copy.invest.detail.printButtonLabel).toBeDefined();
      expect(copy.invest.detail.disclaimerNote).toBeDefined();
      expect(copy.invest.detail.copySuccessMsg).toBeDefined();
      expect(copy.invest.detail.copySuccessTitle).toBeDefined();
      expect(copy.invest.detail.copyErrorMsg).toBeDefined();
      expect(copy.invest.detail.copyErrorTitle).toBeDefined();
      expect(copy.invest.detail.loadErrorMsg).toBeDefined();
      expect(copy.invest.detail.loadErrorTitle).toBeDefined();
      expect(copy.invest.detail.actionGroupLabel).toBeDefined();
      expect(copy.invest.detail.labelReference).toBeDefined();
      expect(copy.invest.detail.exportGroupLabel).toBeDefined();
      expect(copy.invest.detail.exportCSVButton).toBeDefined();
      expect(copy.invest.detail.exportCSVLabel).toBeDefined();
      expect(copy.invest.detail.exportJSONButton).toBeDefined();
      expect(copy.invest.detail.exportJSONLabel).toBeDefined();
    });

    it("has all density toggle copy keys", () => {
      expect(copy.invest.detail.densityToggleLabel).toBeDefined();
      expect(copy.invest.detail.densityCompact).toBeDefined();
      expect(copy.invest.detail.densityComfortable).toBeDefined();
      expect(copy.invest.detail.densityCompactAriaLabel).toBeDefined();
      expect(copy.invest.detail.densityComfortableAriaLabel).toBeDefined();
      expect(copy.invest.detail.densityCurrentAriaLabel).toBeDefined();
    });

    it("density toggle copy values are non-empty strings", () => {
      const densityKeys = [
        "densityToggleLabel",
        "densityCompact",
        "densityComfortable",
        "densityCompactAriaLabel",
        "densityComfortableAriaLabel",
        "densityCurrentAriaLabel",
      ] as const;
      for (const key of densityKeys) {
        expect(typeof copy.invest.detail[key]).toBe("string");
        expect(copy.invest.detail[key].length).toBeGreaterThan(0);
      }
    });

    it("densityCurrentAriaLabel has {density} placeholder", () => {
      expect(copy.invest.detail.densityCurrentAriaLabel).toContain("{density}");
      expect(copy.invest.detail.densityCurrentAriaLabel.replace("{density}", "compact")).toBe(
        "Current density: compact"
      );
    });

    describe("networkMismatch", () => {
      it("has all required keys", () => {
        expect(copy.invest.detail.networkMismatch.bannerTitle).toBeDefined();
        expect(copy.invest.detail.networkMismatch.bannerBody).toBeDefined();
        expect(copy.invest.detail.networkMismatch.bannerBodyUnknown).toBeDefined();
        expect(copy.invest.detail.networkMismatch.bannerBodyDisconnected).toBeDefined();
        expect(copy.invest.detail.networkMismatch.alertLabel).toBeDefined();
        expect(copy.invest.detail.networkMismatch.announceMessage).toBeDefined();
      });

      it("bannerBody contains {walletNetwork} and {invoiceNetwork} placeholders", () => {
        expect(copy.invest.detail.networkMismatch.bannerBody).toContain("{walletNetwork}");
        expect(copy.invest.detail.networkMismatch.bannerBody).toContain("{invoiceNetwork}");
      });

      it("bannerBodyUnknown contains {invoiceNetwork} placeholder", () => {
        expect(copy.invest.detail.networkMismatch.bannerBodyUnknown).toContain("{invoiceNetwork}");
      });

      it("bannerBodyDisconnected contains {invoiceNetwork} placeholder", () => {
        expect(copy.invest.detail.networkMismatch.bannerBodyDisconnected).toContain(
          "{invoiceNetwork}"
        );
      });

      it("announceMessage contains {invoiceNetwork} placeholder", () => {
        expect(copy.invest.detail.networkMismatch.announceMessage).toContain("{invoiceNetwork}");
      });
    });

    describe("inlineEdit", () => {
      it("has all required keys", () => {
        expect(copy.invest.detail.inlineEdit.editButton).toBeDefined();
        expect(copy.invest.detail.inlineEdit.saveButton).toBeDefined();
        expect(copy.invest.detail.inlineEdit.cancelButton).toBeDefined();
        expect(copy.invest.detail.inlineEdit.errorRequired).toBeDefined();
        expect(copy.invest.detail.inlineEdit.announceSaved).toBeDefined();
        expect(copy.invest.detail.inlineEdit.announceCancelled).toBeDefined();
      });

      it("editButton contains {field} placeholder", () => {
        expect(copy.invest.detail.inlineEdit.editButton).toContain("{field}");
      });
    });

    describe("bulk (detail)", () => {
      it("has all required keys", () => {
        expect(copy.invest.detail.bulk.sectionHeading).toBeDefined();
        expect(copy.invest.detail.bulk.sectionSub).toBeDefined();
        expect(copy.invest.detail.bulk.listAriaLabel).toBeDefined();
        expect(copy.invest.detail.bulk.toolbarLabel).toBeDefined();
        expect(copy.invest.detail.bulk.selectAllLabel).toBeDefined();
        expect(copy.invest.detail.bulk.selectAllAria).toBeDefined();
        expect(copy.invest.detail.bulk.rowCheckboxAria).toBeDefined();
        expect(copy.invest.detail.bulk.selectedCount).toBeDefined();
        expect(copy.invest.detail.bulk.clearButton).toBeDefined();
        expect(copy.invest.detail.bulk.exportButton).toBeDefined();
        expect(copy.invest.detail.bulk.exportButtonAria).toBeDefined();
        expect(copy.invest.detail.bulk.deleteButton).toBeDefined();
        expect(copy.invest.detail.bulk.deleteButtonAria).toBeDefined();
        expect(copy.invest.detail.bulk.exportSuccessTitle).toBeDefined();
        expect(copy.invest.detail.bulk.exportSuccessMsg).toBeDefined();
        expect(copy.invest.detail.bulk.exportEmptyMsg).toBeDefined();
        expect(copy.invest.detail.bulk.deleteConfirmTitle).toBeDefined();
        expect(copy.invest.detail.bulk.deleteConfirmBody).toBeDefined();
        expect(copy.invest.detail.bulk.deleteConfirmConfirmLabel).toBeDefined();
        expect(copy.invest.detail.bulk.deleteConfirmCancelLabel).toBeDefined();
        expect(copy.invest.detail.bulk.deleteSuccessTitle).toBeDefined();
        expect(copy.invest.detail.bulk.deleteSuccessMsg).toBeDefined();
        expect(copy.invest.detail.bulk.deleteErrorTitle).toBeDefined();
        expect(copy.invest.detail.bulk.deleteErrorMsg).toBeDefined();
      });
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
      expect(copy.uploadZone.resetAction).toBeDefined();
      expect(copy.uploadZone.resetAriaLabel).toBeDefined();
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
      expect(copy.wallet.toastConnectedTitle).toBeDefined();
      expect(copy.wallet.toastConnectedMsg).toBeDefined();
      expect(copy.wallet.toastErrorTitle).toBeDefined();
      expect(copy.wallet.toastErrorMsg).toBeDefined();
      expect(copy.wallet.toastWrongNetworkTitle).toBeDefined();
      expect(copy.wallet.toastWrongNetworkMsg).toBeDefined();
      expect(copy.wallet.toastCopySuccessTitle).toBeDefined();
      expect(copy.wallet.toastCopySuccessMsg).toBeDefined();
      expect(copy.wallet.toastCopyErrorTitle).toBeDefined();
      expect(copy.wallet.toastCopyErrorMsg).toBeDefined();
      expect(copy.wallet.errorConnect).toBeDefined();
      expect(copy.wallet.errorWrongNetwork).toBeDefined();
      expect(copy.wallet.announceConnected).toBeDefined();
      expect(copy.wallet.announceDisconnected).toBeDefined();
      expect(copy.wallet.announceError).toBeDefined();
      expect(copy.wallet.announceWrongNetwork).toBeDefined();
      expect(copy.wallet.announceNoWallet).toBeDefined();
      expect(copy.wallet.errorTitle).toBeDefined();
      expect(copy.wallet.errorDescription).toBeDefined();
      expect(copy.wallet.errorActionLabel).toBeDefined();
      expect(copy.wallet.errorPreviewLabel).toBeDefined();
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
      expect(copy.home.boxBusinessTitle).toBeDefined();
      expect(copy.home.boxBusinessSub).toBeDefined();
      expect(copy.home.boxBusinessAriaLabel).toBeDefined();
      expect(copy.home.boxInvestTitle).toBeDefined();
      expect(copy.home.boxInvestSub).toBeDefined();
      expect(copy.home.boxInvestAriaLabel).toBeDefined();
    });

    it("has healthStatus sub-keys", () => {
      expect(copy.home.healthStatus.connected).toBeDefined();
      expect(copy.home.healthStatus.degraded).toBeDefined();
      expect(copy.home.healthStatus.unreachable).toBeDefined();
      expect(copy.home.healthStatus.rawResponse).toBeDefined();
    });
  });

  describe("error", () => {
    it("has required keys", () => {
      expect(copy.error.title).toBeDefined();
      expect(copy.error.description).toBeDefined();
      expect(copy.error.actionLabel).toBeDefined();
      expect(copy.error.previewLabel).toBeDefined();
    });
  });

  describe("toastError", () => {
    it("has required keys", () => {
      expect(copy.toastError.title).toBeDefined();
      expect(copy.toastError.description).toBeDefined();
      expect(copy.toastError.actionLabel).toBeDefined();
      expect(copy.toastError.previewLabel).toBeDefined();
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
      expect(copy.globalError.resettingLabel).toBeDefined();
      expect(copy.globalError.homeLabel).toBeDefined();
    });
  });

  describe("footer", () => {
    it("has required keys", () => {
      expect(copy.footer.docs).toBeDefined();
      expect(copy.footer.docsUrl).toBeDefined();
      expect(copy.footer.status).toBeDefined();
      expect(copy.footer.statusUrl).toBeDefined();
      expect(copy.footer.contact).toBeDefined();
      expect(copy.footer.contactUrl).toBeDefined();
      expect(copy.footer.discord).toBeDefined();
      expect(copy.footer.discordUrl).toBeDefined();
    });
  });

  describe("layout", () => {
    it("has required keys", () => {
      expect(copy.layout.backToHome).toBeDefined();
      expect(copy.layout.connectWallet).toBeDefined();
    });
  });

  describe("nav", () => {
    it("has the announceNavigation key", () => {
      expect(copy.nav).toBeDefined();
      expect(copy.nav.announceNavigation).toBeDefined();
    });

    it("announceNavigation is a non-empty string", () => {
      expect(typeof copy.nav.announceNavigation).toBe("string");
      expect(copy.nav.announceNavigation.length).toBeGreaterThan(0);
    });

    it("announceNavigation contains the {label} placeholder", () => {
      expect(copy.nav.announceNavigation).toContain("{label}");
    });

    it("has error boundary keys", () => {
      expect(copy.nav.errorTitle).toBeDefined();
      expect(copy.nav.errorDescription).toBeDefined();
      expect(copy.nav.errorActionLabel).toBeDefined();
    });
  });

  describe("network", () => {
    it("has required keys", () => {
      expect(copy.network.offlineBanner).toBeDefined();
      expect(copy.network.reconnectedTitle).toBeDefined();
      expect(copy.network.reconnectedMsg).toBeDefined();
    });
  });

  describe("invoices", () => {
    it("has required keys", () => {
      expect(copy.invoices.title).toBeDefined();
      expect(copy.invoices.subtext).toBeDefined();
      expect(copy.invoices.emptyState).toBeDefined();
      expect(copy.invoices.errorTitle).toBeDefined();
      expect(copy.invoices.errorDescription).toBeDefined();
      expect(copy.invoices.backToHome).toBeDefined();
      expect(copy.invoices.connectWallet).toBeDefined();
      expect(copy.invoices.editRowAction).toBeDefined();
      expect(copy.invoices.editRowAriaLabel).toBeDefined();
      expect(copy.invoices.saveEditAction).toBeDefined();
      expect(copy.invoices.saveEditAriaLabel).toBeDefined();
      expect(copy.invoices.cancelEditAction).toBeDefined();
      expect(copy.invoices.cancelEditAriaLabel).toBeDefined();
      expect(copy.invoices.issuerLabel).toBeDefined();
      expect(copy.invoices.amountLabel).toBeDefined();
      expect(copy.invoices.currencyLabel).toBeDefined();
      expect(copy.invoices.dueDateLabel).toBeDefined();
      expect(copy.invoices.yieldLabel).toBeDefined();
      expect(copy.invoices.errorIssuerRequired).toBeDefined();
      expect(copy.invoices.errorAmountRequired).toBeDefined();
      expect(copy.invoices.errorDueDateRequired).toBeDefined();
      expect(copy.invoices.errorCurrencyRequired).toBeDefined();
      expect(copy.invoices.announceEditStarted).toBeDefined();
      expect(copy.invoices.announceEditSuccess).toBeDefined();
      expect(copy.invoices.announceEditCancelled).toBeDefined();
      expect(copy.invoices.copyIdButton).toBeDefined();
      expect(copy.invoices.copyIdAriaLabel).toBeDefined();
      expect(copy.invoices.copyIdSuccessTitle).toBeDefined();
      expect(copy.invoices.copyIdSuccessMsg).toBeDefined();
      expect(copy.invoices.copyIdErrorTitle).toBeDefined();
      expect(copy.invoices.copyIdErrorMsg).toBeDefined();
    });
  });

  describe("settings", () => {
    it("has required top-level keys", () => {
      expect(copy.settings.pageTitle).toBeDefined();
      expect(copy.settings.pageSub).toBeDefined();
      expect(copy.settings.editAction).toBeDefined();
      expect(copy.settings.editActionLabel).toBeDefined();
      expect(copy.settings.saveAction).toBeDefined();
      expect(copy.settings.saveActionLabel).toBeDefined();
      expect(copy.settings.cancelAction).toBeDefined();
      expect(copy.settings.cancelActionLabel).toBeDefined();
      expect(copy.settings.emptyValue).toBeDefined();
      expect(copy.settings.savedAnnouncement).toBeDefined();
      expect(copy.settings.cancelledAnnouncement).toBeDefined();
      expect(copy.settings.invalidAnnouncement).toBeDefined();
      expect(copy.settings.errorStatus).toBeDefined();
      expect(copy.settings.loadMore).toBeDefined();
      expect(copy.settings.densityLabel).toBeDefined();
      expect(copy.settings.densityDescription).toBeDefined();
      expect(copy.settings.exportGroupLabel).toBeDefined();
      expect(copy.settings.exportCSVLabel).toBeDefined();
      expect(copy.settings.exportJSONLabel).toBeDefined();
      expect(copy.settings.exportAnnounceCSV).toBeDefined();
      expect(copy.settings.exportAnnounceJSON).toBeDefined();
      expect(copy.settings.exportEmpty).toBeDefined();
    });

    it("has fields sub-keys", () => {
      expect(copy.settings.fields.displayName.label).toBeDefined();
      expect(copy.settings.fields.displayName.description).toBeDefined();
      expect(copy.settings.fields.displayName.placeholder).toBeDefined();
      expect(copy.settings.fields.email.label).toBeDefined();
      expect(copy.settings.fields.email.description).toBeDefined();
      expect(copy.settings.fields.email.placeholder).toBeDefined();
    });

    it("has errors sub-keys", () => {
      expect(copy.settings.errors.required).toBeDefined();
      expect(copy.settings.errors.displayNameTooShort).toBeDefined();
      expect(copy.settings.errors.displayNameTooLong).toBeDefined();
      expect(copy.settings.errors.emailTooLong).toBeDefined();
      expect(copy.settings.errors.invalidEmail).toBeDefined();
    });

    it("has copy/toast sub-keys", () => {
      expect(copy.settings.copyIdentifier).toBeDefined();
      expect(copy.settings.toastCopySuccessMsg).toBeDefined();
      expect(copy.settings.toastCopySuccessTitle).toBeDefined();
      expect(copy.settings.toastCopyErrorMsg).toBeDefined();
      expect(copy.settings.toastCopyErrorTitle).toBeDefined();
    });
  });

  describe("invoiceTimeline", () => {
    it("has required keys", () => {
      expect(copy.invoiceTimeline.heading).toBeDefined();
      expect(copy.invoiceTimeline.stageUploaded).toBeDefined();
      expect(copy.invoiceTimeline.stageVerified).toBeDefined();
      expect(copy.invoiceTimeline.stageListed).toBeDefined();
      expect(copy.invoiceTimeline.stageFunded).toBeDefined();
      expect(copy.invoiceTimeline.stageSettled).toBeDefined();
      expect(copy.invoiceTimeline.statusCompleted).toBeDefined();
      expect(copy.invoiceTimeline.statusCurrent).toBeDefined();
      expect(copy.invoiceTimeline.statusPending).toBeDefined();
    });
  });

  describe("invoiceDetail", () => {
    it("has required keys", () => {
      expect(copy.invoiceDetail.copyIdLabel).toBeDefined();
      expect(copy.invoiceDetail.copyIdSuccess).toBeDefined();
      expect(copy.invoiceDetail.copyIdError).toBeDefined();
    });
  });
});

describe("copy dictionary — template placeholder consistency", () => {
  it("invest announcement templates use {count}, {matched}, {total}, {shown} placeholders", () => {
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

  it("nav.announceNavigation uses {label} placeholder", () => {
    expect(copy.nav.announceNavigation.replace("{label}", "Home")).toBe("Navigated to Home");
    expect(copy.nav.announceNavigation.replace("{label}", "Invoices")).toBe(
      "Navigated to Invoices"
    );
  });

  it("invest.fundAmount.helper uses {max} and {currency} placeholders", () => {
    expect(
      copy.invest.fundAmount.helper.replace("{max}", "5000").replace("{currency}", "USDC")
    ).toBe("Enter an amount between 1 and 5000 USDC.");
  });

  it("invest.fundAmount.errorExceedsBalance uses {max} and {currency} placeholders", () => {
    expect(
      copy.invest.fundAmount.errorExceedsBalance
        .replace("{max}", "5000")
        .replace("{currency}", "USDC")
    ).toBe("Amount cannot exceed the remaining balance of 5000 USDC.");
  });

  it("invest.detail.networkMismatch.bannerBody uses {walletNetwork} and {invoiceNetwork} placeholders", () => {
    expect(
      copy.invest.detail.networkMismatch.bannerBody
        .replace("{walletNetwork}", "testnet")
        .replace("{invoiceNetwork}", "public")
    ).toContain("testnet");
    expect(
      copy.invest.detail.networkMismatch.bannerBody
        .replace("{walletNetwork}", "testnet")
        .replace("{invoiceNetwork}", "public")
    ).toContain("public");
  });

  it("settings.savedAnnouncement uses {label} placeholder", () => {
    expect(copy.settings.savedAnnouncement.replace("{label}", "Display name")).toBe(
      "Display name saved."
    );
  });

  it("settings.invalidAnnouncement uses {label} and {error} placeholders", () => {
    expect(
      copy.settings.invalidAnnouncement
        .replace("{label}", "Email")
        .replace("{error}", "Invalid email")
    ).toBe("Email not saved: Invalid email");
  });
});

describe("copy dictionary — snapshot of full dictionary", () => {
  it("matches the full copy dictionary snapshot", () => {
    expect(copy).toMatchSnapshot();
  });
});
