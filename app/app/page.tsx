"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "sonner";
import { useRouter } from "next/navigation";

export default function AppPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [user, setUser] = useState(null);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-gray-50/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Premium Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <img
                src="/logo.jpeg"
                alt="SY DATA"
                className="h-12 w-12 object-contain"
              />
            </div>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">
            SY DATA SUB
          </h1>
          <p className="text-gray-600 text-base font-medium">
            Premium data & airtime in seconds
          </p>
        </motion.div>

        {/* Premium Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-xl p-1.5 mb-8">
            <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:bg-transparent transition">
              Login
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:bg-transparent transition">
              Sign Up
            </TabsTrigger>
            <TabsTrigger value="guest" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:bg-transparent transition text-xs">
              Guest
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="login" className="mt-0">
              <LoginTab setActiveTab={setActiveTab} setUser={setUser} router={router} />
            </TabsContent>
            <TabsContent value="signup" className="mt-0">
              <SignupTab setUser={setUser} router={router} />
            </TabsContent>
            <TabsContent value="guest" className="mt-0">
              <GuestTab />
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}

function LoginTab({ setActiveTab, setUser, router }: { setActiveTab: (tab: string) => void; setUser: (user: any) => void; router: any }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);

  const handlePinChange = (index: number, value: string) => {
    const digitOnly = value.replace(/[^0-9]/g, '');
    if (digitOnly.length > 1) return;
    const newPin = [...pin];
    newPin[index] = digitOnly;
    setPin(newPin);
    if (digitOnly && index < 5) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

  const handleLogin = async () => {
    if (!phone || pin.some(d => !d)) {
      toast.error("Please fill all fields");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin: pin.join("") }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        toast.success("Login successful!");
        router.push("/app/dashboard");
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div>
        <Label htmlFor="phone" className="text-sm font-semibold text-gray-900 block mb-2">
          Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="08012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-blue-500 rounded-xl py-3 font-semibold"
        />
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-900 block mb-3">PIN</Label>
        <div className="flex gap-2.5">
          {pin.map((digit, index) => (
            <input
              key={index}
              id={`pin-${index}`}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handlePinKeyDown(index, e)}
              className="flex-1 aspect-square text-center bg-gray-50 border-2 border-gray-200 rounded-xl text-xl font-bold text-gray-900 focus:border-blue-500 focus:ring-blue-500 transition"
            />
          ))}
        </div>
      </div>

      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg text-white font-bold rounded-xl mt-8 py-3.5 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
      >
        {isLoading ? "Logging in..." : "Login"}
      </button>

      <div className="text-center pt-2">
        <button
          onClick={() => setActiveTab("signup")}
          className="text-sm text-gray-600 hover:text-gray-900 font-medium transition"
        >
          Don't have an account? <span className="text-blue-600 font-semibold">Sign up</span>
        </button>
      </div>
    </motion.div>
  );
}

function SignupTab({ setUser, router }: { setUser: (user: any) => void; router: any }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePinChange = (index: number, value: string) => {
    const digitOnly = value.replace(/[^0-9]/g, '');
    if (digitOnly.length > 1) return;
    const newPin = [...pin];
    newPin[index] = digitOnly;
    setPin(newPin);
    if (digitOnly && index < 5) {
      document.getElementById(`signup-pin-${index + 1}`)?.focus();
    }
  };

  const handleConfirmPinChange = (index: number, value: string) => {
    const digitOnly = value.replace(/[^0-9]/g, '');
    if (digitOnly.length > 1) return;
    const newPin = [...confirmPin];
    newPin[index] = digitOnly;
    setConfirmPin(newPin);
    if (digitOnly && index < 5) {
      document.getElementById(`confirm-pin-${index + 1}`)?.focus();
    }
  };

  const handleSignup = async () => {
    if (!name || !phone || pin.some(d => !d) || confirmPin.some(d => !d) || !acceptTerms) {
      toast.error("Please fill all fields and accept terms");
      return;
    }
    if (pin.join("") !== confirmPin.join("")) {
      toast.error("PINs don't match");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, pin: pin.join(""), confirmPin: confirmPin.join(""), acceptTerms }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        toast.success("Account created!");
        router.push("/app/dashboard");
      } else {
        toast.error(data.error || "Signup failed");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto"
    >
      <div>
        <Label htmlFor="name" className="text-sm font-semibold text-gray-900 block mb-2">
          Full Name
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-blue-500 rounded-xl py-3 font-semibold"
        />
      </div>

      <div>
        <Label htmlFor="phone" className="text-sm font-semibold text-gray-900 block mb-2">
          Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="08012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-blue-500 rounded-xl py-3 font-semibold"
        />
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-900 block mb-3">PIN</Label>
        <div className="flex gap-2.5">
          {pin.map((digit, index) => (
            <input
              key={index}
              id={`signup-pin-${index}`}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handlePinChange(index, e.target.value)}
              className="flex-1 aspect-square text-center bg-gray-50 border-2 border-gray-200 rounded-xl text-xl font-bold text-gray-900 focus:border-blue-500 focus:ring-blue-500 transition"
            />
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-900 block mb-3">Confirm PIN</Label>
        <div className="flex gap-2.5">
          {confirmPin.map((digit, index) => (
            <input
              key={index}
              id={`confirm-pin-${index}`}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleConfirmPinChange(index, e.target.value)}
              className="flex-1 aspect-square text-center bg-gray-50 border-2 border-gray-200 rounded-xl text-xl font-bold text-gray-900 focus:border-blue-500 focus:ring-blue-500 transition"
            />
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 pt-2">
        <input
          type="checkbox"
          id="terms"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 accent-blue-600 mt-0.5"
        />
        <Label htmlFor="terms" className="text-xs text-gray-600 font-medium leading-tight">
          I agree to the terms and conditions
        </Label>
      </div>

      <button
        onClick={handleSignup}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg text-white font-bold rounded-xl mt-8 py-3.5 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
      >
        {isLoading ? "Creating..." : "Create Account"}
      </button>
    </motion.div>
  );
}

function GuestTab() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGuestPurchase = async () => {
    if (!phone) {
      toast.error("Please enter phone number");
      return;
    }
    if (!/^0[0-9]{10}$/.test(phone)) {
      toast.error("Phone number must be 11 digits starting with 0");
      return;
    }
    setIsLoading(true);
    try {
      localStorage.setItem("guestPhone", phone);
      localStorage.setItem("isGuest", "true");
      router.push("/app/checkout?guest=true&phone=" + encodeURIComponent(phone));
    } catch (error) {
      toast.error("Navigation error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-900 font-medium">
          👤 No account needed
        </p>
        <p className="text-xs text-blue-700 mt-2">
          Buy data instantly without creating an account
        </p>
      </div>

      <div>
        <Label htmlFor="phone" className="text-sm font-semibold text-gray-900 block mb-2">
          Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="08012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-blue-500 rounded-xl py-3 font-semibold"
        />
      </div>

      <button
        onClick={handleGuestPurchase}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg text-white font-bold rounded-xl mt-8 py-3.5 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
      >
        {isLoading ? "Loading..." : "Continue as Guest"}
      </button>
    </motion.div>
  );
}
