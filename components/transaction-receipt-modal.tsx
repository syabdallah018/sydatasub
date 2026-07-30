'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { X, Copy, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ReceiptTransaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  phone?: string | null;
  description?: string | null;
  createdAt: string | Date;
  reference: string;
  plan?: {
    name?: string | null;
    network?: string | null;
    sizeLabel?: string | null;
    validity?: string | null;
    category?: string | null;
  } | null;
}

interface TransactionReceiptModalProps {
  open: boolean;
  onClose: () => void;
  transaction: ReceiptTransaction | null;
}

export function TransactionReceiptModal({
  open,
  onClose,
  transaction,
}: TransactionReceiptModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const receiptCardRef = useRef<HTMLDivElement>(null);

  if (!open || !transaction) return null;

  const isSuccess = transaction.status === 'SUCCESS' || transaction.status === 'SUCCESSFUL';
  const isFailed = transaction.status === 'FAILED';

  // Format network name
  const extractNetwork = (): string => {
    if (transaction.plan?.network) return transaction.plan.network;
    const desc = (transaction.description || '').toUpperCase();
    if (desc.includes('MTN')) return 'MTN';
    if (desc.includes('GLO')) return 'GLO';
    if (desc.includes('AIRTEL')) return 'AIRTEL';
    if (desc.includes('9MOBILE') || desc.includes('ETISALAT')) return '9MOBILE';
    return 'DATA / TELECOM';
  };

  // Format data plan name
  const extractPlanName = (): string => {
    if (transaction.plan?.sizeLabel) {
      const size = transaction.plan.sizeLabel.toLowerCase();
      const val = (transaction.plan.validity || '30 days').toLowerCase();
      return `${size} · ${val}`;
    }
    if (transaction.description) {
      return transaction.description;
    }
    return transaction.type === 'DATA_PURCHASE' ? 'Data Plan' : transaction.type.replace(/_/g, ' ');
  };

  const formattedDate = format(
    new Date(transaction.createdAt || Date.now()),
    'dd/MM/yyyy, HH:mm'
  );

  const handleCopyRef = () => {
    if (!transaction.reference) return;
    navigator.clipboard.writeText(transaction.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download receipt as PNG image using Canvas with real logo & rounded pills
  const handleDownloadPNG = async () => {
    try {
      setDownloading(true);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 600;
      const height = 820;
      canvas.width = width;
      canvas.height = height;

      // 1. Fill background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // 2. Load Real Logo Image
      const logoImg = new window.Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/logo.jpeg';
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
      });

      // 3. Green Hero Gradient Header
      const gradient = ctx.createLinearGradient(0, 0, width, 380);
      if (isSuccess) {
        gradient.addColorStop(0, '#046A38');
        gradient.addColorStop(1, '#024220');
      } else if (isFailed) {
        gradient.addColorStop(0, '#B91C1C');
        gradient.addColorStop(1, '#7F1D1D');
      } else {
        gradient.addColorStop(0, '#D97706');
        gradient.addColorStop(1, '#92400E');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(0, 0, width, 380, [24, 24, 0, 0]);
      } else {
        ctx.rect(0, 0, width, 380);
      }
      ctx.fill();

      // Decorative ambient glowing circle overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.arc(500, 100, 220, 0, Math.PI * 2);
      ctx.fill();

      // Draw Compressed Logo in White Circle
      const logoX = 40;
      const logoY = 38;
      const logoSize = 54;

      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.clip();

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      } else {
        ctx.fillStyle = '#046A38';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SY', logoX + logoSize / 2, logoY + 34);
      }
      ctx.restore();

      // Brand Title & Subtitle
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SY DATA', 110, 62);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('TRANSACTION RECEIPT', 110, 82);

      // Status Badge Glass Pill Top Right
      const statusLabel = isSuccess ? '• SUCCESS' : isFailed ? '• FAILED' : '• PENDING';
      const pillX = 430;
      const pillY = 42;
      const pillW = 130;
      const pillH = 38;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pillX, pillY, pillW, pillH, 19);
      } else {
        ctx.rect(pillX, pillY, pillW, pillH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSuccess ? '#86EFAC' : isFailed ? '#FCA5A5' : '#FDE68A';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(statusLabel, pillX + pillW / 2, pillY + 24);

      // Hero Amount Section
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TOTAL AMOUNT PAID', width / 2, 170);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 54px sans-serif';
      ctx.fillText(`₦${Number(transaction.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, width / 2, 235);

      // Ref ID Glass Pill (Adjusted size & font to fit long references)
      const refPillW = 480;
      const refPillH = 44;
      const refPillX = (width - refPillW) / 2;
      const refPillY = 270;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(refPillX, refPillY, refPillW, refPillH, 22);
      } else {
        ctx.rect(refPillX, refPillY, refPillW, refPillH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      // Dynamically fit text size depending on reference length
      const fullRefText = `REF: ${transaction.reference}`;
      const fontSize = fullRefText.length > 35 ? 11 : fullRefText.length > 25 ? 13 : 14;
      ctx.font = `${fontSize}px monospace`;
      ctx.fillText(fullRefText, width / 2, refPillY + 27);

      // Scalloped Wavy Paper Tear Transition at 380px
      ctx.fillStyle = '#FFFFFF';
      const scallopCount = 24;
      const scallopWidth = width / scallopCount;
      ctx.beginPath();
      ctx.moveTo(0, 380);
      for (let i = 0; i < scallopCount; i++) {
        const x = i * scallopWidth;
        ctx.quadraticCurveTo(x + scallopWidth / 2, 365, x + scallopWidth, 380);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Details section key-values
      const startY = 440;
      const rowHeight = 65;

      const details = [
        ['NETWORK', extractNetwork()],
        ['DATA PLAN', extractPlanName()],
        ['RECIPIENT', transaction.phone || 'N/A'],
        ['DATE & TIME', formattedDate],
      ];

      details.forEach(([label, value], i) => {
        const currentY = startY + i * rowHeight;

        if (i > 0) {
          ctx.strokeStyle = '#F1F5F9';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(40, currentY - 20);
          ctx.lineTo(width - 40, currentY - 20);
          ctx.stroke();
        }

        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, 40, currentY + 10);

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(value, width - 40, currentY + 10);
      });

      // Footer
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0284C7';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('www.sydatasub.com', width / 2, 765);

      // Trigger Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `SYDATA-receipt-${transaction.reference.slice(-8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating PNG receipt:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[340px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
        >
          <X size={16} />
        </button>

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto" ref={receiptCardRef}>
          {/* SY DATA Emerald Green Header & Hero Area */}
          <div
            className={`relative p-5 text-white overflow-hidden ${
              isSuccess
                ? 'bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-600'
                : isFailed
                ? 'bg-gradient-to-br from-red-800 via-red-700 to-rose-600'
                : 'bg-gradient-to-br from-amber-800 via-amber-700 to-yellow-600'
            }`}
          >
            {/* Background Ambient Circle Overlay */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

            {/* Top Bar: Brand & Status */}
            <div className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white border border-white/30 flex items-center justify-center p-0.5 shrink-0 shadow-sm">
                  <Image
                    src="/logo.jpeg"
                    alt="SY DATA"
                    fill
                    className="object-contain p-0.5 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="font-black text-xs text-emerald-800">SY</span>
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white leading-none">SY DATA</h3>
                  <p className="text-[9px] font-bold text-white/70 tracking-widest uppercase mt-0.5">TRANSACTION RECEIPT</p>
                </div>
              </div>

              {/* Status Badge Pill */}
              <div className="px-2.5 py-1 rounded-full bg-white/15 border border-white/25 backdrop-blur-md flex items-center gap-1 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-300' : isFailed ? 'bg-red-300' : 'bg-amber-300'}`} />
                <span className="text-[10px] font-extrabold tracking-wide uppercase text-white">
                  {isSuccess ? 'SUCCESS' : isFailed ? 'FAILED' : 'PENDING'}
                </span>
              </div>
            </div>

            {/* Total Amount Paid Hero */}
            <div className="mt-6 mb-4 text-center">
              <p className="text-[10px] font-bold text-white/80 tracking-widest uppercase">TOTAL AMOUNT PAID</p>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                ₦{Number(transaction.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </div>

              {/* Ref ID Glass Pill */}
              <div className="mt-3 inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-[11px] font-mono text-white/90 max-w-[95%]">
                <span className="truncate max-w-[190px] sm:max-w-[220px]">REF: {transaction.reference}</span>
                <button
                  onClick={handleCopyRef}
                  className="p-0.5 hover:bg-white/20 rounded transition-colors shrink-0"
                  title="Copy reference"
                >
                  {copied ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          </div>

          {/* Scalloped / Wavy Paper-Tear Edge */}
          <div className="relative w-full h-3 bg-white -mt-0.5 leading-none">
            <svg
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              className={`w-full h-3 fill-current ${
                isSuccess ? 'text-green-600' : isFailed ? 'text-rose-600' : 'text-yellow-600'
              }`}
            >
              <path d="M0 0 Q 2.5 10 5 0 Q 7.5 10 10 0 Q 12.5 10 15 0 Q 17.5 10 20 0 Q 22.5 10 25 0 Q 27.5 10 30 0 Q 32.5 10 35 0 Q 37.5 10 40 0 Q 42.5 10 45 0 Q 47.5 10 50 0 Q 52.5 10 55 0 Q 57.5 10 60 0 Q 62.5 10 65 0 Q 67.5 10 70 0 Q 72.5 10 75 0 Q 77.5 10 80 0 Q 82.5 10 85 0 Q 87.5 10 90 0 Q 92.5 10 95 0 Q 97.5 10 100 0 L 100 0 L 0 0 Z" />
            </svg>
          </div>

          {/* Details Section (Clean White Background) */}
          <div className="bg-white p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">NETWORK</span>
              <span className="font-black text-slate-900 text-sm">{extractNetwork()}</span>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">DATA PLAN</span>
              <span className="font-bold text-slate-900 text-sm text-right">{extractPlanName()}</span>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">RECIPIENT</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{transaction.phone || 'N/A'}</span>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">DATE & TIME</span>
              <span className="font-bold text-slate-900 text-xs">{formattedDate}</span>
            </div>

            {/* Footer domain link */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <a
                href="https://www.sydatasub.com"
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 font-extrabold text-xs hover:underline inline-block"
              >
                www.sydatasub.com
              </a>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
          <Button
            onClick={handleDownloadPNG}
            disabled={downloading}
            variant="outline"
            className="flex-1 bg-white border-slate-300 text-slate-800 hover:bg-slate-100 font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
          >
            <Download size={14} />
            {downloading ? 'Exporting...' : 'Save PNG'}
          </Button>

          <Button
            onClick={onClose}
            className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-10 rounded-xl"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
