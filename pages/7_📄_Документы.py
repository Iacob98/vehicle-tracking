import streamlit as st

# Page config
st.set_page_config(
    page_title="Документы",
    page_icon="📄",
    layout="wide"
)

# Language from session state
language = st.session_state.get('language', 'ru')

# Show redirect message
st.title("📄 Документы / Documents")

st.info("""
**🚗 Документы теперь интегрированы со страницей автомобилей!**

Все функции документов были перемещены на страницу **"🚗 Автомобили"** для лучшего удобства использования.

**На странице автомобилей вы найдете:**
- **📄 Все документы** - полный список всех документов с поиском и фильтрацией
- **⚠️ Истекающие документы** - документы требующие внимания  
- **🚗 Документы автомобиля** - при нажатии кнопки "📄 Документы" рядом с автомобилем
- **➕ Добавление документов** - прямо из интерфейса автомобиля

---

**🚗 Dokumente sind jetzt mit der Fahrzeugseite integriert!**

Alle Dokumentenfunktionen wurden zur besseren Benutzerfreundlichkeit auf die Seite **"🚗 Автомобили"** verschoben.

**Auf der Fahrzeugseite finden Sie:**
- **📄 Alle Dokumente** - vollständige Liste aller Dokumente mit Such- und Filterfunktion
- **⚠️ Ablaufende Dokumente** - Dokumente, die Aufmerksamkeit erfordern
- **🚗 Fahrzeugdokumente** - durch Klicken auf die Schaltfläche "📄 Документы" neben dem Fahrzeug
- **➕ Dokumente hinzufügen** - direkt über die Fahrzeugoberfläche
""")

st.divider()

# Navigation button
col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    if st.button("🚗 Перейти к автомобилям / Zu Fahrzeugen gehen", type="primary", use_container_width=True):
        st.switch_page("pages/1_🚗_Автомобили.py")

st.divider()

st.markdown("""
<div style="text-align: center; color: #666; margin-top: 2rem;">
    <small>💡 Эта страница будет автоматически перенаправлять на страницу автомобилей в будущих версиях.</small><br>
    <small>💡 Diese Seite wird in zukünftigen Versionen automatisch zur Fahrzeugseite umleiten.</small>
</div>
""", unsafe_allow_html=True)