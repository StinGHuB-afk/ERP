// Check if large_test.pdf is a valid PDF (has %PDF header)
const fs = require('fs');
const path = require('path');

const pdfPath = path.resolve(__dirname, '../large_test.pdf');
const stats = fs.statSync(pdfPath);
const buf = Buffer.alloc(8);
const fd = fs.openSync(pdfPath, 'r');
fs.readSync(fd, buf, 0, 8, 0);
fs.closeSync(fd);

const header = buf.toString('ascii');
const isValidPdf = header.startsWith('%PDF');

console.log('File:', pdfPath);
console.log('Size:', stats.size, 'bytes', '(' + (stats.size / 1024 / 1024).toFixed(2) + ' MB)');
console.log('Header:', JSON.stringify(header));
console.log('Valid PDF:', isValidPdf);

if (isValidPdf && stats.size > 4.5 * 1024 * 1024) {
  console.log('RESULT: large_test.pdf is VALID and exceeds 4.5MB. Use this file.');
} else if (!isValidPdf) {
  console.log('RESULT: large_test.pdf is NOT a valid PDF. Need to create one.');
} else {
  console.log('RESULT: large_test.pdf is valid but too small.');
}
