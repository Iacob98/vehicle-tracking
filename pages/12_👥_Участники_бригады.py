import streamlit as st
from auth import require_auth, is_admin, is_manager
from models import TeamMember, TeamMemberDocument, Team, Organization, WorkerCategory
from database import Session
from utils import upload_multiple_files, display_file
from datetime import date
import pandas as pd

# Require authentication
user = require_auth()
if not user:
    st.stop()

st.title("👥 Участники бригады / Teammitglieder")

# Only managers and admins can manage team members
if not (is_manager(user) or is_admin(user)):
    st.error("❌ Доступ запрещен. Только админы и менеджеры могут управлять участниками бригады.")
    st.error("❌ Zugriff verweigert. Nur Admins und Manager können Teammitglieder verwalten.")
    st.stop()

# Create tabs
tabs = st.tabs(["📋 Список / Liste", "➕ Добавить / Hinzufügen", "📄 Документы / Dokumente"])

with Session() as session:
    # Get current organization teams
    teams = session.query(Team).filter_by(organization_id=user.organization_id).all()
    team_options = {f"{team.name}": team for team in teams}

with tabs[0]:  # List
    st.subheader("📋 Список участников бригады / Liste der Teammitglieder")
    
    with Session() as session:
        # Filter by team if selected
        selected_team_name = st.selectbox(
            "🔍 Фильтр по бригаде / Filter nach Team:",
            ["Все / Alle"] + list(team_options.keys())
        )
        
        # Get team members
        query = session.query(TeamMember).filter_by(organization_id=user.organization_id)
        if selected_team_name != "Все / Alle":
            selected_team = team_options[selected_team_name]
            query = query.filter_by(team_id=selected_team.id)
            
        team_members = query.all()
        
        if team_members:
            # Create DataFrame for display
            data = []
            for member in team_members:
                team_name = member.team.name if member.team else "Без бригады"
                category_display = {
                    WorkerCategory.driver: "Водитель / Fahrer",
                    WorkerCategory.mechanic: "Механик / Mechaniker", 
                    WorkerCategory.specialist: "Специалист / Spezialist",
                    WorkerCategory.general: "Общие работы / Allgemein"
                }.get(member.category, "Общие работы")
                
                docs_count = len(member.documents) if member.documents else 0
                
                data.append({
                    "ID": str(member.id)[:8],
                    "Имя / Name": f"{member.first_name} {member.last_name}",
                    "Телефон / Telefon": member.phone or "-",
                    "Категория / Kategorie": category_display,
                    "Бригада / Team": team_name,
                    "Документов / Dokumente": docs_count,
                    "Создан / Erstellt": member.created_at.strftime("%d.%m.%Y")
                })
            
            df = pd.DataFrame(data)
            st.dataframe(df, use_container_width=True, hide_index=True)
            
            # Edit/Delete actions
            st.subheader("⚙️ Действия / Aktionen")
            
            # Select member to edit
            member_options = {f"{m.first_name} {m.last_name} ({str(m.id)[:8]})": m for m in team_members}
            selected_member_display = st.selectbox(
                "Выберите участника / Wähle Teammitglied:",
                list(member_options.keys())
            )
            
            if selected_member_display:
                selected_member = member_options[selected_member_display]
                
                col1, col2 = st.columns(2)
                
                with col1:
                    if st.button("✏️ Редактировать / Bearbeiten"):
                        st.session_state.editing_member = selected_member.id
                        st.rerun()
                
                with col2:
                    if st.button("🗑️ Удалить / Löschen", type="secondary"):
                        if st.session_state.get('confirm_delete') != selected_member.id:
                            st.session_state.confirm_delete = selected_member.id
                            st.warning("⚠️ Нажмите еще раз для подтверждения / Nochmals klicken zur Bestätigung")
                        else:
                            # Delete member and documents
                            with Session() as session:
                                member_to_delete = session.get(TeamMember, selected_member.id)
                                if member_to_delete:
                                    # Delete documents first
                                    for doc in member_to_delete.documents:
                                        session.delete(doc)
                                    session.delete(member_to_delete)
                                    session.commit()
                                    st.success("✅ Участник удален / Teammitglied gelöscht")
                                    del st.session_state.confirm_delete
                                    st.rerun()
                
                # Show editing form if member selected for editing
                if st.session_state.get('editing_member') == selected_member.id:
                    st.subheader("✏️ Редактирование участника / Teammitglied bearbeiten")
                    
                    with st.form("edit_member_form"):
                        new_first_name = st.text_input("Имя / Vorname", value=selected_member.first_name)
                        new_last_name = st.text_input("Фамилия / Nachname", value=selected_member.last_name)
                        new_phone = st.text_input("Телефон / Telefon", value=selected_member.phone or "")
                        
                        # Team selection
                        current_team_key = None
                        if selected_member.team:
                            current_team_key = selected_member.team.name
                        
                        new_team_name = st.selectbox(
                            "Бригада / Team:",
                            list(team_options.keys()),
                            index=list(team_options.keys()).index(current_team_key) if current_team_key in team_options else 0
                        )
                        
                        # Category selection
                        category_options = {
                            "Водитель / Fahrer": WorkerCategory.driver,
                            "Механик / Mechaniker": WorkerCategory.mechanic,
                            "Специалист / Spezialist": WorkerCategory.specialist,
                            "Общие работы / Allgemein": WorkerCategory.general
                        }
                        
                        current_category_key = {
                            WorkerCategory.driver: "Водитель / Fahrer",
                            WorkerCategory.mechanic: "Механик / Mechaniker",
                            WorkerCategory.specialist: "Специалист / Spezialist",
                            WorkerCategory.general: "Общие работы / Allgemein"
                        }.get(selected_member.category, "Общие работы / Allgemein")
                        
                        new_category_display = st.selectbox(
                            "Категория / Kategorie:",
                            list(category_options.keys()),
                            index=list(category_options.keys()).index(current_category_key)
                        )
                        
                        col1, col2 = st.columns(2)
                        
                        with col1:
                            if st.form_submit_button("💾 Сохранить / Speichern"):
                                with Session() as session:
                                    member_to_update = session.get(TeamMember, selected_member.id)
                                    if member_to_update:
                                        member_to_update.first_name = new_first_name
                                        member_to_update.last_name = new_last_name
                                        member_to_update.phone = new_phone
                                        member_to_update.team_id = team_options[new_team_name].id
                                        member_to_update.category = category_options[new_category_display]
                                        
                                        session.commit()
                                        st.success("✅ Изменения сохранены / Änderungen gespeichert")
                                        del st.session_state.editing_member
                                        st.rerun()
                        
                        with col2:
                            if st.form_submit_button("❌ Отмена / Abbrechen"):
                                del st.session_state.editing_member
                                st.rerun()
        else:
            st.info("📝 Участники бригады не найдены / Keine Teammitglieder gefunden")

with tabs[1]:  # Add new
    st.subheader("➕ Добавить участника бригады / Teammitglied hinzufügen")
    
    if not teams:
        st.warning("⚠️ Сначала создайте бригады на странице 'Бригады'")
        st.warning("⚠️ Erstellen Sie zuerst Teams auf der 'Teams' Seite")
        st.stop()
    
    with st.form("add_member_form"):
        first_name = st.text_input("* Имя / Vorname")
        last_name = st.text_input("* Фамилия / Nachname")
        phone = st.text_input("Телефон / Telefon")
        
        # Team selection
        team_name = st.selectbox(
            "* Бригада / Team:",
            list(team_options.keys())
        )
        
        # Category selection
        category_options = {
            "Общие работы / Allgemein": WorkerCategory.general,
            "Водитель / Fahrer": WorkerCategory.driver,
            "Механик / Mechaniker": WorkerCategory.mechanic,
            "Специалист / Spezialist": WorkerCategory.specialist
        }
        
        category_display = st.selectbox(
            "Категория / Kategorie:",
            list(category_options.keys())
        )
        
        if st.form_submit_button("➕ Добавить участника / Teammitglied hinzufügen"):
            if first_name and last_name and team_name:
                with Session() as session:
                    new_member = TeamMember(
                        organization_id=user.organization_id,
                        team_id=team_options[team_name].id,
                        first_name=first_name,
                        last_name=last_name,
                        phone=phone,
                        category=category_options[category_display]
                    )
                    
                    session.add(new_member)
                    session.commit()
                    
                    st.success(f"✅ Участник '{first_name} {last_name}' добавлен")
                    st.success(f"✅ Teammitglied '{first_name} {last_name}' hinzugefügt")
                    st.rerun()
            else:
                st.error("❌ Заполните обязательные поля (*)")
                st.error("❌ Füllen Sie die Pflichtfelder aus (*)")

with tabs[2]:  # Documents
    st.subheader("📄 Документы участников / Dokumente der Teammitglieder")
    
    with Session() as session:
        # Get all team members for document management
        team_members = session.query(TeamMember).filter_by(organization_id=user.organization_id).all()
        
        if team_members:
            # Select member
            member_options = {f"{m.first_name} {m.last_name} ({m.team.name if m.team else 'Без бригады'})": m for m in team_members}
            selected_member_display = st.selectbox(
                "Выберите участника / Teammitglied auswählen:",
                list(member_options.keys())
            )
            
            if selected_member_display:
                selected_member = member_options[selected_member_display]
                
                # Show existing documents
                if selected_member.documents:
                    st.write(f"**📄 Документы {selected_member.first_name} {selected_member.last_name}:**")
                    
                    for doc in selected_member.documents:
                        with st.expander(f"📄 {doc.title}"):
                            col1, col2 = st.columns([3, 1])
                            
                            with col1:
                                st.write(f"**Дата загрузки:** {doc.upload_date.strftime('%d.%m.%Y %H:%M')}")
                                if doc.expiry_date:
                                    expiry_status = "🔴 Просрочен" if doc.expiry_date < date.today() else "🟢 Действителен"
                                    st.write(f"**Срок действия:** {doc.expiry_date.strftime('%d.%m.%Y')} {expiry_status}")
                                
                                # Display file
                                if doc.file_url:
                                    display_file(doc.file_url, doc.title)
                            
                            with col2:
                                if st.button(f"🗑️ Удалить", key=f"delete_doc_{doc.id}"):
                                    with Session() as session:
                                        doc_to_delete = session.get(TeamMemberDocument, doc.id)
                                        if doc_to_delete:
                                            session.delete(doc_to_delete)
                                            session.commit()
                                            st.success("✅ Документ удален")
                                            st.rerun()
                else:
                    st.info("📄 Документы не найдены")
                
                # Add new documents
                st.write("**➕ Добавить документы:**")
                
                with st.form(f"add_documents_{selected_member.id}"):
                    doc_title = st.text_input("Название документа / Dokumentname")
                    doc_files = st.file_uploader(
                        "Файлы документов / Dokumentdateien",
                        accept_multiple_files=True,
                        type=['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
                    )
                    expiry_date = st.date_input("Срок действия (опционально) / Ablaufdatum (optional)", value=None)
                    
                    if st.form_submit_button("📄 Добавить документы / Dokumente hinzufügen"):
                        if doc_title and doc_files:
                            # Upload files
                            uploaded_paths = upload_multiple_files(doc_files, 'team_member_documents')
                            
                            if uploaded_paths:
                                with Session() as session:
                                    for file_path in uploaded_paths:
                                        new_doc = TeamMemberDocument(
                                            team_member_id=selected_member.id,
                                            title=doc_title,
                                            file_url=file_path,
                                            expiry_date=expiry_date
                                        )
                                        session.add(new_doc)
                                    
                                    session.commit()
                                    st.success(f"✅ Добавлено {len(uploaded_paths)} документов")
                                    st.rerun()
                            else:
                                st.error("❌ Не удалось загрузить файлы")
                        else:
                            st.error("❌ Заполните название и выберите файлы")
        else:
            st.info("📝 Сначала добавьте участников бригады")