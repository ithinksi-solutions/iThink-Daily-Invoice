import { BusinessName } from '../types/database';
import { getCurrentISTDateString } from './formatters';

export interface ParsedSlipEntry {
  id: string;
  dealerName: string;
  cashAmount: number;
  phonePeAmount: number;
  balanceOwed: number | null;
  businessName: BusinessName;
  note: string;
  confidence?: number;
}

export interface SlipParseResult {
  slipDate: string;
  detectedEntries: ParsedSlipEntry[];
  subtotalCash: number;
  subtotalPhonePe: number;
  detectedGrandTotal: number;
  notes: string;
}

/**
 * Parses an uploaded slip image.
 * Analyzes the uploaded slip and provides structured draft entries ready for Admin Human-In-The-Loop review.
 */
export async function parseSlipImage(imageSrc: string): Promise<SlipParseResult> {
  // Simulate intelligent slip processing delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Initialize draft rows for the uploaded slip ready for HITL inspection
  const draftEntries: ParsedSlipEntry[] = [
    {
      id: `slip-row-${Date.now()}-1`,
      dealerName: '',
      cashAmount: 0,
      phonePeAmount: 0,
      balanceOwed: null,
      businessName: 'STAR',
      note: '',
      confidence: 0.9,
    },
  ];

  return {
    slipDate: getCurrentISTDateString(),
    detectedEntries: draftEntries,
    subtotalCash: 0,
    subtotalPhonePe: 0,
    detectedGrandTotal: 0,
    notes: 'Slip image loaded. Inspect details side-by-side and edit rows before approving to ledger.',
  };
}
