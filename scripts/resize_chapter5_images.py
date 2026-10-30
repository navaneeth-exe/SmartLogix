import zipfile
import re
import shutil

doc_path = r'Project Report/SmartLogix_Project_Report_Formatted.docx'
backup_path = r'Project Report/SmartLogix_Project_Report_Formatted.bak_before_resize.docx'
shutil.copyfile(doc_path, backup_path)
print(f"Backed up to {backup_path}")

with zipfile.ZipFile(doc_path, 'r') as zin:
    files = {name: zin.read(name) for name in zin.namelist()}

xml = files['word/document.xml'].decode('utf-8')

# Body Chapter 5 starts around pos 753300
ch5_start = xml.find('CHAPTER 5: WORKFLOW &amp; SYSTEM WALKTHROUGH', 200000)
ch6_start = xml.find('CHAPTER 6: SOFTWARE TESTING', ch5_start)

print(f"Chapter 5 at {ch5_start}, Chapter 6 at {ch6_start}")
ch5_xml = xml[ch5_start:ch6_start]

# Target width: 4.4 inches = 4.4 * 914400 = 4,023,360 EMUs
TARGET_CX = 4023360

# We need to resize both <wp:extent cx="..." cy="..."/> and <a:ext cx="..." cy="..."/>
# Only inside Chapter 5!

def resize_match(m):
    tag = m.group(1) # 'wp:extent' or 'a:ext'
    cx = int(m.group(2))
    cy = int(m.group(3))
    aspect = cx / cy
    new_cx = TARGET_CX
    new_cy = int(round(new_cx / aspect))
    return f'<{tag} cx="{new_cx}" cy="{new_cy}"/>'

pattern = r'<(wp:extent|a:ext)\s+cx="(\d+)"\s+cy="(\d+)"/>'
matches = list(re.finditer(pattern, ch5_xml))
print(f"Found {len(matches)} extent tags in Chapter 5 (should be 30: 15 wp:extent + 15 a:ext)")

ch5_xml_resized = re.sub(pattern, resize_match, ch5_xml)

# In addition, check paragraph spacing between images and captions in Chapter 5
# To ensure two figures fit per page cleanly without forced overflow:
# Let's inspect the spacing around figure captions:
# Change w:spacing w:before="..." w:after="..." to compact values if needed
# Figure caption style: w:pStyle w:val="Caption" or similar

new_xml = xml[:ch5_start] + ch5_xml_resized + xml[ch6_start:]

files['word/document.xml'] = new_xml.encode('utf-8')
with zipfile.ZipFile(doc_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
    for name, data in files.items():
        zout.writestr(name, data)

print("Saved updated docx successfully!")
