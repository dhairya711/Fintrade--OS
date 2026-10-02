// ─── Indian Number to Words Converter ─────────────────────────────────────────

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen'];

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function wordsLt100(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
}

function wordsLt1000(n: number): string {
  if (n < 100) return wordsLt100(n);
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + wordsLt100(n % 100) : '');
}

/**
 * Converts an integer amount in paise (or rupees * 100) to Indian words.
 * Example: numberToWords(123456) => "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six Only"
 */
export function numberToWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  let result = '';

  if (rupees >= 10000000) {
    result += wordsLt1000(Math.floor(rupees / 10000000)) + ' Crore ';
  }
  if (rupees >= 100000) {
    result += wordsLt1000(Math.floor((rupees % 10000000) / 100000)) + ' Lakh ';
  }
  if (rupees >= 1000) {
    result += wordsLt1000(Math.floor((rupees % 100000) / 1000)) + ' Thousand ';
  }
  if (rupees >= 100) {
    result += ones[Math.floor((rupees % 1000) / 100)] + ' Hundred ';
  }
  if (rupees % 100 !== 0) {
    result += wordsLt100(rupees % 100) + ' ';
  }

  result = result.trim();

  if (paise > 0) {
    result += ' and ' + wordsLt100(paise) + ' Paise';
  }

  return 'Rupees ' + result + ' Only';
}
