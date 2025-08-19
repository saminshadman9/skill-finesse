# Dashboard Sections Structure

This document outlines the modular dashboard structure for the Skill Finesse application.

## Overview

The dashboard system has been refactored to use a modular approach where each section is separated into individual HTML files. This improves maintainability, reusability, and makes it easier to update specific sections without affecting the entire dashboard.

## Directory Structure

```
templates/
├── admin/
│   ├── dashboard.html          # Modular admin dashboard
│   └── sections/               # Admin dashboard sections
│       ├── dashboard_overview.html    # Main stats and overview
│       ├── user_management.html       # User management table
│       ├── admin_profile.html         # Admin profile settings
│       ├── courses.html               # Course management (placeholder)
│       ├── reports.html               # Analytics and reports (placeholder)
│       └── settings.html              # System settings (placeholder)
└── user/
    ├── dashboard.html          # Modular user dashboard
    └── sections/               # User dashboard sections
        ├── dashboard_overview.html    # User stats and recent activity
        ├── profile.html               # User profile management
        ├── courses.html               # My courses section
        ├── certificates.html          # Certificates section
        └── settings.html              # Account settings
```

## Dashboard Sections

### Admin Dashboard Sections

1. **Dashboard Overview** (`dashboard_overview.html`)
   - Total users, courses, revenue statistics
   - Key performance indicators
   - Page header with breadcrumbs

2. **User Management** (`user_management.html`)
   - User listing table with search and filters
   - Add new user modal
   - User actions (edit, delete)

3. **Admin Profile** (`admin_profile.html`)
   - Admin profile settings form
   - Security settings
   - Change password functionality

4. **Courses** (`courses.html`)
   - Course management interface (placeholder)
   - Add/edit/delete courses
   - Course statistics

5. **Reports** (`reports.html`)
   - Analytics dashboard (placeholder)
   - Performance metrics
   - Data visualization

6. **Settings** (`settings.html`)
   - System configuration (placeholder)
   - General settings
   - Email configuration

### User Dashboard Sections

1. **Dashboard Overview** (`dashboard_overview.html`)
   - User learning statistics
   - Recent activity feed
   - Course progress overview

2. **Profile** (`profile.html`)
   - Personal information form
   - Profile picture upload
   - Security settings

3. **Courses** (`courses.html`)
   - Enrolled courses with progress tracking
   - Course filtering (All, In Progress, Completed)
   - Course cards with action buttons

4. **Certificates** (`certificates.html`)
   - Earned certificates display
   - Certificate actions (view, download, share, verify)
   - Certificate statistics

5. **Settings** (`settings.html`)
   - Notification preferences
   - Privacy settings
   - Account management
   - Language and region settings

## Implementation Details

### How It Works

1. **Main Dashboard Files**: `dashboard.html` files contain the layout, sidebar, header, and CSS styles.

2. **Section Includes**: Each dashboard uses Jinja2's `{% include %}` directive to load individual sections:
   ```html
   {% include 'admin/sections/dashboard_overview.html' %}
   {% include 'admin/sections/user_management.html' %}
   ```

3. **Section Visibility**: Sections are controlled by JavaScript that shows/hides sections based on sidebar navigation:
   ```javascript
   // Hide all sections
   sections.forEach(s => s.style.display = 'none');
   
   // Show selected section
   const sectionElement = document.getElementById(section + '-section');
   if (sectionElement) {
       sectionElement.style.display = 'block';
   }
   ```

4. **Section Structure**: Each section file contains:
   - A wrapper div with `id="{section-name}-section"` and `class="content-section"`
   - Complete HTML content for that section
   - Any section-specific modals or components

### CSS Classes

- `.content-section`: Applied to all section wrapper divs
- `.page-header`: Section header with title and breadcrumbs
- `.stat-card`: Statistics display cards
- `.card`: Main content cards
- Display control: Sections start hidden (`style="display: none;"`) except the default dashboard section

### JavaScript Navigation

The sidebar navigation system:
1. Removes active class from all navigation links
2. Adds active class to clicked link
3. Hides all content sections
4. Shows the selected section
5. Closes sidebar on mobile devices

## Benefits

1. **Modularity**: Each section is self-contained and can be edited independently
2. **Reusability**: Sections can be reused in other parts of the application
3. **Maintainability**: Easier to maintain and debug specific functionality
4. **Scalability**: Easy to add new sections without modifying existing code
5. **Organization**: Clear separation of concerns

## Usage Instructions

### Adding a New Section

1. Create a new HTML file in the appropriate sections directory:
   ```html
   <!-- New Section -->
   <div id="newsection-section" class="content-section" style="display: none;">
       <div class="page-header">
           <h1>New Section</h1>
           <nav aria-label="breadcrumb">
               <ol class="breadcrumb">
                   <li class="breadcrumb-item"><a href="{{ url_for('index') }}">Home</a></li>
                   <li class="breadcrumb-item"><a href="#">Dashboard</a></li>
                   <li class="breadcrumb-item active" aria-current="page">New Section</li>
               </ol>
           </nav>
       </div>
       
       <div class="row">
           <div class="col-12">
               <div class="card">
                   <div class="card-header">
                       <h3><i class="fas fa-icon me-2"></i>Section Title</h3>
                   </div>
                   <div class="card-body">
                       <!-- Section content here -->
                   </div>
               </div>
           </div>
       </div>
   </div>
   ```

2. Add the section to the main dashboard file:
   ```html
   {% include 'admin/sections/newsection.html' %}
   ```

3. Add navigation link to the sidebar:
   ```html
   <li class="nav-item">
       <a class="nav-link" href="#" data-section="newsection">
           <i class="fas fa-icon"></i>
           <span>New Section</span>
       </a>
   </li>
   ```

### Modifying Existing Sections

1. Navigate to the appropriate section file in `/sections/` directory
2. Make your changes to the HTML content
3. The changes will automatically reflect in the dashboard

### Basic JavaScript (Already Included)

The dashboard includes basic JavaScript for:
- Sidebar toggle functionality
- Section navigation
- Profile picture upload preview
- Mobile responsiveness

## Final Structure

```
├── admin/
│   ├── dashboard.html          # Main admin dashboard with includes
│   └── sections/
│       ├── dashboard_overview.html
│       ├── user_management.html
│       ├── admin_profile.html
│       ├── courses.html
│       ├── reports.html
│       └── settings.html
└── user/
    ├── dashboard.html          # Main user dashboard with includes
    └── sections/
        ├── dashboard_overview.html
        ├── profile.html
        ├── courses.html
        ├── certificates.html
        └── settings.html
```

This modular approach provides a clean, organized structure for dashboard development while maintaining simplicity and ease of use.
