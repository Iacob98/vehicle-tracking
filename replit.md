# Fleet Management System

## Overview

A comprehensive fleet management web application built with Streamlit that helps organizations manage their vehicle fleet, teams, users, penalties, maintenance, materials, and expenses. The system supports multi-language functionality (Russian and German) and provides a complete solution for fleet operations management with real-time dashboards and analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 14, 2025)

### Vehicle Photo Management System
- Added photo_url field to vehicles table for storing vehicle photographs
- Implemented vehicle photo upload functionality with thumbnail display in vehicle lists
- Enhanced vehicle forms (add/edit) with photo upload capabilities
- Added 80px thumbnail display in vehicle listings for easier identification
- Created uploads/vehicles directory for vehicle photo storage
- Integrated with existing file storage system for reliable photo management

### User Management Enhancement
- Added phone field to users table for contact information storage
- Implemented complete user editing functionality with form pre-population
- Enhanced user interface with edit and delete buttons in separate columns
- Added phone number display in user listings
- Fixed session state management issues for user editing workflow
- Improved user form validation and error handling

### Database Structure Updates (August 13, 2025)
- Migrated users table from single "name" field to separate "first_name" and "last_name" fields
- Added "Worker" role to user_role enum with Russian/German translations
- Updated all SQL queries across application to use new user structure
- Fixed database transaction issues and completed clean database recreation

### User Document Management System
- Created user_documents table with support for 10 document types including driving licenses
- Added comprehensive document management interface in Users section
- Implemented full CRUD operations for user documents with file upload/viewing
- Created expiring documents tracking for user documents with visual alerts
- Added document type translations for Russian and German languages
- Integrated file viewer with full-width display for optimal document viewing

### Currency System Update
- Changed system currency from rubles (₽) to euros (€) throughout the entire application
- Updated format_currency function in utils.py to use euro symbol as default
- Fixed all direct currency references to use euro symbol consistently
- All financial displays now show amounts in euros (expenses, penalties, materials costs)

### Enhanced Expense Management System
- Restructured expenses into two specialized systems:
  - Car Expenses (car_expenses table): repair, maintenance, fuel, insurance, toll, car_wash, other
  - Brigade Expenses (brigade_expenses table): broken_equipment, fine
- Created dedicated PostgreSQL enum types for expense categories
- Implemented separate management interfaces for car and brigade expenses
- Added comprehensive analytics and reporting for both expense types
- Integrated file upload support for receipts and documentation
- All expense amounts displayed in euros with proper formatting

### Maintenance and Expenses Integration
- Unified maintenance repairs and car expenses into single entity system
- Automatic expense creation when repair maintenance is recorded with cost
- Added maintenance_id foreign key to car_expenses table for linking
- Visual indicators showing expense source (manual entry vs maintenance-linked)
- Protection against accidental deletion of maintenance-linked expenses
- Removed separate maintenance page - now managed through car expenses

### Materials and Penalty System Integration
- Removed "Brigade Expenses" page as it duplicated penalty functionality
- Added unit_price field to materials table for cost tracking
- Updated materials interface to display price per unit in euros
- Automatic penalty creation when materials are marked as broken
- Penalty amount calculated as unit_price × quantity for broken materials
- Integrated broken material penalties with existing penalty system

### Enhanced System Logic Requirements
- Bidirectional entity relationships with automatic updates
- Snapshot system for team compositions at specific events
- Equipment categorization: returnable equipment vs consumable materials
- Automatic penalty assignment to team compositions based on incident dates
- Historical tracking of vehicle assignments with proper date ranges
- CSV import/export with preview and validation workflows
- Document management with expiry dates and file attachments

## System Architecture

### Frontend Architecture
- **Framework**: Streamlit web application framework
- **UI Pattern**: Multi-page application with tabbed interfaces
- **Language Support**: Built-in internationalization system supporting Russian and German
- **Navigation**: Sidebar-based navigation with icon-based menu system
- **State Management**: Streamlit session state for language preferences and user interactions

### Backend Architecture
- **Database ORM**: SQLAlchemy with declarative base models
- **Database Connection**: PostgreSQL with connection pooling via SQLAlchemy engine
- **Data Models**: Comprehensive entity relationship model covering:
  - Vehicles with status tracking (active, repair, unavailable)
  - Teams with hierarchical leadership structure
  - Users with role-based access (admin, manager, team_lead)
  - Vehicle assignments to teams with date ranges
  - Penalties tracking with payment status
  - Maintenance records (inspection, repair)
  - Materials and equipment management
  - Expense tracking by vehicle and team
  - Material assignment history with event logging

### Data Storage Solutions
- **Primary Database**: PostgreSQL with custom enum types for status fields
- **Schema Design**: Normalized relational database with foreign key constraints
- **Data Types**: UUID primary keys, PostgreSQL-specific enums, timestamp tracking
- **Query Execution**: Direct SQL execution via SQLAlchemy engine for complex reporting

### Authentication and Authorization
- **Role-Based Access**: Three-tier user role system (admin, manager, team_lead)
- **Team Hierarchy**: Team leaders have specific privileges within their teams
- **Session Management**: Streamlit built-in session handling

### Key Features
- **Dashboard Analytics**: Real-time metrics with Plotly visualizations
- **Multi-Entity Management**: CRUD operations for all major entities
- **Export Functionality**: CSV export capabilities for all data views
- **Search and Filtering**: Advanced filtering across all entity types
- **Date Range Operations**: Historical data analysis with date-based queries
- **Pagination Support**: Efficient data loading for large datasets
- **Snapshot System**: Historical composition tracking for team assignments
- **Equipment vs Consumables**: Returnable equipment and consumable materials tracking
- **Automatic Logging**: All user actions logged with timestamps and user attribution
- **CSV Import/Export**: Bulk data operations with preview and validation
- **Document Management**: File attachments with expiry dates for official documents

## External Dependencies

### Core Framework Dependencies
- **Streamlit**: Web application framework for the user interface
- **SQLAlchemy**: Database ORM and connection management
- **Plotly**: Interactive charts and data visualizations
- **Pandas**: Data manipulation and CSV export functionality

### Database Dependencies
- **PostgreSQL**: Primary database system
- **psycopg2**: PostgreSQL database adapter (implied by SQLAlchemy usage)

### Python Standard Libraries
- **uuid**: Unique identifier generation
- **datetime**: Date and time handling
- **enum**: Enumeration support for status fields
- **os**: Environment variable management for database configuration

### Visualization and Analytics
- **Plotly Express**: Simplified plotting interface
- **Plotly Graph Objects**: Advanced chart customization

### Data Processing
- **Pandas**: DataFrame operations and CSV generation for exports

### Environment Configuration
- **DATABASE_URL**: Environment variable for PostgreSQL connection string
- **Default Configuration**: Fallback PostgreSQL connection for development