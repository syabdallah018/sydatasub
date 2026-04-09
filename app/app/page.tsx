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
    <div className="min-h-screen bg-[#0A0F0E] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="hidden md:block absolute inset-0 bg-black/20 blur-2xl rounded-[2.5rem] max-w-sm mx-auto" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-[#0A0F0E]/80 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent mb-2"
          >
            SY DATA SUB
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400 text-sm"
          >
            Your data, your speed.
          </motion.p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 backdrop-blur-sm rounded-xl p-1 mb-6">
            <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-teal-500 data-[state=active]:text-white transition-all">Login</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-teal-500 data-[state=active]:text-white transition-all">Sign Up</TabsTrigger>
            <TabsTrigger value="guest" className="rounded-lg data-[state=active]:bg-teal-500 data-[state=active]:text-white transition-all text-xs">Buy Without Account</TabsTrigger>
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
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
      <div>
        <Label htmlFor="phone" className="text-slate-300 text-sm">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="08XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 bg-slate-800/50 border-slate-600 text-white" />
      </div>
      <div>
        <Label className="text-slate-300 text-sm">PIN</Label>
        <div className="flex gap-2 mt-2">
          {pin.map((digit, index) => (
            <input key={index} id={`pin-${index}`} type="password" maxLength={1} value={digit} onChange={(e) => handlePinChange(index, e.target.value)} onKeyDown={(e) => handlePinKeyDown(index, e)} className="w-10 h-10 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-teal-400" />
          ))}
        </div>
      </div>
      <Button onClick={handleLogin} disabled={isLoading} className="w-full bg-teal-500 hover:bg-teal-600 text-white">
        {isLoading ? "Logging in..." : "Login"}
      </Button>
      <div className="text-center">
        <button onClick={() => setActiveTab("signup")} className="text-teal-400 text-sm">Sign Up</button>
      </div>
    </motion.div>
  );
}

function SignupTab({ setUser, router }: { setUser: (user: any) => void; router: any }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
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

  const handleSignup = async () => {
    if (!name || !phone || pin.some(d => !d)) {
      toast.error("Please fill all fields");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, pin: pin.join("") }),
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
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div>
        <Label htmlFor="name" className="text-slate-300 text-sm">Full Name</Label>
        <Input id="name" type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 bg-slate-800/50 border-slate-600 text-white" />
      </div>
      <div>
        <Label htmlFor="phone" className="text-slate-300 text-sm">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="08XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 bg-slate-800/50 border-slate-600 text-white" />
      </div>
      <div>
        <Label className="text-slate-300 text-sm">PIN</Label>
        <div className="flex gap-2 mt-2">
          {pin.map((digit, index) => (
            <input key={index} id={`signup-pin-${index}`} type="password" maxLength={1} value={digit} onChange={(e) => handlePinChange(index, e.target.value)} className="w-10 h-10 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-teal-400" />
          ))}
        </div>
      </div>
      <Button onClick={handleSignup} disabled={isLoading} className="w-full bg-teal-500 hover:bg-teal-600 text-white">
        {isLoading ? "Creating..." : "Create Account"}
      </Button>
    </motion.div>
  );
}

function GuestTab() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGuestPurchase = () => {
    if (!phone) {
      toast.error("Please enter phone number");
      return;
    }
    window.location.href = `/app/data-selection?phone=${phone}&guest=true`;
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div>
        <Label htmlFor="phone" className="text-slate-300 text-sm">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="08XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 bg-slate-800/50 border-slate-600 text-white" />
      </div>
      <Button onClick={handleGuestPurchase} className="w-full bg-teal-500 hover:bg-teal-600 text-white">
        Continue as Guest
      </Button>
    </motion.div>
  );
}
