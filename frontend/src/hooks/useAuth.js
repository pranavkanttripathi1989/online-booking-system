/**
 * useAuth — convenience re-export so consumers can import from either:
 *   import { useAuth } from '../context/AuthContext'
 *   import { useAuth } from '../hooks/useAuth'
 *
 * The hook exposes:
 *   - user, token, isAuthenticated, isLoading  (state)
 *   - login(token, user)     — persists token, dispatches LOGIN
 *   - logout(apolloClient?)  — clears token, resets cache, dispatches LOGOUT
 *   - hasRole(role)          — checks user.roles[].name
 *   - hasPermission(perm)    — checks user.permissions[].name
 */
export { useAuth } from '../context/AuthContext'
