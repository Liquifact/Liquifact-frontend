/**
 * @jest-environment jsdom
 *
 * @file app/invest/MarketplaceContext.test.jsx
 *
 * Tests for the MarketplaceContext and MarketplaceProvider:
 *   - Provides invoices and setInvoices from props
 *   - fundInvoice applies optimistic status change to "Funded"
 *   - fundInvoice rolls back status on failure
 *   - pendingIds track in-flight invoices
 *   - Concurrent fund actions are handled independently
 *   - useMarketplace throws outside provider
 */

import React from "react";
import { act, renderHook, render, screen, waitFor } from "@testing-library/react";
import { MarketplaceProvider, useMarketplace } from "./MarketplaceContext";

var INVOICES = [
  { id: "inv-001", issuer: "Acme", status: "Open", amount: "12,500", currency: "USD" },
  { id: "inv-002", issuer: "Bright", status: "Open", amount: "7,800", currency: "EUR" },
  { id: "inv-003", issuer: "Sunrise", status: "Funded", amount: "22,000", currency: "USD" },
];

function deferred() {
  var resolve;
  var reject;
  var promise = new Promise(function (res, rej) {
    resolve = res;
    reject = rej;
  });
  return { promise: promise, resolve: resolve, reject: reject };
}

function wrapperFactory(initialInvoices) {
  var invoices = initialInvoices || INVOICES;
  var capturedSetInvoices = null;

  function Wrapper(_ref) {
    var children = _ref.children;
    var stateHook = React.useState(invoices);
    capturedSetInvoices = stateHook[1];
    return (
      <MarketplaceProvider invoices={stateHook[0]} setInvoices={stateHook[1]}>
        {children}
      </MarketplaceProvider>
    );
  }

  return {
    Wrapper: Wrapper,
    getCapturedSetInvoices: function () {
      return capturedSetInvoices;
    },
  };
}

describe("MarketplaceContext", function () {
  describe("useMarketplace", function () {
    it("throws when used outside a MarketplaceProvider", function () {
      var spy = jest.spyOn(console, "error").mockImplementation(function () {});
      expect(function () {
        renderHook(function () {
          return useMarketplace();
        });
      }).toThrow("useMarketplace must be used within a MarketplaceProvider");
      spy.mockRestore();
    });

    it("returns context value inside a provider", function () {
      var wrapper = wrapperFactory();
      var result = renderHook(
        function () {
          return useMarketplace();
        },
        { wrapper: wrapper.Wrapper }
      ).result;

      expect(result.current.invoices).toEqual(INVOICES);
      expect(typeof result.current.setInvoices).toBe("function");
      expect(typeof result.current.fundInvoice).toBe("function");
      expect(result.current.pendingIds).toBeInstanceOf(Set);
    });
  });

  describe("fundInvoice - optimistic status change", function () {
    it("marks the invoice as 'Funded' immediately before the action resolves", async function () {
      var wrapper = wrapperFactory();
      var d = deferred();
      var action = jest.fn(function () {
        return d.promise;
      });

      var result = renderHook(
        function () {
          return useMarketplace();
        },
        { wrapper: wrapper.Wrapper }
      ).result;

      act(function () {
        result.current.fundInvoice("inv-001", 500, action);
      });

      expect(
        result.current.invoices.find(function (i) {
          return i.id === "inv-001";
        }).status
      ).toBe("Funded");
      expect(
        result.current.invoices.find(function (i) {
          return i.id === "inv-002";
        }).status
      ).toBe("Open");
      expect(result.current.pendingIds.has("inv-001")).toBe(true);

      await act(async function () {
        d.resolve();
        await d.promise;
      });

      expect(result.current.pendingIds.has("inv-001")).toBe(false);
    });

    it("returns true on success", async function () {
      var wrapper = wrapperFactory();
      var action = jest.fn().mockResolvedValue(undefined);
      var result = renderHook(
        function () {
          return useMarketplace();
        },
        { wrapper: wrapper.Wrapper }
      ).result;

      var returned;
      await act(async function () {
        returned = await result.current.fundInvoice("inv-001", 500, action);
      });

      expect(returned).toBe(true);
    });

    it("calls the performAction with invoiceId and amount", async function () {
      var wrapper = wrapperFactory();
      var action = jest.fn().mockResolvedValue(undefined);
      var result = renderHook(
        function () {
          return useMarketplace();
        },
        { wrapper: wrapper.Wrapper }
      ).result;

      await act(async function () {
        await result.current.fundInvoice("inv-002", 1200, action);
      });

      expect(action).toHaveBeenCalledWith("inv-002", 1200);
    });
  });

  describe("fundInvoice - rollback on failure", function () {
    it("restores the original status after the action rejects", async function () {
      var wrapper = wrapperFactory();
      var action = jest.fn().mockRejectedValue(new Error("server error"));
      var result = renderHook(
        function () {
          return useMarketplace();
        },
        { wrapper: wrapper.Wrapper }
      ).result;

      await act(async function () {
        await result.current.fundInvoice("inv-001", 500, action).catch(function () {});
      });

      expect(
        result.current.invoices.find(function (i) {
          return i.id === "inv-001";
        }).status
      ).toBe("Open");
      expect(result.current.pendingIds.has("inv-001")).toBe(false);
    });

    it("re-throws the error", async function () {
      var wrapper = wrapperFactory();
      var boom = new Error("network failure");
      var action = jest.fn().mockRejectedValue(boom);
      var result = renderHook(
        function () {
          return useMarketplace();
        },
        { wrapper: wrapper.Wrapper }
      ).result;

      var caught;
      await act(async function () {
        try {
          await result.current.fundInvoice("inv-001", 500, action);
        } catch (e) {
          caught = e;
        }
      });

      expect(caught).toBe(boom);
    });

    it("does not alter other invoices on rollback", async function () {
      var wrapper = wrapperFactory();
      var action = jest.fn().mockRejectedValue(new Error("fail"));
      var result = renderHook(
        function () {
          return useMarketplace();
        },
        { wrapper: wrapper.Wrapper }
      ).result;

      await act(async function () {
        await result.current.fundInvoice("inv-001", 500, action).catch(function () {});
      });

      expect(
        result.current.invoices.find(function (i) {
          return i.id === "inv-002";
        }).status
      ).toBe("Open");
      expect(
        result.current.invoices.find(function (i) {
          return i.id === "inv-003";
        }).status
      ).toBe("Funded");
    });
  });

  describe("concurrent fund actions", function () {
    it("tracks two independent in-flight actions simultaneously", async function () {
      var wrapper = wrapperFactory();
      var d1 = deferred();
      var d2 = deferred();

      var result = renderHook(
        function () {
          return useMarketplace();
        },
        { wrapper: wrapper.Wrapper }
      ).result;

      var fp1;
      var fp2;

      act(function () {
        fp1 = result.current.fundInvoice("inv-001", 500, function () {
          return d1.promise;
        });
        fp2 = result.current.fundInvoice("inv-002", 300, function () {
          return d2.promise;
        });
      });

      expect(result.current.pendingIds.has("inv-001")).toBe(true);
      expect(result.current.pendingIds.has("inv-002")).toBe(true);
      expect(
        result.current.invoices.find(function (i) {
          return i.id === "inv-001";
        }).status
      ).toBe("Funded");
      expect(
        result.current.invoices.find(function (i) {
          return i.id === "inv-002";
        }).status
      ).toBe("Funded");

      await act(async function () {
        d1.resolve();
        await fp1;
      });

      expect(result.current.pendingIds.has("inv-001")).toBe(false);
      expect(result.current.pendingIds.has("inv-002")).toBe(true);

      await act(async function () {
        d2.resolve();
        await fp2;
      });

      expect(result.current.pendingIds.size).toBe(0);
    });

    it("rolling back one invoice does not affect the other", async function () {
      var wrapper = wrapperFactory();
      var d1 = deferred();
      var d2 = deferred();

      var result = renderHook(
        function () {
          return useMarketplace();
        },
        { wrapper: wrapper.Wrapper }
      ).result;

      var fp1;
      var fp2;

      act(function () {
        fp1 = result.current.fundInvoice("inv-001", 500, function () {
          return d1.promise;
        });
        fp2 = result.current.fundInvoice("inv-002", 300, function () {
          return d2.promise;
        });
      });

      await act(async function () {
        d1.reject(new Error("fail"));
        await fp1.catch(function () {});
      });

      expect(
        result.current.invoices.find(function (i) {
          return i.id === "inv-001";
        }).status
      ).toBe("Open");
      expect(
        result.current.invoices.find(function (i) {
          return i.id === "inv-002";
        }).status
      ).toBe("Funded");
      expect(result.current.pendingIds.has("inv-002")).toBe(true);

      await act(async function () {
        d2.resolve();
        await fp2;
      });

      expect(result.current.pendingIds.size).toBe(0);
    });

    it("blocks duplicate fund calls on the same invoice", async function () {
      var wrapper = wrapperFactory();
      var d = deferred();
      var action = jest.fn(function () {
        return d.promise;
      });

      var result = renderHook(
        function () {
          return useMarketplace();
        },
        { wrapper: wrapper.Wrapper }
      ).result;

      act(function () {
        result.current.fundInvoice("inv-001", 500, action);
      });

      var secondResult;
      await act(async function () {
        secondResult = await result.current.fundInvoice("inv-001", 300, action);
      });

      expect(secondResult).toBe(false);
      expect(action).toHaveBeenCalledTimes(1);

      await act(async function () {
        d.resolve();
        await d.promise;
      });
    });
  });
});
