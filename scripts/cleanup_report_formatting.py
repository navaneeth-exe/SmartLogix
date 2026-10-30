import os
import shutil
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

BASE_DIR_1 = r"c:\Users\NAVANEETH\Documents\Academic Projects\Smart Inventory & Delivery Optimization System\Project Report"
BASE_DIR_2 = r"c:\Users\NAVANEETH\Documents\Academic Projects\Smart_Inventory_and_Delivery_Optimization_System\Project Report"
DOCX_FILE = "SmartLogix_Project_Report_Formatted.docx"
FINAL_FILE = "SmartLogix_Project_Report_Final.docx"

def cleanup_document(docx_path):
    print(f"\nProcessing {docx_path}...")
    doc = docx.Document(docx_path)
    body = doc._body._element

    # 1. Fix Figure 5.2 paragraph separation
    # Find paragraph containing Figure 5.2
    for i, p in enumerate(doc.paragraphs):
        if p.text.startswith("Figure 5.2:") and any('<w:drawing' in r._r.xml for r in p.runs):
            print(f"Found merged Figure 5.2 at paragraph {i}")
            # r0 has drawing, r1 has text
            drawing_run = p.runs[0]
            caption_text = p.runs[1].text

            # Create a separate image paragraph right before p
            new_img_p = parse_xml(f'<w:p {nsdecls("w")}><w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="60" w:line="240" w:lineRule="auto"/></w:pPr></w:p>')
            new_img_p.append(drawing_run._r)
            
            # Insert image paragraph before caption paragraph in XML
            p_elem = p._p
            p_elem.addprevious(new_img_p)

            # Clean up caption paragraph: remove drawing run, adjust spacing
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            pPr = p._p.get_or_add_pPr()
            sp = parse_xml(f'<w:spacing {nsdecls("w")} w:before="60" w:after="160" w:line="240" w:lineRule="auto"/>')
            pPr.append(sp)
            p.paragraph_format.keep_with_next = False
            print("Successfully separated Figure 5.2 image and caption into distinct paragraphs!")
            break

    # 2. Remove redundant blank paragraphs that don't have page breaks or graphics
    removed_count = 0
    paragraphs_to_remove = []
    for p in doc.paragraphs:
        if not p.text.strip():
            has_page_break = 'w:br' in p._p.xml and 'page' in p._p.xml
            has_graphic = 'graphic' in p._p.xml or '<w:drawing' in p._p.xml
            if not has_page_break and not has_graphic:
                paragraphs_to_remove.append(p)

    for p in paragraphs_to_remove:
        p_elem = p._p
        parent = p_elem.getparent()
        if parent is not None:
            parent.remove(p_elem)
            removed_count += 1

    print(f"Removed {removed_count} redundant blank paragraphs (preserved all page breaks & headings).")

    # 3. Ensure consistent Times New Roman, 12pt, 1.5 line spacing on all body text
    # and keep headings with next
    for p in doc.paragraphs:
        if p.text.startswith("CHAPTER") or p.text.startswith("Table") or p.text.startswith("Figure") or p.style.name.startswith("Heading"):
            p.paragraph_format.keep_with_next = True
        elif len(p.text) > 60:
            # Body paragraph
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    doc.save(docx_path)
    print(f"Saved optimized document to: {docx_path}")

if __name__ == "__main__":
    p1 = os.path.join(BASE_DIR_1, DOCX_FILE)
    p2 = os.path.join(BASE_DIR_1, FINAL_FILE)
    cleanup_document(p1)
    cleanup_document(p2)
    print("\nCompleted formatting optimization!")
