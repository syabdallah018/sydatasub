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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img 
            src="/logo.jpeg" 
            alt="SY DATA" 
            className="h-16 w-16 object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-black mb-2">
            SY DATA SUB
          </h1>
          <p className="text-gray-600 text-sm">
            Fast, reliable, affordable data
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-lg p-1 mb-6">
            <TabsTrigger value="login" className="rounded-md data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:text-gray-700 data-[state=inactive]:bg-transparent">Login</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-md data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:text-gray-700 data-[state=inactive]:bg-transparent">Sign Up</TabsTrigger>
            <TabsTrigger value="guest" className="rounded-md data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:text-gray-700 data-[state=inactive]:bg-transparent text-xs">Guest</TabsTrigger>
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
    if (value.length > 1) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value && index < 5) {
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
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
      <div>
        <Label htmlFor="phone" className="text-sm font-medium text-black">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="08XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 bg-gray-50 border-gray-300 text-black focus:border-black focus:ring-0" />
      </div>
      <div>
        <Label className="text-sm font-medium text-black">PIN</Label>
        <div className="flex gap-2 mt-2">
          {pin.map((digit, index) => (
            <input key={index} id={`pin-${index}`} type="password" maxLength={1} value={digit} onChange={(e) => handlePinChange(index, e.target.value)} onKeyDown={(e) => handlePinKeyDown(index, e)} className="w-10 h-10 text-center bg-gray-50 border-gray-300 rounded text-black focus:border-black focus:ring-0" />
          ))}
        </div>
      </div>
      <Button onClick={handleLogin} disabled={isLoading} className="w-full bg-black hover:bg-gray-900 text-white font-medium rounded-lg mt-6">
        {isLoading ? "Logging in..." : "Login"}
      </Button>
      <div className="text-center pt-2">
        <button onClick={() => setActiveTab("signup")} className="text-sm text-gray-600 hover:text-black font-medium">Don't have an account? Sign up</button>
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
    if (value.length > 1) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value && index < 5) {
      document.getElementById(`signup-pin-${index + 1}`)?.focus();
    }
  };

  const handleConfirmPinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newPin = [...confirmPin];
    newPin[index] = value;
    setConfirmPin(newPin);
    if (value && index < 5) {
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
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-sm font-medium text-black">Full Name</Label>
        <Input id="name" type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 bg-gray-50 border-gray-300 text-black focus:border-black focus:ring-0" />
      </div>
      <div>
        <Label htmlFor="phone" className="text-sm font-medium text-black">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="08XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 bg-gray-50 border-gray-300 text-black focus:border-black focus:ring-0" />
      </div>
      <div>
        <Label className="text-sm font-medium text-black">PIN</Label>
        <div className="flex gap-2 mt-2">
          {pin.map((digit, index) => (
            <input key={index} id={`signup-pin-${index}`} type="password" maxLength={1} value={digit} onChange={(e) => handlePinChange(index, e.target.value)} className="w-10 h-10 text-center bg-gray-50 border-gray-300 rounded text-black focus:border-black focus:ring-0" />
          ))}
        </div>
      </div>
      <div>
        <Label className="text-sm font-medium text-black">Confirm PIN</Label>
        <div className="flex gap-2 mt-2">
          {confirmPin.map((digit, index) => (
            <input key={index} id={`confirm-pin-${index}`} type="password" maxLength={1} value={digit} onChange={(e) => handleConfirmPinChange(index, e.target.value)} className="w-10 h-10 text-center bg-gray-50 border-gray-300 rounded text-black focus:border-black focus:ring-0" />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="terms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="w-4 h-4 rounded border-gray-300 accent-black" />
        <Label htmlFor="terms" className="text-xs text-gray-600">I accept the terms and conditions</Label>
      </div>
      <Button onClick={handleSignup} disabled={isLoading} className="w-full bg-black hover:bg-gray-900 text-white font-medium rounded-lg mt-6">
        {isLoading ? "Creating..." : "Create Account"}
      </Button>
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
    // Validate phone format
    if (!/^0[0-9]{10}$/.test(phone)) {
      toast.error("Phone number must be 11 digits starting with 0");
      return;
    }
    setIsLoading(true);
    try {
      // Store guest phone in localStorage for checkout flow
      localStorage.setItem("guestPhone", phone);
      localStorage.setItem("isGuest", "true");
      // Navigate to checkout/data selection page
      router.push("/app/checkout?guest=true&phone=" + encodeURIComponent(phone));
    } catch (error) {
      toast.error("Navigation error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <div>
        <Label htmlFor="phone" className="text-sm font-medium text-black">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="08XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 bg-gray-50 border-gray-300 text-black focus:border-black focus:ring-0" />
      </div>
      <p className="text-xs text-gray-600 py-2">
        Buy data without creating an account. Fast and simple.
      </p>
      <Button onClick={handleGuestPurchase} disabled={isLoading} className="w-full bg-black hover:bg-gray-900 text-white font-medium rounded-lg mt-6">
        {isLoading ? "Loading..." : "Continue as Guest"}
      </Button>
    </motion.div>
  );
}
