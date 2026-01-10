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
	MenuItem,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { ruRU } from '@mui/x-data-grid/locales'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { friendlyDeleteError } from '../shared/friendlyError'

type Employee = {
	id: string
	name: string
	role: string
}

type FormState = {
	id?: string
	name: string
	role: string
}

const ROLE_OPTIONS = [
	{ value: 'менеджер', label: 'Менеджер' },
	{ value: 'бухгалтер', label: 'Бухгалтер' },
	{ value: 'администратор', label: 'Администратор' },
]

const emptyForm: FormState = { name: '', role: 'менеджер' }

export function EmployeesPage() {
	const [rows, setRows] = useState<Employee[]>([])
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

	const columns: GridColDef<Employee>[] = [
		{ field: 'name', headerName: 'ФИО', flex: 1, minWidth: 260 },
		{ field: 'role', headerName: 'Роль', width: 180 },
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

	async function loadEmployees() {
		setLoading(true)
		setError(null)

		const { data, error } = await supabase
			.from('employees')
			.select('id, name, role')
			.order('name', { ascending: true })
			.limit(1000)

		if (error) {
			setError(error.message)
			setLoading(false)
			return
		}

		setRows((data as Employee[] | null) ?? [])
		setLoading(false)
	}

	function openCreate() {
		setForm(emptyForm)
		setError(null)
		setOpen(true)
	}

	function openEdit(emp: Employee) {
		setForm({ id: emp.id, name: emp.name ?? '', role: emp.role ?? 'менеджер' })
		setError(null)
		setOpen(true)
	}

	async function save() {
		const name = form.name.trim()
		const role = form.role.trim()

		if (!name) {
			setError('Введите ФИО сотрудника')
			return
		}
		if (!role) {
			setError('Выберите роль')
			return
		}

		setSaving(true)
		setError(null)

		const payload = { name, role }

		if (isEdit && form.id) {
			const { error } = await supabase
				.from('employees')
				.update(payload)
				.eq('id', form.id)
			if (error) setError(error.message)
		} else {
			const { error } = await supabase.from('employees').insert(payload)
			if (error) setError(error.message)
		}

		setSaving(false)

		if (!error) {
			setOpen(false)
			await loadEmployees()
		}
	}

	async function deleteEmployee(id: string) {
		setDeletingId(id)
		setError(null)

		const { error } = await supabase.from('employees').delete().eq('id', id)
		if (error) setError(friendlyDeleteError(error.message))

		setDeletingId(null)
		await loadEmployees()
	}

	useEffect(() => {
		loadEmployees()
	}, [])

	const filteredRows = useMemo(() => {
		const query = q.trim().toLowerCase()
		if (!query) return rows
		return rows.filter(
			r =>
				(r.name ?? '').toLowerCase().includes(query) ||
				(r.role ?? '').toLowerCase().includes(query)
		)
	}, [rows, q])

	return (
		<Stack spacing={2}>
			<Box>
				<Typography variant='h5' fontWeight={700}>
					Сотрудники
				</Typography>
				<Typography variant='body2' color='text.secondary'>
					Справочник сотрудников (менеджеры/бухгалтерия)
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
						label='Поиск (ФИО/роль)'
						size='small'
						value={q}
						onChange={e => setQ(e.target.value)}
						sx={{ minWidth: 260 }}
					/>

					<Box sx={{ flex: 1 }} />

					<Button
						startIcon={
							loading ? <CircularProgress size={16} /> : <RefreshIcon />
						}
						onClick={loadEmployees}
						disabled={loading}
					>
						Обновить
					</Button>

					<Button
						variant='contained'
						startIcon={<AddIcon />}
						onClick={openCreate}
					>
						Добавить
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
					{isEdit ? 'Редактирование сотрудника' : 'Добавление сотрудника'}
				</DialogTitle>

				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label='ФИО'
							size='small'
							value={form.name}
							onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
							autoFocus
						/>

						<TextField
							select
							label='Роль'
							size='small'
							value={form.role}
							onChange={e => setForm(s => ({ ...s, role: e.target.value }))}
						>
							{ROLE_OPTIONS.map(r => (
								<MenuItem key={r.value} value={r.value}>
									{r.label}
								</MenuItem>
							))}
						</TextField>
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
				title='Удалить сотрудника?'
				description={`Сотрудник: ${confirm.name ?? ''}. Удалить запись?`}
				loading={!!deletingId}
				onClose={() => setConfirm({ open: false, id: null })}
				onConfirm={() => {
					if (!confirm.id) return
					void deleteEmployee(confirm.id)
					setConfirm({ open: false, id: null })
				}}
			/>
		</Stack>
	)
}
