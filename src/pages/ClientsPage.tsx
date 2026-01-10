import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Paper,
	Stack,
	TextField,
	Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { ruRU } from '@mui/x-data-grid/locales'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { friendlyDeleteError } from '../shared/friendlyError'

type Client = {
	id: string
	name: string
	phone: string | null
	email: string | null
	address: string | null
}

type FormState = {
	id?: string
	name: string
	phone: string
	email: string
	address: string
}

const emptyForm: FormState = {
	name: '',
	phone: '',
	email: '',
	address: '',
}

export function ClientsPage() {
	const [rows, setRows] = useState<Client[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [confirm, setConfirm] = useState<{
		open: boolean
		id: string | null
		name?: string
	}>({
		open: false,
		id: null,
	})

	const [q, setQ] = useState('')

	const [open, setOpen] = useState(false)
	const [saving, setSaving] = useState(false)
	const [deletingId, setDeletingId] = useState<string | null>(null)

	const [form, setForm] = useState<FormState>(emptyForm)

	const isEdit = Boolean(form.id)

	const columns: GridColDef<Client>[] = [
		{ field: 'name', headerName: 'Клиент', flex: 1, minWidth: 240 },
		{
			field: 'phone',
			headerName: 'Телефон',
			width: 160,
			valueGetter: v => v ?? '—',
		},
		{
			field: 'email',
			headerName: 'Email',
			width: 220,
			valueGetter: v => v ?? '—',
		},
		{
			field: 'address',
			headerName: 'Адрес',
			flex: 1,
			minWidth: 220,
			valueGetter: v => v ?? '—',
		},
		{
			field: 'actions',
			headerName: '',
			width: 190,
			sortable: false,
			filterable: false,
			renderCell: params => (
				<Stack direction='row' spacing={1}>
					<Button
						size='small'
						startIcon={<EditIcon />}
						onClick={() => openEdit(params.row)}
					>
						Изм.
					</Button>

					<Button
						size='small'
						color='error'
						startIcon={<DeleteIcon />}
						onClick={() =>
							setConfirm({
								open: true,
								id: params.row.id,
								name: params.row.name,
							})
						}
						disabled={deletingId === params.row.id}
					>
						{deletingId === params.row.id ? '...' : 'Удал.'}
					</Button>
				</Stack>
			),
		},
	]

	async function loadClients() {
		setLoading(true)
		setError(null)

		const { data, error } = await supabase
			.from('clients')
			.select('id, name, phone, email, address')
			.order('name', { ascending: true })
			.limit(1000)

		if (error) {
			setError(error.message)
			setLoading(false)
			return
		}

		setRows((data as Client[] | null) ?? [])
		setLoading(false)
	}

	function openCreate() {
		setForm(emptyForm)
		setError(null)
		setOpen(true)
	}

	function openEdit(client: Client) {
		setForm({
			id: client.id,
			name: client.name ?? '',
			phone: client.phone ?? '',
			email: client.email ?? '',
			address: client.address ?? '',
		})
		setError(null)
		setOpen(true)
	}

	async function save() {
		const name = form.name.trim()
		const phone = form.phone.trim()
		const email = form.email.trim()
		const address = form.address.trim()

		if (!name) {
			setError('Введите имя/название клиента')
			return
		}

		setSaving(true)
		setError(null)

		const payload = {
			name,
			phone: phone || null,
			email: email || null,
			address: address || null,
		}

		if (isEdit && form.id) {
			const { error } = await supabase
				.from('clients')
				.update(payload)
				.eq('id', form.id)
			if (error) setError(error.message)
		} else {
			const { error } = await supabase.from('clients').insert(payload)
			if (error) setError(error.message)
		}

		setSaving(false)

		if (!error) {
			setOpen(false)
			await loadClients()
		}
	}

	async function deleteClient(id: string) {
		setDeletingId(id)
		setError(null)

		const { error } = await supabase.from('clients').delete().eq('id', id)
		if (error) setError(friendlyDeleteError(error.message))

		setDeletingId(null)
		await loadClients()
	}

	useEffect(() => {
		loadClients()
	}, [])

	const filteredRows = useMemo(() => {
		const query = q.trim().toLowerCase()
		if (!query) return rows

		return rows.filter(r => {
			const name = (r.name ?? '').toLowerCase()
			const phone = (r.phone ?? '').toLowerCase()
			const email = (r.email ?? '').toLowerCase()
			return (
				name.includes(query) || phone.includes(query) || email.includes(query)
			)
		})
	}, [rows, q])

	return (
		<Stack spacing={2}>
			<Box>
				<Typography variant='h5' fontWeight={700}>
					Клиенты
				</Typography>
				<Typography variant='body2' color='text.secondary'>
					Справочник клиентов для оформления заказов
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
						label='Поиск (ФИО/телефон/email)'
						size='small'
						value={q}
						onChange={e => setQ(e.target.value)}
						sx={{ minWidth: 280 }}
					/>

					<Box sx={{ flex: 1 }} />

					<Button
						startIcon={
							loading ? <CircularProgress size={16} /> : <RefreshIcon />
						}
						onClick={loadClients}
						disabled={loading}
					>
						Обновить
					</Button>

					<Button
						variant='contained'
						startIcon={<AddIcon />}
						onClick={openCreate}
					>
						Добавить клиента
					</Button>
				</Stack>
			</Paper>

			<Paper sx={{ height: 560 }}>
				<DataGrid
					rows={filteredRows}
					columns={columns}
					loading={loading}
					disableRowSelectionOnClick
					pageSizeOptions={[10, 20, 50]}
					localeText={ruRU.components.MuiDataGrid.defaultProps.localeText}
					initialState={{
						pagination: { paginationModel: { pageSize: 20, page: 0 } },
					}}
				/>
			</Paper>

			<Dialog
				open={open}
				onClose={saving ? undefined : () => setOpen(false)}
				maxWidth='sm'
				fullWidth
			>
				<DialogTitle>
					{isEdit ? 'Редактирование клиента' : 'Добавление клиента'}
				</DialogTitle>

				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label='ФИО / Название организации'
							size='small'
							value={form.name}
							onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
							autoFocus
						/>

						<TextField
							label='Телефон'
							size='small'
							value={form.phone}
							onChange={e => setForm(s => ({ ...s, phone: e.target.value }))}
						/>

						<TextField
							label='Email'
							size='small'
							value={form.email}
							onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
						/>

						<TextField
							label='Адрес'
							size='small'
							value={form.address}
							onChange={e => setForm(s => ({ ...s, address: e.target.value }))}
							multiline
							minRows={2}
						/>
					</Stack>
				</DialogContent>

				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={() => setOpen(false)} disabled={saving}>
						Отмена
					</Button>

					<Button
						variant='contained'
						onClick={save}
						disabled={saving}
						startIcon={saving ? <CircularProgress size={16} /> : undefined}
					>
						Сохранить
					</Button>
				</DialogActions>
			</Dialog>

			<ConfirmDialog
				open={confirm.open}
				title='Удалить клиента?'
				description={`Клиент: ${confirm.name ?? ''}. Удалить запись?`}
				loading={!!deletingId}
				onClose={() => setConfirm({ open: false, id: null })}
				onConfirm={() => {
					if (!confirm.id) return
					void deleteClient(confirm.id)
					setConfirm({ open: false, id: null })
				}}
			/>
		</Stack>
	)
}
