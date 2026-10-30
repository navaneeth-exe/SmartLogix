import zipfile
import re
import shutil

doc_path = r'Project Report/SmartLogix_Project_Report_Formatted.docx'
backup_path = r'Project Report/SmartLogix_Project_Report_Formatted.bak_before_page57.docx'
shutil.copyfile(doc_path, backup_path)
print(f"Backed up to {backup_path}")

with zipfile.ZipFile(doc_path, 'r') as zin:
    files = {name: zin.read(name) for name in zin.namelist()}

xml = files['word/document.xml'].decode('utf-8')

ch6_idx = xml.find('CHAPTER 6', 200000)
ch7_idx = xml.find('CHAPTER 7', ch6_idx)

ch6_block = xml[ch6_idx:ch7_idx]

# Let's adjust spacing in Chapter 6:
# Give headings and paragraphs a balanced spacing so it fills page 57 comfortably without spilling over to 58
# Headings before/after:
# w:before="240" w:after="100" (instead of 160/60)
# Body paragraphs: w:after="100" (instead of 60)
# Caption before/after: w:before="180" w:after="80" (instead of 120/40)
# Table cells: w:after="40" or "60" (instead of 20)

new_ch6_block = ch6_block
new_ch6_block = re.sub(r'w:before="160"', r'w:before="240"', new_ch6_block)
new_ch6_block = re.sub(r'w:before="120"', r'w:before="180"', new_ch6_block)
new_ch6_block = re.sub(r'w:after="60"', r'w:after="100"', new_ch6_block)
new_ch6_block = re.sub(r'w:after="40"', r'w:after="80"', new_ch6_block)

# In table cells (<w:tc>), let's set w:after="50"
def adjust_tc(m):
    tc_xml = m.group(0)
    tc_xml = re.sub(r'w:after="20"', r'w:after="50"', tc_xml)
    return tc_xml

new_ch6_block = re.sub(r'<w:tc\b.*?</w:tc>', adjust_tc, new_ch6_block, flags=re.DOTALL)

xml_new = xml[:ch6_idx] + new_ch6_block + xml[ch7_idx:]

files['word/document.xml'] = xml_new.encode('utf-8')
with zipfile.ZipFile(doc_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
    for name, data in files.items():
        zout.writestr(name, data)

print("Saved updated docx with balanced Chapter 6 spacing!")
