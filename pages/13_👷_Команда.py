import streamlit as st
from auth import require_auth, is_admin, is_manager
from models import TeamMember, TeamMemberDocument, Team, WorkerCategory
from database import SessionLocal
from datetime import date
import pandas as pd

# Требуем авторизацию
require_auth()

st.title("👷 Команда")

# Проверяем права доступа
user_role = st.session_state.get('user_role', '')
user_org_id = st.session_state.get('organization_id')

if not user_org_id:
    st.error("❌ Не найдена организация. Попробуйте войти заново.")
    st.stop()

if user_role not in ['admin', 'owner', 'manager']:
    st.error("❌ Нет доступа. Только админы и менеджеры могут управлять командой.")
    st.stop()

# Создаем вкладки
tab1, tab2 = st.tabs(["📋 Список команды", "➕ Добавить участника"])

with tab1:
    st.subheader("📋 Участники команды")
    
    try:
        with SessionLocal() as session:
            # Получаем участников команды для текущей организации
            members = session.query(TeamMember).filter_by(
                organization_id=user_org_id
            ).all()
            
            if members:
                # Показываем таблицу участников
                member_data = []
                for member in members:
                    team_name = ""
                    if member.team_id:
                        team = session.query(Team).filter_by(id=member.team_id).first()
                        team_name = team.name if team else "Не указана"
                    
                    member_data.append({
                        'ID': member.id,
                        'Имя': member.name,
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
                
    except Exception as e:
        st.error(f"❌ Ошибка загрузки данных: {str(e)}")

with tab2:
    st.subheader("➕ Добавить участника команды")
    
    try:
        with SessionLocal() as session:
            # Получаем список бригад
            teams = session.query(Team).filter_by(
                organization_id=user_org_id
            ).all()
            
            team_options = {"Не выбрана": None}
            for team in teams:
                team_options[team.name] = team.id
            
            with st.form("add_team_member"):
                col1, col2 = st.columns(2)
                
                with col1:
                    member_name = st.text_input("Имя участника*", placeholder="Введите имя")
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
                
                notes = st.text_area("Заметки", placeholder="Дополнительная информация")
                
                if st.form_submit_button("💾 Добавить участника"):
                    if not member_name:
                        st.error("❌ Необходимо указать имя участника")
                    else:
                        try:
                            # Создаем нового участника
                            new_member = TeamMember(
                                name=member_name,
                                phone=member_phone if member_phone else None,
                                category=WorkerCategory(selected_category) if selected_category != "Не указана" else None,
                                team_id=team_options[selected_team],
                                notes=notes if notes else None,
                                organization_id=user_org_id
                            )
                            
                            session.add(new_member)
                            session.commit()
                            
                            st.success(f"✅ Участник {member_name} успешно добавлен!")
                            st.rerun()
                            
                        except Exception as e:
                            session.rollback()
                            st.error(f"❌ Ошибка добавления участника: {str(e)}")
            
    except Exception as e:
        st.error(f"❌ Ошибка загрузки форм: {str(e)}")

# Информация о функциональности
st.markdown("---")
st.info("💡 **Функциональность:** Управление участниками команды без создания учетных записей в системе")