import streamlit as st
import uuid
import pandas as pd
from database import execute_query, SessionLocal
from translations import get_text
from utils import export_to_csv
from datetime import datetime, date
from auth import require_auth, show_org_header
from models import TeamMember, Team, WorkerCategory, TeamMemberDocument

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
    
    with st.form("add_team_form"):
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
        
        with st.form("add_team_member_form"):
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

def show_team_management():
    """Show team member management - assign/reassign members to teams"""
    st.subheader("🔄 Управление составом бригад")
    
    with SessionLocal() as session:
        # Получаем всех участников
        members = session.query(TeamMember).filter_by(organization_id=user_org_id).all()
        teams = session.query(Team).filter_by(organization_id=user_org_id).all()
        
        if not members:
            st.info("📝 Нет участников для распределения по бригадам")
            return
            
        if not teams:
            st.warning("⚠️ Нет бригад для назначения участников")
            return
        
        st.write("### Текущее распределение участников:")
        
        # Группируем участников по бригадам
        team_dict = {team.id: team.name for team in teams}
        team_dict[None] = "Не назначена"
        
        for team in teams:
            team_members = [m for m in members if m.team_id == team.id]
            with st.expander(f"🏢 {team.name} ({len(team_members)} участников)", expanded=False):
                if team_members:
                    for member in team_members:
                        col1, col2, col3 = st.columns([3, 2, 1])
                        with col1:
                            st.write(f"👤 {member.first_name} {member.last_name}")
                        with col2:
                            st.write(f"📞 {member.phone or 'Не указан'}")
                        with col3:
                            if st.button("🔄", key=f"reassign_{member.id}", help="Переназначить"):
                                st.session_state[f"reassign_member_{member.id}"] = True
                                st.rerun()
                else:
                    st.write("Нет участников в этой бригаде")
        
        # Участники без бригады
        unassigned_members = [m for m in members if m.team_id is None]
        if unassigned_members:
            with st.expander(f"❓ Не назначены ({len(unassigned_members)} участников)", expanded=True):
                for member in unassigned_members:
                    col1, col2, col3 = st.columns([3, 2, 1])
                    with col1:
                        st.write(f"👤 {member.first_name} {member.last_name}")
                    with col2:
                        st.write(f"📞 {member.phone or 'Не указан'}")
                    with col3:
                        if st.button("➕", key=f"assign_{member.id}", help="Назначить в бригаду"):
                            st.session_state[f"reassign_member_{member.id}"] = True
                            st.rerun()
        
        st.write("---")
        
        # Форма переназначения участников
        for member in members:
            if st.session_state.get(f"reassign_member_{member.id}", False):
                st.write(f"### Переназначение: {member.first_name} {member.last_name}")
                
                current_team = "Не назначена"
                if member.team_id:
                    current_team = team_dict.get(member.team_id, "Неизвестная бригада")
                
                st.write(f"**Текущая бригада:** {current_team}")
                
                with st.form(f"reassign_form_{member.id}"):
                    team_options = {"Не назначать": None}
                    for team in teams:
                        team_options[team.name] = team.id
                    
                    new_team = st.selectbox("Новая бригада:", list(team_options.keys()))
                    
                    col1, col2 = st.columns(2)
                    with col1:
                        if st.form_submit_button("✅ Переназначить"):
                            try:
                                member.team_id = team_options[new_team]
                                session.commit()
                                
                                new_team_name = new_team if new_team != "Не назначать" else "Не назначена"
                                st.success(f"✅ {member.first_name} {member.last_name} переназначен в '{new_team_name}'")
                                
                                # Очищаем состояние
                                if f"reassign_member_{member.id}" in st.session_state:
                                    del st.session_state[f"reassign_member_{member.id}"]
                                st.rerun()
                                
                            except Exception as e:
                                session.rollback()
                                st.error(f"❌ Ошибка переназначения: {str(e)}")
                    
                    with col2:
                        if st.form_submit_button("❌ Отмена"):
                            if f"reassign_member_{member.id}" in st.session_state:
                                del st.session_state[f"reassign_member_{member.id}"]
                            st.rerun()
                
                break  # Показываем только одну форму за раз

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
    
    with st.form(f"edit_team_form_{team_id}"):
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

def show_team_member_documents():
    """Show team member documents management"""
    st.subheader("📄 Документы участников")
    
    # Check if viewing a document
    view_doc_id = None
    for key in st.session_state:
        if key.startswith("view_tm_doc_") and st.session_state[key]:
            view_doc_id = key.replace("view_tm_doc_", "")
            break
    
    with SessionLocal() as session:
        # If viewing a document, show viewer
        if view_doc_id:
            doc = session.query(TeamMemberDocument).filter_by(id=view_doc_id).first()
            if doc:
                member = session.query(TeamMember).filter_by(id=doc.team_member_id).first()
                member_name = f"{member.first_name} {member.last_name}" if member else "Неизвестный"
                
                st.header(f"📎 {doc.title}")
                st.write(f"**Участник:** {member_name}")
                
                if st.button("⬅️ Назад к списку", use_container_width=True):
                    if f"view_tm_doc_{view_doc_id}" in st.session_state:
                        del st.session_state[f"view_tm_doc_{view_doc_id}"]
                    st.rerun()
                
                if doc.file_url:
                    # Display the document
                    file_name = doc.file_url.split('/')[-1]
                    file_extension = file_name.split('.')[-1].lower() if '.' in file_name else ''
                    
                    col_main, col_sidebar = st.columns([3, 1])
                    
                    with col_main:
                        st.info(f"📁 **Файл:** {file_name}")
                        
                        if file_extension in ['jpg', 'jpeg', 'png', 'gif']:
                            try:
                                import os
                                if doc.file_url.startswith('/'):
                                    file_path = doc.file_url.lstrip('/')
                                    if os.path.exists(file_path):
                                        st.image(file_path, caption=doc.title, use_container_width=True)
                                    else:
                                        st.error("🚫 Файл изображения не найден")
                                else:
                                    st.image(doc.file_url, caption=doc.title, use_container_width=True)
                            except Exception as e:
                                st.error(f"❌ Ошибка загрузки изображения: {str(e)}")
                        elif file_extension == 'pdf':
                            st.success("📄 **PDF документ готов к просмотру**")
                            st.write("💡 Используйте кнопку 'Скачать' справа для просмотра PDF файла")
                        else:
                            st.warning(f"📎 **Файл типа .{file_extension}**")
                            st.info("💡 Используйте кнопку скачивания справа")
                    
                    with col_sidebar:
                        st.markdown("### Действия")
                        
                        try:
                            import os
                            if doc.file_url.startswith('/'):
                                file_path = doc.file_url.lstrip('/')
                                if os.path.exists(file_path):
                                    with open(file_path, "rb") as f:
                                        file_data = f.read()
                                    
                                    st.download_button(
                                        label="⬇️ **Скачать**",
                                        data=file_data,
                                        file_name=file_name,
                                        use_container_width=True
                                    )
                                else:
                                    st.error("❌ Файл не найден")
                            else:
                                st.markdown(f"🔗 [Скачать файл]({doc.file_url})")
                        except Exception as e:
                            st.error("❌ Ошибка доступа")
                        
                        if st.button("🗑️ Удалить документ", use_container_width=True):
                            try:
                                session.delete(doc)
                                session.commit()
                                st.success("Документ удален")
                                if f"view_tm_doc_{view_doc_id}" in st.session_state:
                                    del st.session_state[f"view_tm_doc_{view_doc_id}"]
                                st.rerun()
                            except Exception as e:
                                session.rollback()
                                st.error(f"Ошибка удаления: {str(e)}")
                else:
                    st.warning("Файл не найден")
                return
        
        # Normal document management view
        members = session.query(TeamMember).filter_by(organization_id=user_org_id).all()
        
        if not members:
            st.info("📝 Нет участников для управления документами")
            return
        
        # Member selection
        member_options = {}
        for member in members:
            member_options[f"{member.first_name} {member.last_name}"] = member.id
        
        selected_member = st.selectbox("👤 Выберите участника:", list(member_options.keys()))
        selected_member_id = member_options[selected_member]
        
        # Get documents for selected member  
        documents = session.query(TeamMemberDocument).filter_by(team_member_id=selected_member_id).all()
        
        # Check which documents are missing for this member
        existing_doc_titles = [doc.title for doc in documents]
        required_docs = ["Паспорт", "Разрешение на работу", "Вид на жительство", "Медицинская страховка"]
        missing_docs = [doc for doc in required_docs if doc not in existing_doc_titles]
        
        if missing_docs:
            st.warning(f"⚠️ Отсутствуют обязательные документы: {', '.join(missing_docs)}")
        
        doc_tab1, doc_tab2 = st.tabs(["📋 Список документов", "➕ Добавить документ"])
        
        with doc_tab1:
            if documents:
                for doc in documents:
                    with st.container():
                        col1, col2, col3, col4, col5 = st.columns([3, 2, 2, 1, 1])
                        
                        with col1:
                            st.write(f"📄 **{doc.title}**")
                        
                        with col2:
                            if doc.upload_date:
                                st.write(f"📅 Загружен: {doc.upload_date.strftime('%d.%m.%Y')}")
                        
                        with col3:
                            if doc.expiry_date:
                                days_left = (doc.expiry_date - date.today()).days
                                if days_left <= 0:
                                    st.error("⚠️ Просрочен")
                                elif days_left <= 30:
                                    st.warning(f"⚠️ Истекает через {days_left} дней")
                                else:
                                    st.success(f"✅ До {doc.expiry_date.strftime('%d.%m.%Y')}")
                            else:
                                st.info("Срок не указан")
                        
                        with col4:
                            if st.button("👁️", key=f"view_tm_doc_{doc.id}", help="Просмотр"):
                                if doc.file_url:
                                    st.session_state[f"view_tm_doc_{doc.id}"] = True
                                    st.rerun()
                        
                        with col5:
                            if st.button("🗑️", key=f"del_tm_doc_{doc.id}", help="Удалить"):
                                try:
                                    session.delete(doc)
                                    session.commit()
                                    st.success("Документ удален")
                                    st.rerun()
                                except Exception as e:
                                    session.rollback()
                                    st.error(f"Ошибка: {str(e)}")
                        
                        st.divider()
            else:
                st.info(f"У участника {selected_member} нет документов")
        
        with doc_tab2:
            st.write("### Добавить документ")
            
            # Document types for workers in Germany
            document_types = {
                "🆔 Паспорт / Reisepass": "Паспорт",
                "🚗 Водительские права / Führerschein": "Водительские права",
                "💼 Разрешение на работу / Arbeitserlaubnis": "Разрешение на работу",
                "🏠 Вид на жительство / Aufenthaltstitel": "Вид на жительство",
                "🏥 Медицинская страховка / Krankenversicherung": "Медицинская страховка",
                "📍 Регистрация по месту жительства / Anmeldung": "Регистрация по месту жительства",
                "💰 Налоговый номер / Steuer-ID": "Налоговый номер",
                "👥 Социальное страхование / Sozialversicherungsausweis": "Социальное страхование",
                "📋 Трудовой договор / Arbeitsvertrag": "Трудовой договор",
                "🎓 Квалификация / Qualifikation": "Квалификация",
                "📝 Другой документ / Sonstiges": "Другой документ"
            }
            
            with st.form("add_team_member_document_form"):
                col1, col2 = st.columns(2)
                
                with col1:
                    # Dropdown for document type
                    selected_doc_type = st.selectbox(
                        "📋 Тип документа* / Dokumenttyp*",
                        options=list(document_types.keys()),
                        help="Выберите тип документа из списка / Wählen Sie den Dokumenttyp"
                    )
                    
                    # If "Other" is selected, show text input
                    if selected_doc_type == "📝 Другой документ / Sonstiges":
                        custom_doc_title = st.text_input(
                            "Название документа*",
                            placeholder="Введите название / Dokumentname eingeben"
                        )
                        doc_title = custom_doc_title if custom_doc_title else "Другой документ"
                    else:
                        doc_title = document_types[selected_doc_type]
                        st.info(f"📄 Будет сохранен как: **{doc_title}**")
                    
                    uploaded_file = st.file_uploader(
                        "📎 Выберите файл / Datei auswählen",
                        type=['pdf', 'jpg', 'jpeg', 'png'],
                        help="Форматы: PDF, JPG, PNG"
                    )
                
                with col2:
                    expiry_date = st.date_input(
                        "📅 Срок действия до / Gültig bis",
                        value=None,
                        help="Оставьте пустым если срок не ограничен / Leer lassen wenn unbegrenzt"
                    )
                    
                    # Show required documents info
                    st.markdown("#### ⚠️ Обязательные документы:")
                    st.markdown("""
                    **Для работы в Германии:**
                    - 🆔 Паспорт
                    - 💼 Разрешение на работу
                    - 🏠 Вид на жительство
                    - 🏥 Медицинская страховка
                    
                    **Для водителей:**
                    - 🚗 Водительские права
                    """)
                
                if st.form_submit_button("💾 Сохранить документ / Dokument speichern"):
                    if selected_doc_type == "📝 Другой документ / Sonstiges" and not custom_doc_title:
                        st.error("❌ Необходимо указать название документа / Dokumentname erforderlich")
                    elif not uploaded_file:
                        st.error("❌ Необходимо выбрать файл / Datei erforderlich")
                    else:
                        try:
                            from utils import upload_file
                            
                            # Upload file
                            file_url = upload_file(uploaded_file, 'team_member_documents')
                            
                            # Create document record
                            new_doc = TeamMemberDocument(
                                team_member_id=selected_member_id,
                                title=doc_title,
                                file_url=file_url,
                                expiry_date=expiry_date,
                                upload_date=datetime.now()
                            )
                            
                            session.add(new_doc)
                            session.commit()
                            
                            st.success(f"✅ Документ '{doc_title}' добавлен для {selected_member}")
                            st.rerun()
                            
                        except Exception as e:
                            session.rollback()
                            st.error(f"❌ Ошибка сохранения документа: {str(e)}")

# Main page
st.title("👥 Бригады")

tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "📋 Список бригад",
    "➕ Добавить бригаду", 
    "👷 Участники команды",
    "➕ Добавить участника",
    "🔄 Управление составом",
    "📄 Документы участников"
])

with tab1:
    show_teams_list()

with tab2:
    show_add_team_form()

with tab3:
    show_team_members()

with tab4:
    show_add_team_member()

with tab5:
    show_team_management()

with tab6:
    show_team_member_documents()