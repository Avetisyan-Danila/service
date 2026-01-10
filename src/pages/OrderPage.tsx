import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Divider,
	MenuItem,
	Paper,
	Stack,
	Tab,
	Tabs,
	TextField,
	Typography,
	Autocomplete,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { friendlyDeleteError } from '../shared/friendlyError'
import PrintIcon from '@mui/icons-material/Print'
import { PAYMENT_METHOD_OPTIONS, STATUS_OPTIONS } from '../shared/consts'
import RefreshIcon from '@mui/icons-material/Refresh'

type OrderInfo = {
	id: string
	order_date: string
	status: string
	total_amount: number
	clients: { id: string; name: string } | null
	employees: { id: string; name: string } | null
}

type ItemRow = {
	id: string
	product_id: string
	product_name: string
	quantity: number
	price: number
	line_total: number
}

type PaymentRow = {
	id: string
	payment_date: string
	amount: number
	payment_method: string | null
}

type ProductOption = {
	id: string
	name: string
	price: number
}

export function OrderPage() {
	const { id } = useParams()
	const navigate = useNavigate()

	const [tab, setTab] = useState(0)

	const [order, setOrder] = useState<OrderInfo | null>(null)
	const [items, setItems] = useState<ItemRow[]>([])
	const [payments, setPayments] = useState<PaymentRow[]>([])

	const [products, setProducts] = useState<ProductOption[]>([])

	const [loading, setLoading] = useState(true)
	const [savingStatus, setSavingStatus] = useState(false)
	const [savingItems, setSavingItems] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [confirmItem, setConfirmItem] = useState<{
		open: boolean
		productId: string | null
		name?: string
	}>({
		open: false,
		productId: null,
	})

	const [status, setStatus] = useState('new')

	// форма добавления позиции
	const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(
		null
	)
	const [itemQty, setItemQty] = useState<number>(1)
	const [itemPrice, setItemPrice] = useState<number>(0)
	const [addingItem, setAddingItem] = useState(false)

	// платежи
	const [payAmount, setPayAmount] = useState<number>(0)
	const [payMethod, setPayMethod] = useState('cash')
	const [addingPay, setAddingPay] = useState(false)

	const paidSum = useMemo(
		() => payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0),
		[payments]
	)
	const debt = useMemo(
		() => Math.max(0, (Number(order?.total_amount) || 0) - paidSum),
		[order, paidSum]
	)

	const itemsTotal = useMemo(
		() => items.reduce((acc, it) => acc + (Number(it.line_total) || 0), 0),
		[items]
	)

	const itemsColumns: GridColDef<ItemRow>[] = [
		{ field: 'product_name', headerName: 'Позиция', flex: 1, minWidth: 240 },
		{ field: 'quantity', headerName: 'Кол-во', width: 110, type: 'number' },
		{
			field: 'price',
			headerName: 'Цена',
			width: 140,
			type: 'number',
			valueFormatter: v => `${Number(v).toFixed(2)}`,
		},
		{
			field: 'line_total',
			headerName: 'Сумма',
			width: 140,
			type: 'number',
			valueFormatter: v => `${Number(v).toFixed(2)}`,
		},
		{
			field: 'actions',
			headerName: '',
			width: 120,
			sortable: false,
			filterable: false,
			renderCell: params => (
				<Button
					size='small'
					color='error'
					startIcon={<DeleteIcon />}
					onClick={() =>
						setConfirmItem({
							open: true,
							productId: params.row.product_id,
							name: params.row.product_name,
						})
					}
				>
					Удалить
				</Button>
			),
		},
	]

	const payColumns: GridColDef<PaymentRow>[] = [
		{ field: 'payment_date', headerName: 'Дата', width: 130 },
		{
			field: 'amount',
			headerName: 'Сумма',
			width: 140,
			type: 'number',
			valueFormatter: v => `${Number(v).toFixed(2)}`,
		},
		{ field: 'payment_method', headerName: 'Способ', flex: 1, minWidth: 180 },
	]

	async function loadProducts() {
		const { data, error } = await supabase
			.from('products')
			.select('id, name, price')
			.order('name', { ascending: true })
			.limit(500)

		if (error) {
			setError(error.message)
			return
		}

		setProducts(
			(data as any[] | null)?.map(p => ({
				id: p.id,
				name: p.name,
				price: Number(p.price) || 0,
			})) ?? []
		)
	}

	async function loadAll() {
		if (!id) return
		setLoading(true)
		setError(null)

		const { data: o, error: oErr } = await supabase
			.from('orders')
			.select(
				'id, order_date, status, total_amount, clients(id, name), employees(id, name)'
			)
			.eq('id', id)
			.single()

		if (oErr) {
			setError(oErr.message)
			setLoading(false)
			return
		}

		const orderData: OrderInfo = {
			id: o.id,
			order_date: o.order_date,
			status: o.status,
			total_amount: o.total_amount,
			clients:
				Array.isArray(o.clients) && o.clients.length > 0
					? o.clients[0]
					: o.clients &&
					  typeof o.clients === 'object' &&
					  !Array.isArray(o.clients)
					? o.clients
					: null,
			employees:
				Array.isArray(o.employees) && o.employees.length > 0
					? o.employees[0]
					: o.employees &&
					  typeof o.employees === 'object' &&
					  !Array.isArray(o.employees)
					? o.employees
					: null,
		}
		setOrder(orderData)
		setStatus(orderData.status)

		const { data: it, error: itErr } = await supabase
			.from('order_items')
			.select('order_id, product_id, quantity, price, products(name)')
			.eq('order_id', id)

		if (itErr) {
			setError(itErr.message)
			setLoading(false)
			return
		}

		const mappedItems =
			(it as any[] | null)?.map(x => ({
				id: `${x.order_id}_${x.product_id}`,
				product_id: x.product_id,
				product_name:
					Array.isArray(x.products) && x.products.length > 0
						? x.products[0]?.name ?? '—'
						: x.products?.name ?? '—',
				quantity: x.quantity,
				price: Number(x.price) || 0,
				line_total: (Number(x.price) || 0) * (Number(x.quantity) || 0),
			})) ?? []
		setItems(mappedItems)

		const { data: pay, error: pErr } = await supabase
			.from('payments')
			.select('id, payment_date, amount, payment_method')
			.eq('order_id', id)
			.order('payment_date', { ascending: false })

		if (pErr) {
			setError(pErr.message)
			setLoading(false)
			return
		}

		setPayments((pay as PaymentRow[] | null) ?? [])

		setLoading(false)
	}

	async function updateOrderTotal(newTotal: number) {
		if (!id) return

		const { error } = await supabase
			.from('orders')
			.update({ total_amount: Number(newTotal.toFixed(2)) })
			.eq('id', id)

		if (error) throw new Error(error.message)
	}

	async function saveStatus() {
		if (!id) return
		setSavingStatus(true)
		setError(null)

		const { error } = await supabase
			.from('orders')
			.update({ status })
			.eq('id', id)
		if (error) setError(error.message)

		await loadAll()
		setSavingStatus(false)
	}

	async function addItem() {
		if (!id) return
		if (!selectedProduct) {
			setError('Выберите товар/услугу')
			return
		}
		setError(null)

		const qty = Number(itemQty)
		const price = Number(itemPrice)

		if (!qty || qty <= 0) {
			setError('Количество должно быть больше 0')
			return
		}
		if (price < 0) {
			setError('Цена не может быть отрицательной')
			return
		}

		setAddingItem(true)
		setError(null)

		// вставляем (или, если позиция уже есть — обновляем qty/price)
		const { error: upsertErr } = await supabase.from('order_items').upsert(
			{
				order_id: id,
				product_id: selectedProduct.id,
				quantity: qty,
				price,
			},
			{ onConflict: 'order_id,product_id' }
		)

		if (upsertErr) {
			setError(upsertErr.message)
			setAddingItem(false)
			return
		}

		// локально обновим items, чтобы посчитать сумму, затем обновим orders.total_amount
		const nextItems = (() => {
			const existing = items.find(x => x.product_id === selectedProduct.id)
			if (!existing) {
				return [
					...items,
					{
						id: `${id}_${selectedProduct.id}`,
						product_id: selectedProduct.id,
						product_name: selectedProduct.name,
						quantity: qty,
						price,
						line_total: qty * price,
					},
				]
			}
			return items.map(x =>
				x.product_id === selectedProduct.id
					? { ...x, quantity: qty, price, line_total: qty * price }
					: x
			)
		})()

		setItems(nextItems)

		try {
			const total = nextItems.reduce(
				(acc, it) => acc + (Number(it.line_total) || 0),
				0
			)
			await updateOrderTotal(total)
		} catch (e: any) {
			setError(e?.message ?? 'Не удалось обновить сумму заказа')
		}

		// сброс формы
		setSelectedProduct(null)
		setItemQty(1)
		setItemPrice(0)

		await loadAll()
		setAddingItem(false)
	}

	async function deleteItem(productId: string) {
		if (!id) return
		setSavingItems(true)
		setError(null)

		const { error: delErr } = await supabase
			.from('order_items')
			.delete()
			.eq('order_id', id)
			.eq('product_id', productId)

		if (delErr) {
			setError(friendlyDeleteError(delErr.message))
			setSavingItems(false)
			return
		}

		const nextItems = items.filter(x => x.product_id !== productId)
		setItems(nextItems)

		try {
			const total = nextItems.reduce(
				(acc, it) => acc + (Number(it.line_total) || 0),
				0
			)
			await updateOrderTotal(total)
		} catch (e: any) {
			setError(e?.message ?? 'Не удалось обновить сумму заказа')
		}

		await loadAll()
		setSavingItems(false)
	}

	async function addPayment() {
		if (!id) return
		setAddingPay(true)
		setError(null)

		const amount = Number(payAmount)
		if (!amount || amount <= 0) {
			setError('Введите сумму платежа больше 0')
			setAddingPay(false)
			return
		}

		const { error } = await supabase.from('payments').insert({
			order_id: id,
			amount,
			payment_method: payMethod,
		})

		if (error) setError(error.message)

		setPayAmount(0)
		await loadAll()
		setAddingPay(false)
	}

	useEffect(() => {
		loadProducts()
	}, [])

	useEffect(() => {
		loadAll()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id])

	// автоподстановка цены при выборе продукта
	useEffect(() => {
		if (selectedProduct) setItemPrice(selectedProduct.price)
	}, [selectedProduct])

	if (!id) return <Alert severity='error'>Не указан id заказа</Alert>

	if (loading) {
		return (
			<Stack direction='row' spacing={2} alignItems='center'>
				<CircularProgress size={20} />
				<Typography>Загрузка заказа...</Typography>
			</Stack>
		)
	}

	if (!order) return <Alert severity='error'>Заказ не найден</Alert>

	return (
		<Stack spacing={2}>
			<Stack direction='row' spacing={2} alignItems='center'>
				<Button
					startIcon={<ArrowBackIcon />}
					onClick={() => navigate('/orders')}
				>
					Назад
				</Button>

				<Typography variant='h5' fontWeight={700}>
					Заказ
				</Typography>

				<Chip
					label={
						STATUS_OPTIONS.find(s => s.value === order.status)?.label ?? '—'
					}
					color={
						(STATUS_OPTIONS.find(s => s.value === order.status)?.color ??
							'default') as
							| 'default'
							| 'primary'
							| 'secondary'
							| 'error'
							| 'info'
							| 'success'
							| 'warning'
					}
				/>

				<Box sx={{ flex: 1 }} />

				<Button
					variant='outlined'
					onClick={loadAll}
					startIcon={<RefreshIcon />}
					disabled={savingItems || addingItem || addingPay}
				>
					Обновить
				</Button>

				<Button
					variant='outlined'
					startIcon={<PrintIcon />}
					onClick={() => window.print()}
				>
					Печать
				</Button>
			</Stack>

			{error && <Alert severity='error'>{error}</Alert>}

			<Paper sx={{ p: 2 }}>
				<Stack spacing={1}>
					<Typography variant='subtitle1' fontWeight={700}>
						Общая информация
					</Typography>

					<Stack
						direction={{ xs: 'column', sm: 'row' }}
						spacing={2}
						flexWrap='wrap'
					>
						<Box sx={{ minWidth: 240 }}>
							<Typography variant='body2' color='text.secondary'>
								Клиент
							</Typography>
							<Typography>{order.clients?.name ?? '—'}</Typography>
						</Box>

						<Box sx={{ minWidth: 240 }}>
							<Typography variant='body2' color='text.secondary'>
								Менеджер
							</Typography>
							<Typography>{order.employees?.name ?? '—'}</Typography>
						</Box>

						<Box sx={{ minWidth: 160 }}>
							<Typography variant='body2' color='text.secondary'>
								Дата
							</Typography>
							<Typography>{order.order_date}</Typography>
						</Box>

						<Box sx={{ minWidth: 160 }}>
							<Typography variant='body2' color='text.secondary'>
								Сумма (итого)
							</Typography>
							<Typography>{Number(order.total_amount).toFixed(2)}</Typography>
						</Box>

						<Box sx={{ minWidth: 180 }}>
							<Typography variant='body2' color='text.secondary'>
								Оплачено / Долг
							</Typography>
							<Typography>
								{paidSum.toFixed(2)} / {debt.toFixed(2)}
							</Typography>
						</Box>
					</Stack>

					<Divider sx={{ my: 1 }} />

					<Stack
						direction={{ xs: 'column', sm: 'row' }}
						spacing={2}
						alignItems='center'
					>
						<TextField
							select
							label='Статус'
							size='small'
							value={status}
							onChange={e => setStatus(e.target.value)}
							sx={{ minWidth: 220 }}
						>
							{STATUS_OPTIONS.map(s => (
								<MenuItem key={s.value} value={s.value}>
									{s.label}
								</MenuItem>
							))}
						</TextField>

						<Button
							variant='contained'
							startIcon={
								savingStatus ? <CircularProgress size={16} /> : <SaveIcon />
							}
							onClick={saveStatus}
							disabled={savingStatus}
						>
							Сохранить статус
						</Button>

						<Box sx={{ flex: 1 }} />

						<Chip label={`Сумма по позициям: ${itemsTotal.toFixed(2)}`} />
					</Stack>
				</Stack>
			</Paper>

			<Paper>
				<Tabs value={tab} onChange={(_, v) => setTab(v)}>
					<Tab label='Состав заказа' />
					<Tab label='Платежи' />
				</Tabs>
			</Paper>

			{tab === 0 && (
				<Stack spacing={2}>
					<Paper sx={{ p: 2 }}>
						<Typography variant='subtitle1' fontWeight={700} sx={{ mb: 1 }}>
							Добавить / обновить позицию
						</Typography>

						<Stack
							direction={{ xs: 'column', md: 'row' }}
							spacing={2}
							alignItems='center'
						>
							<Autocomplete
								options={products}
								value={selectedProduct}
								onChange={(_, v) => setSelectedProduct(v)}
								getOptionLabel={o => o.name}
								renderInput={params => (
									<TextField {...params} label='Товар/услуга' size='small' />
								)}
								sx={{ minWidth: 320, flex: 1 }}
							/>

							<TextField
								label='Количество'
								size='small'
								type='number'
								value={itemQty}
								onChange={e => setItemQty(Number(e.target.value))}
								sx={{ width: 160 }}
							/>

							<TextField
								label='Цена'
								size='small'
								type='number'
								value={itemPrice}
								onChange={e => setItemPrice(Number(e.target.value))}
								sx={{ width: 180 }}
							/>

							<Button
								variant='contained'
								startIcon={
									addingItem ? <CircularProgress size={16} /> : <AddIcon />
								}
								onClick={addItem}
								disabled={addingItem}
							>
								Добавить
							</Button>
						</Stack>

						<Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
							Если позиция уже есть в заказе — она будет обновлена
							(кол-во/цена).
						</Typography>
					</Paper>

					<Paper sx={{ height: 520 }}>
						<DataGrid
							rows={items}
							columns={itemsColumns}
							loading={savingItems}
							disableRowSelectionOnClick
							pageSizeOptions={[10, 20, 50]}
							initialState={{
								pagination: { paginationModel: { pageSize: 20, page: 0 } },
							}}
						/>
					</Paper>
				</Stack>
			)}

			{tab === 1 && (
				<Stack spacing={2}>
					<Paper sx={{ p: 2 }}>
						<Typography variant='subtitle1' fontWeight={700} sx={{ mb: 1 }}>
							Добавить платёж
						</Typography>

						<Stack
							direction={{ xs: 'column', sm: 'row' }}
							spacing={2}
							alignItems='center'
						>
							<TextField
								label='Сумма'
								size='small'
								type='number'
								value={payAmount}
								onChange={e => setPayAmount(Number(e.target.value))}
								sx={{ width: 180 }}
							/>

							<TextField
								select
								label='Способ'
								size='small'
								value={payMethod}
								onChange={e => setPayMethod(e.target.value)}
								sx={{ minWidth: 180 }}
							>
								{PAYMENT_METHOD_OPTIONS.map(s => (
									<MenuItem key={s.value} value={s.value}>
										{s.label}
									</MenuItem>
								))}
							</TextField>

							<Button
								variant='contained'
								startIcon={
									addingPay ? <CircularProgress size={16} /> : <AddIcon />
								}
								onClick={addPayment}
								disabled={addingPay}
							>
								Добавить
							</Button>
						</Stack>
					</Paper>

					<Paper sx={{ height: 520 }}>
						<DataGrid
							rows={payments}
							columns={payColumns}
							disableRowSelectionOnClick
							pageSizeOptions={[10, 20, 50]}
							initialState={{
								pagination: { paginationModel: { pageSize: 20, page: 0 } },
							}}
						/>
					</Paper>
				</Stack>
			)}

			<ConfirmDialog
				open={confirmItem.open}
				title='Удалить позицию из заказа?'
				description={`Позиция: ${confirmItem.name ?? ''}. Удалить из заказа?`}
				loading={savingItems}
				onClose={() => setConfirmItem({ open: false, productId: null })}
				onConfirm={() => {
					if (!confirmItem.productId) return
					void deleteItem(confirmItem.productId)
					setConfirmItem({ open: false, productId: null })
				}}
			/>
		</Stack>
	)
}
