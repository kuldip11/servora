import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui",()=>({Badge:({children,...p}:any)=><span {...p}>{children}</span>,StatusBadge:({label,tone}:any)=><span data-tone={tone}>{label}</span>}));
import { FoodTypeDot } from "../FoodTypeDot";
import { PublishBadge } from "../PublishBadge";
import { StatusBadge } from "../StatusBadge";
describe("menu badge helpers coverage",()=>{it("covers food types/sizes and fallback",()=>{const {rerender}=render(<FoodTypeDot type="VEG" size="sm"/>);expect(screen.getByTitle("Veg")).toBeTruthy();rerender(<FoodTypeDot type="NON_VEG"/>);expect(screen.getByTitle("Non-Veg")).toBeTruthy();rerender(<FoodTypeDot type={"UNKNOWN" as any}/>);expect(screen.getByTitle("Veg")).toBeTruthy();});it("covers publish and status badges",()=>{const {rerender}=render(<PublishBadge isPublished={false}/>);expect(screen.getByText("Draft")).toBeTruthy();rerender(<PublishBadge isPublished/>);expect(screen.queryByText("Draft")).toBeNull();rerender(<StatusBadge status="ACTIVE"/>);expect(screen.getByText(/Active/i)).toBeTruthy();rerender(<StatusBadge status={"UNKNOWN" as any}/>);expect(screen.getByText(/Active/i)).toBeTruthy();});});
