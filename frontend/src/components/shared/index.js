// Shared component barrel — import from '@/components/shared'
export { default as StatusChip } from './StatusChip'
export { default as DataCard } from './DataCard'
export { default as PatientAvatar } from './PatientAvatar'
export { default as ConfirmDialog } from './ConfirmDialog'
export { default as EmptyState } from './EmptyState'
export { default as SearchField } from './SearchField'
export { default as RoleBadge } from './RoleBadge'
export { default as NotificationBell } from './NotificationBell'
export { default as DoctorCard } from './DoctorCard'
export { default as LanguageSwitcher } from './LanguageSwitcher'
export { GlobalSnackbarProvider, useSnackbar } from './GlobalSnackbar'

// Skeleton loaders
export {
  DataCardSkeleton,
  TableSkeleton,
  AppointmentCardSkeleton,
  DoctorCardSkeleton,
  DoctorGridSkeleton,
  KpiRowSkeleton,
  PageHeaderSkeleton,
  AppointmentsListSkeleton,
} from './Skeletons'
