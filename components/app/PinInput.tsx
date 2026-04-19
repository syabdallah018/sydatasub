"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

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

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    // Auto-focus next input if digit entered
    if (value && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits filled
    if (newPin.every((digit) => digit !== "") && onComplete) {
      onComplete(newPin.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const newPin = [...pin];
      newPin[index] = e.key;
      setPin(newPin);

      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (newPin.every((digit) => digit !== "") && onComplete) {
        onComplete(newPin.join(""));
      }
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const newPin = [...pin];

      if (newPin[index]) {
        newPin[index] = "";
        setPin(newPin);
      } else if (index > 0) {
        // Move to previous input on backspace if current is empty
        newPin[index - 1] = "";
        setPin(newPin);
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

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").slice(0, length);

    if (digits.length > 0) {
      const newPin = [...pin];
      digits.split("").forEach((digit, idx) => {
        if (idx < length) newPin[idx] = digit;
      });
      setPin(newPin);

      // Focus last filled input or last input
      const lastFilledIndex = Math.min(digits.length - 1, length - 1);
      inputRefs.current[lastFilledIndex]?.focus();

      // Call onComplete if all digits filled
      if (newPin.every((d) => d !== "") && onComplete) {
        onComplete(newPin.join(""));
      }
    }
  };

  return (
    <motion.div
      animate={shake ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex gap-3 justify-center"
    >
      {Array.from({ length }).map((_, index) => (
        <motion.input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={pin[index]}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.currentTarget.select()}
          onPaste={handlePaste}
          disabled={disabled}
          className={`
            w-14 h-16 rounded-lg text-center text-2xl font-bold
            transition-all duration-200
            ${
              pin[index]
                ? "bg-gradient-brand text-white"
                : "bg-card-elevated border border-border-primary"
            }
            ${error ? "border-error bg-error/5" : ""}
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}
            focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
          `}
          whileTap={{ scale: 0.95 }}
          whileFocus={{
            boxShadow: "0 0 0 3px rgba(0, 200, 150, 0.1)",
          }}
        />
      ))}
    </motion.div>
  );
}
