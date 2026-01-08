export type DemoUser = {
	fullName: string
	role: string
}

const STORAGE_KEY = 'demo_user'

const USERS: Array<{ login: string; password: string; user: DemoUser }> = [
	{
		login: 'davetisyan',
		password: 'demo',
		user: { fullName: 'Аветисян Данила Андраникович', role: 'администратор' },
	},
]

export function getStoredUser(): DemoUser | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		return raw ? (JSON.parse(raw) as DemoUser) : null
	} catch {
		return null
	}
}

export function storeUser(user: DemoUser) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function clearStoredUser() {
	localStorage.removeItem(STORAGE_KEY)
}

export function loginDemo(login: string, password: string): DemoUser | null {
	const found = USERS.find(u => u.login === login && u.password === password)
	return found ? found.user : null
}
