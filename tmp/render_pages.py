import pymupdf, os
os.makedirs('tmp/rendered-test/Canada', exist_ok=True)
os.makedirs('tmp/rendered-test/US', exist_ok=True)
doc_ca = pymupdf.open('tmp/output_canada.pdf')
for i, page in enumerate(doc_ca):
    pix = page.get_pixmap(dpi=144)
    pix.save(f'tmp/rendered-test/Canada/ca{i+1}.png')
print(f"Canada: {len(doc_ca)} pages rendered")
doc_us = pymupdf.open('tmp/output_us.pdf')
for i, page in enumerate(doc_us):
    pix = page.get_pixmap(dpi=144)
    pix.save(f'tmp/rendered-test/US/us{i+1}.png')
print(f"US: {len(doc_us)} pages rendered")

