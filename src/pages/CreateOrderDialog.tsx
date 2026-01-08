import { useEffect, useMemo, useState } from 'react'
import {
	Alert,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	MenuItem,
	Stack,
	TextField,
	Autocomplete,
} from '@mui/material'
import { supabase } from '../lib/supabase'

type Option = { id: string; name: string }

const STATUS_OPTIONS = [
	{ value: 'new', label: 'Новый' },
	{ value: 'in_work', label: 'В работе' },
	{ value: 'done', label: 'Выполнен' },
	{ value: 'closed', label: 'Закрыт' },
]

export function CreateOrderDialog(props: {
	open: boolean
	onClose: () => void
	onCreated: (orderId: string) => void
}) {
	const { open, onClose, onCreated } = props

	const [clients, setClients] = useState<Option[]>([])
	const [employees, setEmployees] = useState<Option[]>([])

	const [client, setClient] = useState<Option | null>(null)
	const [employee, setEmployee] = useState<Option | null>(null)

	const [orderDate, setOrderDate] = useState(() =>
		new Date().toISOString().slice(0, 10)
	)
	const [status, setStatus] = useState('new')

	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const canCreate = useMemo(
		() => !!client && !!employee && !!orderDate,
		[client, employee, orderDate]
	)

	async function loadRefs() {
		setError(null)

		const { data: c, error: cErr } = await supabase
			.from('clients')
			.select('id, name')
			.order('name', { ascending: true })
			.limit(500)

		if (cErr) {
			setError(cErr.message)
			return
		}

		const { data: e, error: eErr } = await supabase
			.from('employees')
			.select('id, name')
			.eq('role', 'менеджер')
			.order('name', { ascending: true })
			.limit(200)

		if (eErr) {
			setError(eErr.message)
			return
		}

		setClients(
			(c as any[] | null)?.map(x => ({ id: x.id, name: x.name })) ?? []
		)
		setEmployees(
			(e as any[] | null)?.map(x => ({ id: x.id, name: x.name })) ?? []
		)
	}

	async function create() {
		if (!canCreate || !client || !employee) return

		setLoading(true)
		setError(null)

		const { data, error } = await supabase
			.from('orders')
			.insert({
				client_id: client.id,
				employee_id: employee.id,
				order_date: orderDate,
				status,
				total_amount: 0,
			})
			.select('id')
			.single()

		if (error) {
			setError(error.message)
			setLoading(false)
			return
		}

		const id = (data as any)?.id as string | undefined
		if (!id) {
			setError('Не удалось получить id созданного заказа')
			setLoading(false)
			return
		}

		setLoading(false)
		onClose()
		onCreated(id)
	}

	// при открытии подгружаем справочники и сбрасываем форму
	useEffect(() => {
		if (!open) return

		setClient(null)
		setEmployee(null)
		setOrderDate(new Date().toISOString().slice(0, 10))
		setStatus('new')
		setError(null)

		void loadRefs()
	}, [open])

	return (
		<Dialog
			open={open}
			onClose={loading ? undefined : onClose}
			maxWidth='sm'
			fullWidth
		>
			<DialogTitle>Создание заказа</DialogTitle>

			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					{error && <Alert severity='error'>{error}</Alert>}

					<Autocomplete
						options={clients}
						value={client}
						onChange={(_, v) => setClient(v)}
						getOptionLabel={o => o.name}
						renderInput={params => (
							<TextField {...params} label='Клиент' size='small' />
						)}
					/>

					<Autocomplete
						options={employees}
						value={employee}
						onChange={(_, v) => setEmployee(v)}
						getOptionLabel={o => o.name}
						renderInput={params => (
							<TextField {...params} label='Менеджер' size='small' />
						)}
					/>

					<TextField
						label='Дата'
						size='small'
						type='date'
						value={orderDate}
						onChange={e => setOrderDate(e.target.value)}
						InputLabelProps={{ shrink: true }}
					/>

					<TextField
						select
						label='Статус'
						size='small'
						value={status}
						onChange={e => setStatus(e.target.value)}
					>
						{STATUS_OPTIONS.map(s => (
							<MenuItem key={s.value} value={s.value}>
								{s.label}
							</MenuItem>
						))}
					</TextField>
				</Stack>
			</DialogContent>

			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={onClose} disabled={loading}>
					Отмена
				</Button>

				<Button
					variant='contained'
					onClick={create}
					disabled={!canCreate || loading}
					startIcon={loading ? <CircularProgress size={16} /> : undefined}
				>
					Создать
				</Button>
			</DialogActions>
		</Dialog>
	)
}
