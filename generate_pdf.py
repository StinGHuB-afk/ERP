from reportlab.pdfgen import canvas
import os

def create_large_pdf(filename, target_size_mb):
    c = canvas.Canvas(filename)
    # Add a lot of pages and random lines to increase file size
    page_count = 0
    # Also add large strings
    large_string = "A" * 1024 * 100 # 100KB string
    
    target_bytes = target_size_mb * 1024 * 1024
    
    while True:
        c.drawString(100, 100, "This is a large test PDF file.")
        # Add some random lines
        for i in range(100):
            c.line(i, i, i+100, i+100)
            
        c.showPage()
        page_count += 1
        
        if page_count % 100 == 0:
            c.save()
            if os.path.getsize(filename) > target_bytes:
                break
            # To speed it up, we need a faster way to make the file large. 
            # reportlab might be slow if we just add pages.
            c = canvas.Canvas(filename) # start over, this will overwrite though
            pass

    # A better way is to add a lot of text or an image.
    pass

filename = "large_test_file.pdf"
# Faster way to generate a 5MB valid PDF: generate a small PDF, then append a large comment block
c = canvas.Canvas(filename)
c.drawString(100, 800, "Valid Test PDF for >4.5MB Upload Test")
c.save()

# Append junk to make it > 5MB
with open(filename, "ab") as f:
    junk = b"% " + (b"A" * 1024 * 1024 * 5) # 5MB comment
    f.write(junk)
    # Append %%EOF just in case
    f.write(b"\n%%EOF\n")

print(f"Created {filename} with size {os.path.getsize(filename)} bytes")
