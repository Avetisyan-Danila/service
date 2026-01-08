import React, { createContext, useContext, useMemo, useState } from 'react'
import {
	clearStoredUser,
	type DemoUser,
	getStoredUser,
	storeUser,
} from './auth'

type AuthCtx = {
	user: DemoUser | null
	setUser: (u: DemoUser | null) => void
	logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUserState] = useState<DemoUser | null>(() => getStoredUser())

	const api = useMemo<AuthCtx>(() => {
		return {
			user,
			setUser: u => {
				setUserState(u)
				if (u) storeUser(u)
				else clearStoredUser()
			},
			logout: () => {
				setUserState(null)
				clearStoredUser()
			},
		}
	}, [user])

	return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useAuth() {
	const ctx = useContext(Ctx)
	if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
	return ctx
}
