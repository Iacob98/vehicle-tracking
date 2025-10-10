"""
Utility functions for authentication and organization filtering
"""
import streamlit as st
from database import execute_query

def get_org_filter_sql():
    """Get SQL WHERE clause for organization filtering"""
    if st.session_state.get('organization_id'):
        return " AND organization_id = :org_id "
    return ""

def get_org_params():
    """Get organization parameters for SQL queries"""
    if st.session_state.get('organization_id'):
        return {'org_id': st.session_state.organization_id}
    return {}

def execute_org_query(query, additional_params=None):
    """Execute query with organization filtering"""
    if not st.session_state.get('organization_id'):
        return []
    
    params = {'org_id': st.session_state.organization_id}
    if additional_params:
        params.update(additional_params)
    
    # Automatically add organization filter if not already present
    if 'organization_id' in query and 'WHERE' in query.upper() and ':org_id' not in query:
        query = query.replace('WHERE', 'WHERE organization_id = :org_id AND')
    elif 'organization_id' in query and 'WHERE' not in query.upper():
        if 'ORDER BY' in query.upper():
            query = query.replace('ORDER BY', 'WHERE organization_id = :org_id ORDER BY')
        else:
            query += ' WHERE organization_id = :org_id'
    
    return execute_query(query, params)

def ensure_org_id_in_data(data_dict):
    """Ensure organization_id is included in data for insertion"""
    if st.session_state.get('organization_id'):
        data_dict['organization_id'] = st.session_state.organization_id
    return data_dict