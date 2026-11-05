import React, { useState } from 'react';
import { X, Send, MessageSquare, CheckCircle, ShieldCheck } from 'lucide-react';
import { ReceivableItem } from '../../types/accounting.ts';
import { formatINR } from '../../utils/accounting.ts';

interface WhatsAppModalProps {
  item: ReceivableItem | null;
  onClose: () => void;
  onSend: (item: ReceivableItem) => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ item, onClose, onSend }) => {
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!item) return null;

  const messageText = `Dear ${item.customer},\n\nGreetings from Sample Traders Pvt Ltd. This is a gentle reminder regarding Invoice *${item.id}* for *${formatINR(item.amount)}*, which was due ${item.overdueDays > 0 ? `${item.overdueDays} days ago` : 'shortly'}.\n\nKindly arrange the payment at your earliest convenience. You can also pay instantly via UPI: *sampletraders@icici*.\n\nIf the payment has already been initiated, please share the transaction reference. Thank you for your continued partnership.\n\nWarm regards,\nFinance Team | Sample Traders Pvt Ltd`;

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      onSend(item);
      setIsSending(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Send WhatsApp Reminder</h3>
              <p className="text-[11px] text-emerald-200">Verified Business Messaging (TRAI &amp; WhatsApp Compliant)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-emerald-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-500 block">Recipient</span>
              <span className="font-semibold text-slate-800">{item.customer}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Amount Due</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(item.amount)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Message Preview
            </label>
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3 text-xs text-slate-800 font-sans whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
              {messageText}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Sends within permitted customer quiet hours (9 AM – 7 PM). Includes opt-out notice.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-sm disabled:opacity-50"
          >
            {isSending ? (
              <span>Dispatching...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Confirm &amp; Send Reminder</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
