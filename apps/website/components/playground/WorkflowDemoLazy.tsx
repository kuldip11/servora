"use client";
import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
const WorkflowDemo = dynamic(
  () => import("./WorkflowDemo").then((module) => module.WorkflowDemo),
  {
    loading: () => (
      <div className="demo-loading" role="status">
        Loading the local playground…
      </div>
    ),
  },
);
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="demo-loading" role="alert">
        <h2>The playground could not load.</h2>
        <p>Reload this page to try again.</p>
        <button
          type="button"
          className="action"
          onClick={() => location.reload()}
        >
          Reload playground
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function WorkflowDemoLazy() {
  return (
    <Boundary>
      <WorkflowDemo />
    </Boundary>
  );
}
