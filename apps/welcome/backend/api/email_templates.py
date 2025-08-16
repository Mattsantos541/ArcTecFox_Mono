"""
Shared email templates for invitations
"""

def create_invitation_email_content(recipient_name, company_name, site_name, invitation_link):
    """
    Create the HTML and text content for invitation emails
    Used by both production and test invitation emails - identical format
    """
    
    # Subject line
    subject = f"You're invited to join {company_name} - {site_name}"
    
    # HTML content - identical for both production and test
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #4A90E2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
            .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
            .button {{ display: inline-block; padding: 12px 30px; background-color: #4A90E2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to ArcTecFox PM Planner</h1>
            </div>
            <div class="content">
                <h2>Hi {recipient_name},</h2>
                
                <p>You've been invited to join <strong>{company_name} - {site_name}</strong> on ArcTecFox PM Planner, 
                a preventive maintenance planning platform.</p>
                
                <p>Click the button below to accept this invitation:</p>
                
                <div style="text-align: center;">
                    <a href="{invitation_link}" class="button">Accept Invitation</a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 3px;">
                    {invitation_link}
                </p>
                
                <p><strong>What happens next?</strong></p>
                <ul>
                    <li>If you're new, you'll be prompted to create an account using Google Sign-In</li>
                    <li>If you already have an account, just sign in</li>
                    <li>You'll automatically gain access to {site_name}</li>
                </ul>
                
                <p>This invitation will expire in 7 days.</p>
                
                <div class="footer">
                    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                    <p>© 2024 ArcTecFox. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Text content - identical for both production and test
    text_content = f"""
    Hi {recipient_name},
    
    You've been invited to join {company_name} - {site_name} on ArcTecFox PM Planner.
    
    Accept this invitation by visiting:
    {invitation_link}
    
    This invitation will expire in 7 days.
    
    If you didn't expect this invitation, you can safely ignore this email.
    """
    
    return subject, html_content, text_content