"use client";

import { Children, isValidElement, useId, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

export function StrategyTab({ children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return <>{children}</>;
}

export default function StrategyFormTabs({ children }: { children: ReactNode }) {
  const id = useId();
  const panels = Children.toArray(children).filter(isValidElement<{ label: string; icon?: ReactNode }>);
  const [selected, setSelected] = useState("Basics");
  const active = panels.some((panel) => panel.props.label === selected) ? selected : "Basics";

  return <div className="strategy-tabs">
    <div className="strategy-tab-list" role="tablist" aria-label="Strategy settings">
      {panels.map((panel, index) => <button
        key={panel.props.label}
        id={`${id}-tab-${index}`}
        className="strategy-tab"
        type="button"
        role="tab"
        data-tab={panel.props.label}
        aria-selected={active === panel.props.label}
        aria-controls={`${id}-panel-${index}`}
        tabIndex={active === panel.props.label ? 0 : -1}
        onClick={() => setSelected(panel.props.label)}
        onKeyDown={(event) => {
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % panels.length;
          else if (event.key === "ArrowLeft") next = (index + panels.length - 1) % panels.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = panels.length - 1;
          else return;
          event.preventDefault();
          setSelected(panels[next].props.label);
          document.getElementById(`${id}-tab-${next}`)?.focus();
        }}
      >
        {panel.props.icon ? (
          <span className="strategy-tab-icon" aria-hidden="true">{panel.props.icon}</span>
        ) : null}
        <span className="strategy-tab-label">{panel.props.label}</span>
      </button>)}
    </div>
    {panels.map((panel, index) => <div
      key={panel.props.label}
      id={`${id}-panel-${index}`}
      className="strategy-modal-body strategy-tab-panel"
      role="tabpanel"
      aria-labelledby={`${id}-tab-${index}`}
      hidden={active !== panel.props.label}
      tabIndex={0}
      onInvalidCapture={() => {
        // Reveal invalid fields before the browser focuses them during Save.
        if (active !== panel.props.label) flushSync(() => setSelected(panel.props.label));
      }}
    >{panel}</div>)}
  </div>;
}
