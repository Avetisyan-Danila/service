import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
	Alert,
	Box,
	Button,
	Paper,
	Stack,
	TextField,
	Typography,
} from '@mui/material'
import { loginDemo } from '../auth/auth'
import { useAuth } from '../auth/AuthProvider'

export function LoginPage() {
	const nav = useNavigate()
	const loc = useLocation()
	const { setUser, user } = useAuth()

	const from = (loc.state as any)?.from || '/orders'

	const [login, setLogin] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)

	const already = useMemo(() => !!user, [user])

	function submit() {
		setError(null)
		const u = loginDemo(login.trim(), password)
		if (!u) {
			setError('Неверный логин или пароль')
			return
		}
		setUser(u)
		nav(from, { replace: true })
	}

	return (
		<Box
			sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}
		>
			<Paper sx={{ width: '100%', maxWidth: 420, p: 3 }}>
				<Stack spacing={2}>
					<Typography variant='h5' fontWeight={800}>
						Вход
					</Typography>

					{already && (
						<Alert severity='info'>Вы уже вошли. Перейдите в систему.</Alert>
					)}
					{error && <Alert severity='error'>{error}</Alert>}

					<TextField
						label='Логин'
						size='small'
						value={login}
						onChange={e => setLogin(e.target.value)}
					/>
					<TextField
						label='Пароль'
						size='small'
						type='password'
						value={password}
						onChange={e => setPassword(e.target.value)}
					/>

					<Button variant='contained' onClick={submit}>
						Войти
					</Button>
				</Stack>
			</Paper>
		</Box>
	)
}
