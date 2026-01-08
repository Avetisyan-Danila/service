import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography,
} from '@mui/material'

export function ConfirmDialog(props: {
	open: boolean
	title: string
	description?: string
	confirmText?: string
	cancelText?: string
	loading?: boolean
	onConfirm: () => void
	onClose: () => void
}) {
	const {
		open,
		title,
		description,
		confirmText = 'Удалить',
		cancelText = 'Отмена',
		loading = false,
		onConfirm,
		onClose,
	} = props

	return (
		<Dialog
			open={open}
			onClose={loading ? undefined : onClose}
			maxWidth='xs'
			fullWidth
		>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
					{description ?? 'Вы уверены? Это действие нельзя отменить.'}
				</Typography>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={onClose} disabled={loading}>
					{cancelText}
				</Button>
				<Button
					color='error'
					variant='contained'
					onClick={onConfirm}
					disabled={loading}
				>
					{confirmText}
				</Button>
			</DialogActions>
		</Dialog>
	)
}
