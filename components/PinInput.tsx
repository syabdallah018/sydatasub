"use client";

import { useEffect, useRef, useState } from "react";

interface PinInputProps {
  value: string[];
  onChange: (newValue: string[]) => void;
  error?: boolean;
  disabled?: boolean;
  bgColor: string;
  bgElevated: string;
  borderColor: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  errorColor: string;
  blueColor: string;
}

export default function PinInput({
  value,
  onChange,
  error = false,
  disabled = false,
  bgColor,
  bgElevated,
  borderColor,
  borderStrong,
  textPrimary,
  textSecondary,
  errorColor,
  blueColor,
}: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [shake, setShake] = useState(false);

  const handleDigitChange = (index: number, newDigit: string) => {
    // Only allow digits
    const digit = newDigit.replace(/\D/g, "");

    const newValue = [...value];
    newValue[index] = digit;
    onChange(newValue);

    // Auto-advance to next box
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace: move to previous box
    if (e.key === "Backspace" && !value[index] && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    // Left arrow: move to previous
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    // Right arrow: move to next
    if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pasted.length > 0) {
      const newValue = [...value];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newValue[i] = pasted[i];
      }
      onChange(newValue);

      // Focus last filled box or next empty box
      const lastFilledIndex = Math.min(pasted.length - 1, 5);
      setTimeout(() => {
        inputRefs.current[lastFilledIndex < 5 ? lastFilledIndex + 1 : 5]?.focus();
      }, 0);
    }
  };

  useEffect(() => {
    if (error) {
      setShake(true);
      // Focus first box on error
      inputRefs.current[0]?.focus();
      // Reset shake animation
      const timer = setTimeout(() => setShake(false), 300);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const shakeStyle = shake
    ? `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-6px); }
        50% { transform: translateX(6px); }
        75% { transform: translateX(-6px); }
      }
    `
    : "";

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        animation: shake ? "shake 0.3s" : "none",
      }}
    >
      <style>{shakeStyle}</style>
      {value.map((digit, i) => (
        <input
          key={`pin-digit-${i}`}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleDigitChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`PIN digit ${i + 1}`}
          style={{
            width: "45px",
            height: "50px",
            borderRadius: 12,
            background: digit ? `${blueColor}20` : bgElevated,
            border: `2px solid ${error ? errorColor : digit ? blueColor : borderColor}`,
            color: textPrimary,
            fontSize: 20,
            fontWeight: 700,
            textAlign: "center",
            fontFamily: "monospace",
            transition: "all 150ms ease",
            cursor: disabled ? "not-allowed" : "text",
            opacity: disabled ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  );
}
