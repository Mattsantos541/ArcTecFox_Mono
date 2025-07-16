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
    title_style = ParagraphStyle(
        'TaskTitle',
        parent=styles['Heading1'],
        fontSize=12,
        textColor=colors.white,
        backColor=colors.Color(25/255, 55/255, 109/255),  # Dark blue
        alignment=TA_LEFT,
        leftIndent=10,
        topPadding=4,
        bottomPadding=4
    )
    
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.black
    )
    
    # Task Name Header
    task_title = task.get('task', 'Maintenance Task')
    story.append(Paragraph(task_title, title_style))
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
        story.append(Paragraph("<b>Instructions</b>", styles['Heading2']))
        
        clean_instructions = process_instructions(task['instructions'])
        instructions_text = ""
        for i, instruction in enumerate(clean_instructions, 1):
            instructions_text += f"{i}. {instruction}<br/><br/>"
        
        instructions_para = Paragraph(
            instructions_text,
            ParagraphStyle(
                'Instructions',
                parent=normal_style,
                backColor=colors.Color(240/255, 240/255, 240/255),  # Light grey
                leftIndent=6,
                rightIndent=6,
                topPadding=4,
                bottomPadding=4
            )
        )
        story.append(instructions_para)
        story.append(Spacer(1, 8))
    
    # Safety Precautions Section - Light Red Background
    story.append(Paragraph("<b>Safety Precautions</b>", styles['Heading2']))
    safety_content = task.get('safety_precautions', 'No content provided')
    safety_para = Paragraph(
        safety_content,
        ParagraphStyle(
            'Safety',
            parent=normal_style,
            backColor=colors.Color(255/255, 235/255, 235/255),  # Light red
            textColor=colors.Color(200/255, 0, 0),  # Red text
            leftIndent=6,
            rightIndent=6,
            topPadding=4,
            bottomPadding=4
        )
    )
    story.append(safety_para)
    story.append(Spacer(1, 8))
    
    # Engineering Rationale Section - Light Blue Background
    story.append(Paragraph("<b>Engineering Rationale</b>", styles['Heading2']))
    engineering_content = task.get('engineering_rationale', 'No content provided')
    engineering_para = Paragraph(
        engineering_content,
        ParagraphStyle(
            'Engineering',
            parent=normal_style,
            backColor=colors.Color(235/255, 245/255, 255/255),  # Light blue
            leftIndent=6,
            rightIndent=6,
            topPadding=4,
            bottomPadding=4
        )
    )
    story.append(engineering_para)
    story.append(Spacer(1, 8))
    
    # Common Failures Prevented Section - Light Yellow Background
    story.append(Paragraph("<b>Common Failures Prevented</b>", styles['Heading2']))
    failures_content = task.get('common_failures_prevented', 'No content provided')
    failures_para = Paragraph(
        failures_content,
        ParagraphStyle(
            'Failures',
            parent=normal_style,
            backColor=colors.Color(255/255, 255/255, 235/255),  # Light yellow
            leftIndent=6,
            rightIndent=6,
            topPadding=4,
            bottomPadding=4
        )
    )
    story.append(failures_para)
    story.append(Spacer(1, 8))
    
    # Usage Insights Section - Light Green Background
    story.append(Paragraph("<b>Usage Insights</b>", styles['Heading2']))
    insights_content = task.get('usage_insights', 'No content provided')
    insights_para = Paragraph(
        insights_content,
        ParagraphStyle(
            'Insights',
            parent=normal_style,
            backColor=colors.Color(235/255, 255/255, 235/255),  # Light green
            leftIndent=6,
            rightIndent=6,
            topPadding=4,
            bottomPadding=4
        )
    )
    story.append(insights_para)
    story.append(Spacer(1, 8))
    
    # Scheduled Dates Section
    story.append(Paragraph("<b>Scheduled Dates (Next 12 months)</b>", styles['Heading2']))
    if task.get('scheduled_dates') and len(task['scheduled_dates']) > 0:
        dates_to_show = task['scheduled_dates'][:12]
        dates_string = ', '.join(dates_to_show)
        dates_para = Paragraph(
            dates_string,
            ParagraphStyle(
                'Dates',
                parent=normal_style,
                backColor=colors.Color(245/255, 245/255, 245/255),  # Light grey
                leftIndent=6,
                rightIndent=6,
                topPadding=4,
                bottomPadding=4
            )
        )
    else:
        dates_para = Paragraph(
            "No scheduled dates available",
            ParagraphStyle(
                'DatesEmpty',
                parent=normal_style,
                backColor=colors.Color(245/255, 245/255, 245/255),  # Light grey
                textColor=colors.Color(120/255, 120/255, 120/255),  # Grey text
                leftIndent=6,
                rightIndent=6,
                topPadding=4,
                bottomPadding=4
            )
        )
    story.append(dates_para)
    
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
    """Export PM Plans data to PDF with asset grouping"""
    
    if not output_path:
        # Create temp file
        temp_fd, output_path = tempfile.mkstemp(suffix='.pdf')
        os.close(temp_fd)
    
    doc = SimpleDocTemplate(output_path, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    
    # Add header
    story.append(Paragraph("Preventive Maintenance Report", styles['Title']))
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%m/%d/%Y')}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Group data by asset
    asset_groups = {}
    for task in data:
        asset_key = task.get('asset_name', 'Unknown Asset')
        if asset_key not in asset_groups:
            asset_groups[asset_key] = {
                'asset_name': task.get('asset_name', 'Unknown Asset'),
                'asset_model': task.get('asset_model', 'N/A'),
                'serial_number': task.get('serial_number', 'N/A'),
                'tasks': []
            }
        asset_groups[asset_key]['tasks'].append(task)
    
    for asset_group in asset_groups.values():
        # Asset Information Header
        story.append(Paragraph("ASSET INFORMATION", 
                              ParagraphStyle('AssetHeader', parent=styles['Heading1'], 
                                           textColor=COLORS['primary'])))
        
        # Asset details
        asset_details = [
            f"Asset Name: {asset_group['asset_name']}",
            f"Model: {asset_group['asset_model']}",
            f"Serial Number: {asset_group['serial_number']}"
        ]
        
        for detail in asset_details:
            story.append(Paragraph(detail, 
                                 ParagraphStyle('AssetDetail', parent=styles['Normal'],
                                              backColor=COLORS['light_background'],
                                              leftIndent=5, topPadding=2, bottomPadding=2)))
        
        story.append(Spacer(1, 15))
        
        # Maintenance Tasks
        story.append(Paragraph("MAINTENANCE TASKS", 
                              ParagraphStyle('TasksHeader', parent=styles['Heading2'], 
                                           textColor=COLORS['primary'])))
        
        for task_index, task in enumerate(asset_group['tasks']):
            # Task header
            task_title = f"Task {task_index + 1}: {task.get('task_name', 'Unnamed Task')}"
            story.append(Paragraph(task_title, 
                                 ParagraphStyle('TaskTitle', parent=styles['Heading3'],
                                              backColor=COLORS['background'],
                                              leftIndent=5, topPadding=2, bottomPadding=2)))
            
            # Task details
            task_details = [
                f"Maintenance Interval: {task.get('maintenance_interval', 'N/A')}",
                f"Number of Technicians: {task.get('no_techs_needed', 'N/A')}",
                f"Estimated Time: {task.get('time_to_complete') or (str(task.get('est_minutes')) + ' minutes' if task.get('est_minutes') else 'N/A')}",
                f"Tools Required: {task.get('tools_needed', 'N/A')}"
            ]
            
            for detail in task_details:
                story.append(Paragraph(detail, 
                                     ParagraphStyle('TaskDetail', parent=styles['Normal'],
                                                  leftIndent=10, fontSize=10)))
            
            # Instructions
            if task.get('instructions'):
                story.append(Paragraph("<b>Instructions:</b>", 
                                     ParagraphStyle('InstructionsHeader', parent=styles['Normal'],
                                                  leftIndent=10, fontSize=10, 
                                                  textColor=COLORS['secondary'])))
                
                clean_instructions = process_instructions(task['instructions'])
                for i, instruction in enumerate(clean_instructions, 1):
                    story.append(Paragraph(f"{i}. {instruction}", 
                                         ParagraphStyle('InstructionItem', parent=styles['Normal'],
                                                      leftIndent=20, fontSize=9,
                                                      textColor=COLORS['text'])))
            
            story.append(Spacer(1, 10))
        
        story.append(Spacer(1, 20))
    
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