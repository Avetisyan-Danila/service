import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Paper,
	Stack,
	Tab,
	Tabs,
	TextField,
	Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { ruRU } from '@mui/x-data-grid/locales'
import { STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from '../shared/consts'
import * as XLSX from 'xlsx'
import PrintIcon from '@mui/icons-material/Print'
import FileDownloadIcon from '@mui/icons-material/FileDownload'

type OrderRow = {
	id: string
	order_date: string
	status: string
	total_amount: number
	clients: { name: string } | null
	employees: { name: string } | null
}

type PaymentRow = {
	id: string
	payment_date: string
	amount: number
	payment_method: string | null
	order_id: string
}

type RankedRow = {
	id: string
	name: string
	count: number
	sum: number
}

function isoDate(d: Date) {
	return d.toISOString().slice(0, 10)
}

function money(n: number) {
	return Number(n || 0).toFixed(2)
}

function normalizePaymentMethod(method: string | null): string | null {
	if (!method) return null
	
	const normalized = method.toLowerCase().trim()
	
	// Сначала проверяем константы
	const found = PAYMENT_METHOD_OPTIONS.find(o => o.value === normalized)
	if (found) return found.value
	
	// Нормализация русских вариантов
	if (normalized === 'наличный' || normalized === 'наличные') return 'cash'
	if (normalized === 'безналичный' || normalized === 'безналичные') return 'card'
	
	// Если не найдено, возвращаем null (не отображаем)
	return null
}

function getPaymentMethodLabel(method: string | null): string | null {
	const normalized = normalizePaymentMethod(method)
	if (!normalized) return null
	
	const found = PAYMENT_METHOD_OPTIONS.find(o => o.value === normalized)
	return found?.label ?? null
}

export function ReportsPage() {
	const [tab, setTab] = useState(0)

	// период по умолчанию: последние 30 дней
	const [dateFrom, setDateFrom] = useState(() => {
		const d = new Date()
		d.setDate(d.getDate() - 30)
		return isoDate(d)
	})
	const [dateTo, setDateTo] = useState(() => isoDate(new Date()))

	const [orders, setOrders] = useState<OrderRow[]>([])
	const [payments, setPayments] = useState<PaymentRow[]>([])

	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function loadReport() {
		setLoading(true)
		setError(null)

		// Заказы за период (order_date)
		const { data: o, error: oErr } = await supabase
			.from('orders')
			.select(
				'id, order_date, status, total_amount, clients(name), employees(name)'
			)
			.gte('order_date', dateFrom)
			.lte('order_date', dateTo)
			.limit(10000)

		if (oErr) {
			setError(oErr.message)
			setLoading(false)
			return
		}

		const mappedOrders = ((o as any[] | null) ?? []).map(x => ({
			id: x.id,
			order_date: x.order_date,
			status: x.status,
			total_amount: Number(x.total_amount) || 0,
			clients: x.clients ?? null,
			employees: x.employees ?? null,
		})) as OrderRow[]
		setOrders(mappedOrders)

		// Платежи за период (payment_date)
		const { data: p, error: pErr } = await supabase
			.from('payments')
			.select('id, payment_date, amount, payment_method, order_id')
			.gte('payment_date', dateFrom)
			.lte('payment_date', dateTo)
			.limit(10000)

		if (pErr) {
			setError(pErr.message)
			setLoading(false)
			return
		}

		const mappedPayments = ((p as any[] | null) ?? []).map(x => ({
			id: x.id,
			payment_date: x.payment_date,
			amount: Number(x.amount) || 0,
			payment_method: x.payment_method ?? null,
			order_id: x.order_id,
		})) as PaymentRow[]
		setPayments(mappedPayments)

		setLoading(false)
	}

	useEffect(() => {
		loadReport()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// ===== Сводка =====
	const ordersCount = orders.length
	const ordersSum = useMemo(
		() => orders.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0),
		[orders]
	)

	const paymentsCount = payments.length
	const paymentsSum = useMemo(
		() => payments.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
		[payments]
	)

	const paidRatio = useMemo(() => {
		if (ordersSum <= 0) return 0
		const r = paymentsSum / ordersSum
		return Math.max(0, Math.min(1, r))
	}, [paymentsSum, ordersSum])

	const statusStats = useMemo(() => {
		const m = new Map<string, number>()
		for (const o of orders) m.set(o.status, (m.get(o.status) ?? 0) + 1)
		return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
	}, [orders])

	// ===== ТОП клиенты =====
	const topClients = useMemo((): RankedRow[] => {
		const by = new Map<string, { name: string; count: number; sum: number }>()
		for (const o of orders) {
			const name = o.clients?.name ?? '—'
			const prev = by.get(name) ?? { name, count: 0, sum: 0 }
			prev.count += 1
			prev.sum += Number(o.total_amount) || 0
			by.set(name, prev)
		}
		return Array.from(by.values())
			.sort((a, b) => b.sum - a.sum)
			.slice(0, 20)
			.map((x, idx) => ({ id: String(idx + 1), ...x }))
	}, [orders])

	// ===== ТОП сотрудники (нагрузка менеджеров) =====
	const topEmployees = useMemo((): RankedRow[] => {
		const by = new Map<string, { name: string; count: number; sum: number }>()
		for (const o of orders) {
			const name = o.employees?.name ?? '—'
			const prev = by.get(name) ?? { name, count: 0, sum: 0 }
			prev.count += 1
			prev.sum += Number(o.total_amount) || 0
			by.set(name, prev)
		}
		return Array.from(by.values())
			.sort((a, b) => b.count - a.count)
			.slice(0, 20)
			.map((x, idx) => ({ id: String(idx + 1), ...x }))
	}, [orders])

	// ===== Финансы (поступления + дебиторка оценочно) =====
	// Дебиторка тут оценочная: сумма заказов периода минус оплаты периода.
	// Это не “истинная дебиторка по заказам”, но для учебного отчёта — ок и объяснимо.
	const estimatedDebt = useMemo(
		() => Math.max(0, ordersSum - paymentsSum),
		[ordersSum, paymentsSum]
	)

	const byMethod = useMemo(() => {
		const m = new Map<string, number>()
		for (const p of payments) {
			const normalized = normalizePaymentMethod(p.payment_method)
			if (!normalized) continue // Пропускаем неизвестные способы оплаты
			m.set(normalized, (m.get(normalized) ?? 0) + (Number(p.amount) || 0))
		}
		return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
	}, [payments])

	const rankedColumns: GridColDef<RankedRow>[] = [
		{ field: 'name', headerName: 'Наименование', flex: 1, minWidth: 240 },
		{ field: 'count', headerName: 'Кол-во', width: 120, type: 'number' },
		{
			field: 'sum',
			headerName: 'Сумма',
			width: 160,
			type: 'number',
			valueFormatter: v => money(Number(v)),
		},
	]

	function handlePrint() {
		window.print()
	}

	function exportExcel() {
		// 1) Сводка (пара строк — без перегруза)
		const summarySheet = XLSX.utils.json_to_sheet([
			{
				'Период с': dateFrom,
				'Период по': dateTo,
				Заказов: ordersCount,
				'Сумма заказов': Number(ordersSum.toFixed(2)),
				Платежей: paymentsCount,
				'Сумма оплат': Number(paymentsSum.toFixed(2)),
				'Доля оплат (%)': Number((paidRatio * 100).toFixed(0)),
				'Оценочная дебиторка': Number(estimatedDebt.toFixed(2)),
			},
		])

		// 2) Клиенты
		const clientsSheet = XLSX.utils.json_to_sheet(
			topClients.map(r => ({
				Клиент: r.name,
				'Кол-во заказов': r.count,
				'Сумма заказов': Number(r.sum.toFixed(2)),
			}))
		)

		// 3) Сотрудники
		const employeesSheet = XLSX.utils.json_to_sheet(
			topEmployees.map(r => ({
				Сотрудник: r.name,
				'Кол-во заказов': r.count,
				'Сумма заказов': Number(r.sum.toFixed(2)),
			}))
		)

		// 4) Финансы (способы оплат)
		const financeMethodsSheet = XLSX.utils.json_to_sheet(
			byMethod
				.map(([method, sum]) => {
					const label = getPaymentMethodLabel(method)
					return label
						? {
								'Способ оплаты': label,
								'Сумма оплат': Number(Number(sum || 0).toFixed(2)),
							}
						: null
				})
				.filter((x): x is { 'Способ оплаты': string; 'Сумма оплат': number } => x !== null)
		)

		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, summarySheet, 'Сводка')
		XLSX.utils.book_append_sheet(wb, clientsSheet, 'Клиенты')
		XLSX.utils.book_append_sheet(wb, employeesSheet, 'Сотрудники')
		XLSX.utils.book_append_sheet(wb, financeMethodsSheet, 'Финансы')

		const fileName = `reports_${dateFrom}_${dateTo}.xlsx`
		XLSX.writeFile(wb, fileName)
	}

	return (
		<Stack spacing={2}>
			<Box>
				<Typography variant='h5' fontWeight={800}>
					Отчёты
				</Typography>
				<Typography variant='body2' color='text.secondary'>
					Основные показатели по заказам и оплатам за период
				</Typography>
			</Box>

			{error && <Alert severity='error'>{error}</Alert>}

			{/* Общий период */}
			<Paper sx={{ p: 2 }}>
				<Stack
					direction={{ xs: 'column', sm: 'row' }}
					spacing={2}
					alignItems='center'
				>
					<TextField
						label='Дата с'
						size='small'
						type='date'
						value={dateFrom}
						onChange={e => setDateFrom(e.target.value)}
						InputLabelProps={{ shrink: true }}
						sx={{ width: 180 }}
					/>

					<TextField
						label='Дата по'
						size='small'
						type='date'
						value={dateTo}
						onChange={e => setDateTo(e.target.value)}
						InputLabelProps={{ shrink: true }}
						sx={{ width: 180 }}
					/>

					<Box sx={{ flex: 1 }} />

					<Button
						startIcon={
							loading ? <CircularProgress size={16} /> : <RefreshIcon />
						}
						onClick={loadReport}
						disabled={loading}
					>
						Сформировать
					</Button>

					<Button
						variant='outlined'
						startIcon={<PrintIcon />}
						onClick={handlePrint}
						disabled={loading}
					>
						Печать
					</Button>

					<Button
						variant='outlined'
						startIcon={<FileDownloadIcon />}
						onClick={exportExcel}
						disabled={loading}
					>
						Excel
					</Button>
				</Stack>
			</Paper>

			{/* Tabs */}
			<Paper>
				<Tabs
					value={tab}
					onChange={(_, v) => setTab(v)}
					variant='scrollable'
					scrollButtons='auto'
				>
					<Tab label='Сводка' />
					<Tab label='Клиенты' />
					<Tab label='Сотрудники' />
					<Tab label='Финансы' />
				</Tabs>
			</Paper>

			{/* 1) Сводка */}
			{tab === 0 && (
				<Stack spacing={2}>
					<Paper sx={{ p: 2 }}>
						<Typography variant='subtitle1' fontWeight={800} sx={{ mb: 1 }}>
							Итоги
						</Typography>

						<Stack
							direction={{ xs: 'column', sm: 'row' }}
							spacing={3}
							flexWrap='wrap'
						>
							<Box>
								<Typography variant='body2' color='text.secondary'>
									Заказов
								</Typography>
								<Typography fontWeight={800}>{ordersCount}</Typography>
							</Box>

							<Box>
								<Typography variant='body2' color='text.secondary'>
									Сумма заказов
								</Typography>
								<Typography fontWeight={800}>{money(ordersSum)}</Typography>
							</Box>

							<Box>
								<Typography variant='body2' color='text.secondary'>
									Платежей
								</Typography>
								<Typography fontWeight={800}>{paymentsCount}</Typography>
							</Box>

							<Box>
								<Typography variant='body2' color='text.secondary'>
									Сумма оплат
								</Typography>
								<Typography fontWeight={800}>{money(paymentsSum)}</Typography>
							</Box>

							<Box>
								<Typography variant='body2' color='text.secondary'>
									Доля оплат
								</Typography>
								<Typography fontWeight={800}>
									{(paidRatio * 100).toFixed(0)}%
								</Typography>
							</Box>
						</Stack>

						{statusStats.length > 0 && (
							<Box sx={{ mt: 2 }}>
								<Typography variant='subtitle2' fontWeight={800} sx={{ mb: 1 }}>
									По статусам
								</Typography>

								<Stack direction='row' spacing={2} flexWrap='wrap'>
									{statusStats.map(([s, n]) => (
										<Typography key={s} variant='body2'>
											<b>
												{STATUS_OPTIONS.find(o => o.value === s)?.label ?? '—'}
											</b>
											: {n}
										</Typography>
									))}
								</Stack>
							</Box>
						)}
					</Paper>

					<Paper sx={{ p: 2 }}>
						<Typography variant='body2' color='text.secondary'>
							• Сводка показывает объём заказов и поступления за период, а также
							распределение по статусам.
							<br />• Доля оплат помогает оценить оплату заказов в выбранном
							промежутке времени.
						</Typography>
					</Paper>
				</Stack>
			)}

			{/* 2) Клиенты */}
			{tab === 1 && (
				<Stack spacing={2}>
					<Paper sx={{ p: 2 }}>
						<Typography variant='subtitle1' fontWeight={800}>
							ТОП клиентов по сумме заказов
						</Typography>
						<Typography variant='body2' color='text.secondary'>
							Помогает выявить наиболее значимых клиентов за период.
						</Typography>
					</Paper>

					<Paper sx={{ height: 560 }}>
						<DataGrid
							rows={topClients}
							columns={rankedColumns}
							disableRowSelectionOnClick
							loading={loading}
							pageSizeOptions={[10, 20, 50]}
							localeText={ruRU.components.MuiDataGrid.defaultProps.localeText}
							initialState={{
								pagination: { paginationModel: { pageSize: 20, page: 0 } },
							}}
						/>
					</Paper>
				</Stack>
			)}

			{/* 3) Сотрудники */}
			{tab === 2 && (
				<Stack spacing={2}>
					<Paper sx={{ p: 2 }}>
						<Typography variant='subtitle1' fontWeight={800}>
							Нагрузка сотрудников (менеджеров)
						</Typography>
						<Typography variant='body2' color='text.secondary'>
							Количество и сумма оформленных заказов по сотрудникам.
						</Typography>
					</Paper>

					<Paper sx={{ height: 560 }}>
						<DataGrid
							rows={topEmployees}
							columns={rankedColumns}
							disableRowSelectionOnClick
							loading={loading}
							pageSizeOptions={[10, 20, 50]}
							localeText={ruRU.components.MuiDataGrid.defaultProps.localeText}
							initialState={{
								pagination: { paginationModel: { pageSize: 20, page: 0 } },
							}}
						/>
					</Paper>
				</Stack>
			)}

			{/* 4) Финансы */}
			{tab === 3 && (
				<Stack spacing={2}>
					<Paper sx={{ p: 2 }}>
						<Typography variant='subtitle1' fontWeight={800} sx={{ mb: 1 }}>
							Финансы
						</Typography>

						<Stack
							direction={{ xs: 'column', sm: 'row' }}
							spacing={3}
							flexWrap='wrap'
						>
							<Box>
								<Typography variant='body2' color='text.secondary'>
									Поступления (оплаты)
								</Typography>
								<Typography fontWeight={800}>{money(paymentsSum)}</Typography>
							</Box>

							<Box>
								<Typography variant='body2' color='text.secondary'>
									Оценочная дебиторка
								</Typography>
								<Typography fontWeight={800}>{money(estimatedDebt)}</Typography>
							</Box>
						</Stack>

						{byMethod.length > 0 && (
							<Box sx={{ mt: 2 }}>
								<Typography variant='subtitle2' fontWeight={800} sx={{ mb: 1 }}>
									Оплаты по способам
								</Typography>

								<Stack direction='row' spacing={2} flexWrap='wrap'>
									{byMethod.map(([m, sum]) => {
										const label = getPaymentMethodLabel(m)
										if (!label) return null
										return (
											<Typography key={m} variant='body2'>
												<b>{label}</b>: {money(sum)}
											</Typography>
										)
									})}
								</Stack>
							</Box>
						)}

						<Typography
							variant='caption'
							color='text.secondary'
							sx={{ display: 'block', mt: 2 }}
						>
							Примечание: дебиторка рассчитана как “сумма заказов периода −
							сумма оплат периода”.
						</Typography>
					</Paper>
				</Stack>
			)}
		</Stack>
	)
}
