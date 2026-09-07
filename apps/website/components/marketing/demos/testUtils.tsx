import React, { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type RenderedDemo = {
  container: HTMLDivElement;
  click: (element: Element) => Promise<void>;
  change: (
    element: HTMLInputElement | HTMLSelectElement,
    value: string,
  ) => Promise<void>;
  unmount: () => Promise<void>;
};

const elementText = (element: Element) =>
  element.textContent?.replace(/\s+/g, " ").trim() ?? "";

export const findByText = (container: ParentNode, text: string) => {
  const match = Array.from(container.querySelectorAll("*")).find(
    (element) => element.children.length === 0 && elementText(element) === text,
  );
  if (!match) throw new Error(`Unable to find element with text: ${text}`);
  return match;
};

export const findButton = (container: ParentNode, name: string) => {
  const match = Array.from(container.querySelectorAll("button")).find(
    (element) =>
      element.getAttribute("aria-label") === name ||
      elementText(element) === name,
  );
  if (!match) throw new Error(`Unable to find button: ${name}`);
  return match;
};

export const findTab = (container: ParentNode, name: string) => {
  const match = Array.from(container.querySelectorAll('[role="tab"]')).find(
    (element) =>
      element.getAttribute("aria-label") === name ||
      elementText(element) === name,
  );
  if (!match) throw new Error(`Unable to find tab: ${name}`);
  return match;
};

export const findSelectByLabel = (container: ParentNode, labelText: string) => {
  const labelledSelect = Array.from(container.querySelectorAll("select")).find(
    (element) => element.getAttribute("aria-label") === labelText,
  );
  if (labelledSelect instanceof HTMLSelectElement) return labelledSelect;

  const label = Array.from(container.querySelectorAll("label")).find(
    (element) => elementText(element) === labelText,
  );
  const htmlFor = label?.getAttribute("for");
  const select = htmlFor
    ? container.querySelector<HTMLSelectElement>(`#${CSS.escape(htmlFor)}`)
    : label?.querySelector<HTMLSelectElement>("select");
  if (!select) throw new Error(`Unable to find select labelled: ${labelText}`);
  return select;
};

export const renderDemo = async (
  element: ReactElement,
): Promise<RenderedDemo> => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root;

  await act(async () => {
    root = createRoot(container);
    root.render(element);
  });

  return {
    container,
    click: async (target) => {
      await act(async () => {
        target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    },
    change: async (target, value) => {
      await act(async () => {
        target.value = value;
        target.dispatchEvent(new Event("change", { bubbles: true }));
      });
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
};
