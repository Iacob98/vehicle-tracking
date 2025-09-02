import streamlit as st
import uuid
import pandas as pd
from database import execute_query, SessionLocal
from translations import get_text
from utils import export_to_csv
from datetime import datetime
from auth import require_auth, show_org_header
from models import TeamMember, Team, WorkerCategory

# Page config
st.set_page_config(
    page_title="Бригады",
    page_icon="👥",
    layout="wide"
)

# Require authentication
require_auth()
show_org_header()

# Language from session state
language = st.session_state.get('language', 'ru')
user_org_id = st.session_state.get('organization_id')

def show_teams_list():
    """Show list of teams with inline editing"""
    try:
        # Check if we're editing a team
        edit_team_id = st.session_state.get('edit_team_id', None)
        
        if edit_team_id:
            show_edit_team_form(edit_team_id)
            return
        
        teams = execute_query(f"""
            SELECT 
                t.id,
                t.name,
                CONCAT(u.first_name, ' ', u.last_name) as leader_name,
                t.lead_id,
                COUNT(DISTINCT usr.id) as users_count,
                COUNT(DISTINCT va.vehicle_id) as vehicles_count,
                COUNT(DISTINCT tm.id) as team_members_count
            FROM teams t
            LEFT JOIN users u ON t.lead_id = u.id
            LEFT JOIN users usr ON t.id = usr.team_id
            LEFT JOIN vehicle_assignments va ON t.id = va.team_id 
                AND (va.end_date IS NULL OR va.end_date > CURRENT_DATE)
            LEFT JOIN team_members tm ON t.id = tm.team_id
            WHERE t.organization_id = '{user_org_id}'
            GROUP BY t.id, t.name, u.first_name, u.last_name, t.lead_id
            ORDER BY t.name
        """)
        
        if teams:
            for team in teams:
                with st.container():
                    col1, col2, col3, col4, col5 = st.columns([3, 1.5, 1.5, 1.5, 1])
                    
                    with col1:
                        st.write(f"**{team[1]}**")
                        if team[2]:
                            st.write(f"👤 Лидер: {team[2]}")
                        else:
                            st.write("👤 Лидер: не назначен")
                    
                    with col2:
                        st.write(f"👥 Пользователей: {team[4]}")
                    
                    with col3:
                        st.write(f"🚗 Автомобилей: {team[5]}")
                    
                    with col4:
                        st.write(f"👷 Участников: {team[6]}")
                    
                    with col5:
                        col_edit, col_delete = st.columns(2)
                        with col_edit:
                            if st.button("✏️", key=f"edit_team_{team[0]}", help="Редактировать"):
                                st.session_state.edit_team_id = team[0]
                                st.rerun()
                        with col_delete:
                            if st.button("🗑️", key=f"delete_team_{team[0]}", help="Удалить"):
                                delete_team(team[0])
                    
                    st.divider()
        else:
            st.info("Нет созданных бригад")
            
    except Exception as e:
        st.error(f"Ошибка: {str(e)}")

def show_add_team_form():
    """Show form to add new team"""
    st.subheader("Добавить новую бригаду")
    
    with st.form("add_team"):
        team_name = st.text_input("Название бригады*", placeholder="Введите название")
        
        # Get available users for team lead
        users = execute_query(f"""
            SELECT id, CONCAT(first_name, ' ', last_name) as full_name, role
            FROM users 
            WHERE organization_id = '{user_org_id}'
            ORDER BY first_name
        """)
        
        lead_options = {"Не назначен": None}
        if users:
            for user in users:
                lead_options[f"{user[1]} ({user[2]})"] = user[0]
        
        selected_lead = st.selectbox("Лидер бригады", list(lead_options.keys()))
        
        if st.form_submit_button("➕ Создать бригаду"):
            if not team_name:
                st.error("❌ Необходимо указать название бригады")
            else:
                try:
                    team_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO teams (id, organization_id, name, lead_id, created_at)
                        VALUES (:id, :org_id, :name, :lead_id, :created_at)
                    """, {
                        'id': team_id,
                        'org_id': user_org_id,
                        'name': team_name,
                        'lead_id': lead_options[selected_lead],
                        'created_at': datetime.now()
                    })
                    st.success(f"✅ Бригада '{team_name}' создана!")
                    st.rerun()
                except Exception as e:
                    st.error(f"❌ Ошибка создания бригады: {str(e)}")

def show_team_members():
    """Show team members management"""
    st.subheader("👷 Участники бригад")
    
    # Выбор бригады для просмотра участников
    with SessionLocal() as session:
        teams = session.query(Team).filter_by(organization_id=user_org_id).all()
        
        if not teams:
            st.warning("⚠️ Сначала создайте хотя бы одну бригаду")
            return
        
        team_options = {"Все бригады": None}
        for team in teams:
            team_options[team.name] = team.id
        
        selected_team_filter = st.selectbox("🔍 Фильтр по бригаде:", list(team_options.keys()))
        
        # Показать участников
        query = session.query(TeamMember).filter_by(organization_id=user_org_id)
        if selected_team_filter != "Все бригады":
            query = query.filter_by(team_id=team_options[selected_team_filter])
        
        members = query.all()
        
        if members:
            member_data = []
            for member in members:
                team_name = "Не назначена"
                if member.team_id:
                    team = session.query(Team).filter_by(id=member.team_id).first()
                    team_name = team.name if team else "Не назначена"
                
                member_data.append({
                    'Имя': f"{member.first_name} {member.last_name}",
                    'Телефон': member.phone or "Не указан",
                    'Категория': member.category.value if member.category else "Не указана",
                    'Бригада': team_name,
                    'Дата создания': member.created_at.strftime('%d.%m.%Y') if member.created_at else ""
                })
            
            df = pd.DataFrame(member_data)
            st.dataframe(df, use_container_width=True)
            
            st.write(f"**Всего участников:** {len(members)}")
        else:
            st.info("📝 Участников команды пока нет")

def show_add_team_member():
    """Show form to add team member"""
    st.subheader("➕ Добавить участника команды")
    
    with SessionLocal() as session:
        teams = session.query(Team).filter_by(organization_id=user_org_id).all()
        
        team_options = {"Не назначена": None}
        for team in teams:
            team_options[team.name] = team.id
        
        with st.form("add_team_member"):
            col1, col2 = st.columns(2)
            
            with col1:
                member_first_name = st.text_input("Имя*", placeholder="Введите имя")
                member_last_name = st.text_input("Фамилия*", placeholder="Введите фамилию")
                member_phone = st.text_input("Телефон", placeholder="+7 xxx xxx xx xx")
            
            with col2:
                # Категории работников
                category_options = [
                    "Не указана",
                    "driver", 
                    "mechanic", 
                    "helper", 
                    "supervisor"
                ]
                selected_category = st.selectbox("Категория работника", category_options)
                
                selected_team = st.selectbox("Бригада", list(team_options.keys()))
            
            if st.form_submit_button("💾 Добавить участника"):
                if not member_first_name or not member_last_name:
                    st.error("❌ Необходимо указать имя и фамилию участника")
                else:
                    try:
                        # Создаем нового участника
                        new_member = TeamMember(
                            first_name=member_first_name,
                            last_name=member_last_name,
                            phone=member_phone if member_phone else None,
                            category=WorkerCategory(selected_category) if selected_category != "Не указана" else None,
                            team_id=team_options[selected_team],
                            organization_id=user_org_id
                        )
                        
                        session.add(new_member)
                        session.commit()
                        
                        st.success(f"✅ Участник {member_first_name} {member_last_name} успешно добавлен!")
                        st.rerun()
                        
                    except Exception as e:
                        session.rollback()
                        st.error(f"❌ Ошибка добавления участника: {str(e)}")

def delete_team(team_id):
    """Delete team"""
    try:
        execute_query("DELETE FROM teams WHERE id = :id", {'id': team_id})
        st.success("Бригада удалена")
        st.rerun()
    except Exception as e:
        st.error(f"Ошибка удаления: {str(e)}")

def show_edit_team_form(team_id):
    """Show edit team form"""
    st.subheader("Редактировать бригаду")
    
    team = execute_query("SELECT name, lead_id FROM teams WHERE id = :id", {'id': team_id})
    if not team:
        st.error("Бригада не найдена")
        return
    
    current_name, current_lead_id = team[0]
    
    with st.form("edit_team"):
        new_name = st.text_input("Название бригады", value=current_name)
        
        if st.form_submit_button("💾 Сохранить"):
            try:
                execute_query("""
                    UPDATE teams 
                    SET name = :name 
                    WHERE id = :id
                """, {'name': new_name, 'id': team_id})
                st.success("Бригада обновлена")
                st.session_state.edit_team_id = None
                st.rerun()
            except Exception as e:
                st.error(f"Ошибка: {str(e)}")
        
        if st.form_submit_button("❌ Отмена"):
            st.session_state.edit_team_id = None
            st.rerun()

# Main page
st.title("👥 Бригады")

tab1, tab2, tab3, tab4 = st.tabs([
    "📋 Список бригад",
    "➕ Добавить бригаду", 
    "👷 Участники команды",
    "➕ Добавить участника"
])

with tab1:
    show_teams_list()

with tab2:
    show_add_team_form()

with tab3:
    show_team_members()

with tab4:
    show_add_team_member()