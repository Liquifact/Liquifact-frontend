import { renderHook, act } from "@testing-library/react";
import { useWalletUrlState } from "./useWalletUrlState";

const mockRouter = {
  replace: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/wallet",
  useSearchParams: () => new URLSearchParams(mockSearchParams),
}));

let mockSearchParams = "";

describe("useWalletUrlState", () => {
  beforeEach(() => {
    mockRouter.replace.mockClear();
    mockSearchParams = "";
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize with default filters when URL has no params", () => {
    const { result } = renderHook(() => useWalletUrlState());
    const [filters] = result.current;

    expect(filters).toEqual({
      searchTerm: "",
      sort: { key: "date", direction: "desc" },
    });
  });

  it("should initialize state from valid URL search params", () => {
    mockSearchParams = "q=test-search&sort=amount&direction=asc";
    const { result } = renderHook(() => useWalletUrlState());
    const [filters] = result.current;

    expect(filters).toEqual({
      searchTerm: "test-search",
      sort: { key: "amount", direction: "asc" },
    });
  });

  it("should ignore invalid URL search params and use defaults", () => {
    mockSearchParams = "q=test&sort=invalidKey&direction=invalidDir";
    const { result } = renderHook(() => useWalletUrlState());
    const [filters] = result.current;

    expect(filters).toEqual({
      searchTerm: "test",
      sort: { key: "date", direction: "desc" },
    });
  });

  it("should update search term and debounce URL update", () => {
    const { result } = renderHook(() => useWalletUrlState());
    const [, setFilters] = result.current;

    act(() => {
      setFilters({ searchTerm: "new-search" });
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockRouter.replace).toHaveBeenCalledWith(
      "/wallet?q=new-search&sort=date&direction=desc",
      { scroll: false }
    );
  });

  it("should update sort state and debounce URL update", () => {
    const { result } = renderHook(() => useWalletUrlState());
    const [, setFilters] = result.current;

    act(() => {
      setFilters({ sort: { key: "status", direction: "asc" } });
    });

    expect(result.current[0].sort).toEqual({ key: "status", direction: "asc" });
    expect(mockRouter.replace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockRouter.replace).toHaveBeenCalledWith("/wallet?sort=status&direction=asc", {
      scroll: false,
    });
  });

  it("should remove empty search term from URL", () => {
    mockSearchParams = "q=old-search";
    const { result } = renderHook(() => useWalletUrlState());
    const [, setFilters] = result.current;

    act(() => {
      setFilters({ searchTerm: "" });
    });

    expect(result.current[0].searchTerm).toBe("");

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockRouter.replace).toHaveBeenCalledWith("/wallet?sort=date&direction=desc", {
      scroll: false,
    });
  });
});
