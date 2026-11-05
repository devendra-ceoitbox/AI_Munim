import React, { useState } from 'react';
import { X, Receipt, AlertCircle, Check } from 'lucide-react';
import { validateGstin, calculateTax, formatINR } from '../../utils/accounting.ts';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bill: {
    party: string;
    docNo: string;
    gstin: string;
    taxableValue: number;
    gstRate: number;
    ledger: string;
  }) => void;
  existingDocNos: string[];
}

export const AddBillModal: React.FC<AddBillModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingDocNos
}) => {
  const [supplier, setSupplier] = useState('');
  const [billNo, setBillNo] = useState('');
  const [gstin, setGstin] = useState('');
  const [taxable, setTaxable] = useState('');
  const [rate, setRate] = useState('18');
  const [ledger, setLedger] = useState('Raw Materials Purchase');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const taxableNum = parseFloat(taxable) || 0;
  const rateNum = parseInt(rate, 10) || 18;
  const taxAmount = calculateTax(taxableNum, rateNum);
  const totalAmount = taxableNum + taxAmount;

  const isDuplicate = billNo.trim() && existingDocNos.includes(billNo.trim());
  const isGstinValid = !gstin || validateGstin(gstin);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim()) {
      setError('Supplier name is required');
      return;
    }
    if (!billNo.trim()) {
      setError('Bill number is required');
      return;
    }
    if (isDuplicate) {
      setError(`Bill number ${billNo} already exists in the system.`);
      return;
    }
    if (!gstin.trim() || !validateGstin(gstin)) {
      setError('A valid 15-character GSTIN is required (e.g. 06AABCS1234F1Z5)');
      return;
    }
    if (taxableNum <= 0) {
      setError('Taxable value must be greater than zero');
      return;
    }

    onSubmit({
      party: supplier.trim(),
      docNo: billNo.trim(),
      gstin: gstin.trim().toUpperCase(),
      taxableValue: taxableNum,
      gstRate: rateNum,
      ledger
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-semibold text-sm">Add Purchase / Supplier Bill</h3>
              <p className="text-[11px] text-slate-400">Maker-Checker workflow with duplicate prevention</p>
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
                Supplier Name *
              </label>
              <input
                type="text"
                value={supplier}
                onChange={e => {
                  setSupplier(e.target.value);
                  setError('');
                }}
                placeholder="e.g. Apex Packaging"
                className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Bill / Invoice No. *
              </label>
              <input
                type="text"
                value={billNo}
                onChange={e => {
                  setBillNo(e.target.value);
                  setError('');
                }}
                placeholder="e.g. AP-414"
                className={`w-full text-xs p-2 border rounded-md focus:ring-1 focus:outline-none ${
                  isDuplicate ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-slate-300'
                }`}
              />
              {isDuplicate && (
                <span className="text-[11px] text-rose-600 block mt-0.5">Warning: Duplicate document number</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Supplier GSTIN (15 chars) *
              </label>
              <input
                type="text"
                value={gstin}
                onChange={e => {
                  setGstin(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="06AABCS1234F1Z5"
                maxLength={15}
                className={`w-full text-xs p-2 border rounded-md uppercase font-mono ${
                  gstin && !isGstinValid ? 'border-amber-500 bg-amber-50' : 'border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Expense / Purchase Ledger *
              </label>
              <select
                value={ledger}
                onChange={e => setLedger(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-md"
              >
                <option>Raw Materials Purchase</option>
                <option>Freight &amp; Logistics</option>
                <option>Office Expenses</option>
                <option>Consulting Revenue</option>
                <option>IT &amp; Software Subscriptions</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Taxable Value (₹) *
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
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                GST Rate (%)
              </label>
              <select
                value={rate}
                onChange={e => setRate(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-md"
              >
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST (Standard)</option>
                <option value="28">28% GST</option>
              </select>
            </div>
          </div>

          {/* Real-time Tax calculation summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-mono">{formatINR(taxableNum)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Estimated GST ({rateNum}%):</span>
              <span className="font-mono text-teal-700">{formatINR(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-semibold pt-1 border-t border-slate-200">
              <span>Total Invoice Amount:</span>
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
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md shadow-sm"
            >
              Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
