# Fleet Management System

## Overview

A comprehensive fleet management web application built with Streamlit that helps organizations manage their vehicle fleet, teams, users, penalties, maintenance, materials, and expenses. The system supports multi-language functionality (Russian and German) and provides a complete solution for fleet operations management with real-time dashboards and analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

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