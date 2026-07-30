'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { X, CheckCircle2, AlertCircle, Clock, Copy, Download, Check } from 'lucide-react';
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
      return `${transaction.plan.sizeLabel} ${transaction.plan.category || ''} (${transaction.plan.validity || '30 Days'})`.trim();
    }
    if (transaction.description) {
      return transaction.description;
    }
    return transaction.type === 'DATA_PURCHASE' ? 'Data Plan' : transaction.type.replace(/_/g, ' ');
  };

  const formattedDate = format(
    new Date(transaction.createdAt || Date.now()),
    'MMM d, yyyy · hh:mm a'
  );

  const handleCopyRef = () => {
    if (!transaction.reference) return;
    navigator.clipboard.writeText(transaction.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download receipt as PNG image using Canvas
  const handleDownloadPNG = async () => {
    try {
      setDownloading(true);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 600;
      const height = 800;
      canvas.width = width;
      canvas.height = height;

      // Fill background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Border frame
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // Header background
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(20, 20, width - 40, 90);

      // Brand text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SMART SY DATA', width / 2, 60);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px sans-serif';
      ctx.fillText('Official Transaction Receipt', width / 2, 85);

      // Hero Green Status Box
      const heroBg = isSuccess ? '#ECFDF5' : isFailed ? '#FEF2F2' : '#FFFBEB';
      const heroBorder = isSuccess ? '#A7F3D0' : isFailed ? '#FECACA' : '#FDE68A';
      const statusColor = isSuccess ? '#059669' : isFailed ? '#DC2626' : '#D97706';

      ctx.fillStyle = heroBg;
      ctx.fillRect(40, 130, width - 80, 190);
      ctx.strokeStyle = heroBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 130, width - 80, 190);

      // Amount
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText(`₦${Number(transaction.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, width / 2, 190);

      ctx.fillStyle = '#64748B';
      ctx.font = '14px sans-serif';
      ctx.fillText('Amount Debited', width / 2, 215);

      // Status Pill
      ctx.fillStyle = statusColor;
      ctx.font = 'bold 18px sans-serif';
      const statusText = isSuccess ? '✓ SUCCESSFUL' : isFailed ? '✗ FAILED' : '⏱ PENDING';
      ctx.fillText(statusText, width / 2, 260);

      // Ref ID
      ctx.fillStyle = '#475569';
      ctx.font = '13px monospace';
      ctx.fillText(`Ref: ${transaction.reference}`, width / 2, 295);

      // Details section
      ctx.textAlign = 'left';
      const startY = 360;
      const rowHeight = 45;

      const details = [
        ['Network Operator', extractNetwork()],
        ['Data Package', extractPlanName()],
        ['Recipient Phone', transaction.phone || 'N/A'],
        ['Date & Time', formattedDate],
        ['Payment Method', 'SY DATA Wallet'],
      ];

      details.forEach(([label, value], i) => {
        const currentY = startY + i * rowHeight;
        // Line separator
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, currentY - 10);
        ctx.lineTo(width - 50, currentY - 10);
        ctx.stroke();

        ctx.fillStyle = '#64748B';
        ctx.font = '15px sans-serif';
        ctx.fillText(label, 60, currentY + 15);

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(value, width - 60, currentY + 15);
        ctx.textAlign = 'left';
      });

      // Footer Section (White background)
      const footerY = 640;
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(40, footerY);
      ctx.lineTo(width - 40, footerY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#0284C7';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('www.sydatasub.com', width / 2, 690);

      ctx.fillStyle = '#64748B';
      ctx.font = '14px sans-serif';
      ctx.fillText('Automated Instant Data & Airtime Services', width / 2, 720);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Thank you for choosing SY DATA', width / 2, 745);

      // Trigger Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `sydatasub-receipt-${transaction.reference.slice(-8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating PNG receipt:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[360px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header bar with logo & close */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-white/20 bg-white flex items-center justify-center">
              <Image
                src="/logo.jpeg"
                alt="SY DATA"
                fill
                className="object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-wider text-white uppercase">SMART SY DATA</h3>
              <p className="text-[10px] text-slate-300">Transaction Receipt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-4 overflow-y-auto space-y-3 text-slate-800 text-xs" ref={receiptCardRef}>
          {/* Light Green Hero Status Box */}
          <div
            className={`rounded-2xl p-4 text-center border transition-all ${
              isSuccess
                ? 'bg-emerald-50 border-emerald-200/80 text-emerald-900'
                : isFailed
                ? 'bg-red-50 border-red-200/80 text-red-900'
                : 'bg-amber-50 border-amber-200/80 text-amber-900'
            }`}
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm mb-2">
              {isSuccess ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : isFailed ? (
                <AlertCircle className="w-6 h-6 text-red-600" />
              ) : (
                <Clock className="w-6 h-6 text-amber-600" />
              )}
            </div>

            <div className="text-2xl font-extrabold tracking-tight text-slate-900">
              ₦{Number(transaction.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">Amount Debited</p>

            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-slate-200 shadow-2xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSuccess ? 'bg-emerald-500 animate-pulse' : isFailed ? 'bg-red-500' : 'bg-amber-500'
                }`}
              />
              <span className="font-bold text-[11px] tracking-wide uppercase">
                {isSuccess ? 'SUCCESSFUL' : isFailed ? 'FAILED' : 'PENDING'}
              </span>
            </div>

            {/* Reference ID Sub-row */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-center gap-1.5">
              <span className="font-mono text-[10px] text-slate-600 truncate max-w-[200px]">
                Ref: {transaction.reference}
              </span>
              <button
                onClick={handleCopyRef}
                className="p-1 hover:bg-white rounded transition-colors text-slate-500 hover:text-slate-900"
                title="Copy reference"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Network</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {extractNetwork()}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Data / Package</span>
              <span className="font-semibold text-slate-900 text-right max-w-[170px] truncate">
                {extractPlanName()}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Recipient</span>
              <span className="font-bold font-mono text-slate-900">
                {transaction.phone || 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Date & Time</span>
              <span className="font-medium text-slate-700">{formattedDate}</span>
            </div>

            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium">Payment Source</span>
              <span className="font-semibold text-slate-800">SY DATA Wallet</span>
            </div>
          </div>

          {/* Footer Section (White Background) */}
          <div className="bg-white rounded-2xl p-3 border border-dashed border-slate-200 text-center space-y-1">
            <a
              href="https://www.sydatasub.com"
              target="_blank"
              rel="noreferrer"
              className="text-sky-600 font-extrabold text-sm hover:underline block"
            >
              www.sydatasub.com
            </a>
            <p className="text-[10px] text-slate-500">Automated Instant Data & Airtime Services</p>
          </div>
        </div>

        {/* Modal Footer Controls (Download PNG & Close) */}
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
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 rounded-xl"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
