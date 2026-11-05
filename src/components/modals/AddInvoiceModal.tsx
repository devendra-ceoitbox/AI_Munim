import React, { useState } from 'react';
import { X, Send, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { validateGstin, calculateTax, formatINR } from '../../utils/accounting.ts';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (invoice: {
    customer: string;
    invoiceNo: string;
    gstin: string;
    invoiceDate: string;
    dueDate: string;
    taxableValue: number;
    gstRate: number;
    ledger: string;
    notes?: string;
  }) => void;
  existingInvoiceNos: string[];
}

export const AddInvoiceModal: React.FC<AddInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingInvoiceNos
}) => {
  const today = new Date().toISOString().split('T')[0];
  const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [customer, setCustomer] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [gstin, setGstin] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(next30Days);
  const [taxable, setTaxable] = useState('');
  const [rate, setRate] = useState('18');
  const [ledger, setLedger] = useState('IT & Consulting Services');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const taxableNum = parseFloat(taxable) || 0;
  const rateNum = parseInt(rate, 10) || 18;
  const taxAmount = calculateTax(taxableNum, rateNum);
  const totalAmount = taxableNum + taxAmount;

  const isDuplicate = invoiceNo.trim() && existingInvoiceNos.includes(invoiceNo.trim());
  const isGstinValid = !gstin || validateGstin(gstin);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.trim()) {
      setError('Customer / Client name is required');
      return;
    }
    if (!invoiceNo.trim()) {
      setError('Invoice number is required');
      return;
    }
    if (isDuplicate) {
      setError(`Invoice number ${invoiceNo} already exists in receivables.`);
      return;
    }
    if (gstin.trim() && !validateGstin(gstin)) {
      setError('If GSTIN is entered, it must be a valid 15-character format (e.g. 07AABCC1234F1Z8)');
      return;
    }
    if (taxableNum <= 0) {
      setError('Taxable invoice value must be greater than zero');
      return;
    }

    onSubmit({
      customer: customer.trim(),
      invoiceNo: invoiceNo.trim().toUpperCase(),
      gstin: gstin.trim().toUpperCase(),
      invoiceDate,
      dueDate,
      taxableValue: taxableNum,
      gstRate: rateNum,
      ledger,
      notes: notes.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600/30 flex items-center justify-center text-teal-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Create Live Sales Invoice</h3>
              <p className="text-[11px] text-slate-400">Posts to Accounts Receivable and Output GST (GSTR-1)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Customer / Client Name *
              </label>
              <input
                type="text"
                value={customer}
                onChange={e => {
                  setCustomer(e.target.value);
                  setError('');
                }}
                placeholder="e.g. Reliance Retail Ltd"
                className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={e => {
                  setInvoiceNo(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="e.g. INV-2026-001"
                className={`w-full text-xs p-2 border rounded-md uppercase font-mono focus:ring-1 focus:outline-none ${
                  isDuplicate ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-slate-300'
                }`}
                required
              />
              {isDuplicate && (
                <span className="text-[11px] text-rose-600 block mt-0.5">Warning: Duplicate invoice number</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Customer GSTIN (Optional if B2C)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={e => {
                  setGstin(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="07AABCC1234F1Z8"
                maxLength={15}
                className={`w-full text-xs p-2 border rounded-md uppercase font-mono ${
                  gstin && !isGstinValid ? 'border-amber-500 bg-amber-50' : 'border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Revenue Ledger *
              </label>
              <select
                value={ledger}
                onChange={e => setLedger(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-md"
              >
                <option>IT &amp; Consulting Services</option>
                <option>SaaS &amp; Software Licenses</option>
                <option>Product Sales (Taxable)</option>
                <option>Professional Fees</option>
                <option>AMC &amp; Support Contracts</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Payment Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-md"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Taxable Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={taxable}
                onChange={e => {
                  setTaxable(e.target.value);
                  setError('');
                }}
                placeholder="0.00"
                className="w-full text-xs p-2 border border-slate-300 rounded-md font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                GST Tax Rate (%)
              </label>
              <select
                value={rate}
                onChange={e => setRate(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-md"
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST (Standard)</option>
                <option value="28">28% GST</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Notes / Payment Terms (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Net 30 days, PO Ref #9872"
              className="w-full text-xs p-2 border border-slate-300 rounded-md"
            />
          </div>

          {/* Real-time Tax calculation summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-mono">{formatINR(taxableNum)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Output GST ({rateNum}%):</span>
              <span className="font-mono text-teal-700">{formatINR(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-semibold pt-1 border-t border-slate-200">
              <span>Total Invoice Receivable:</span>
              <span className="font-mono text-slate-900">{formatINR(totalAmount)}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Post Real Invoice</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
