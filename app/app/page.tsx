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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      <div className="hidden md:block absolute inset-0 bg-white/40 blur-2xl rounded-[2.5rem] max-w-sm mx-auto" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl border border-gray-200 p-8 shadow-lg"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4 flex justify-center"
          >
            <img 
              src="/logo.jpeg" 
              alt="SY DATA" 
              className="h-20 w-20 object-contain"
            />
          </motion.div>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            SY DATA SUB
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 text-sm"
          >
            Affordable, always connected.
          </motion.p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 backdrop-blur-sm rounded-xl p-1 mb-6">
            <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-teal-500 data-[state=active]:text-white transition-all text-gray-700">Login</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-teal-500 data-[state=active]:text-white transition-all text-gray-700">Sign Up</TabsTrigger>
            <TabsTrigger value="guest" className="rounded-lg data-[state=active]:bg-teal-500 data-[state=active]:text-white transition-all text-xs text-gray-700">Buy Without Account</TabsTrigger>
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
      </motion.div>
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
        <Label htmlFor="phone" className="text-gray-700 text-sm font-medium">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="08XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 bg-white border-gray-300 text-gray-900 focus:border-teal-500" />
      </div>
      <div>
        <Label className="text-gray-700 text-sm font-medium">PIN</Label>
        <div className="flex gap-2 mt-2">
          {pin.map((digit, index) => (
            <input key={index} id={`pin-${index}`} type="password" maxLength={1} value={digit} onChange={(e) => handlePinChange(index, e.target.value)} onKeyDown={(e) => handlePinKeyDown(index, e)} className="w-10 h-10 text-center bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-teal-500" />
          ))}
        </div>
      </div>
      <Button onClick={handleLogin} disabled={isLoading} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium">
        {isLoading ? "Logging in..." : "Login"}
      </Button>
      <div className="text-center">
        <button onClick={() => setActiveTab("signup")} className="text-teal-600 hover:text-teal-700 text-sm font-medium">Sign Up</button>
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
        <Label htmlFor="name" className="text-gray-700 text-sm font-medium">Full Name</Label>
        <Input id="name" type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 bg-white border-gray-300 text-gray-900 focus:border-teal-500" />
      </div>
      <div>
        <Label htmlFor="phone" className="text-gray-700 text-sm font-medium">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="08XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 bg-white border-gray-300 text-gray-900 focus:border-teal-500" />
      </div>
      <div>
        <Label className="text-gray-700 text-sm font-medium">PIN</Label>
        <div className="flex gap-2 mt-2">
          {pin.map((digit, index) => (
            <input key={index} id={`signup-pin-${index}`} type="password" maxLength={1} value={digit} onChange={(e) => handlePinChange(index, e.target.value)} className="w-10 h-10 text-center bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-teal-500" />
          ))}
        </div>
      </div>
      <div>
        <Label className="text-gray-700 text-sm font-medium">Confirm PIN</Label>
        <div className="flex gap-2 mt-2">
          {confirmPin.map((digit, index) => (
            <input key={index} id={`confirm-pin-${index}`} type="password" maxLength={1} value={digit} onChange={(e) => handleConfirmPinChange(index, e.target.value)} className="w-10 h-10 text-center bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-teal-500" />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="terms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500" />
        <Label htmlFor="terms" className="text-gray-700 text-xs">I accept the terms and conditions</Label>
      </div>
      <Button onClick={handleSignup} disabled={isLoading} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium">
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
        <Label htmlFor="phone" className="text-gray-700 text-sm font-medium">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="08XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 bg-white border-gray-300 text-gray-900 focus:border-teal-500" />
      </div>
      <Button onClick={handleGuestPurchase} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium">
        Continue as Guest
      </Button>
    </motion.div>
  );
}
