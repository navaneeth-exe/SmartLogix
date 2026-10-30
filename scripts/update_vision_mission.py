import os
import docx
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

DOCX_PATHS = [
    r"c:\Users\NAVANEETH\Documents\Academic Projects\Smart Inventory & Delivery Optimization System\Project Report\SmartLogix_Project_Report_Formatted.docx",
    r"c:\Users\NAVANEETH\Documents\Academic Projects\Smart Inventory & Delivery Optimization System\Project Report\SmartLogix_Project_Report_Final.docx",
    r"c:\Users\NAVANEETH\Documents\Academic Projects\Smart_Inventory_and_Delivery_Optimization_System\Project Report\SmartLogix_Project_Report_Formatted.docx",
    r"c:\Users\NAVANEETH\Documents\Academic Projects\Smart_Inventory_and_Delivery_Optimization_System\Project Report\SmartLogix_Project_Report_Final.docx",
]

MD_PATH = r"c:\Users\NAVANEETH\Documents\Academic Projects\Smart_Inventory_and_Delivery_Optimization_System\Project Report\SMARTLOGIX_PROJECT_REPORT.md"

INST_VISION = "Grow as a center of learning and research, transforming students to professionals with knowledge, skill, competence, commitment, confidence through decisive learning and contribute to the sustainable development of the society."

INST_MISSION = (
    "1. To instil technical expertise in order to address current and emerging challenges in the quest for creating sustainable and high-quality livelihoods.\n"
    "2. To foster a culture of research, innovation, and entrepreneurship through determined learning.\n"
    "3. To promote an environment that supports the welfare of society through ethical and professional conduct."
)

DEPT_VISION = "To develop computer science engineers with knowledge, computing skills and empowering them to excel in their profession through performance based learning contributing to sustainability, well-being of the society and professional ethics."

DEPT_MISSION = (
    "1. To implement effective outcome-based education that fosters the development of competent and skilled graduates, empowering them to promote and adopt sustainable practices.\n"
    "2. To provide students with opportunities to engage in advancements in computer science and engineering through interdisciplinary research, collaborative projects that encourage innovation and entrepreneurship."
)

def format_body_p(p, text):
    p.clear()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(12)
    run = p.add_run(text)
    run.font.name = "Times New Roman"
    run.font.size = Pt(12)
    run.font.bold = False
    run.font.color.rgb = RGBColor(0, 0, 0)

def update_docx(path):
    if not os.path.exists(path):
        return
    print(f"Updating DOCX: {path}")
    doc = docx.Document(path)

    # Locate headings and their following body paragraphs
    for i, p in enumerate(doc.paragraphs):
        t = p.text.strip()
        if t == "VISION OF THE INSTITUTION" and i + 1 < len(doc.paragraphs):
            format_body_p(doc.paragraphs[i + 1], INST_VISION)
            print("  Updated INSTITUTION VISION")
        elif t == "MISSION OF THE INSTITUTION" and i + 1 < len(doc.paragraphs):
            format_body_p(doc.paragraphs[i + 1], INST_MISSION)
            print("  Updated INSTITUTION MISSION")
        elif t in ["VISION OF THE DEPARTMENT (CSE)", "VISION OF THE DEPARTMENT"] and i + 1 < len(doc.paragraphs):
            format_body_p(doc.paragraphs[i + 1], DEPT_VISION)
            print("  Updated DEPARTMENT VISION")
        elif t in ["MISSION OF THE DEPARTMENT (CSE)", "MISSION OF THE DEPARTMENT"] and i + 1 < len(doc.paragraphs):
            format_body_p(doc.paragraphs[i + 1], DEPT_MISSION)
            print("  Updated DEPARTMENT MISSION")

    doc.save(path)
    print(f"  Saved {path}")

def update_markdown(path):
    if not os.path.exists(path):
        return
    print(f"Updating Markdown: {path}")
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    vm_header = "## INSTITUTION & DEPARTMENT VISION AND MISSION\n"
    vm_end = "\n---\n\n## ABSTRACT"

    start_pos = text.find(vm_header)
    end_pos = text.find(vm_end, start_pos)

    new_vm_md = f"""## INSTITUTION & DEPARTMENT VISION AND MISSION

### INSTITUTION VISION
{INST_VISION}

### INSTITUTION MISSION
1. To instil technical expertise in order to address current and emerging challenges in the quest for creating sustainable and high-quality livelihoods.
2. To foster a culture of research, innovation, and entrepreneurship through determined learning.
3. To promote an environment that supports the welfare of society through ethical and professional conduct.

### DEPARTMENT VISION
{DEPT_VISION}

### DEPARTMENT MISSION
1. To implement effective outcome-based education that fosters the development of competent and skilled graduates, empowering them to promote and adopt sustainable practices.
2. To provide students with opportunities to engage in advancements in computer science and engineering through interdisciplinary research, collaborative projects that encourage innovation and entrepreneurship."""

    if start_pos != -1 and end_pos != -1:
        text = text[:start_pos] + new_vm_md + text[end_pos:]
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print("  Successfully updated SMARTLOGIX_PROJECT_REPORT.md!")
    else:
        print("  Could not locate Vision & Mission boundaries in markdown.")

if __name__ == "__main__":
    for p in DOCX_PATHS:
        update_docx(p)
    update_markdown(MD_PATH)
    print("\nAll documents updated successfully with official Vision & Mission!")

