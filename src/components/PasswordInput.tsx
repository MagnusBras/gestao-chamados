import { useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
  style?: React.CSSProperties;
};

/**
 * Input de senha com:
 *  - botão de mostrar/ocultar (ícone de olho)
 *  - botão de limpar (X), aparece só quando há texto
 *
 * Uso:
 *   <PasswordInput value={pwd} onChange={setPwd} required minLength={6} />
 */
export default function PasswordInput({
  value,
  onChange,
  style,
  required,
  autoFocus,
  autoComplete,
  minLength,
  placeholder,
}: Props) {
  const [show, setShow] = useState(false);
  const hasValue = value.length > 0;

  return (
    <div style={{ position: "relative", display: "flex", width: "100%" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        style={{
          ...style,
          width: "100%",
          paddingRight: 80,
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 6,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        {hasValue && (
          <IconButton onClick={() => onChange("")} ariaLabel="Limpar senha">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </IconButton>
        )}
        <IconButton
          onClick={() => setShow((s) => !s)}
          ariaLabel={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? (
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={ariaLabel}
      aria-label={ariaLabel}
      style={{
        background: "transparent",
        border: "none",
        color: "#cbd5e1",
        cursor: "pointer",
        padding: 6,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}
