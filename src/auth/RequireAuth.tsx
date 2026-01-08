import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { type ReactNode } from 'react'

export function RequireAuth({ children }: { children: ReactNode }) {
	const { user } = useAuth()
	const location = useLocation()

	if (!user) {
		return <Navigate to='/login' replace state={{ from: location.pathname }} />
	}

	return children
}
