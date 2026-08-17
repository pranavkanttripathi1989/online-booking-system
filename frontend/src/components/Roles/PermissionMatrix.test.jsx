import { render, screen, fireEvent } from '@testing-library/react'
import PermissionMatrix from './PermissionMatrix'

const resources = ['appointments', 'patients']
const actions = ['view', 'edit']

describe('PermissionMatrix', () => {
  it('renders a resource row and an action column for every combination', () => {
    render(<PermissionMatrix resources={resources} actions={actions} selectedIds={[]} onToggle={() => {}} />)
    expect(screen.getByText('appointments')).toBeInTheDocument()
    expect(screen.getByText('patients')).toBeInTheDocument()
    expect(screen.getByLabelText('Grant appointments — view')).toBeInTheDocument()
    expect(screen.getByLabelText('Grant patients — edit')).toBeInTheDocument()
  })

  it('reflects selectedIds as checked checkboxes', () => {
    render(<PermissionMatrix resources={resources} actions={actions} selectedIds={['perm-appointments-view']} onToggle={() => {}} />)
    expect(screen.getByLabelText('Grant appointments — view')).toBeChecked()
    expect(screen.getByLabelText('Grant appointments — edit')).not.toBeChecked()
  })

  it('calls onToggle with the correct permission id when a checkbox is clicked', () => {
    const onToggle = jest.fn()
    render(<PermissionMatrix resources={resources} actions={actions} selectedIds={[]} onToggle={onToggle} />)
    fireEvent.click(screen.getByLabelText('Grant patients — view'))
    expect(onToggle).toHaveBeenCalledWith('perm-patients-view')
  })

  it('disables all checkboxes when disabled is true (system roles)', () => {
    render(<PermissionMatrix resources={resources} actions={actions} selectedIds={[]} onToggle={() => {}} disabled />)
    expect(screen.getByLabelText('Grant appointments — view')).toBeDisabled()
  })
})
