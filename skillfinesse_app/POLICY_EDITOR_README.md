# Policy Editor Feature

## Overview

The Policy Editor feature allows administrators to edit and update the website's policy pages (Privacy Policy, Refund Policy, Terms of Service, and Cookie Policy) directly from the admin dashboard. This feature provides a rich text editor with preview functionality and the ability to reset to default content.

## Features

### ✅ Completed Features

1. **Policy Editor Interface**
   - Rich text editor with formatting toolbar
   - Support for bold, italic, underline, headings, lists, alignment
   - Link and image insertion capabilities
   - Code block insertion

2. **Policy Management**
   - Edit Privacy Policy content
   - Edit Refund Policy content  
   - Edit Terms of Service content
   - Edit Cookie Policy content

3. **Preview Functionality**
   - Live preview modal showing how the policy will appear on the website
   - Styled preview matching the actual website appearance

4. **Reset to Default**
   - One-click reset to restore original default content
   - Confirmation dialog to prevent accidental resets

5. **Dynamic Content**
   - Policy pages now load content from the database
   - Fallback to static content if database content is not available
   - Real-time content updates

6. **Database Integration**
   - PolicyContent model for storing policy data
   - Migration script to create tables and populate with defaults
   - CRUD API endpoints for policy management

## Installation & Setup

### 1. Run the Migration Script

Before using the policy editor, run the migration script to create the necessary database tables:

```bash
# Activate virtual environment
source venv/bin/activate

# Run migration
python migrate_policy_content.py
```

This will:
- Create the `policy_content` table
- Populate it with default content for all four policy types
- Show a summary of created policies

### 2. Access the Policy Editor

1. Log in to the admin dashboard
2. Navigate to **"Policy Editor"** in the sidebar
3. Select a policy type from the dropdown
4. Edit the content using the rich text editor
5. Preview changes before saving
6. Save or reset as needed

## API Endpoints

### Get Policy Content
```
GET /admin/api/policy/<policy_type>
```
Returns the current content for a specific policy type.

### Save Policy Content
```
POST /admin/api/policy/<policy_type>
Content-Type: application/json

{
    "title": "Policy Title",
    "last_updated": "Date String", 
    "content": "HTML Content"
}
```

### Reset Policy to Default
```
POST /admin/api/policy/<policy_type>/reset
```
Resets the policy to its default content.

## Policy Types

The system supports four policy types:

1. **`privacy_policy`** - Privacy Policy
2. **`refund_policy`** - Refund Policy  
3. **`terms_of_service`** - Terms of Service
4. **`cookie_policy`** - Cookie Policy

## File Structure

### Backend Files
- `app.py` - PolicyContent model and API routes
- `migrate_policy_content.py` - Database migration script

### Frontend Files
- `templates/admin/sections/policy_editor.html` - Policy editor interface
- `templates/admin/dashboard.html` - Updated with policy editor sidebar link
- `templates/privacy_policy.html` - Updated to use dynamic content
- `templates/refund_policy.html` - Updated to use dynamic content
- `templates/terms_of_service.html` - Updated to use dynamic content
- `templates/cookie_policy.html` - Updated to use dynamic content

## Rich Text Editor Features

The custom rich text editor includes:

### Formatting Tools
- **Bold**, *Italic*, <u>Underline</u>
- Headings (H1, H2, H3)
- Paragraph formatting

### Lists
- Bulleted lists
- Numbered lists

### Alignment
- Left align
- Center align
- Right align

### Advanced Features
- Link insertion
- Image insertion
- Code block insertion
- Undo/Redo functionality

## Usage Guide

### Editing a Policy

1. **Select Policy Type**: Choose from the dropdown menu
2. **Edit Content**: Use the rich text editor to modify content
3. **Preview**: Click "Preview" to see how it will look on the website
4. **Save**: Click "Save Changes" to update the policy
5. **Reset**: Click "Reset to Default" to restore original content

### Rich Text Editor Tips

- Use the formatting toolbar for basic text styling
- Create headings with H1, H2, H3 buttons
- Add lists using the bullet or number list buttons
- Insert links by clicking the link button and entering a URL
- Add images by clicking the image button and entering an image URL
- Use the code button to insert code blocks
- Undo/redo buttons help with editing mistakes

### Preview Modal

The preview modal shows:
- Exact styling as it appears on the website
- Proper policy title and last updated date
- All HTML formatting rendered correctly
- Scrollable content for long policies

## Technical Details

### Database Schema

```sql
CREATE TABLE policy_content (
    id INTEGER PRIMARY KEY,
    policy_type VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    last_updated VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    admin_id INTEGER REFERENCES user(id)
);
```

### Security Features

- Admin authentication required for all policy management
- CSRF protection on form submissions
- Input sanitization for policy content
- HTML content is safely rendered with Jinja2's `|safe` filter

### Error Handling

- Graceful fallback to static content if database issues occur
- User-friendly error messages for failed operations
- Validation for required fields (title, content)
- Database transaction rollback on errors

## Troubleshooting

### Common Issues

1. **Migration Fails**
   - Ensure virtual environment is activated
   - Check database permissions
   - Verify admin user exists in database

2. **Policy Editor Not Visible**
   - Ensure user is logged in as admin (`is_admin = True`)
   - Clear browser cache
   - Check console for JavaScript errors

3. **Rich Text Editor Not Working**
   - Verify Bootstrap JS is loaded
   - Check browser developer tools for errors
   - Ensure FontAwesome icons are loading

4. **Preview Modal Not Opening**
   - Confirm Bootstrap modal JavaScript is available
   - Check for CSS conflicts
   - Verify modal HTML structure

### Debug Steps

1. Check database tables exist:
   ```bash
   sqlite3 instance/skill_finesse.db ".tables"
   ```

2. Verify policies in database:
   ```bash
   sqlite3 instance/skill_finesse.db "SELECT policy_type, title FROM policy_content;"
   ```

3. Test API endpoints:
   ```bash
   curl http://localhost:5000/admin/api/policy/privacy_policy
   ```

## Future Enhancements

Potential improvements for future versions:

1. **Version Control**
   - Track policy revision history
   - Compare different versions
   - Rollback to previous versions

2. **Advanced Editor Features**
   - Table insertion and editing
   - Color picker for text styling
   - Font family selection
   - Advanced image management

3. **Workflow Features**
   - Draft/publish workflow
   - Approval process for policy changes
   - Scheduled publishing

4. **Export/Import**
   - Export policies as PDF
   - Import policies from external sources
   - Bulk policy management

5. **Localization**
   - Multi-language policy support
   - Translation management interface

## Support

For technical support or questions about the Policy Editor feature:

1. Check this README file
2. Review the troubleshooting section
3. Check browser developer tools for errors
4. Verify database and migration status

---

**Note**: This feature requires admin privileges and a properly configured database. Make sure to run the migration script before using the policy editor for the first time.