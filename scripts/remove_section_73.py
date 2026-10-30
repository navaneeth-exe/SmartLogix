import zipfile
import re
import shutil

doc_path = r'Project Report/SmartLogix_Project_Report_Formatted.docx'
backup_path = r'Project Report/SmartLogix_Project_Report_Formatted.bak_before_73_removal.docx'
shutil.copyfile(doc_path, backup_path)
print(f"Backed up to {backup_path}")

with zipfile.ZipFile(doc_path, 'r') as zin:
    files = {name: zin.read(name) for name in zin.namelist()}

xml = files['word/document.xml'].decode('utf-8')

# --- 1. REMOVE FROM TOC ---
# In TOC, remove paragraphs containing 7.3, 7.3.1, 7.3.2, 7.3.3
# Each is a <w:p ...> ... </w:p>
toc_patterns = [
    r'<w:p\b[^>]*>(?:(?!</w:p>).)*?7\.3 Core Source Code Excerpts.*?</w:p>',
    r'<w:p\b[^>]*>(?:(?!</w:p>).)*?7\.3\.1 Dijkstra.*?short.*?path.*?</w:p>',
    r'<w:p\b[^>]*>(?:(?!</w:p>).)*?7\.3\.2 Kruskal.*?minimum.*?spanning.*?</w:p>',
    r'<w:p\b[^>]*>(?:(?!</w:p>).)*?7\.3\.3 First Fit Decreasing.*?</w:p>'
]

# Let's inspect TOC matches carefully
# The TOC is before the first CHAPTER 1 in the document body.
body_ch1_idx = xml.find('CHAPTER 1: INTRODUCTION', 200000)
print(f"Body Chapter 1 at {body_ch1_idx}")
toc_zone = xml[:body_ch1_idx]
body_zone = xml[body_ch1_idx:]

for pattern in toc_patterns:
    match = re.search(pattern, toc_zone, flags=re.IGNORECASE | re.DOTALL)
    if match:
        print(f"Matched TOC entry: length {len(match.group(0))}")
        toc_zone = toc_zone[:match.start()] + toc_zone[match.end():]
    else:
        print(f"Warning: pattern not matched in TOC: {pattern}")

# --- 2. REMOVE SECTION 7.3 FROM BODY ---
# In body_zone, find the Heading 2 for 7.3:
body_73_match = re.search(r'<w:p\b[^>]*>(?:(?!</w:p>).)*?7\.3 Core Source Code Excerpts.*?</w:p>', body_zone, flags=re.DOTALL)
if not body_73_match:
    print("Error: Could not find body 7.3 heading!")
    exit(1)

start_73 = body_73_match.start()
# Find the start of Chapter 8
ch8_match = re.search(r'<w:p\b[^>]*>(?:(?!</w:p>).)*?CHAPTER 8: REFERENCES.*?</w:p>', body_zone, flags=re.DOTALL)
if not ch8_match:
    print("Error: Could not find Chapter 8 heading!")
    exit(1)

end_73 = ch8_match.start()
removed_body = body_zone[start_73:end_73]
print(f"Removing {len(removed_body)} characters from body.")
# Check if there is a page break right before Chapter 8 that we want to keep
# In Word, Chapter 8 usually starts with a page break: <w:p ...><w:r><w:br w:type="page"/></w:r></w:p>
# Let's check what was at the end of removed_body:
if '<w:br w:type="page"/>' in removed_body:
    print("Preserving page break before Chapter 8")
    replacement = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
else:
    replacement = ''

body_zone = body_zone[:start_73] + replacement + body_zone[end_73:]

# Combine back
new_xml = toc_zone + body_zone

# Write new docx
files['word/document.xml'] = new_xml.encode('utf-8')
with zipfile.ZipFile(doc_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
    for name, data in files.items():
        zout.writestr(name, data)

print("Successfully updated document.xml and wrote docx!")

