import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { OrdersPage } from './pages/OrdersPage'
import { OrderPage } from './pages/OrderPage'
import { ClientsPage } from './pages/ClientsPage'
import { ProductsPage } from './pages/ProductsPage'
import { ReportsPage } from './pages/ReportsPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { LoginPage } from './pages/LoginPage'

import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'

const router = createBrowserRouter([
	{ path: '/login', element: <LoginPage /> },

	{
		path: '/',
		element: (
			<RequireAuth>
				<AppShell />
			</RequireAuth>
		),
		children: [
			{ index: true, element: <Navigate to='/orders' replace /> },
			{ path: 'orders', element: <OrdersPage /> },
			{ path: 'orders/:id', element: <OrderPage /> },
			{ path: 'clients', element: <ClientsPage /> },
			{ path: 'products', element: <ProductsPage /> },
			{ path: 'employees', element: <EmployeesPage /> },
			{ path: 'reports', element: <ReportsPage /> },
		],
	},
])

export default function App() {
	return (
		<AuthProvider>
			<RouterProvider router={router} />
		</AuthProvider>
	)
}
