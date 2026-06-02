"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { LockKeyhole, ShieldCheck } from "lucide-react";

interface PinInputProps {
  length?: number;
  onComplete?: (pin: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function PinInput({
  length = 6,
  onComplete,
  error = false,
  disabled = false,
  autoFocus = true,
}: PinInputProps) {
  const [pin, setPin] = useState<string[]>(Array(length).fill(""));
  const [shake, setShake] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (error) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const commitPin = (nextPin: string[]) => {
    setPin(nextPin);
    if (nextPin.every((digit) => digit !== "") && onComplete) {
      onComplete(nextPin.join(""));
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const nextPin = [...pin];
    nextPin[index] = value.slice(-1);
    commitPin(nextPin);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const nextPin = [...pin];
      nextPin[index] = e.key;
      commitPin(nextPin);

      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const nextPin = [...pin];

      if (nextPin[index]) {
        nextPin[index] = "";
        commitPin(nextPin);
      } else if (index > 0) {
        nextPin[index - 1] = "";
        commitPin(nextPin);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").slice(0, length);

    if (digits.length > 0) {
      const nextPin = [...pin];
      digits.split("").forEach((digit, idx) => {
        if (idx < length) nextPin[idx] = digit;
      });
      commitPin(nextPin);

      const lastFilledIndex = Math.min(digits.length - 1, length - 1);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const filledCount = pin.filter(Boolean).length;

  return (
    <motion.div
      animate={shake ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full"
    >
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-[rgba(0,200,150,0.14)] bg-[linear-gradient(180deg,rgba(31,31,38,0.98)_0%,rgba(20,20,24,0.96)_100%)] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#00c896_0%,#2563eb_100%)] text-white shadow-[0_12px_24px_rgba(0,200,150,0.2)]">
            <LockKeyhole size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Secure PIN entry</p>
            <p className="text-xs text-text-tertiary">Your PIN is never shown on screen.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border-primary bg-card-bg px-3 py-1.5">
          <ShieldCheck size={14} className="text-brand" />
          <span className="text-xs font-semibold text-text-primary">{filledCount}/{length}</span>
        </div>
      </div>

      <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
        {Array.from({ length }).map((_, index) => {
          const isFilled = Boolean(pin[index]);
          const isActive = focusedIndex === index;

          return (
            <motion.input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={pin[index]}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
              onPaste={handlePaste}
              disabled={disabled}
              aria-label={`PIN digit ${index + 1}`}
              className="aspect-[0.9] w-full rounded-[20px] border text-center text-2xl font-semibold tracking-[0.18em] outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 sm:text-[1.7rem]"
              style={{
                background: isFilled
                  ? "linear-gradient(135deg, rgba(0, 200, 150, 0.96) 0%, rgba(37, 99, 235, 0.96) 100%)"
                  : "linear-gradient(180deg, rgba(35, 35, 41, 0.95) 0%, rgba(26, 26, 31, 0.95) 100%)",
                borderColor: error
                  ? "rgba(239, 68, 68, 0.8)"
                  : isActive
                    ? "rgba(0, 200, 150, 0.95)"
                    : isFilled
                      ? "rgba(0, 200, 150, 0.4)"
                      : "rgba(42, 42, 49, 0.95)",
                boxShadow: isActive
                  ? "0 0 0 4px rgba(0, 200, 150, 0.15), 0 18px 34px rgba(0, 0, 0, 0.28)"
                  : isFilled
                    ? "0 14px 28px rgba(0, 200, 150, 0.16)"
                    : "0 10px 24px rgba(0, 0, 0, 0.18)",
                color: isFilled ? "#ffffff" : "var(--text-primary)",
                fontFamily: "var(--font-mono)",
              }}
              whileTap={{ scale: 0.96 }}
              whileFocus={{ y: -1 }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
