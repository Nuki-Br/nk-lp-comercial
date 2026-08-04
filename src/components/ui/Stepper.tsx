"use client";

/** Stepper compartilhado. Estilo default é claro (fundo branco, botão preto);
    o CSS pai pode sobrescrever cores via descendant selectors — usado assim
    no `.cta-plano-simulador` pra virar variant dark. */
export function Stepper({
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="calc-stepper"
      role="spinbutton"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
    >
      <button
        type="button"
        className="calc-stepper-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label={`Diminuir ${ariaLabel}`}
        disabled={value <= min}
      >
        −
      </button>
      <span className="calc-stepper-value">{value}</span>
      <button
        type="button"
        className="calc-stepper-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label={`Aumentar ${ariaLabel}`}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
