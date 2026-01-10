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

type Product = {
	id: string
	name: string
	category: string | null
	unit: string | null
	price: number
}

type FormState = {
	id?: string
	name: string
	category: string
	unit: string
	price: string // в форме удобнее строкой
}

const emptyForm: FormState = {
	name: '',
	category: '',
	unit: 'шт',
	price: '0',
}

export function ProductsPage() {
	const [rows, setRows] = useState<Product[]>([])
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

	const columns: GridColDef<Product>[] = [
		{ field: 'name', headerName: 'Наименование', flex: 1, minWidth: 260 },
		{
			field: 'category',
			headerName: 'Категория',
			width: 200,
			valueGetter: v => v ?? '—',
		},
		{
			field: 'unit',
			headerName: 'Ед. изм.',
			width: 110,
			valueGetter: v => v ?? '—',
		},
		{
			field: 'price',
			headerName: 'Цена',
			width: 140,
			type: 'number',
			valueFormatter: v => `${Number(v).toFixed(2)}`,
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

	async function loadProducts() {
		setLoading(true)
		setError(null)

		const { data, error } = await supabase
			.from('products')
			.select('id, name, category, unit, price')
			.order('name', { ascending: true })
			.limit(2000)

		if (error) {
			setError(error.message)
			setLoading(false)
			return
		}

		setRows(
			((data as Product[] | null) ?? []).map(x => ({
				id: x.id,
				name: x.name,
				category: x.category,
				unit: x.unit,
				price: Number(x.price) || 0,
			}))
		)

		setLoading(false)
	}

	function openCreate() {
		setForm(emptyForm)
		setError(null)
		setOpen(true)
	}

	function openEdit(product: Product) {
		setForm({
			id: product.id,
			name: product.name ?? '',
			category: product.category ?? '',
			unit: product.unit ?? 'шт',
			price: String(product.price ?? 0),
		})
		setError(null)
		setOpen(true)
	}

	async function save() {
		const name = form.name.trim()
		const category = form.category.trim()
		const unit = form.unit.trim()
		const price = Number(form.price)

		if (!name) {
			setError('Введите наименование товара/услуги')
			return
		}
		if (Number.isNaN(price) || price < 0) {
			setError('Цена должна быть числом и не может быть отрицательной')
			return
		}

		setSaving(true)
		setError(null)

		const payload = {
			name,
			category: category || null,
			unit: unit || null,
			price: Number(price.toFixed(2)),
		}

		if (isEdit && form.id) {
			const { error } = await supabase
				.from('products')
				.update(payload)
				.eq('id', form.id)
			if (error) setError(error.message)
		} else {
			const { error } = await supabase.from('products').insert(payload)
			if (error) setError(error.message)
		}

		setSaving(false)

		if (!error) {
			setOpen(false)
			await loadProducts()
		}
	}

	async function deleteProduct(id: string) {
		setDeletingId(id)
		setError(null)

		const { error } = await supabase.from('products').delete().eq('id', id)
		if (error) setError(friendlyDeleteError(error.message))

		setDeletingId(null)
		await loadProducts()
	}

	useEffect(() => {
		loadProducts()
	}, [])

	const filteredRows = useMemo(() => {
		const query = q.trim().toLowerCase()
		if (!query) return rows

		return rows.filter(r => {
			const name = (r.name ?? '').toLowerCase()
			const category = (r.category ?? '').toLowerCase()
			return name.includes(query) || category.includes(query)
		})
	}, [rows, q])

	return (
		<Stack spacing={2}>
			<Box>
				<Typography variant='h5' fontWeight={700}>
					Товары и услуги
				</Typography>
				<Typography variant='body2' color='text.secondary'>
					Номенклатура для формирования состава заказа
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
						label='Поиск (наименование/категория)'
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
						onClick={loadProducts}
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
				<DialogTitle>{isEdit ? 'Редактирование' : 'Добавление'}</DialogTitle>

				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label='Наименование'
							size='small'
							value={form.name}
							onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
							autoFocus
						/>

						<TextField
							label='Категория'
							size='small'
							value={form.category}
							onChange={e => setForm(s => ({ ...s, category: e.target.value }))}
						/>

						<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
							<TextField
								label='Ед. изм.'
								size='small'
								value={form.unit}
								onChange={e => setForm(s => ({ ...s, unit: e.target.value }))}
								sx={{ width: 160 }}
							/>

							<TextField
								label='Цена'
								size='small'
								type='number'
								value={form.price}
								onChange={e => setForm(s => ({ ...s, price: e.target.value }))}
								sx={{ width: 200 }}
							/>
						</Stack>
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
				title='Удалить товар/услугу?'
				description={`Позиция: ${confirm.name ?? ''}. Удалить запись?`}
				loading={!!deletingId}
				onClose={() => setConfirm({ open: false, id: null })}
				onConfirm={() => {
					if (!confirm.id) return
					void deleteProduct(confirm.id)
					setConfirm({ open: false, id: null })
				}}
			/>
		</Stack>
	)
}
