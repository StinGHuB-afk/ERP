// Create a valid >5MB PDF by manually constructing PDF with raw uncompressed streams
// This bypasses pdf-lib compression and directly writes binary PDF content
const fs = require('fs');
const path = require('path');

function createRawPdf(outputPath, targetSizeMB) {
  const targetBytes = targetSizeMB * 1024 * 1024;
  
  // A minimal valid PDF structure with a large embedded stream object
  // The stream will contain uncompressed random-ish binary data
  
  // Generate large binary data (no compression filter = raw bytes)
  const streamSize = Math.ceil(targetBytes * 1.1); // slightly over target
  const streamData = Buffer.alloc(streamSize);
  
  // Fill with pseudo-random pattern (prevents run-length compression artifacts)
  for (let i = 0; i < streamSize; i++) {
    streamData[i] = (i * 1664525 + 1013904223) & 0xFF; // LCG PRNG pattern
  }

  // Build PDF manually
  let offset = 0;
  const offsets = {};
  const parts = [];

  function write(str) {
    const buf = Buffer.isBuffer(str) ? str : Buffer.from(str, 'binary');
    parts.push(buf);
    offset += buf.length;
  }

  // Header
  write('%PDF-1.7\n');
  write('%\xFF\xFF\xFF\xFF\n'); // Binary marker (standard practice)

  // Object 1: Catalog
  offsets[1] = offset;
  write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages
  offsets[2] = offset;
  write('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Object 3: Page
  offsets[3] = offset;
  write('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n');

  // Object 4: Page content stream
  offsets[4] = offset;
  const contentStream = [
    'BT',
    '/F1 20 Tf',
    '50 800 Td',
    '(School ERP - Smoke Test PDF - Final Acceptance Test) Tj',
    '0 -30 Td',
    '/F1 12 Tf',
    '(Generated: ' + new Date().toISOString() + ') Tj',
    '0 -20 Td',
    '(File Size: >' + targetSizeMB + ' MB valid PDF) Tj',
    '0 -20 Td',
    '(This PDF proves the browser upload flow works end-to-end.) Tj',
    'ET',
  ].join('\n');
  const contentBuf = Buffer.from(contentStream, 'latin1');
  write('4 0 obj\n<< /Length ' + contentBuf.length + ' >>\nstream\n');
  write(contentBuf);
  write('\nendstream\nendobj\n');

  // Object 5: Font
  offsets[5] = offset;
  write('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n');

  // Object 6: Large binary data stream (the bulk of the file)
  offsets[6] = offset;
  const streamHeader = '6 0 obj\n<< /Length ' + streamData.length + ' >>\nstream\n';
  write(streamHeader);
  write(streamData);
  write('\nendstream\nendobj\n');

  // Cross-reference table
  const xrefOffset = offset;
  write('xref\n');
  write('0 7\n');
  write('0000000000 65535 f \n');
  for (let i = 1; i <= 6; i++) {
    write(offsets[i].toString().padStart(10, '0') + ' 00000 n \n');
  }

  // Trailer
  write('trailer\n<< /Size 7 /Root 1 0 R >>\n');
  write('startxref\n');
  write(xrefOffset.toString() + '\n');
  write('%%EOF\n');

  const finalPdf = Buffer.concat(parts);
  fs.writeFileSync(outputPath, finalPdf);

  const stats = fs.statSync(outputPath);
  const header = finalPdf.slice(0, 8).toString('ascii');

  console.log('=== PDF CREATION RESULT ===');
  console.log('Output:', outputPath);
  console.log('Size:', stats.size, 'bytes (' + (stats.size / 1024 / 1024).toFixed(2) + ' MB)');
  console.log('PDF Header:', JSON.stringify(header.substring(0, 8)));
  console.log('Valid PDF (%PDF):', header.startsWith('%PDF'));
  console.log('Exceeds 4.5 MB:', stats.size > 4.5 * 1024 * 1024);

  return { size: stats.size, valid: header.startsWith('%PDF') };
}

const outPath = path.resolve(__dirname, '../test-large.pdf');
const result = createRawPdf(outPath, 5);

if (result.valid && result.size > 4.5 * 1024 * 1024) {
  console.log('\nSUCCESS: Valid ' + (result.size/1024/1024).toFixed(2) + 'MB PDF created.');
  process.exit(0);
} else {
  console.log('\nFAILED.');
  process.exit(1);
}
