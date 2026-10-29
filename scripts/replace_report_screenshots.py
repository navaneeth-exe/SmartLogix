import os
import shutil
import zipfile
import xml.etree.ElementTree as ET
from PIL import Image

BASE_DIR_1 = r"c:\Users\NAVANEETH\Documents\Academic Projects\Smart Inventory & Delivery Optimization System"
BASE_DIR_2 = r"c:\Users\NAVANEETH\Documents\Academic Projects\Smart_Inventory_and_Delivery_Optimization_System"

SCREENSHOTS_DIR = os.path.join(BASE_DIR_1, "Screenshots")

# Mapping of figures to docx media filename and user-provided screenshot filename
MAPPING = [
    # (fig_name, docx_media_name, rId, user_screenshot_name)
    ("fig1_dashboard.png", "image6.png", "rId13", "image.png"),
    ("fig2_map_workspace.png", "image7.png", "rId14", "image copy.png"),
    ("fig3_dijkstra_routing.png", "image8.png", "rId15", "image copy 2.png"),
    ("fig4_kruskal_mst.png", "image9.png", "rId16", "image copy 3.png"),
    ("fig5_floyd_warshall.png", "image10.png", "rId17", "image copy 4.png"),
    ("fig6_products_catalog.png", "image11.png", "rId18", "image copy 5.png"),
    ("fig7_inventory_tracking.png", "image12.png", "rId19", "image copy 6.png"),
    ("fig8_warehouses.png", "image13.png", "rId20", "image copy 7.png"),
    ("fig9_orders_management.png", "image14.png", "rId21", "image copy 8.png"),
    ("fig10_order_details_modal.png", "image15.png", "rId22", "image copy 9.png"),
    ("fig11_delivery_locations.png", "image16.png", "rId23", "image copy 10.png"),
    ("fig12_fleet_vehicles.png", "image17.png", "rId24", "image copy 11.png"),
    ("fig13_delivery_planning.png", "image18.png", "rId25", "image copy 12.png"),
    ("fig14_distance_matrix.png", "image19.png", "rId26", "image copy 14.png"),
    ("fig15_reports_benchmarks.png", "image20.png", "rId27", "image copy 13.png"),
]

def update_assets_folders():
    print("=== 1. Updating Project Report/assets in both directories ===")
    dirs_to_update = [
        os.path.join(BASE_DIR_1, "Project Report", "assets"),
        os.path.join(BASE_DIR_2, "Project Report", "assets")
    ]
    
    for d in dirs_to_update:
        if not os.path.exists(d):
            os.makedirs(d, exist_ok=True)
        for fig_name, _, _, user_file in MAPPING:
            src = os.path.join(SCREENSHOTS_DIR, user_file)
            dst = os.path.join(d, fig_name)
            shutil.copy2(src, dst)
            print(f"  Copied {user_file} -> {dst}")

def update_docx(docx_path):
    print(f"\n=== Updating DOCX: {docx_path} ===")
    if not os.path.exists(docx_path):
        print(f"  File not found: {docx_path}")
        return

    # Backup original
    bak_path = docx_path + ".bak"
    if not os.path.exists(bak_path):
        shutil.copy2(docx_path, bak_path)
        print(f"  Created backup at: {bak_path}")

    # Read media replacements and target aspect ratios
    media_data = {}
    rId_dims = {} # rId -> (cx, cy)
    target_width_emu = 5577840 # 6.10 inches

    for fig_name, media_name, rId, user_file in MAPPING:
        user_path = os.path.join(SCREENSHOTS_DIR, user_file)
        with open(user_path, 'rb') as f:
            raw_bytes = f.read()
        media_data[f"word/media/{media_name}"] = raw_bytes

        with Image.open(user_path) as im:
            w, h = im.size
            # Calculate height preserving exact aspect ratio
            target_height_emu = int(target_width_emu * (h / w))
            # Keep max height bounded so it fits nicely on a single page below headings
            if target_height_emu > 3400000: # ~3.7 inches max
                target_height_emu = 3400000
                calc_width = int(target_height_emu * (w / h))
                rId_dims[rId] = (calc_width, target_height_emu)
            else:
                rId_dims[rId] = (target_width_emu, target_height_emu)

    # Process XML inside the docx
    temp_docx = docx_path + ".processing"
    with zipfile.ZipFile(docx_path, 'r') as zin:
        doc_xml_bytes = zin.read('word/document.xml')
        
        # Parse XML
        root = ET.fromstring(doc_xml_bytes)
        
        # Update drawing dimensions matching rId
        for drawing in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}drawing'):
            blip = drawing.find('.//{http://schemas.openxmlformats.org/drawingml/2006/main}blip')
            if blip is not None:
                embed = blip.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                if embed in rId_dims:
                    new_cx, new_cy = rId_dims[embed]
                    # Update wp:extent
                    extent = drawing.find('.//{http://schemas.openxmlformats.org/wordprocessingDrawing}extent')
                    if extent is not None:
                        extent.attrib['cx'] = str(new_cx)
                        extent.attrib['cy'] = str(new_cy)
                    # Update a:ext
                    ext = drawing.find('.//{http://schemas.openxmlformats.org/drawingml/2006/main}ext')
                    if ext is not None:
                        ext.attrib['cx'] = str(new_cx)
                        ext.attrib['cy'] = str(new_cy)

        modified_doc_xml = ET.tostring(root, encoding='utf-8', xml_declaration=True)

        with zipfile.ZipFile(temp_docx, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename in media_data:
                    # Write updated image
                    zout.writestr(item.filename, media_data[item.filename])
                elif item.filename == 'word/document.xml':
                    # Write updated XML
                    zout.writestr('word/document.xml', modified_doc_xml)
                else:
                    zout.writestr(item, zin.read(item.filename))

    os.replace(temp_docx, docx_path)
    print(f"  Successfully updated images & dimensions in {docx_path}")

def convert_to_pdf(docx_path, pdf_path):
    print(f"\n=== Converting {docx_path} to PDF via Microsoft Word ===")
    try:
        import win32com.client
        import pythoncom
        pythoncom.CoInitialize()
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0

        doc = word.Documents.Open(os.path.abspath(docx_path))
        doc.SaveAs(os.path.abspath(pdf_path), FileFormat=17) # 17 = wdFormatPDF
        doc.Close(SaveChanges=0)
        word.Quit()
        print(f"  Generated PDF: {pdf_path} ({os.path.getsize(pdf_path):,} bytes)")
    except Exception as e:
        print(f"  Error converting to PDF: {e}")

if __name__ == '__main__':
    update_assets_folders()

    doc_files = [
        os.path.join(BASE_DIR_1, "Project Report", "SmartLogix_Project_Report_Formatted.docx"),
        os.path.join(BASE_DIR_1, "Project Report", "SmartLogix_Project_Report_Final.docx"),
        os.path.join(BASE_DIR_2, "Project Report", "SmartLogix_Project_Report_Formatted.docx"),
        os.path.join(BASE_DIR_2, "Project Report", "SmartLogix_Project_Report_Final.docx"),
    ]

    for df in doc_files:
        if os.path.exists(df):
            update_docx(df)

    # Convert the final formatted docx to PDF
    pdf_out_1 = os.path.join(BASE_DIR_1, "Project Report", "SmartLogix_Project_Report_Final.pdf")
    docx_src_1 = os.path.join(BASE_DIR_1, "Project Report", "SmartLogix_Project_Report_Formatted.docx")
    convert_to_pdf(docx_src_1, pdf_out_1)

    pdf_out_2 = os.path.join(BASE_DIR_2, "Project Report", "SmartLogix_Project_Report_Final.pdf")
    if os.path.exists(os.path.dirname(pdf_out_2)):
        shutil.copy2(pdf_out_1, pdf_out_2)
        print(f"  Copied PDF to: {pdf_out_2}")

    print("\nALL SCREENSHOTS SUCCESSFULLY REPLACED AND REPORT COMPILED!")
