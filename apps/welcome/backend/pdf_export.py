from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus.flowables import Flowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
import json
from datetime import datetime
import re
import os
import tempfile

# Professional color scheme for reports
COLORS = {
    'primary': colors.Color(41/255, 128/255, 185/255),      # Professional blue
    'secondary': colors.Color(52/255, 73/255, 94/255),      # Dark gray-blue
    'accent': colors.Color(231/255, 76/255, 60/255),        # Red for warnings/critical
    'success': colors.Color(39/255, 174/255, 96/255),       # Green for success
    'background': colors.Color(236/255, 240/255, 241/255),  # Light gray background
    'border': colors.Color(149/255, 165/255, 166/255),      # Border gray
    'text': colors.Color(44/255, 62/255, 80/255),           # Dark text
    'light_background': colors.Color(248/255, 249/255, 250/255), # Very light background
    'white': colors.white,
    'black': colors.black
}

class RoundedTableWrapper(Flowable):
    """A simple wrapper that draws a rounded rectangle background with a table on top"""
    
    def __init__(self, table_data, col_widths, table_style, corner_radius=20):
        self.table_data = table_data
        self.col_widths = col_widths
        self.table_style = table_style
        self.corner_radius = corner_radius
        
        # Create the table with all styling including background
        self.table = Table(table_data, colWidths=col_widths)
        
        # Get background color from table style
        self.bg_color = colors.white
        for cmd in table_style.getCommands():
            if cmd[0] == 'BACKGROUND' and len(cmd) > 4:
                self.bg_color = cmd[4]
                break
        
        # Apply the full style to the table
        self.table.setStyle(table_style)
    
    def wrap(self, availWidth, availHeight):
        """Calculate the space needed"""
        w, h = self.table.wrap(availWidth, availHeight)
        self.width = w
        self.height = h
        return w, h
    
    def draw(self):
        """Draw rounded rectangle background then table on top"""
        canvas = self.canv
        
        # Save canvas state
        canvas.saveState()
        
        # Draw rounded rectangle background
        canvas.setFillColor(self.bg_color)
        canvas.roundRect(0, 0, self.width, self.height, self.corner_radius, fill=1, stroke=0)
        
        # Restore canvas state
        canvas.restoreState()
        
        # Draw table on top but without background
        table_style_commands = []
        for cmd in self.table_style.getCommands():
            if cmd[0] != 'BACKGROUND':
                table_style_commands.append(cmd)
        
        self.table.setStyle(TableStyle(table_style_commands))
        self.table.drawOn(canvas, 0, 0)

def process_instructions(instructions):
    """Process instructions and remove double numbering"""
    if not instructions:
        return []
    
    try:
        if isinstance(instructions, str):
            # Handle JSON string
            if instructions.strip().startswith('[') or instructions.strip().startswith('{'):
                instruction_array = json.loads(instructions)
            else:
                # Check if already formatted with numbers
                if '\n' in instructions and re.match(r'^\d+\.', instructions.strip()):
                    instruction_array = instructions.split('\n')
                else:
                    instruction_array = instructions.split('\n')
        elif isinstance(instructions, list):
            instruction_array = instructions
        else:
            instruction_array = [str(instructions) if instructions else 'No instructions provided']
        
        # Clean up each instruction - remove existing numbering
        cleaned = []
        for instruction in instruction_array:
            if instruction:
                cleaned_instruction = re.sub(r'^"?(\d+\.\s*)+', '', str(instruction))
                cleaned_instruction = re.sub(r'^\d+\.\s*', '', cleaned_instruction)
                cleaned_instruction = cleaned_instruction.strip(' "')
                if cleaned_instruction:
                    cleaned.append(cleaned_instruction)
        
        return cleaned
    except Exception as e:
        print(f"Error processing instructions: {e}")
        return [str(instructions) if instructions else 'No instructions provided']

def export_maintenance_task_to_pdf(task, output_path=None):
    """Generate PDF export for single maintenance task"""
    
    if not output_path:
        # Create temp file
        temp_fd, output_path = tempfile.mkstemp(suffix='.pdf')
        os.close(temp_fd)
    
    doc = SimpleDocTemplate(output_path, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    
    # Custom styles
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.black
    )
    
    # Task Name Header - using table to match width of other sections
    task_title = task.get('task', 'Maintenance Task')
    header_para = Paragraph(
        task_title,
        ParagraphStyle(
            'HeaderContent',
            parent=styles['Heading1'],
            fontSize=12,
            textColor=colors.white,
            leftIndent=0,
            rightIndent=0,
            topPadding=0,
            bottomPadding=0
        )
    )
    
    # Asset Name - smaller font below task name
    asset_name = task.get('asset_name') or task.get('pm_plans', {}).get('asset_name', 'Unknown Asset')
    asset_para = Paragraph(
        asset_name,
        ParagraphStyle(
            'AssetContent',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.white,
            leftIndent=0,
            rightIndent=0,
            topPadding=0,
            bottomPadding=0
        )
    )
    
    header_table = RoundedTableWrapper(
        [[header_para], [asset_para]], 
        [6.6*inch],
        TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.Color(25/255, 55/255, 109/255)),  # Dark blue
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (0, 0), 8),
            ('BOTTOMPADDING', (0, 0), (0, 0), 2),
            ('TOPPADDING', (0, 1), (0, 1), 2),
            ('BOTTOMPADDING', (0, 1), (0, 1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]),
        corner_radius=20
    )
    
    story.append(header_table)
    story.append(Spacer(1, 12))
    
    # Create dynamic 2x3 table layout using Paragraphs
    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.black,
        leftIndent=0,
        spaceAfter=0
    )
    
    label_style = ParagraphStyle(
        'LabelStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.black,
        leftIndent=0,
        spaceAfter=2
    )
    
    # Row 1
    row1 = [
        [
            Paragraph("<b>Interval:</b>", label_style),
            Paragraph(str(task.get('duration') or task.get('maintenance_interval', 'Monthly')), cell_style)
        ],
        [
            Paragraph("<b>Technicians Required:</b>", label_style),
            Paragraph(str(task.get('no_techs_needed', '1')), cell_style)
        ],
        [
            Paragraph("<b>Estimated Time:</b>", label_style),
            Paragraph(str(task.get('time_to_complete') or (str(task.get('est_minutes', 'Not specified')) + ' minutes' if task.get('est_minutes') else 'Not specified')), cell_style)
        ]
    ]
    
    # Row 2  
    row2 = [
        [
            Paragraph("<b>Tools Needed:</b>", label_style),
            Paragraph(str(task.get('tools_needed', 'Standard maintenance tools')), cell_style)
        ],
        [
            Paragraph("<b>Reason:</b>", label_style),
            Paragraph(str(task.get('reason', 'Preventive maintenance to ensure optimal performance')), cell_style)
        ],
        ""  # Empty cell
    ]
    
    table_data = [row1, row2]
    
    # Create table with white background and borders
    table = Table(table_data, colWidths=[2.2*inch, 2.2*inch, 2.2*inch], rowHeights=[None, None])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.Color(149/255, 165/255, 166/255)),  # Light grid lines
    ]))
    
    story.append(table)
    story.append(Spacer(1, 8))
    
    # Helper function to create colored section tables that match table width
    def create_colored_section(title, content, bg_color, text_color=colors.black):
        # Add section title
        story.append(Paragraph(f"<b>{title}</b>", styles['Heading2']))
        
        # Create single-cell table with same width as main table (6.6 inches)
        if content:
            content_para = Paragraph(
                str(content),
                ParagraphStyle(
                    'SectionContent',
                    parent=normal_style,
                    fontSize=9,
                    textColor=text_color,
                    leftIndent=0,
                    rightIndent=0,
                    topPadding=0,
                    bottomPadding=0
                )
            )
        else:
            content_para = Paragraph(
                "No content provided",
                ParagraphStyle(
                    'SectionContent',
                    parent=normal_style,
                    fontSize=9,
                    textColor=colors.Color(120/255, 120/255, 120/255),
                    leftIndent=0,
                    rightIndent=0,
                    topPadding=0,
                    bottomPadding=0
                )
            )
        
        section_table = RoundedTableWrapper(
            [[content_para]], 
            [6.6*inch],
            TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), bg_color),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]),
            corner_radius=20
        )
        
        story.append(section_table)
        story.append(Spacer(1, 8))
    
    # Instructions Section - Light Grey Background
    if task.get('instructions'):
        clean_instructions = process_instructions(task['instructions'])
        instructions_text = ""
        for i, instruction in enumerate(clean_instructions, 1):
            instructions_text += f"{i}. {instruction}<br/><br/>"
        create_colored_section("Instructions", instructions_text, colors.Color(240/255, 240/255, 240/255))
    
    # Safety Precautions Section - Light Red Background
    create_colored_section(
        "Safety Precautions", 
        task.get('safety_precautions', 'No content provided'), 
        colors.Color(255/255, 235/255, 235/255),
        colors.Color(200/255, 0, 0)  # Red text
    )
    
    # Engineering Rationale Section - Light Blue Background
    create_colored_section(
        "Engineering Rationale", 
        task.get('engineering_rationale', 'No content provided'), 
        colors.Color(235/255, 245/255, 255/255)
    )
    
    # Common Failures Prevented Section - Light Yellow Background
    create_colored_section(
        "Common Failures Prevented", 
        task.get('common_failures_prevented', 'No content provided'), 
        colors.Color(255/255, 255/255, 235/255)
    )
    
    # Usage Insights Section - Light Green Background
    create_colored_section(
        "Usage Insights", 
        task.get('usage_insights', 'No content provided'), 
        colors.Color(235/255, 255/255, 235/255)
    )
    
    # Scheduled Dates Section - Light Grey Background
    if task.get('scheduled_dates') and len(task['scheduled_dates']) > 0:
        dates_to_show = task['scheduled_dates'][:12]
        dates_string = ', '.join(dates_to_show)
        create_colored_section(
            "Scheduled Dates (Next 12 months)", 
            dates_string, 
            colors.Color(245/255, 245/255, 245/255)
        )
    else:
        create_colored_section(
            "Scheduled Dates (Next 12 months)", 
            "No scheduled dates available", 
            colors.Color(245/255, 245/255, 245/255),
            colors.Color(120/255, 120/255, 120/255)  # Grey text
        )
    
    # Footer information
    story.append(Spacer(1, 20))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.Color(100/255, 100/255, 100/255)
    )
    
    footer_text = f"Generated on: {datetime.now().strftime('%m/%d/%Y')} | Task ID: {task.get('id', 'N/A')}"
    story.append(Paragraph(footer_text, footer_style))
    
    # Build PDF
    doc.build(story)
    return output_path

def export_pm_plans_data_to_pdf(data, output_path=None):
    """Export PM Plans data to PDF using same rich format as maintenance tasks"""
    
    if not output_path:
        # Create temp file
        temp_fd, output_path = tempfile.mkstemp(suffix='.pdf')
        os.close(temp_fd)
    
    doc = SimpleDocTemplate(output_path, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    
    # Custom styles
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.black
    )
    
    # Helper function to create colored section tables that match table width
    def create_colored_section(title, content, bg_color, text_color=colors.black):
        # Add section title
        story.append(Paragraph(f"<b>{title}</b>", styles['Heading2']))
        
        # Create single-cell table with same width as main table (6.6 inches)
        if content:
            content_para = Paragraph(
                str(content),
                ParagraphStyle(
                    'SectionContent',
                    parent=normal_style,
                    fontSize=9,
                    textColor=text_color,
                    leftIndent=0,
                    rightIndent=0,
                    topPadding=0,
                    bottomPadding=0
                )
            )
        else:
            content_para = Paragraph(
                "No content provided",
                ParagraphStyle(
                    'SectionContent',
                    parent=normal_style,
                    fontSize=9,
                    textColor=colors.Color(120/255, 120/255, 120/255),
                    leftIndent=0,
                    rightIndent=0,
                    topPadding=0,
                    bottomPadding=0
                )
            )
        
        section_table = RoundedTableWrapper(
            [[content_para]], 
            [6.6*inch],
            TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), bg_color),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]),
            corner_radius=20
        )
        
        story.append(section_table)
        story.append(Spacer(1, 8))
    
    # Process each task using the same format as maintenance_task export
    for task_index, task in enumerate(data):
        # Add page break between tasks (except for first task)
        if task_index > 0:
            story.append(PageBreak())
        
        # Task Name Header - using table to match width of other sections
        task_title = task.get('task_name') or task.get('task', f'Maintenance Task {task_index + 1}')
        header_para = Paragraph(
            task_title,
            ParagraphStyle(
                'HeaderContent',
                parent=styles['Heading1'],
                fontSize=12,
                textColor=colors.white,
                leftIndent=0,
                rightIndent=0,
                topPadding=0,
                bottomPadding=0
            )
        )
        
        # Asset Name - smaller font below task name
        asset_name = task.get('asset_name') or task.get('pm_plans', {}).get('asset_name', 'Unknown Asset')
        asset_para = Paragraph(
            asset_name,
            ParagraphStyle(
                'AssetContent',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.white,
                leftIndent=0,
                rightIndent=0,
                topPadding=0,
                bottomPadding=0
            )
        )
        
        header_table = RoundedTableWrapper(
            [[header_para], [asset_para]], 
            [6.6*inch],
            TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.Color(25/255, 55/255, 109/255)),  # Dark blue
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (0, 0), 8),
                ('BOTTOMPADDING', (0, 0), (0, 0), 2),
                ('TOPPADDING', (0, 1), (0, 1), 2),
                ('BOTTOMPADDING', (0, 1), (0, 1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]),
            corner_radius=20
        )
        
        story.append(header_table)
        story.append(Spacer(1, 12))
        
        # Create dynamic 2x3 table layout using Paragraphs
        cell_style = ParagraphStyle(
            'CellStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.black,
            leftIndent=0,
            spaceAfter=0
        )
        
        label_style = ParagraphStyle(
            'LabelStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.black,
            leftIndent=0,
            spaceAfter=2
        )
        
        # Row 1
        row1 = [
            [
                Paragraph("<b>Interval:</b>", label_style),
                Paragraph(str(task.get('duration') or task.get('maintenance_interval', 'Monthly')), cell_style)
            ],
            [
                Paragraph("<b>Technicians Required:</b>", label_style),
                Paragraph(str(task.get('no_techs_needed', '1')), cell_style)
            ],
            [
                Paragraph("<b>Estimated Time:</b>", label_style),
                Paragraph(str(task.get('time_to_complete') or (str(task.get('est_minutes', 'Not specified')) + ' minutes' if task.get('est_minutes') else 'Not specified')), cell_style)
            ]
        ]
        
        # Row 2  
        row2 = [
            [
                Paragraph("<b>Tools Needed:</b>", label_style),
                Paragraph(str(task.get('tools_needed', 'Standard maintenance tools')), cell_style)
            ],
            [
                Paragraph("<b>Reason:</b>", label_style),
                Paragraph(str(task.get('reason', 'Preventive maintenance to ensure optimal performance')), cell_style)
            ],
            ""  # Empty cell
        ]
        
        table_data = [row1, row2]
        
        # Create table with white background and borders
        table = Table(table_data, colWidths=[2.2*inch, 2.2*inch, 2.2*inch], rowHeights=[None, None])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.Color(149/255, 165/255, 166/255)),  # Light grid lines
        ]))
        
        story.append(table)
        story.append(Spacer(1, 8))
        
        # Instructions Section - Light Grey Background
        if task.get('instructions'):
            clean_instructions = process_instructions(task['instructions'])
            instructions_text = ""
            for i, instruction in enumerate(clean_instructions, 1):
                instructions_text += f"{i}. {instruction}<br/><br/>"
            create_colored_section("Instructions", instructions_text, colors.Color(240/255, 240/255, 240/255))
        
        # Safety Precautions Section - Light Red Background
        create_colored_section(
            "Safety Precautions", 
            task.get('safety_precautions', 'No content provided'), 
            colors.Color(255/255, 235/255, 235/255),
            colors.Color(200/255, 0, 0)  # Red text
        )
        
        # Engineering Rationale Section - Light Blue Background
        create_colored_section(
            "Engineering Rationale", 
            task.get('engineering_rationale', 'No content provided'), 
            colors.Color(235/255, 245/255, 255/255)
        )
        
        # Common Failures Prevented Section - Light Yellow Background
        create_colored_section(
            "Common Failures Prevented", 
            task.get('common_failures_prevented', 'No content provided'), 
            colors.Color(255/255, 255/255, 235/255)
        )
        
        # Usage Insights Section - Light Green Background
        create_colored_section(
            "Usage Insights", 
            task.get('usage_insights', 'No content provided'), 
            colors.Color(235/255, 255/255, 235/255)
        )
        
        # Scheduled Dates Section - Light Grey Background
        if task.get('scheduled_dates') and len(task['scheduled_dates']) > 0:
            dates_to_show = task['scheduled_dates'][:12]
            dates_string = ', '.join(dates_to_show)
            create_colored_section(
                "Scheduled Dates (Next 12 months)", 
                dates_string, 
                colors.Color(245/255, 245/255, 245/255)
            )
        else:
            create_colored_section(
                "Scheduled Dates (Next 12 months)", 
                "No scheduled dates available", 
                colors.Color(245/255, 245/255, 245/255),
                colors.Color(120/255, 120/255, 120/255)  # Grey text
            )
    
    # Footer information
    story.append(Spacer(1, 20))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.Color(100/255, 100/255, 100/255)
    )
    
    footer_text = f"Generated on: {datetime.now().strftime('%m/%d/%Y')} | PM Plans Export ({len(data)} tasks)"
    story.append(Paragraph(footer_text, footer_style))
    
    # Build PDF
    doc.build(story)
    return output_path

def export_assets_data_to_pdf(data, output_path=None):
    """Export Assets data to PDF"""
    
    if not output_path:
        # Create temp file
        temp_fd, output_path = tempfile.mkstemp(suffix='.pdf')
        os.close(temp_fd)
    
    doc = SimpleDocTemplate(output_path, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    
    # Add header
    story.append(Paragraph("Asset Inventory Report", styles['Title']))
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%m/%d/%Y')}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    for index, asset in enumerate(data):
        # Asset header
        asset_title = f"ASSET {index + 1}: {asset.get('name', 'Unnamed Asset')}"
        story.append(Paragraph(asset_title, 
                              ParagraphStyle('AssetTitle', parent=styles['Heading2'],
                                           textColor=COLORS['primary'])))
        
        # Asset details
        asset_details = [
            ('Asset ID:', asset.get('id', 'N/A')),
            ('Type:', asset.get('type', 'N/A')),
            ('Location:', asset.get('location', 'N/A')),
            ('Manufacturer:', asset.get('manufacturer', 'N/A')),
            ('Model:', asset.get('model', 'N/A')),
            ('Serial Number:', asset.get('serialNumber', 'N/A')),
            ('Status:', asset.get('status', 'N/A')),
            ('Criticality:', asset.get('criticality', 'N/A')),
            ('Install Date:', asset.get('installDate', 'N/A')),
            ('Next Maintenance:', asset.get('nextMaintenance', 'N/A'))
        ]
        
        # Create table for asset details
        table_data = [[label, value] for label, value in asset_details]
        table = Table(table_data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLORS['light_background']),
            ('TEXTCOLOR', (0, 0), (0, -1), COLORS['secondary']),
            ('TEXTCOLOR', (1, 0), (1, -1), COLORS['text']),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        story.append(table)
        story.append(Spacer(1, 15))
    
    # Build PDF
    doc.build(story)
    return output_path

def export_detailed_pm_plans_to_pdf(plans, output_path=None):
    """Export detailed PM plans to PDF in landscape format"""
    
    if not output_path:
        # Create temp file
        temp_fd, output_path = tempfile.mkstemp(suffix='.pdf')
        os.close(temp_fd)
    
    doc = SimpleDocTemplate(output_path, pagesize=landscape(letter), topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    
    # Add header
    story.append(Paragraph("Detailed PM Plans Report", styles['Title']))
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%m/%d/%Y')}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    for plan in plans:
        # Plan header
        asset_title = f"Asset: {plan.get('asset_name', 'Unknown Asset')}"
        story.append(Paragraph(asset_title, styles['Heading1']))
        story.append(Spacer(1, 15))
        
        if plan.get('tasks') and len(plan['tasks']) > 0:
            for task_index, task in enumerate(plan['tasks']):
                # Task header
                task_title = f"Task {task_index + 1}: {task.get('task_name', 'Unnamed Task')}"
                story.append(Paragraph(task_title, styles['Heading3']))
                
                # Task details
                task_details = [
                    f"Interval: {task.get('maintenance_interval', 'N/A')}",
                    f"Time to Complete: {task.get('time_to_complete', 'N/A')}",
                    f"Tools Needed: {task.get('tools_needed', 'N/A')}",
                    f"Number of Technicians: {task.get('no_techs_needed', 'N/A')}",
                    f"Reason: {task.get('reason', 'N/A')}",
                    f"Safety Precautions: {task.get('safety_precautions', 'N/A')}"
                ]
                
                for detail in task_details:
                    story.append(Paragraph(detail, 
                                         ParagraphStyle('TaskDetail', parent=styles['Normal'],
                                                      leftIndent=10, fontSize=10)))
                
                # Instructions
                if task.get('instructions'):
                    story.append(Paragraph("<b>Instructions:</b>", 
                                         ParagraphStyle('InstructionsHeader', parent=styles['Normal'],
                                                      leftIndent=10, fontSize=10)))
                    
                    clean_instructions = process_instructions(task['instructions'])
                    for i, instruction in enumerate(clean_instructions, 1):
                        story.append(Paragraph(f"{i}. {instruction}", 
                                             ParagraphStyle('InstructionItem', parent=styles['Normal'],
                                                          leftIndent=15, fontSize=9)))
                
                story.append(Spacer(1, 10))
        else:
            story.append(Paragraph("No tasks found for this asset.", styles['Normal']))
        
        story.append(Spacer(1, 15))
    
    # Build PDF
    doc.build(story)
    return output_path