import zipfile
import re
import shutil

doc_path = r'Project Report/SmartLogix_Project_Report_Formatted.docx'
backup_path = r'Project Report/SmartLogix_Project_Report_Formatted.bak_before_tighten_ch6.docx'
shutil.copyfile(doc_path, backup_path)
print(f"Backed up to {backup_path}")

with zipfile.ZipFile(doc_path, 'r') as zin:
    files = {name: zin.read(name) for name in zin.namelist()}

xml = files['word/document.xml'].decode('utf-8')

# Locate Chapter 6 in body
ch6_idx = xml.find('CHAPTER 6: SOFTWARE TESTING', 200000)
ch7_idx = xml.find('CHAPTER 7: CONCLUSION', ch6_idx)

ch6_block = xml[ch6_idx:ch7_idx]
print(f"Chapter 6 block length: {len(ch6_block)} chars")

# 1. Compact table cell padding / paragraph spacing in Table 6.1 and Table 6.2
# Table cells currently have w:p inside them with w:spacing w:after="120" or similar
# Let's reduce paragraph spacing after headings and paragraphs in Chapter 6:
# Change w:spacing w:before="320" -> w:before="160"
# Change w:spacing w:after="120" -> w:after="60"
# Change w:spacing w:before="240" -> w:before="120"
# Change w:spacing w:before="480" -> w:before="280"

new_ch6_block = ch6_block
new_ch6_block = re.sub(r'w:before="320"', r'w:before="160"', new_ch6_block)
new_ch6_block = re.sub(r'w:before="240"', r'w:before="120"', new_ch6_block)
new_ch6_block = re.sub(r'w:before="480"', r'w:before="280"', new_ch6_block)
new_ch6_block = re.sub(r'w:after="120"', r'w:after="60"', new_ch6_block)
new_ch6_block = re.sub(r'w:after="80"', r'w:after="40"', new_ch6_block)

# In table cells (<w:tc>), let's tighten paragraph spacing to w:after="20" or "0"
def tighten_tc(m):
    tc_xml = m.group(0)
    # inside tc, replace w:spacing w:after="..." with w:after="20"
    tc_xml = re.sub(r'w:after="\d+"', r'w:after="20"', tc_xml)
    return tc_xml

new_ch6_block = re.sub(r'<w:tc\b.*?</w:tc>', tighten_tc, new_ch6_block, flags=re.DOTALL)

xml_new = xml[:ch6_idx] + new_ch6_block + xml[ch7_idx:]

files['word/document.xml'] = xml_new.encode('utf-8')
with zipfile.ZipFile(doc_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
    for name, data in files.items():
        zout.writestr(name, data)

print("Saved compacted Chapter 6 docx successfully!")
