import { getFocusableElements } from "./getFocusableElements";

/**
 * jsdom has no real layout engine, so every element's `offsetParent` is null
 * by default — including genuinely visible ones. getFocusableElements uses
 * offsetParent to detect display:none-hidden elements, so tests that want an
 * element treated as "visible" need to stub it explicitly per-element (kept
 * local rather than global so the "actually hidden" test below can still
 * exercise the real default-null behaviour).
 */
function makeVisible(el: HTMLElement) {
  Object.defineProperty(el, "offsetParent", {
    configurable: true,
    get: () => document.body,
  });
  return el;
}

describe("getFocusableElements", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns an empty array for a null container", () => {
    expect(getFocusableElements(null)).toEqual([]);
  });

  it("returns an empty array when nothing focusable is inside", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>Just text</p><span>More text</span>";
    document.body.appendChild(container);

    expect(getFocusableElements(container)).toEqual([]);
  });

  it("finds buttons, links, and form controls in document order", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <button>One</button>
      <a href="/x">Two</a>
      <input type="text" />
      <select><option>a</option></select>
      <textarea></textarea>
    `;
    document.body.appendChild(container);
    container.querySelectorAll("*").forEach((el) => makeVisible(el as HTMLElement));

    const found = getFocusableElements(container);
    expect(found.map((el) => el.tagName)).toEqual(["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"]);
  });

  it("excludes disabled form controls even when otherwise visible", () => {
    const container = document.createElement("div");
    container.innerHTML = `<button disabled>Disabled</button><input disabled />`;
    document.body.appendChild(container);
    container.querySelectorAll("*").forEach((el) => makeVisible(el as HTMLElement));

    expect(getFocusableElements(container)).toEqual([]);
  });

  it("excludes elements with tabindex=-1", () => {
    const container = document.createElement("div");
    container.innerHTML = `<div tabindex="-1">Not tabbable</div><button>Real button</button>`;
    document.body.appendChild(container);
    container.querySelectorAll("*").forEach((el) => makeVisible(el as HTMLElement));

    const found = getFocusableElements(container);
    expect(found).toHaveLength(1);
    expect(found[0].tagName).toBe("BUTTON");
  });

  it("includes elements with a non-negative tabindex", () => {
    const container = document.createElement("div");
    container.innerHTML = `<div tabindex="0">Tabbable div</div>`;
    document.body.appendChild(container);
    container.querySelectorAll("*").forEach((el) => makeVisible(el as HTMLElement));

    const found = getFocusableElements(container);
    expect(found).toHaveLength(1);
  });

  it("excludes elements hidden via offsetParent (e.g. display:none ancestor)", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const hidden = document.createElement("button");
    hidden.textContent = "Hidden";
    container.appendChild(hidden);

    // No makeVisible() here — this is the real jsdom default (null), which
    // is exactly the "hidden" signal the helper relies on.
    expect(getFocusableElements(container)).toEqual([]);
  });

  it("still includes an element with a null offsetParent if it is the active element", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const btn = document.createElement("button");
    btn.textContent = "Active despite null offsetParent";
    container.appendChild(btn);
    btn.focus();

    expect(document.activeElement).toBe(btn);
    const found = getFocusableElements(container);
    expect(found).toEqual([btn]);
  });
});
