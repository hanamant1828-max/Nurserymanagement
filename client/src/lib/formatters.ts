/**
 * Format a number using Indian numbering system
 * Examples: 1000 -> "1 thousand", 100000 -> "1 lakh", 1000000 -> "10 lakh", 10000000 -> "1 crore"
 */
export function formatIndianNumber(num: number): string {
  if (num === 0) return "0";
  
  const crore = 10000000;
  const lakh = 100000;
  const thousand = 1000;
  
  if (num >= crore) {
    const croreValue = (num / crore).toFixed(2);
    return `${parseFloat(croreValue)} Cr`;
  } else if (num >= lakh) {
    const lakhValue = (num / lakh).toFixed(2);
    return `${parseFloat(lakhValue)} Lakh`;
  } else if (num >= thousand) {
    const thousandValue = (num / thousand).toFixed(2);
    return `${parseFloat(thousandValue)} K`;
  }
  
  return num.toLocaleString('en-IN');
}
