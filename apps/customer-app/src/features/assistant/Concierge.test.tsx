import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Concierge } from "./Concierge";
const mock = vi.hoisted(() => ({
  capabilities: vi.fn(),
  ask: vi.fn(),
  menu: vi.fn(),
  openItem: vi.fn(),
  waiter: vi.fn(),
}));
vi.mock("./api", () => ({
  getAssistantCapabilities: mock.capabilities,
  askAssistant: mock.ask,
}));
vi.mock("@/features/menu/api", () => ({ getCustomerMenu: mock.menu }));
vi.mock("@pos/ui", () => ({
  BottomSheet: ({
    children,
    footer,
    onClose,
  }: {
    children: React.ReactNode;
    footer?: React.ReactNode;
    onClose: () => void;
  }) => (
    <div role="dialog">
      <button onClick={onClose}>Close concierge</button>
      {children}
      {footer}
    </div>
  ),
}));
const answer = {
  language: "en",
  outcome: "MATCHES",
  message: "Here are dishes matching your preferences.",
  items: [
    {
      id: "item",
      name: "Paneer",
      basePrice: "200",
      foodType: "VEG",
      spiceLevel: "MILD",
    },
  ],
  disclaimer: "Confirm dietary information with staff.",
  canCallWaiter: true,
};
const clients: QueryClient[] = [];
const mount = (waiter = true, token = "session-A") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <Concierge
        token={token}
        onOpenItem={mock.openItem}
        onCallWaiter={waiter ? mock.waiter : undefined}
        requestBusy={false}
        requestMessage={null}
      />
    </QueryClientProvider>,
  );
};
const open = async () => {
  fireEvent.click(
    await screen.findByRole("button", { name: /Ask Servora Concierge/ }),
  );
  await screen.findByRole("dialog");
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.capabilities.mockResolvedValue({ enabled: true });
  mock.ask.mockResolvedValue(answer);
  mock.menu.mockResolvedValue({
    items: [{ id: "item", name: "Fresh paneer", basePrice: "220" }],
  });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
});
describe("customer Concierge", () => {
  it("hides the entry when the server disables this branch", async () => {
    mock.capabilities.mockResolvedValue({ enabled: false });
    mount();
    await waitFor(() => expect(mock.capabilities).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /Ask Servora/ })).toBeNull();
    expect(mock.ask).not.toHaveBeenCalled();
  });
  it("submits a session-scoped question and displays authoritative item cards", async () => {
    mount();
    await open();
    fireEvent.change(screen.getByLabelText("Menu question"), {
      target: { value: "veg under 300" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find dishes" }));
    expect(await screen.findByText("Paneer")).toBeTruthy();
    expect(screen.getByText(answer.disclaimer)).toBeTruthy();
    expect(mock.ask).toHaveBeenCalledWith(
      "session-A",
      { message: "veg under 300", language: "en" },
      expect.any(AbortSignal),
    );
    expect(mock.openItem).not.toHaveBeenCalled();
    expect(mock.waiter).not.toHaveBeenCalled();
  });
  it("refreshes the menu before opening the existing customization flow", async () => {
    mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Vegetarian" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "View options" }),
    );
    await waitFor(() =>
      expect(mock.openItem).toHaveBeenCalledWith({
        id: "item",
        name: "Fresh paneer",
        basePrice: "220",
      }),
    );
    expect(mock.menu).toHaveBeenCalledWith(
      "session-A",
      expect.any(AbortSignal),
    );
  });
  it("does not open an item removed since the recommendation", async () => {
    mock.menu.mockResolvedValue({ items: [] });
    mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Vegetarian" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "View options" }),
    );
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "This dish is no longer available. Please search again.",
    );
    expect(mock.openItem).not.toHaveBeenCalled();
  });
  it("supports Hindi questions and requires an explicit waiter click", async () => {
    mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "हिंदी" }));
    fireEvent.click(screen.getByRole("button", { name: "जैन विकल्प?" }));
    await waitFor(() =>
      expect(mock.ask).toHaveBeenCalledWith(
        "session-A",
        { message: "जैन विकल्प?", language: "hi" },
        expect.any(AbortSignal),
      ),
    );
    expect(mock.waiter).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "वेटर से पूछें" }));
    expect(mock.waiter).toHaveBeenCalledOnce();
  });
  it("does not expose waiter actions for takeaway", async () => {
    mount(false);
    await open();
    expect(screen.queryByRole("button", { name: "Ask waiter" })).toBeNull();
  });
  it("aborts a pending provider request when the sheet closes", async () => {
    mock.ask.mockImplementation(() => new Promise(() => {}));
    mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Vegetarian" }));
    await waitFor(() => expect(mock.ask).toHaveBeenCalled());
    const signal = mock.ask.mock.calls[0]?.[2] as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: "Close concierge" }));
    expect(signal.aborted).toBe(true);
  });
  it("keeps server errors visible and allows another attempt", async () => {
    mock.ask.mockRejectedValue(new Error("Assistant limit reached"));
    mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Vegetarian" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Assistant limit reached",
    );
    fireEvent.change(screen.getByLabelText("Menu question"), {
      target: { value: "Try another dish" },
    });
    expect(screen.getByRole("button", { name: "Find dishes" })).toHaveProperty(
      "disabled",
      false,
    );
  });
  it("retains earlier turns while another question is pending and after it completes", async () => {
    let resolve!: (value: typeof answer) => void;
    mock.ask.mockResolvedValueOnce(answer).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Vegetarian" }));
    await screen.findByText("Paneer");
    fireEvent.click(screen.getByRole("button", { name: "Not spicy" }));
    expect(screen.getByText("Paneer")).toBeTruthy();
    expect(screen.getByRole("log").textContent).toContain("Not spicy");
    await waitFor(() => expect(mock.ask).toHaveBeenCalledTimes(2));
    resolve({
      ...answer,
      items: [{ ...answer.items[0]!, id: "tea", name: "Green tea" }],
    });
    await screen.findByText("Green tea");
    expect(screen.getByText("Paneer")).toBeTruthy();
    expect(screen.getByLabelText("Menu question")).toHaveProperty("value", "");
  });
  it("preserves completed history across closing and reopening and clears it explicitly", async () => {
    mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Vegetarian" }));
    await screen.findByText("Paneer");
    fireEvent.click(screen.getByRole("button", { name: "Close concierge" }));
    await open();
    expect(screen.getByText("Paneer")).toBeTruthy();
    expect(mock.ask).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Clear chat" }));
    expect(screen.queryByText("Paneer")).toBeNull();
  });
  it("keeps a failed turn beside previous results and supports the next question", async () => {
    mock.ask
      .mockResolvedValueOnce(answer)
      .mockRejectedValueOnce(new Error("Offline"));
    mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Vegetarian" }));
    await screen.findByText("Paneer");
    fireEvent.click(screen.getByRole("button", { name: "Not spicy" }));
    await screen.findByText("Offline");
    expect(screen.getByText("Paneer")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vegetarian" })).toHaveProperty(
      "disabled",
      false,
    );
  });
  it("does not show the previous QR session history after the session changes", async () => {
    const view = mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Vegetarian" }));
    await screen.findByText("Paneer");
    const client = clients[0]!;
    view.rerender(
      <QueryClientProvider client={client}>
        <Concierge
          token="session-B"
          onOpenItem={mock.openItem}
          requestBusy={false}
          requestMessage={null}
        />
      </QueryClientProvider>,
    );
    await open();
    expect(screen.queryByText("Paneer")).toBeNull();
  });
  it("marks an interrupted turn on reopen and ignores its late completion", async () => {
    let resolve!: (value: typeof answer) => void;
    mock.ask.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Vegetarian" }));
    await waitFor(() => expect(mock.ask).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Close concierge" }));
    await open();
    expect(
      screen.getByText(/Search stopped when Concierge closed/),
    ).toBeTruthy();
    await act(async () => {
      resolve(answer);
    });
    await waitFor(() => expect(screen.queryByText("Paneer")).toBeNull());
  });
});
