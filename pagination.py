"""
Pagination helper for large datasets
"""
import streamlit as st
import math

def paginate_data(data, page_size=20, key_prefix="pagination"):
    """
    Paginate large datasets with streamlit
    
    Args:
        data: List of items to paginate
        page_size: Number of items per page
        key_prefix: Unique key prefix for session state
    
    Returns:
        Paginated data for current page
    """
    if not data:
        return []
    
    total_items = len(data)
    total_pages = math.ceil(total_items / page_size)
    
    # Initialize page number in session state
    page_key = f"{key_prefix}_page"
    if page_key not in st.session_state:
        st.session_state[page_key] = 1
    
    current_page = st.session_state[page_key]
    
    # Calculate indices
    start_idx = (current_page - 1) * page_size
    end_idx = min(start_idx + page_size, total_items)
    
    # Display pagination controls
    if total_pages > 1:
        col1, col2, col3, col4, col5 = st.columns([1, 1, 2, 1, 1])
        
        with col1:
            if st.button("⏮️", key=f"{key_prefix}_first", disabled=current_page == 1):
                st.session_state[page_key] = 1
                st.rerun()
        
        with col2:
            if st.button("◀️", key=f"{key_prefix}_prev", disabled=current_page == 1):
                st.session_state[page_key] = current_page - 1
                st.rerun()
        
        with col3:
            st.write(f"Страница {current_page} из {total_pages}")
        
        with col4:
            if st.button("▶️", key=f"{key_prefix}_next", disabled=current_page == total_pages):
                st.session_state[page_key] = current_page + 1
                st.rerun()
        
        with col5:
            if st.button("⏭️", key=f"{key_prefix}_last", disabled=current_page == total_pages):
                st.session_state[page_key] = total_pages
                st.rerun()
        
        # Page size selector
        st.write(f"Показано {start_idx + 1}-{end_idx} из {total_items}")
    
    return data[start_idx:end_idx]

def reset_pagination(key_prefix="pagination"):
    """Reset pagination to first page"""
    page_key = f"{key_prefix}_page"
    if page_key in st.session_state:
        st.session_state[page_key] = 1