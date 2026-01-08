export function friendlyDeleteError(message: string) {
	const m = (message || '').toLowerCase()

	// Supabase/Postgres обычно возвращает что-то вроде:
	// "update or delete on table ... violates foreign key constraint ..."
	if (
		m.includes('violates foreign key constraint') ||
		m.includes('foreign key')
	) {
		return 'Нельзя удалить: есть связанные записи (например, заказы/позиции). Сначала удалите или измените связанные данные.'
	}

	// на всякий случай
	if (m.includes('permission'))
		return 'Недостаточно прав для выполнения операции.'

	return message
}
