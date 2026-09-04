import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusScreen } from "../StatusScreen";
describe("StatusScreen",()=>{ it("renders loading and static states",()=>{ const {rerender}=render(<StatusScreen title="Loading" message="Wait" loading/>); expect(screen.getByRole("main").getAttribute("aria-live")).toBe("polite"); rerender(<StatusScreen title="Error" message="Oops"/>); expect(screen.getByRole("main").getAttribute("aria-live")).toBe("assertive"); }); it("runs optional action",()=>{const fn=vi.fn();render(<StatusScreen title="X" message="Y" actionLabel="Retry" onAction={fn}/>);fireEvent.click(screen.getByRole("button",{name:"Retry"}));expect(fn).toHaveBeenCalled();}); });
