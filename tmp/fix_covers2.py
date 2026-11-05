
# Fix 1: Section cover pages should use pageFooter (with disclaimer pill), not sectionCoverFooter
# Fix 2: huge-section-title font-size too big (38pt causes long titles to wrap)
# Fix 3: Radar SVG - "Similar jobs" label is cropped (cx - r - 12 goes negative)

import re

with open('backend/src/fairexit/reportOutput.ts', 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# Fix 1: Replace sectionCoverFooter() with pageFooter() in all section covers
content = content.replace(
    '${sectionCoverFooter(curPage, effTotal)}',
    '${pageFooter(curPage, effTotal)}'
)

# Fix 2: Reduce huge-section-title font size from 38pt to 30pt to prevent wrapping
content = content.replace(
    '.huge-section-title {\n  font-size: 38pt;',
    '.huge-section-title {\n  font-size: 30pt;'
)

# Fix 3: Fix radar SVG viewBox to prevent "Similar jobs" label cropping
# Current: width="280" height="260" viewBox="0 0 280 260"
# cx=140, cy=130, r=75 => cx - r - 12 = 140 - 75 - 12 = 53 (but text-anchor="end" goes further left)
# Let's widen the viewBox and move the diagram right
old_radar = '''    <div class="radar-box">
      <svg width="280" height="260" viewBox="0 0 280 260">'''
new_radar = '''    <div class="radar-box">
      <svg width="300" height="260" viewBox="-15 0 310 260">'''

content = content.replace(old_radar, new_radar)

changes = []
if '${pageFooter(curPage, effTotal)}' in content and '${sectionCoverFooter' not in content:
    changes.append('Fix 1: sectionCoverFooter replaced with pageFooter')
if '.huge-section-title {\n  font-size: 30pt;' in content:
    changes.append('Fix 2: huge-section-title reduced to 30pt')
if 'viewBox="-15 0 310 260"' in content:
    changes.append('Fix 3: radar SVG viewBox widened')

if content != original:
    with open('backend/src/fairexit/reportOutput.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("File written successfully!")
    for c in changes:
        print(f"  - {c}")
else:
    print("WARNING: No changes made!")
    # Debug: check what was found
    print(f"sectionCoverFooter occurrences: {content.count('sectionCoverFooter')}")
    print(f"huge-section-title 38pt occurrences: {content.count('font-size: 38pt')}")
    print(f"viewBox occurrences: {content.count('viewBox=\"0 0 280 260\"')}")

