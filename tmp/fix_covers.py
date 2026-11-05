"""
Fix section cover pages to use slim footer (page number only, no disclaimer pill).
Also fix hero band height, logo size, and other visual improvements.
"""
import re

with open('backend/src/fairexit/reportOutput.ts', encoding='utf-8') as f:
    content = f.read()

# ------------------------------------------------------------------
# 1. Replace pageFooter calls for all 5 section cover pages with sectionCoverFooter
# ------------------------------------------------------------------
# The section cover pages all have this pattern just before sec.push({ id: 'sN_cover' ...})
# We'll use regex to target only section-cover-page usages

# Find and replace pageFooter in section-cover context
# Each section cover ends with:
#   ${pageFooter(curPage, effTotal)}
#   </div>
#   `
#   sec.push({ id: 'sN_cover', ...
for cover_id in ['s1_cover', 's2_cover', 's3_cover', 's4_cover', 's5_cover']:
    old = f"      ${{pageFooter(curPage, effTotal)}}\n    </div>\n  `\n  sec.push({{ id: '{cover_id}'"
    new = f"      ${{sectionCoverFooter(curPage, effTotal)}}\n    </div>\n  `\n  sec.push({{ id: '{cover_id}'"
    if old in content:
        content = content.replace(old, new)
        print(f"Fixed {cover_id}")
    else:
        print(f"WARNING: pattern not found for {cover_id}")

# ------------------------------------------------------------------
# 2. Increase hero band height from 220px to 285px (matches reference)
# ------------------------------------------------------------------
old_hero = '.cover-hero-band {\n  width: 100%;\n  height: 220px;'
new_hero = '.cover-hero-band {\n  width: 100%;\n  height: 285px;'
if old_hero in content:
    content = content.replace(old_hero, new_hero)
    print("Fixed hero band height")
else:
    print("WARNING: hero band height pattern not found")

# ------------------------------------------------------------------
# 3. Increase logo height from 28px to 42px
# ------------------------------------------------------------------
old_logo = '.hero-logo {\n  height: 28px;\n  width: auto;\n  display: block;\n}'
new_logo = '.hero-logo {\n  height: 42px;\n  width: auto;\n  display: block;\n}'
if old_logo in content:
    content = content.replace(old_logo, new_logo)
    print("Fixed logo height")
else:
    print("WARNING: logo height pattern not found")

# ------------------------------------------------------------------
# 4. Add page-footer-slim CSS rule for section cover pages
# ------------------------------------------------------------------
old_footer_css = '.page-footer-num {\n  font-size: 8.5pt;\n  color: #062C55;\n  font-weight: 500;\n  text-align: center;\n}\n`'
new_footer_css = '.page-footer-num {\n  font-size: 8.5pt;\n  color: #062C55;\n  font-weight: 500;\n  text-align: center;\n}\n.page-footer-slim {\n  margin-top: auto;\n  margin-bottom: 0;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  width: 100%;\n}\n`'
if old_footer_css in content:
    content = content.replace(old_footer_css, new_footer_css)
    print("Added page-footer-slim CSS")
else:
    print("WARNING: footer CSS pattern not found")

# ------------------------------------------------------------------
# 5. Increase CHECKS_PER_PAGE from 7 to 8
# ------------------------------------------------------------------
old_checks = '  const CHECKS_PER_PAGE = 7'
new_checks = '  const CHECKS_PER_PAGE = 8'
if old_checks in content:
    content = content.replace(old_checks, new_checks)
    print("Fixed CHECKS_PER_PAGE to 8")
else:
    print("WARNING: CHECKS_PER_PAGE not found")

# ------------------------------------------------------------------
# 6. Reduce check-card-row padding to fit more rows
# ------------------------------------------------------------------
old_ccr = '.check-card-row {\n  display: grid;\n  grid-template-columns: 1.5fr 2.1fr 2fr 1.9fr 2.5fr;\n  gap: 8px;\n  padding: 6px 10px;'
new_ccr = '.check-card-row {\n  display: grid;\n  grid-template-columns: 1.5fr 2.1fr 2fr 1.9fr 2.5fr;\n  gap: 8px;\n  padding: 5px 10px;'
if old_ccr in content:
    content = content.replace(old_ccr, new_ccr)
    print("Fixed check-card-row padding")
else:
    print("WARNING: check-card-row padding not found")

# ------------------------------------------------------------------
# 7. Fix path card titles to be larger
# ------------------------------------------------------------------
old_path_title = '.path-title {\n  font-family: "Newsreader", Georgia, serif;\n  font-size: 14pt;\n  color: #062C55;\n  margin: 0 0 10px 0;\n}'
new_path_title = '.path-title {\n  font-family: "Newsreader", Georgia, serif;\n  font-size: 15pt;\n  color: #062C55;\n  margin: 0 0 10px 0;\n  font-weight: 600;\n}'
if old_path_title in content:
    content = content.replace(old_path_title, new_path_title)
    print("Fixed path-title")
else:
    print("WARNING: path-title not found")

# ------------------------------------------------------------------
# 8. Fix path cards to have more internal padding
# ------------------------------------------------------------------
old_path_card = '.path-card {\n  border: 1px solid #E7E4DD;\n  border-radius: 8px;\n  padding: 16px;\n  background: #FFFFFF;\n  display: flex;\n  flex-direction: column;\n}'
new_path_card = '.path-card {\n  border: 1px solid #E7E4DD;\n  border-radius: 8px;\n  padding: 20px 18px;\n  background: #FFFFFF;\n  display: flex;\n  flex-direction: column;\n}'
if old_path_card in content:
    content = content.replace(old_path_card, new_path_card)
    print("Fixed path-card padding")
else:
    print("WARNING: path-card not found")

# ------------------------------------------------------------------
# 9. Fix path-desc font size (make slightly bigger)
# ------------------------------------------------------------------
old_path_desc = '.path-desc {\n  font-size: 9pt;\n  color: #5A6B78;\n  line-height: 1.4;\n  margin: 0 0 14px 0;\n}'
new_path_desc = '.path-desc {\n  font-size: 10pt;\n  color: #5A6B78;\n  line-height: 1.45;\n  margin: 0 0 16px 0;\n}'
if old_path_desc in content:
    content = content.replace(old_path_desc, new_path_desc)
    print("Fixed path-desc")
else:
    print("WARNING: path-desc not found")

# ------------------------------------------------------------------
# 10. Fix path-bold-note font size
# ------------------------------------------------------------------
old_bold_note = '.path-bold-note {\n  font-size: 9pt;\n  color: #062C55;\n  line-height: 1.4;\n  margin-top: auto;\n}'
new_bold_note = '.path-bold-note {\n  font-size: 10pt;\n  font-weight: 700;\n  color: #062C55;\n  line-height: 1.4;\n  margin-top: auto;\n}'
if old_bold_note in content:
    content = content.replace(old_bold_note, new_bold_note)
    print("Fixed path-bold-note")
else:
    print("WARNING: path-bold-note not found")

# ------------------------------------------------------------------
# 11. Fix three-paths-grid gap and add min-height to cards
# ------------------------------------------------------------------
old_grid = '.three-paths-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 14px;\n  margin-bottom: 18px;\n}'
new_grid = '.three-paths-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 16px;\n  margin-bottom: 20px;\n}'
if old_grid in content:
    content = content.replace(old_grid, new_grid)
    print("Fixed three-paths-grid")
else:
    print("WARNING: three-paths-grid not found")

# ------------------------------------------------------------------
# 12. Adjust glance-card for better spacing
# ------------------------------------------------------------------
old_glance = '.glance-card {\n  border: 1px solid #E7E4DD;\n  border-radius: 8px;\n  padding: 16px;\n  display: grid;\n  grid-template-columns: 1.1fr 1fr;\n  gap: 20px;\n}'
new_glance = '.glance-card {\n  border: 1px solid #E7E4DD;\n  border-radius: 8px;\n  padding: 20px 18px;\n  display: grid;\n  grid-template-columns: 1.1fr 1fr;\n  gap: 24px;\n}'
if old_glance in content:
    content = content.replace(old_glance, new_glance)
    print("Fixed glance-card")
else:
    print("WARNING: glance-card not found")

# ------------------------------------------------------------------
# 13. Fix glance-lead font size (make bigger for readability)
# ------------------------------------------------------------------
old_lead = '.glance-lead {\n  font-size: 10.5pt;\n  line-height: 1.5;\n  color: #17242F;\n  margin: 0 0 10px 0;\n}'
new_lead = '.glance-lead {\n  font-size: 11pt;\n  line-height: 1.55;\n  color: #17242F;\n  margin: 0 0 12px 0;\n}'
if old_lead in content:
    content = content.replace(old_lead, new_lead)
    print("Fixed glance-lead")
else:
    print("WARNING: glance-lead not found")

# ------------------------------------------------------------------
# 14. Fix page top padding - slightly more breathing room
# ------------------------------------------------------------------
old_page = '  padding: 61.5pt 67.5pt 15.5pt 67.5pt;'
new_page = '  padding: 54pt 67.5pt 14pt 67.5pt;'
if old_page in content:
    content = content.replace(old_page, new_page)
    print("Fixed page padding")
else:
    print("WARNING: page padding not found")

# ------------------------------------------------------------------
# 15. Adjust section cover paddings for correct vertical position
#     Reference analysis: section kicker at ~25% from top
#     s1: kicker at ~240px/1584px = 15.2% → 15.2% × 11in × 72pt/in = ~120pt but subtract 54pt page pad → 66pt between top-margin and kicker
# ------------------------------------------------------------------
# s1-cover: kicker at ~252px from top (1584px image, 144 DPI)
# 252px @ 144dpi = 1.75in = 126pt
old_s1 = '.section-cover-page.s1-cover { padding-top: 119.5pt; }'
new_s1 = '.section-cover-page.s1-cover { padding-top: 126pt; }'
if old_s1 in content:
    content = content.replace(old_s1, new_s1)
    print("Fixed s1-cover padding")
else:
    print("WARNING: s1-cover padding not found")

# s2-cover: "2" digit appears at ~330px = 2.3in = 165pt — but this is the digit not the kicker
# kicker at ~265px = 1.84in = 133pt
old_s2 = '.section-cover-page.s2-cover { padding-top: 182.5pt; }'
new_s2 = '.section-cover-page.s2-cover { padding-top: 133pt; }'
if old_s2 in content:
    content = content.replace(old_s2, new_s2)
    print("Fixed s2-cover padding")
else:
    print("WARNING: s2-cover padding not found")

# s3-cover: kicker at ~230px = 1.6in = 115pt
old_s3 = '.section-cover-page.s3-cover { padding-top: 128.5pt; }'
new_s3 = '.section-cover-page.s3-cover { padding-top: 115pt; }'
if old_s3 in content:
    content = content.replace(old_s3, new_s3)
    print("Fixed s3-cover padding")
else:
    print("WARNING: s3-cover padding not found")

# s4-cover: kicker at ~252px = 1.75in = 126pt
old_s4 = '.section-cover-page.s4-cover { padding-top: 177pt; }'
new_s4 = '.section-cover-page.s4-cover { padding-top: 126pt; }'
if old_s4 in content:
    content = content.replace(old_s4, new_s4)
    print("Fixed s4-cover padding")
else:
    print("WARNING: s4-cover padding not found")

# s5-cover: kicker at ~252px = 1.75in = 126pt
old_s5 = '.section-cover-page.s5-cover { padding-top: 160.5pt; }'
new_s5 = '.section-cover-page.s5-cover { padding-top: 126pt; }'
if old_s5 in content:
    content = content.replace(old_s5, new_s5)
    print("Fixed s5-cover padding")
else:
    print("WARNING: s5-cover padding not found")

# ------------------------------------------------------------------
# 16. Fix toc-title to be normal weight (not bold) to match reference
# ------------------------------------------------------------------
old_toc_title = '.toc-title {\n  font-size: 10.5pt;\n  font-weight: 700;\n  color: #062C55;\n}'
new_toc_title = '.toc-title {\n  font-size: 10.5pt;\n  font-weight: 600;\n  color: #062C55;\n}'
if old_toc_title in content:
    content = content.replace(old_toc_title, new_toc_title)
    print("Fixed toc-title weight")
else:
    print("WARNING: toc-title not found")

# ------------------------------------------------------------------
# 17. Myth cards - increase gap slightly for better spacing
# ------------------------------------------------------------------
old_myths = '.myths-list {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}'
new_myths = '.myths-list {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n}'
if old_myths in content:
    content = content.replace(old_myths, new_myths)
    print("Fixed myths-list gap")
else:
    print("WARNING: myths-list not found")

# ------------------------------------------------------------------
# 18. Myth card padding increase  
# ------------------------------------------------------------------
old_myth_card = '.myth-card {\n  border: 1px solid #E7E4DD;\n  border-radius: 8px;\n  padding: 9px 14px;\n  display: grid;\n  grid-template-columns: 1fr 1.3fr;\n  gap: 16px;\n}'
new_myth_card = '.myth-card {\n  border: 1px solid #E7E4DD;\n  border-radius: 8px;\n  padding: 12px 16px;\n  display: grid;\n  grid-template-columns: 1fr 1.3fr;\n  gap: 18px;\n}'
if old_myth_card in content:
    content = content.replace(old_myth_card, new_myth_card)
    print("Fixed myth-card padding")
else:
    print("WARNING: myth-card not found")

# ------------------------------------------------------------------
# 19. Myth text font size (make bigger to match reference)
# ------------------------------------------------------------------
old_myth_text = '.myth-text {\n  font-size: 9pt;\n  font-weight: 700;\n  color: #062C55;\n  line-height: 1.35;\n}'
new_myth_text = '.myth-text {\n  font-size: 10pt;\n  font-weight: 700;\n  color: #062C55;\n  line-height: 1.35;\n}'
if old_myth_text in content:
    content = content.replace(old_myth_text, new_myth_text)
    print("Fixed myth-text size")
else:
    print("WARNING: myth-text not found")

# ------------------------------------------------------------------
# 20. Rule text font size (increase for readability)
# ------------------------------------------------------------------
old_rule_text = '.rule-text {\n  font-size: 8.5pt;\n  color: #27343F;\n  line-height: 1.35;\n}'
new_rule_text = '.rule-text {\n  font-size: 9pt;\n  color: #27343F;\n  line-height: 1.4;\n}'
if old_rule_text in content:
    content = content.replace(old_rule_text, new_rule_text)
    print("Fixed rule-text size")
else:
    print("WARNING: rule-text not found")

# ------------------------------------------------------------------
# 21. Feature card amount font size (make larger like reference)
# ------------------------------------------------------------------
old_feat_amount = '.feature-card-amount {\n  font-family: "Newsreader", Georgia, serif;\n  font-size: 26pt;\n  font-weight: 700;\n  letter-spacing: -0.5px;\n  margin-bottom: 6px;\n}'
new_feat_amount = '.feature-card-amount {\n  font-family: "Newsreader", Georgia, serif;\n  font-size: 36pt;\n  font-weight: 700;\n  letter-spacing: -1px;\n  margin-bottom: 8px;\n}'
if old_feat_amount in content:
    content = content.replace(old_feat_amount, new_feat_amount)
    print("Fixed feature-card-amount size")
else:
    print("WARNING: feature-card-amount not found")

# ------------------------------------------------------------------
# 22. Increase navy card padding to give range number more prominence
# ------------------------------------------------------------------
old_navy = '.navy-feature-card {\n  background: #062C55;\n  color: #FFFFFF;\n  border-radius: 8px;\n  padding: 16px 22px;\n  text-align: center;\n  margin-bottom: 14px;\n}'
new_navy = '.navy-feature-card {\n  background: #062C55;\n  color: #FFFFFF;\n  border-radius: 10px;\n  padding: 22px 28px;\n  text-align: center;\n  margin-bottom: 16px;\n}'
if old_navy in content:
    content = content.replace(old_navy, new_navy)
    print("Fixed navy-feature-card padding")
else:
    print("WARNING: navy-feature-card not found")

# ------------------------------------------------------------------
# 23. Cover page content padding 
# ------------------------------------------------------------------
old_cover_content = '.cover-content {\n  padding: 24pt 43.5pt 18pt 43.5pt;\n  display: flex;\n  flex-direction: column;\n}'
new_cover_content = '.cover-content {\n  padding: 22pt 36pt 16pt 36pt;\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n}'
if old_cover_content in content:
    content = content.replace(old_cover_content, new_cover_content)
    print("Fixed cover-content")
else:
    print("WARNING: cover-content not found")

# ------------------------------------------------------------------
# 24. Cover title bigger to match reference
# ------------------------------------------------------------------
old_cover_title = '.cover-title {\n  font-size: 32pt;\n  margin: 0 0 10px 0;\n  line-height: 1.1;\n}'
new_cover_title = '.cover-title {\n  font-size: 36pt;\n  margin: 0 0 12px 0;\n  line-height: 1.1;\n}'
if old_cover_title in content:
    content = content.replace(old_cover_title, new_cover_title)
    print("Fixed cover-title size")
else:
    print("WARNING: cover-title not found")

# ------------------------------------------------------------------
# 25. Cover meta value (name, role) font bigger
# ------------------------------------------------------------------
old_meta_val = '.meta-value {\n  font-size: 12.5pt;\n  font-weight: 700;\n  color: #062C55;\n}'
new_meta_val = '.meta-value {\n  font-size: 13pt;\n  font-weight: 700;\n  color: #062C55;\n}'
if old_meta_val in content:
    content = content.replace(old_meta_val, new_meta_val)
    print("Fixed meta-value size")
else:
    print("WARNING: meta-value not found")

# ------------------------------------------------------------------
# 26. Section heading size on content pages bigger
# ------------------------------------------------------------------
old_heading = '.section-heading {\n  font-size: 22pt;\n  margin: 0 0 6px 0;\n  line-height: 1.2;\n}'
new_heading = '.section-heading {\n  font-size: 24pt;\n  margin: 0 0 8px 0;\n  line-height: 1.15;\n}'
if old_heading in content:
    content = content.replace(old_heading, new_heading)
    print("Fixed section-heading size")
else:
    print("WARNING: section-heading not found")

# ------------------------------------------------------------------
# 27. Huge section title bigger to match reference (s.cover title)
# ------------------------------------------------------------------
old_huge = '.huge-section-title {\n  font-size: 32pt;\n  margin: 0 0 14px 0;\n  line-height: 1.1;\n}'
new_huge = '.huge-section-title {\n  font-size: 38pt;\n  margin: 0 0 16px 0;\n  line-height: 1.1;\n}'
if old_huge in content:
    content = content.replace(old_huge, new_huge)
    print("Fixed huge-section-title size")
else:
    print("WARNING: huge-section-title not found")

# ------------------------------------------------------------------
# 28. Huge section digit bigger  
# ------------------------------------------------------------------
old_digit = '.huge-section-digit {\n  font-family: "Newsreader", Georgia, serif;\n  font-size: 64pt;\n  color: #062C55;\n  line-height: 1;\n  margin: 16px 0 8px 0;\n}'
new_digit = '.huge-section-digit {\n  font-family: "Newsreader", Georgia, serif;\n  font-size: 80pt;\n  color: #062C55;\n  line-height: 1;\n  margin: 14px 0 6px 0;\n}'
if old_digit in content:
    content = content.replace(old_digit, new_digit)
    print("Fixed huge-section-digit size")
else:
    print("WARNING: huge-section-digit not found")

with open('backend/src/fairexit/reportOutput.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone! File written.")

