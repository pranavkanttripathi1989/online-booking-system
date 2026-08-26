import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import NotificationBell from './NotificationBell'

// REQ134 (F-14 residue) — this widget had zero test coverage before this
// slice. Confirms the {data, paginatorInfo} migration (Hard Rule 7) and,
// more importantly, the real correctness fix this slice makes: the badge
// count now comes from a dedicated unreadNotificationCount query, not a
// client-side count over the (now bounded, first: 20) dropdown list --
// counting client-side would silently undercount once a caller has more
// unread notifications than fit in one dropdown page.

const GET_NOTIFICATIONS = gql`
  query GetNotificationsForBell($first: Int) {
    notifications(first: $first) {
      data {
        id
        title
        message
        type
        priority
        is_read
        created_at
      }
    }
  }
`
const GET_UNREAD_COUNT = gql`
  query GetUnreadNotificationCountForBell {
    unreadNotificationCount
  }
`

function notificationsMock(data) {
  return {
    request: { query: GET_NOTIFICATIONS, variables: { first: 20 } },
    result: { data: { notifications: { data } } },
  }
}
function unreadCountMock(count) {
  return { request: { query: GET_UNREAD_COUNT, variables: {} }, result: { data: { unreadNotificationCount: count } } }
}

function renderBell(mocks) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <NotificationBell />
    </MockedProvider>,
  )
}

describe('NotificationBell (REQ134)', () => {
  it('shows the badge count from the dedicated unreadNotificationCount query, not the fetched list length', async () => {
    // Only 2 notifications are fetched for the dropdown, but the true
    // unread total (from a separate query) is much higher -- proves the
    // badge doesn't silently undercount against a bounded list.
    renderBell([
      notificationsMock([
        {
          __typename: 'Notification',
          id: 'n-1',
          title: 'Recent 1',
          message: 'msg',
          type: 'system',
          priority: 'normal',
          is_read: false,
          created_at: '2026-08-26T10:00:00.000Z',
        },
        {
          __typename: 'Notification',
          id: 'n-2',
          title: 'Recent 2',
          message: 'msg',
          type: 'system',
          priority: 'normal',
          is_read: false,
          created_at: '2026-08-26T09:00:00.000Z',
        },
      ]),
      unreadCountMock(47),
    ])
    await waitFor(() => expect(screen.getByLabelText('47 unread notifications')).toBeInTheDocument())
  })

  it('renders real notifications in the dropdown', async () => {
    renderBell([
      notificationsMock([
        {
          __typename: 'Notification',
          id: 'n-1',
          title: 'Appointment reminder',
          message: 'Tomorrow at 9am',
          type: 'appointment',
          priority: 'normal',
          is_read: false,
          created_at: '2026-08-26T10:00:00.000Z',
        },
      ]),
      unreadCountMock(1),
    ])
    await userEvent.click(await screen.findByLabelText('1 unread notifications'))
    await waitFor(() => expect(screen.getByText('Appointment reminder')).toBeInTheDocument())
  })

  it('shows zero badge state honestly when there are no unread notifications', async () => {
    renderBell([notificationsMock([]), unreadCountMock(0)])
    await waitFor(() => expect(screen.getByLabelText('0 unread notifications')).toBeInTheDocument())
  })
})
