import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
	Box,
	Button,
	Paper,
	Stack,
	Typography,
	Alert,
	CircularProgress,
	TextField,
	MenuItem,
	Chip,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import AddIcon from '@mui/icons-material/Add'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom' // ✅
import { CreateOrderDialog } from './CreateOrderDialog'
import { STATUS_OPTIONS } from '../shared/consts'

type DbOrderRow = {
	id: string
	order_date: string
	status: string
	total_amount: number
	clients: { name: string } | null
	employees: { name: string } | null
}

type OrderRow = {
	id: string
	order_date: string
	status: string
	total_amount: number
	client_name: string
	employee_name: string
}

export function OrdersPage() {
	const navigate = useNavigate() // ✅

	const [rows, setRows] = useState<OrderRow[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [createOpen, setCreateOpen] = useState(false)

	const [status, setStatus] = useState('all')
	const [q, setQ] = useState('')

	const columns: GridColDef<OrderRow>[] = [
		{ field: 'order_date', headerName: 'Дата', width: 130 },
		{ field: 'client_name', headerName: 'Клиент', flex: 1, minWidth: 220 },
		{ field: 'employee_name', headerName: 'Менеджер', width: 180 },
		{
			field: 'status',
			headerName: 'Статус',
			width: 140,
			renderCell: params => (
				<Chip
					label={
						STATUS_OPTIONS.find(s => s.value === params.value)?.label ?? '—'
					}
					color={
						STATUS_OPTIONS.find(s => s.value === params.value)?.color ??
						'default'
					}
				/>
			),
		},
		{
			field: 'total_amount',
			headerName: 'Сумма',
			width: 140,
			type: 'number',
			valueFormatter: v => `${Number(v).toFixed(2)}`,
		},
	]

	async function loadOrders() {
		setLoading(true)
		setError(null)

		const { data, error } = await supabase
			.from('orders')
			.select(
				'id, order_date, status, total_amount, clients(name), employees(name)'
			)
			.order('order_date', { ascending: false })
			.limit(200)

		if (error) {
			setError(error.message)
			setLoading(false)
			return
		}

		const mapped =
			(data as DbOrderRow[] | null)?.map(o => ({
				id: o.id,
				order_date: o.order_date,
				status: o.status,
				total_amount: o.total_amount ?? 0,
				client_name: o.clients?.name ?? '—',
				employee_name: o.employees?.name ?? '—',
			})) ?? []

		setRows(mapped)
		setLoading(false)
	}

	async function quickCreateTestOrder() {
		setLoading(true)
		setError(null)

		const { data: clients, error: cErr } = await supabase
			.from('clients')
			.select('id')
			.limit(1)
		if (cErr || !clients?.[0]) {
			setError(cErr?.message ?? 'Нет клиентов в таблице clients')
			setLoading(false)
			return
		}

		const { data: employees, error: eErr } = await supabase
			.from('employees')
			.select('id')
			.limit(1)
		if (eErr || !employees?.[0]) {
			setError(eErr?.message ?? 'Нет сотрудников в таблице employees')
			setLoading(false)
			return
		}

		const { data: created, error: insErr } = await supabase
			.from('orders')
			.insert({
				client_id: clients[0].id,
				employee_id: employees[0].id,
				status: 'new',
				total_amount: 0,
			})
			.select('id')
			.single()

		if (insErr) {
			setError(insErr.message)
			setLoading(false)
			return
		}

		await loadOrders()
		setLoading(false)

		if (created?.id) navigate(`/orders/${created.id}`) // ✅ сразу открыть
	}

	useEffect(() => {
		loadOrders()
	}, [])

	const filteredRows = useMemo(() => {
		const query = q.trim().toLowerCase()

		return rows.filter(r => {
			const okStatus = status === 'all' ? true : r.status === status
			const okQ =
				!query ||
				r.client_name.toLowerCase().includes(query) ||
				r.employee_name.toLowerCase().includes(query) ||
				r.id.toLowerCase().includes(query)

			return okStatus && okQ
		})
	}, [rows, status, q])

	return (
		<Stack spacing={2}>
			<Box>
				<Typography variant='h5' fontWeight={700}>
					Журнал заказов
				</Typography>
				<Typography variant='body2' color='text.secondary'>
					Клик по заказу открывает карточку
				</Typography>
			</Box>

			{error && <Alert severity='error'>{error}</Alert>}

			<Paper sx={{ p: 2 }}>
				<Stack
					direction={{ xs: 'column', sm: 'row' }}
					spacing={2}
					alignItems='center'
				>
					<TextField
						label='Поиск'
						size='small'
						value={q}
						onChange={e => setQ(e.target.value)}
						sx={{ minWidth: 260 }}
					/>

					<TextField
						select
						label='Статус'
						size='small'
						value={status}
						onChange={e => setStatus(e.target.value)}
						sx={{ minWidth: 180 }}
					>
						{STATUS_OPTIONS.map(s => (
							<MenuItem key={s.value} value={s.value}>
								{s.label}
							</MenuItem>
						))}
					</TextField>

					<Box sx={{ flex: 1 }} />

					<Button
						startIcon={
							loading ? <CircularProgress size={16} /> : <RefreshIcon />
						}
						onClick={loadOrders}
						disabled={loading}
					>
						Обновить
					</Button>

					<Button
						variant='contained'
						startIcon={<AddIcon />}
						onClick={() => setCreateOpen(true)}
						disabled={loading}
					>
						Создать заказ
					</Button>
				</Stack>
			</Paper>

			<Paper sx={{ height: 520 }}>
				<DataGrid
					rows={filteredRows}
					columns={columns}
					loading={loading}
					disableRowSelectionOnClick
					pageSizeOptions={[10, 20, 50]}
					initialState={{
						pagination: { paginationModel: { pageSize: 20, page: 0 } },
					}}
					onRowClick={params => navigate(`/orders/${params.row.id}`)} // ✅
					sx={{ cursor: 'pointer' }}
				/>
			</Paper>

			<CreateOrderDialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				onCreated={async orderId => {
					await loadOrders()
					navigate(`/orders/${orderId}`)
				}}
			/>
		</Stack>
	)
}
