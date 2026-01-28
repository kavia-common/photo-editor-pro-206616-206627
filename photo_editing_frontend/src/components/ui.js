import React from "react";
import "./ui.css";

// PUBLIC_INTERFACE
export function Button({ variant = "primary", size = "md", disabled, children, ...props }) {
  return (
    <button
      className={`pe-btn pe-btn--${variant} pe-btn--${size}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// PUBLIC_INTERFACE
export function Input({ label, error, hint, ...props }) {
  const id = props.id || `in_${props.name || Math.random().toString(16).slice(2)}`;
  return (
    <div className="pe-field">
      {label ? (
        <label className="pe-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input id={id} className={`pe-input ${error ? "pe-input--error" : ""}`} {...props} />
      {error ? <div className="pe-field-error">{error}</div> : null}
      {!error && hint ? <div className="pe-field-hint">{hint}</div> : null}
    </div>
  );
}

// PUBLIC_INTERFACE
export function Slider({ label, value, min, max, step, onChange, hint }) {
  return (
    <div className="pe-field">
      <div className="pe-row pe-row--space">
        <div className="pe-label">{label}</div>
        <div className="pe-mono">{value}</div>
      </div>
      <input
        className="pe-range"
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint ? <div className="pe-field-hint">{hint}</div> : null}
    </div>
  );
}

// PUBLIC_INTERFACE
export function Card({ title, subtitle, children, right }) {
  return (
    <div className="pe-card">
      {(title || subtitle || right) && (
        <div className="pe-card__hdr">
          <div>
            {title ? <div className="pe-card__title">{title}</div> : null}
            {subtitle ? <div className="pe-card__sub">{subtitle}</div> : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
      )}
      <div className="pe-card__body">{children}</div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function Spinner({ label = "Loading..." }) {
  return (
    <div className="pe-spinner" role="status" aria-live="polite">
      <div className="pe-spinner__dot" />
      <div className="pe-spinner__dot" />
      <div className="pe-spinner__dot" />
      <span className="pe-spinner__label">{label}</span>
    </div>
  );
}

// PUBLIC_INTERFACE
export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="pe-alert pe-alert--error" role="alert">
      <div className="pe-alert__msg">{message}</div>
      {onDismiss ? (
        <button className="pe-alert__x" onClick={onDismiss} aria-label="Dismiss error">
          ×
        </button>
      ) : null}
    </div>
  );
}

// PUBLIC_INTERFACE
export function InfoBanner({ message }) {
  if (!message) return null;
  return (
    <div className="pe-alert pe-alert--info" role="status" aria-live="polite">
      <div className="pe-alert__msg">{message}</div>
    </div>
  );
}
