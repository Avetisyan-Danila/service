import { Outlet, NavLink } from 'react-router-dom'
import {
	AppBar,
	Toolbar,
	Typography,
	Drawer,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Box,
	CssBaseline,
} from '@mui/material'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import PeopleIcon from '@mui/icons-material/People'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import AssessmentIcon from '@mui/icons-material/Assessment'
import BadgeIcon from '@mui/icons-material/Badge'
import { Button } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const drawerWidth = 240

const navItems = [
	{ to: '/orders', label: 'Заказы', icon: <ReceiptLongIcon /> },
	{ to: '/clients', label: 'Клиенты', icon: <PeopleIcon /> },
	{ to: '/products', label: 'Товары', icon: <Inventory2Icon /> },
	{ to: '/employees', label: 'Сотрудники', icon: <BadgeIcon /> },
	{ to: '/reports', label: 'Отчёты', icon: <AssessmentIcon /> },
]

export function AppShell() {
	const navigate = useNavigate()
	const { user, logout } = useAuth()

	return (
		<Box sx={{ display: 'flex' }}>
			<CssBaseline />

			<AppBar
				position='fixed'
				sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}
			>
				<Toolbar>
					<Typography variant='h6' noWrap component='div'>
						Учёт заказов сервисного центра
					</Typography>

					<Box sx={{ flex: 1 }} />

					<Typography variant='body2' sx={{ mr: 2 }}>
						{user?.fullName ?? ''}
					</Typography>

					<Button
						color='error'
						variant='contained'
						startIcon={<LogoutIcon />}
						onClick={() => {
							logout()
							navigate('/login', { replace: true })
						}}
					>
						Выход
					</Button>
				</Toolbar>
			</AppBar>

			<Drawer
				variant='permanent'
				sx={{
					width: drawerWidth,
					flexShrink: 0,
					[`& .MuiDrawer-paper`]: {
						width: drawerWidth,
						boxSizing: 'border-box',
					},
				}}
			>
				<Toolbar />
				<List>
					{navItems.map(item => (
						<ListItemButton
							key={item.to}
							component={NavLink}
							to={item.to}
							sx={{
								'&.active': {
									bgcolor: 'action.selected',
								},
							}}
						>
							<ListItemIcon>{item.icon}</ListItemIcon>
							<ListItemText primary={item.label} />
						</ListItemButton>
					))}
				</List>
			</Drawer>

			<Box component='main' sx={{ flexGrow: 1, p: 2 }}>
				<Toolbar />
				<Outlet />
			</Box>
		</Box>
	)
}
