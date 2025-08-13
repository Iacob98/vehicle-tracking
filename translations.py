"""
Multi-language support for the fleet management system
"""

LANGUAGES = {
    'ru': 'Русский',
    'de': 'Deutsch'
}

TRANSLATIONS = {
    # Navigation
    'dashboard': {
        'ru': 'Панель управления',
        'de': 'Dashboard'
    },
    'vehicles': {
        'ru': 'Автомобили',
        'de': 'Fahrzeuge'
    },
    'teams': {
        'ru': 'Бригады',
        'de': 'Teams'
    },
    'users': {
        'ru': 'Пользователи',
        'de': 'Benutzer'
    },
    'penalties': {
        'ru': 'Штрафы',
        'de': 'Strafen'
    },
    'maintenance': {
        'ru': 'Техобслуживание',
        'de': 'Wartung'
    },
    'materials': {
        'ru': 'Материалы',
        'de': 'Materialien'
    },
    'expenses': {
        'ru': 'Расходы',
        'de': 'Ausgaben'
    },
    
    # Common actions
    'add': {
        'ru': 'Добавить',
        'de': 'Hinzufügen'
    },
    'edit': {
        'ru': 'Редактировать',
        'de': 'Bearbeiten'
    },
    'delete': {
        'ru': 'Удалить',
        'de': 'Löschen'
    },
    'save': {
        'ru': 'Сохранить',
        'de': 'Speichern'
    },
    'cancel': {
        'ru': 'Отмена',
        'de': 'Abbrechen'
    },
    'search': {
        'ru': 'Поиск',
        'de': 'Suchen'
    },
    'filter': {
        'ru': 'Фильтр',
        'de': 'Filter'
    },
    'export': {
        'ru': 'Экспорт',
        'de': 'Export'
    },
    
    # Form fields
    'name': {
        'ru': 'Название',
        'de': 'Name'
    },
    'phone': {
        'ru': 'Телефон',
        'de': 'Telefon'
    },
    'email': {
        'ru': 'Email',
        'de': 'E-Mail'
    },
    'role': {
        'ru': 'Роль',
        'de': 'Rolle'
    },
    'status': {
        'ru': 'Статус',
        'de': 'Status'
    },
    'date': {
        'ru': 'Дата',
        'de': 'Datum'
    },
    'amount': {
        'ru': 'Сумма',
        'de': 'Betrag'
    },
    'description': {
        'ru': 'Описание',
        'de': 'Beschreibung'
    },
    'quantity': {
        'ru': 'Количество',
        'de': 'Menge'
    },
    
    # Vehicle fields
    'license_plate': {
        'ru': 'Номерной знак',
        'de': 'Kennzeichen'
    },
    'vin': {
        'ru': 'VIN номер',
        'de': 'VIN-Nummer'
    },
    'vehicle_name': {
        'ru': 'Название автомобиля',
        'de': 'Fahrzeugname'
    },
    
    # Status values
    'active': {
        'ru': 'Активный',
        'de': 'Aktiv'
    },
    'repair': {
        'ru': 'В ремонте',
        'de': 'In Reparatur'
    },
    'unavailable': {
        'ru': 'Недоступен',
        'de': 'Nicht verfügbar'
    },
    'open': {
        'ru': 'Открыт',
        'de': 'Offen'
    },
    'paid': {
        'ru': 'Оплачен',
        'de': 'Bezahlt'
    },
    'returned': {
        'ru': 'Возвращен',
        'de': 'Zurückgegeben'
    },
    'broken': {
        'ru': 'Сломан',
        'de': 'Kaputt'
    },
    
    # Role values
    'admin': {
        'ru': 'Администратор',
        'de': 'Administrator'
    },
    'manager': {
        'ru': 'Менеджер',
        'de': 'Manager'
    },
    'team_lead': {
        'ru': 'Бригадир',
        'de': 'Teamleiter'
    },
    
    # Type values
    'inspection': {
        'ru': 'Техосмотр',
        'de': 'Inspektion'
    },
    'material': {
        'ru': 'Материал',
        'de': 'Material'
    },
    'equipment': {
        'ru': 'Оборудование',
        'de': 'Ausrüstung'
    },
    'vehicle': {
        'ru': 'Автомобиль',
        'de': 'Fahrzeug'
    },
    'team': {
        'ru': 'Бригада',
        'de': 'Team'
    },
    
    # Messages
    'success_save': {
        'ru': 'Данные успешно сохранены',
        'de': 'Daten erfolgreich gespeichert'
    },
    'success_delete': {
        'ru': 'Запись успешно удалена',
        'de': 'Eintrag erfolgreich gelöscht'
    },
    'error_save': {
        'ru': 'Ошибка при сохранении данных',
        'de': 'Fehler beim Speichern der Daten'
    },
    'error_delete': {
        'ru': 'Ошибка при удалении записи',
        'de': 'Fehler beim Löschen des Eintrags'
    },
    'confirm_delete': {
        'ru': 'Вы уверены, что хотите удалить эту запись?',
        'de': 'Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?'
    },
    'no_data': {
        'ru': 'Нет данных для отображения',
        'de': 'Keine Daten zur Anzeige'
    },
    
    # Dashboard
    'total_vehicles': {
        'ru': 'Всего автомобилей',
        'de': 'Fahrzeuge insgesamt'
    },
    'total_teams': {
        'ru': 'Всего бригад',
        'de': 'Teams insgesamt'
    },
    'total_users': {
        'ru': 'Всего пользователей',
        'de': 'Benutzer insgesamt'
    },
    'open_penalties': {
        'ru': 'Открытые штрафы',
        'de': 'Offene Strafen'
    },
    'recent_maintenances': {
        'ru': 'Недавние ТО',
        'de': 'Letzte Wartungen'
    },
    'monthly_expenses': {
        'ru': 'Расходы за месяц',
        'de': 'Monatliche Ausgaben'
    }
}

def get_text(key: str, language: str = 'ru') -> str:
    """Get translated text for a given key and language"""
    return TRANSLATIONS.get(key, {}).get(language, key)
