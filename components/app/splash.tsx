'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export function SplashScreenWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(pathname === '/app');

  useEffect(() => {
    // Only show splash if we're exactly at /app
    if (pathname === '/app') {
      setShowSplash(true);
      const timer = setTimeout(() => setShowSplash(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowSplash(false);
    }
  }, [pathname]);

  return (
    <>
      {showSplash && <SplashScreen />}
      {children}
    </>
  );
}

function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        flexDirection: 'column',
        gap: 24,
        pointerEvents: 'none'
      }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          width: 100,
          height: 100,
          borderRadius: 24,
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}
      >
        <img
          src="/logo.jpeg"
          alt="SY Data Sub Logo"
          style={{
            width: 80,
            height: 80,
            objectFit: 'contain',
            borderRadius: 16
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        style={{
          textAlign: 'center',
          color: '#ffffff'
        }}
      >
        <h1
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 28,
            fontWeight: 800,
            margin: '0 0 8px',
            letterSpacing: '-0.02em'
          }}
        >
          SY Data Sub
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            margin: 0,
            opacity: 0.9,
            letterSpacing: '0.05em'
          }}
        >
          Fast • Reliable • Affordable
        </p>
      </motion.div>

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.3)',
          borderTopColor: '#ffffff',
          marginTop: 12
        }}
      />
    </motion.div>
  );
}
