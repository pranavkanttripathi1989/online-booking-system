import { useState, useEffect, useCallback } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DownloadIcon from '@mui/icons-material/Download'
import { useSnackbar } from 'notistack'
import { CLINICS_QUERY, CLINICIANS_QUERY } from '../../../graphql/queries'

// REQ158 (P2-06) — doctor revenue-share & payouts. Desktop-dense tier
// (manager financial console, same tier as Finances/Reports). SURF-14:
// the Clinic selector at the top is the persistent branch-scope
// indicator — every rule and every payout on this page is for the
// selected clinic; there is no "all clinics" option because a payout
// run (computeMonthlyPayouts) always requires a concrete clinic_id.
const GET_REVENUE_SHARE_RULES = gql`
  query GetRevenueShareRules($clinicId: ID) {
    revenueShareRules(clinicId: $clinicId) {
      id
      scope
      clinic_id
      clinician_id
      share_percentage
      clinic_name
      clinician_name
    }
  }
`

const SET_REVENUE_SHARE_RULE = gql`
  mutation SetRevenueShareRule($input: RevenueShareRuleInput!) {
    setRevenueShareRule(input: $input) {
      success
      userErrors
      rule {
        id
      }
    }
  }
`

const GET_PAYOUTS = gql`
  query GetPayouts($clinicId: ID, $year: Int, $month: Int) {
    payouts(clinicId: $clinicId, year: $year, month: $month) {
      id
      clinician_id
      clinician_name
      period_start
      period_end
      gross_amount
      share_percentage_used
      payout_amount
      appointment_count
      status
      approved_at
    }
  }
`

const COMPUTE_MONTHLY_PAYOUTS = gql`
  mutation ComputeMonthlyPayouts($input: ComputeMonthlyPayoutsInput!) {
    computeMonthlyPayouts(input: $input) {
      success
      userErrors
      skippedClinicianNames
      payouts {
        id
      }
    }
  }
`

const APPROVE_PAYOUT = gql`
  mutation ApprovePayout($id: ID!) {
    approvePayout(id: $id) {
      id
      status
    }
  }
`

const SCOPES = [
  { value: 'org', label: 'Org default' },
  { value: 'clinic', label: 'This clinic (override)' },
  { value: 'clinician', label: 'One doctor at this clinic (override)' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatInr(rupees) {
  return `₹${Number(rupees).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function RevenueSharePage() {
  const client = useApolloClient()
  const { enqueueSnackbar } = useSnackbar()

  const [clinics, setClinics] = useState([])
  const [clinicId, setClinicId] = useState('')
  const [clinicians, setClinicians] = useState([])

  const [rules, setRules] = useState([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [rulesError, setRulesError] = useState(null)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [payouts, setPayouts] = useState([])
  const [payoutsLoading, setPayoutsLoading] = useState(true)
  const [payoutsError, setPayoutsError] = useState(null)
  const [running, setRunning] = useState(false)

  const [ruleForm, setRuleForm] = useState({ scope: 'org', clinician_id: '', share_percentage: '' })
  const [ruleSubmitting, setRuleSubmitting] = useState(false)
  const [ruleFormError, setRuleFormError] = useState(null)

  useEffect(() => {
    client
      .query({ query: CLINICS_QUERY, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        const list = data?.clinics ?? []
        setClinics(list)
        if (!clinicId && list.length > 0) setClinicId(list[0].id)
      })
      .catch((e) => setRulesError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!clinicId) return
    client
      .query({ query: CLINICIANS_QUERY, variables: { clinic_id: clinicId, is_active: true, first: 100 }, fetchPolicy: 'network-only' })
      .then(({ data }) => setClinicians(data?.clinicians?.data ?? []))
      .catch(() => setClinicians([]))
  }, [clinicId, client])

  const loadRules = useCallback(async () => {
    if (!clinicId) return
    setRulesLoading(true)
    setRulesError(null)
    try {
      const { data } = await client.query({ query: GET_REVENUE_SHARE_RULES, variables: { clinicId }, fetchPolicy: 'network-only' })
      setRules(data?.revenueShareRules ?? [])
    } catch (err) {
      setRulesError(err.message)
    } finally {
      setRulesLoading(false)
    }
  }, [clinicId, client])

  const loadPayouts = useCallback(async () => {
    if (!clinicId) return
    setPayoutsLoading(true)
    setPayoutsError(null)
    try {
      const { data } = await client.query({ query: GET_PAYOUTS, variables: { clinicId, year, month }, fetchPolicy: 'network-only' })
      setPayouts(data?.payouts ?? [])
    } catch (err) {
      setPayoutsError(err.message)
    } finally {
      setPayoutsLoading(false)
    }
  }, [clinicId, year, month, client])

  useEffect(() => {
    loadRules()
  }, [loadRules])
  useEffect(() => {
    loadPayouts()
  }, [loadPayouts])

  const submitRule = async (e) => {
    e.preventDefault()
    const pct = Number(ruleForm.share_percentage)
    if (!ruleForm.share_percentage || Number.isNaN(pct) || pct < 0 || pct > 100) {
      setRuleFormError('Enter a share percentage between 0 and 100')
      return
    }
    if (ruleForm.scope === 'clinician' && !ruleForm.clinician_id) {
      setRuleFormError('Choose a doctor for a doctor-level rule')
      return
    }
    setRuleSubmitting(true)
    setRuleFormError(null)
    try {
      const { data } = await client.mutate({
        mutation: SET_REVENUE_SHARE_RULE,
        variables: {
          input: {
            scope: ruleForm.scope,
            clinic_id: ruleForm.scope === 'org' ? undefined : clinicId,
            clinician_id: ruleForm.scope === 'clinician' ? ruleForm.clinician_id : undefined,
            share_percentage: pct,
          },
        },
      })
      if (!data?.setRevenueShareRule?.success) {
        setRuleFormError((data?.setRevenueShareRule?.userErrors ?? []).join(', ') || 'Could not save the rule')
        return
      }
      enqueueSnackbar('Revenue-share rule saved.', { variant: 'success' })
      setRuleForm({ scope: 'org', clinician_id: '', share_percentage: '' })
      loadRules()
    } catch (err) {
      setRuleFormError(err.message)
    } finally {
      setRuleSubmitting(false)
    }
  }

  const runPayouts = async () => {
    setRunning(true)
    try {
      const { data } = await client.mutate({
        mutation: COMPUTE_MONTHLY_PAYOUTS,
        variables: { input: { clinic_id: clinicId, year, month } },
      })
      const result = data?.computeMonthlyPayouts
      if (!result?.success) {
        enqueueSnackbar((result?.userErrors ?? []).join(', ') || 'Could not compute payouts', { variant: 'error' })
        return
      }
      if (result.skippedClinicianNames?.length) {
        enqueueSnackbar(
          `No share rate configured for: ${result.skippedClinicianNames.join(', ')} — set a rule and re-run.`,
          { variant: 'warning' },
        )
      }
      enqueueSnackbar(`${result.payouts.length} payout(s) computed for ${MONTHS[month - 1]} ${year}.`, { variant: 'success' })
      loadPayouts()
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' })
    } finally {
      setRunning(false)
    }
  }

  const approvePayout = async (id) => {
    try {
      await client.mutate({ mutation: APPROVE_PAYOUT, variables: { id } })
      enqueueSnackbar('Payout approved.', { variant: 'success' })
      loadPayouts()
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' })
    }
  }

  // SURF-8 — CSV export is non-negotiable on every manager table.
  const exportStatement = () => {
    if (payouts.length === 0) {
      enqueueSnackbar('Nothing to export for this month yet.', { variant: 'info' })
      return
    }
    const rows = [
      ['Doctor', 'Period', 'Gross (INR)', 'Share %', 'Payout (INR)', 'Appointments', 'Status'],
      ...payouts.map((p) => [
        p.clinician_name,
        `${MONTHS[month - 1]} ${year}`,
        p.gross_amount.toFixed(2),
        p.share_percentage_used,
        p.payout_amount.toFixed(2),
        p.appointment_count,
        p.status,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `doctor_payouts_${year}_${String(month).padStart(2, '0')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    enqueueSnackbar(`Statement downloaded (${payouts.length} doctors).`, { variant: 'success' })
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Doctor Revenue Share &amp; Payouts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set per-doctor share rates and close a month into a payout statement
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          label="Clinic"
          value={clinicId}
          onChange={(e) => setClinicId(e.target.value)}
          sx={{ minWidth: 220 }}
          data-testid="revenue-share-clinic-select"
        >
          {clinics.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {!clinicId && !rulesLoading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No clinics available yet — add a clinic first.
        </Alert>
      )}

      <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Share Rules
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          The most specific rule wins: a doctor's own rate beats this clinic's default, which beats the org-wide default.
        </Typography>

        <Box component="form" onSubmit={submitRule} sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-start">
            <TextField
              select
              size="small"
              label="Applies to"
              value={ruleForm.scope}
              onChange={(e) => setRuleForm((f) => ({ ...f, scope: e.target.value }))}
              sx={{ minWidth: 220 }}
            >
              {SCOPES.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            {ruleForm.scope === 'clinician' && (
              <TextField
                select
                size="small"
                label="Doctor"
                value={ruleForm.clinician_id}
                onChange={(e) => setRuleForm((f) => ({ ...f, clinician_id: e.target.value }))}
                sx={{ minWidth: 220 }}
              >
                {clinicians.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.full_name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              size="small"
              type="number"
              label="Doctor's share %"
              value={ruleForm.share_percentage}
              onChange={(e) => setRuleForm((f) => ({ ...f, share_percentage: e.target.value }))}
              inputProps={{ min: 0, max: 100, step: 0.5 }}
              sx={{ width: 160 }}
            />
            <Button type="submit" variant="contained" disabled={ruleSubmitting}>
              {ruleSubmitting ? 'Saving…' : 'Save rule'}
            </Button>
          </Stack>
          {ruleFormError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {ruleFormError}
            </Alert>
          )}
        </Box>

        {rulesLoading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={28} />
          </Stack>
        ) : rulesError ? (
          <Alert severity="error" action={<Button onClick={loadRules}>Retry</Button>}>
            {rulesError}
          </Alert>
        ) : rules.length === 0 ? (
          <Alert severity="info">No share rules configured yet — set an org default above to get started.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Scope</TableCell>
                  <TableCell>Applies to</TableCell>
                  <TableCell align="right">Share %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r.scope === 'org' ? 'Org' : r.scope === 'clinic' ? 'Clinic' : 'Doctor'}
                        color={r.scope === 'clinician' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{r.scope === 'org' ? 'All doctors, all clinics' : r.scope === 'clinic' ? r.clinic_name : r.clinician_name}</TableCell>
                    <TableCell align="right">{r.share_percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Card variant="outlined" sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
          <Typography variant="h6" fontWeight={600}>
            Monthly Payout Run
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              select
              size="small"
              label="Month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              sx={{ minWidth: 150 }}
            >
              {MONTHS.map((m, i) => (
                <MenuItem key={m} value={i + 1}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              type="number"
              label="Year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              sx={{ width: 110 }}
            />
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={runPayouts}
              disabled={running || !clinicId}
            >
              {running ? 'Running…' : 'Run Payouts'}
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportStatement} disabled={payouts.length === 0}>
              Export CSV
            </Button>
          </Stack>
        </Stack>

        {payoutsLoading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={28} />
          </Stack>
        ) : payoutsError ? (
          <Alert severity="error" action={<Button onClick={loadPayouts}>Retry</Button>}>
            {payoutsError}
          </Alert>
        ) : payouts.length === 0 ? (
          <Alert severity="info">No payouts computed for this month yet — click "Run Payouts" above.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Doctor</TableCell>
                  <TableCell align="right">Gross</TableCell>
                  <TableCell align="right">Share %</TableCell>
                  <TableCell align="right">Payout</TableCell>
                  <TableCell align="right">Visits</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.clinician_name}</TableCell>
                    <TableCell align="right">{formatInr(p.gross_amount)}</TableCell>
                    <TableCell align="right">{p.share_percentage_used}%</TableCell>
                    <TableCell align="right">{formatInr(p.payout_amount)}</TableCell>
                    <TableCell align="right">{p.appointment_count}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={p.status === 'approved' ? 'Approved' : 'Pending approval'}
                        color={p.status === 'approved' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {p.status !== 'approved' && (
                        <Button size="small" onClick={() => approvePayout(p.id)}>
                          Approve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  )
}
