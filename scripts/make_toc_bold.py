import os
import zipfile
import xml.etree.ElementTree as ET

DOCX_PATHS = [
    r"c:\Users\NAVANEETH\Documents\Academic Projects\Smart Inventory & Delivery Optimization System\Project Report\SmartLogix_Project_Report_Formatted.docx",
    r"c:\Users\NAVANEETH\Documents\Academic Projects\Smart_Inventory_and_Delivery_Optimization_System\Project Report\SmartLogix_Project_Report_Formatted.docx"
]

NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
}

def update_toc_bold(docx_path):
    if not os.path.exists(docx_path):
        return
    print(f"\nProcessing {docx_path}...")

    temp_docx = docx_path + ".temp"

    with zipfile.ZipFile(docx_path, 'r') as zin:
        doc_xml_bytes = zin.read('word/document.xml')
        styles_xml_bytes = zin.read('word/styles.xml')

        # 1. Update document.xml
        root_doc = ET.fromstring(doc_xml_bytes)
        
        # Find TOC content control
        sdt = root_doc.find('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}sdt')
        if sdt is not None:
            paragraphs = sdt.findall('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
            print(f"  Found TOC with {len(paragraphs)} paragraphs.")

            for p in paragraphs:
                p_style = p.find('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pStyle')
                if p_style is not None:
                    style_val = p_style.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '')
                    
                    # We want to bold TOC1 (Chapters) and TOC2 (Sections: 1.1, 1.2, 1.3, 1.4, etc.)
                    # TOC3 (Subsections: 1.3.1, 1.3.2) remains normal font as shown in the screenshot!
                    if style_val in ['TOC1', 'TOC2']:
                        # Find all runs inside hyperlink or directly in p
                        for r in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r'):
                            # Only target runs that contain text or are text runs (skip tab/pageref if desired, or bold the text run)
                            t_elem = r.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                            if t_elem is not None:
                                rPr = r.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
                                if rPr is None:
                                    rPr = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
                                
                                # Add <w:b/> and <w:bCs/> if not present
                                b_elem = rPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}b')
                                if b_elem is None:
                                    b_elem = ET.SubElement(rPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}b')
                                
                                bcs_elem = rPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}bCs')
                                if bcs_elem is None:
                                    bcs_elem = ET.SubElement(rPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}bCs')

        # 2. Update styles.xml for toc 1 and toc 2 styles
        root_styles = ET.fromstring(styles_xml_bytes)
        for style in root_styles.findall('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}style'):
            style_id = style.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}styleId', '')
            if style_id in ['TOC1', 'TOC2']:
                rPr = style.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
                if rPr is None:
                    rPr = ET.SubElement(style, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
                
                b_elem = rPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}b')
                if b_elem is None:
                    ET.SubElement(rPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}b')
                
                bcs_elem = rPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}bCs')
                if bcs_elem is None:
                    ET.SubElement(rPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}bCs')
                print(f"  Updated style definition for {style_id} to be bold by default.")

        # Re-pack the docx
        with zipfile.ZipFile(temp_docx, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == 'word/document.xml':
                    zout.writestr(item.filename, ET.tostring(root_doc, encoding='utf-8', xml_declaration=True))
                elif item.filename == 'word/styles.xml':
                    zout.writestr(item.filename, ET.tostring(root_styles, encoding='utf-8', xml_declaration=True))
                else:
                    zout.writestr(item, zin.read(item.filename))

    os.replace(temp_docx, docx_path)
    print(f"  Successfully applied bold styling to TOC in {docx_path}!")

if __name__ == '__main__':
    for p in DOCX_PATHS:
        update_toc_bold(p)
    print("\nAll docx Table of Contents updated successfully!")
