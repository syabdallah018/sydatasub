const fs = require('fs');

const code = `"use client"

import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
        <p className="text-white/60 mb-8">Page loaded successfully</p>
        <Loader2 className="animate-spin mx-auto" size={32} />
      </div>
    </div>
  )
}`;

fs.writeFileSync('app/app/dashboard/page.tsx', code, 'utf8');
console.log('File written: ' + fs.statSync('app/app/dashboard/page.tsx').size + ' bytes');
