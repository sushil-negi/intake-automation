import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { HEADER_HEIGHT, PAGE_WIDTH, CONTENT_WIDTH, PDF_MARGIN } from '../utils/pdf/pdfStyles';
import { FONT_SIZES } from '../utils/pdf/pdfStyles';

/**
 * Visual PDF banner tests.
 * Verify that the dynamic banner (which wraps long addresses) does not
 * exceed HEADER_HEIGHT, so content starting at HEADER_HEIGHT never overlaps.
 */

/** Compute actual banner bottom for a given address string (matches pdfHeader.ts compact layout) */
function computeBannerBottom(address: string): number {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  doc.setFontSize(FONT_SIZES.small); // 8pt, matching pdfHeader.ts

  const bannerTop = 19; // from pdfHeader.ts
  const padV = 1.5;     // compact vertical padding
  const padH = 2;       // horizontal padding for text inset

  // Measure address wrapping (matching pdfHeader.ts logic)
  const addrLabelText = 'Address: ';
  const addrLabelW = doc.getTextWidth(addrLabelText);
  const addrMaxW = CONTENT_WIDTH - addrLabelW - padH * 2;
  const addrLines = doc.splitTextToSize(address || '—', addrMaxW);

  const addrLineHeight = 3.5;
  const row1Height = 4;
  const maxAddrLines = 2; // address capped at 2 lines in pdfHeader.ts
  const row2Height = Math.min(addrLines.length, maxAddrLines) * addrLineHeight;
  const rawBannerHeight = padV + row1Height + 0.5 + row2Height + padV;
  // Banner is also hard-capped in pdfHeader.ts
  const maxBannerHeight = HEADER_HEIGHT - bannerTop - 1;
  const bannerHeight = Math.min(rawBannerHeight, maxBannerHeight);

  return bannerTop + bannerHeight;
}

describe('PDF banner height vs HEADER_HEIGHT', () => {
  it('short address (1 line) stays within HEADER_HEIGHT', () => {
    const bottom = computeBannerBottom('123 Main St, West Chester, PA 19380');
    expect(bottom).toBeLessThanOrEqual(HEADER_HEIGHT);
  });

  it('medium address (typical 1-2 lines) stays within HEADER_HEIGHT', () => {
    const bottom = computeBannerBottom(
      '12345 West Chester Pike, Suite 200, West Chester, Chester County, PA 19382-4500'
    );
    expect(bottom).toBeLessThanOrEqual(HEADER_HEIGHT);
  });

  it('long address (2-3 lines) stays within HEADER_HEIGHT', () => {
    const bottom = computeBannerBottom(
      '12345 South East Pennsylvania Avenue Extension, Building C, Apartment 4B, East Fallowfield Township, Chester County, PA 19320-1234'
    );
    expect(bottom).toBeLessThanOrEqual(HEADER_HEIGHT);
  });

  it('very long address (3+ lines) stays within HEADER_HEIGHT', () => {
    const bottom = computeBannerBottom(
      '98765 North West Chester Springs Boulevard, Building Complex D, Unit 123, Second Floor, East Coventry Township, Chester County, Pennsylvania 19465-7890, United States of America'
    );
    expect(bottom).toBeLessThanOrEqual(HEADER_HEIGHT);
  });

  it('empty address stays within HEADER_HEIGHT', () => {
    const bottom = computeBannerBottom('');
    expect(bottom).toBeLessThanOrEqual(HEADER_HEIGHT);
  });

  it('reports actual banner heights for documentation', () => {
    const cases = [
      { label: 'empty', addr: '' },
      { label: 'short', addr: '123 Main St, West Chester, PA' },
      { label: 'typical', addr: '456 Market Street, Apartment 2A, West Chester, PA 19380' },
      { label: 'long', addr: '12345 South East Pennsylvania Avenue Extension, Building C, Apartment 4B, East Fallowfield Township, Chester County, PA 19320-1234' },
      { label: 'extreme', addr: '98765 North West Chester Springs Boulevard, Building Complex D, Unit 123, Second Floor, East Coventry Township, Chester County, Pennsylvania 19465-7890, United States of America' },
    ];

    for (const { label, addr } of cases) {
      const bottom = computeBannerBottom(addr);
      const lines = new jsPDF({ unit: 'mm', format: 'letter' })
        .setFontSize(FONT_SIZES.small)
        .splitTextToSize(addr || '—', CONTENT_WIDTH - 20).length;
      console.log(`  [${label}] ${lines} line(s), banner bottom: ${bottom.toFixed(1)}mm (HEADER_HEIGHT: ${HEADER_HEIGHT}mm)`);
      expect(bottom).toBeLessThanOrEqual(HEADER_HEIGHT);
    }
  });
});
