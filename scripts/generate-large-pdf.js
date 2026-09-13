const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function createLargePdf() {
  const pdfDoc = await PDFDocument.create();
  
  console.log('Generating valid large PDF with uncompressible data...');

  // 1500 pages with 4KB of random hex text per page should be ~6MB uncompressed, 
  // and since it's random it won't compress well.
  for (let i = 0; i < 2000; i++) {
    const page = pdfDoc.addPage([600, 400]);
    page.drawText(`This is page ${i} of the final acceptance test PDF.`, {
      x: 50,
      y: 350,
      size: 20,
      color: rgb(0, 0, 0),
    });
    
    // Add random data to prevent high compression
    const randomBuffer = crypto.randomBytes(2000); // 4000 hex chars
    const bulkyText = randomBuffer.toString('hex').match(/.{1,100}/g).join('\n');
    
    page.drawText(bulkyText, {
      x: 10,
      y: 300,
      size: 5,
      color: rgb(0.5, 0.5, 0.5),
      lineHeight: 6
    });
  }

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(__dirname, '..', 'large_test_acceptance.pdf');
  
  fs.writeFileSync(filePath, pdfBytes);
  
  const stats = fs.statSync(filePath);
  console.log(`Generated PDF at ${filePath}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);
  
  if (stats.size < 4.5 * 1024 * 1024) {
    console.warn('Warning: PDF is smaller than 4.5 MB. Test requires >4.5MB.');
  } else {
    console.log('PDF size is appropriate for >4.5 MB upload test.');
  }
}

createLargePdf().catch(console.error);
