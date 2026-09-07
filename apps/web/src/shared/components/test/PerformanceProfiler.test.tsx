import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h=vi.hoisted(()=>({debug:vi.fn(),duration:20}));
vi.mock("react",async(importOriginal)=>{
 const actual=await importOriginal<any>();
 return {...actual,Profiler:({id,onRender,children}:any)=>{onRender(id,"mount",h.duration,0,10,35);return <>{children}</>;}};
});
import { PerformanceProfiler } from "../PerformanceProfiler";

describe("PerformanceProfiler coverage",()=>{
 beforeEach(()=>{vi.clearAllMocks();h.duration=20;vi.spyOn(console,"debug").mockImplementation(h.debug);});
 it("logs slow renders with rounded timing metadata",()=>{
  render(<PerformanceProfiler id="test"><span>child</span></PerformanceProfiler>);
  expect(screen.getByText("child")).toBeTruthy();
  expect(h.debug).toHaveBeenCalledWith("[perf]",{id:"test",phase:"mount",actualDuration:20,commitDuration:25});
 });
 it("ignores fast renders",()=>{
  h.duration=15.999; render(<PerformanceProfiler id="fast"><span>fast</span></PerformanceProfiler>);
  expect(h.debug).not.toHaveBeenCalled();
 });
});
