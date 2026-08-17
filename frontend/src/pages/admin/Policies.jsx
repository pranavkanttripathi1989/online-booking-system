import React, { useState, useEffect } from 'react';
import { useApolloClient, gql } from '@apollo/client';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip, Divider,
  Switch, FormControlLabel, TextField, Select, MenuItem, FormControl,
  InputLabel, Alert, Paper, Tab, Tabs, IconButton, Tooltip,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';

// ─── Cancellation Rules GraphQL ──────────────────────────────────────────────
const GET_CANCELLATION_RULES = gql`
  query GetCancellationRules {
    cancellationRules {
      id name description hours_before fee_type fee_amount clinic_id is_active priority
      clinic { id name }
    }
    clinics { id name }
  }
`;
const CREATE_RULE = gql`mutation CreateCancellationRule($input:CreateCancellationRuleInput!){createCancellationRule(input:$input){success userErrors{message}}}`;
const UPDATE_RULE = gql`mutation UpdateCancellationRule($id:ID!,$input:UpdateCancellationRuleInput!){updateCancellationRule(id:$id,input:$input){success userErrors{message}}}`;
const DELETE_RULE = gql`mutation DeleteCancellationRule($id:ID!){deleteCancellationRule(id:$id){success userErrors{message}}}`;

const defaultRule = { name:'', description:'', hours_before:24, fee_type:'percentage', fee_amount:0, clinic_id:'', priority:1, is_active:true };

const POLICIES = [
  { id: 1, key: 'cancellation',   label: 'Cancellation Policy',   value: '24',    unit: 'hours',   description: 'Patients can cancel for free up to this many hours before their appointment.' },
  { id: 2, key: 'lateFee',        label: 'Late Cancellation Fee',  value: '25',    unit: '₹',       description: 'Fee charged when a patient cancels inside the cancellation window.' },
  { id: 3, key: 'noShow',         label: 'No-Show Fee',            value: '85',    unit: '₹',       description: 'Fee charged when a patient does not attend without cancelling.' },
  { id: 4, key: 'slotBuffer',     label: 'Slot Buffer Time',       value: '10',    unit: 'minutes', description: 'Gap automatically added between consecutive appointments.' },
  { id: 5, key: 'maxReschedule',  label: 'Max Reschedules/Month',  value: '3',     unit: 'times',   description: 'Maximum number of times a patient can reschedule per calendar month.' },
  { id: 6, key: 'retention',      label: 'Data Retention Period',  value: '7',     unit: 'years',   description: 'Patient records are retained for this period per UK GDPR requirements.' },
];

const SECURITY = [
  { key: 'mfaRequired',     label: 'Require MFA for all staff',    default: true,  help: 'Forces all non-patient accounts to set up two-factor authentication.' },
  { key: 'sessionTimeout',  label: 'Auto-logout after 30 min idle', default: true,  help: 'Inactive sessions will be terminated automatically.' },
  { key: 'auditLog',        label: 'Enable audit logging',          default: true,  help: 'Record all data access and user actions for compliance.' },
  { key: 'dataExport',      label: 'Allow patient data export',     default: false, help: 'Allows patients to download their personal data (GDPR Art.20).' },
  { key: 'ipWhitelist',     label: 'IP whitelist for admin',        default: false, help: 'Restrict admin panel access to specified IP addresses.' },
];

export default function AdminPolicies() {
  const client = useApolloClient();
  const [tab, setTab] = useState(0);
  const [policies, setPolicies] = useState(POLICIES);
  const [security, setSecurity] = useState(
    Object.fromEntries(SECURITY.map((s) => [s.key, s.default]))
  );
  const [saved, setSaved] = useState(false);

  // ── Cancellation Rules state ────────────────────────────────────────────
  const [rules, setRules]             = useState([]);
  const [clinics, setClinics]         = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editRule, setEditRule]       = useState(null);
  const [ruleForm, setRuleForm]       = useState(defaultRule);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId]   = useState(null);
  const [ruleError, setRuleError]     = useState(null);
  const [ruleSuccess, setRuleSuccess] = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  const loadRules = async () => {
    try {
      const { data } = await client.query({ query: GET_CANCELLATION_RULES, fetchPolicy: 'network-only' });
      setRules(data?.cancellationRules || []);
      setClinics(data?.clinics || []);
    } catch (err) { setRuleError(err.message); }
  };
  useEffect(() => { loadRules(); }, []); // eslint-disable-line

  const showRuleSuccess = (msg) => { setRuleSuccess(msg); setTimeout(() => setRuleSuccess(null), 3000); };
  const setRF = (k, v) => setRuleForm(p => ({ ...p, [k]: v }));
  const resetRuleForm = () => { setRuleForm(defaultRule); setEditRule(null); setShowRuleForm(false); setRuleError(null); };

  const handleRuleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setRuleError(null);
    const input = { ...ruleForm, hours_before: parseInt(ruleForm.hours_before), fee_amount: parseFloat(ruleForm.fee_amount), priority: parseInt(ruleForm.priority), clinic_id: ruleForm.clinic_id || null };
    try {
      if (editRule) {
        const { data: r } = await client.mutate({ mutation: UPDATE_RULE, variables: { id: editRule.id, input } });
        if (!r?.updateCancellationRule?.success) throw new Error(r?.updateCancellationRule?.userErrors?.[0]?.message);
        showRuleSuccess('Rule updated.');
      } else {
        const { data: r } = await client.mutate({ mutation: CREATE_RULE, variables: { input } });
        if (!r?.createCancellationRule?.success) throw new Error(r?.createCancellationRule?.userErrors?.[0]?.message);
        showRuleSuccess('Rule created.');
      }
      resetRuleForm(); loadRules();
    } catch (err) { setRuleError(err.message); }
    finally { setSubmitting(false); }
  };

  const confirmDeleteRule = async () => {
    setConfirmOpen(false);
    try {
      const { data: r } = await client.mutate({ mutation: DELETE_RULE, variables: { id: deletingId } });
      if (!r?.deleteCancellationRule?.success) throw new Error(r?.deleteCancellationRule?.userErrors?.[0]?.message);
      showRuleSuccess('Rule deleted.'); loadRules();
    } catch (err) { setRuleError(err.message); }
    setDeletingId(null);
  };

  const updatePolicy = (id, value) => setPolicies((prev) => prev.map((p) => p.id === id ? { ...p, value } : p));
  const saveAll = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>Policies &amp; Compliance</Typography>
          <Typography variant="body2" color="text.secondary">Booking rules, security settings, and GDPR compliance</Typography>
        </Box>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={saveAll}>Save All Changes</Button>
      </Stack>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>✅ Policy settings saved successfully.</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #D0E8EA' }}>
        <Tab label="Booking Policies" />
        <Tab label="Security &amp; Privacy" />
        <Tab label="GDPR &amp; Compliance" />
        <Tab label="Cancellation Rules" />
      </Tabs>

      {/* Booking Policies */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {policies.map((policy) => (
            <Grid item xs={12} sm={6} key={policy.id}>
              <Card sx={{ border: '1px solid #D0E8EA' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography fontWeight={700} sx={{ mb: 0.5 }}>{policy.label}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{policy.description}</Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <TextField
                      size="small" type="number" value={policy.value}
                      onChange={(e) => updatePolicy(policy.id, e.target.value)}
                      sx={{ width: 100 }}
                    />
                    <Chip label={policy.unit} size="small" sx={{ bgcolor: '#E8F8F9', color: '#006D77', fontWeight: 700 }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Security */}
      {tab === 1 && (
        <Stack spacing={2} sx={{ maxWidth: 680 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
                <SecurityIcon sx={{ color: '#006D77' }} />
                <Typography variant="h5" fontWeight={700}>Security Settings</Typography>
              </Stack>
              <Stack spacing={2} divider={<Divider />}>
                {SECURITY.map((s) => (
                  <Stack key={s.key} direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1} sx={{ pr: 2 }}>
                      <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.help}</Typography>
                    </Box>
                    <Switch
                      checked={security[s.key]}
                      onChange={(e) => setSecurity({ ...security, [s.key]: e.target.checked })}
                    />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {security.ipWhitelist && (
            <Card sx={{ border: '1px solid #D97706' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Allowed IP Addresses</Typography>
                <TextField fullWidth multiline rows={3} placeholder="Enter one IP per line, e.g.&#10;192.168.1.0/24&#10;10.0.0.1" size="small" />
                <Button size="small" variant="outlined" sx={{ mt: 1 }}>Save IPs</Button>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* GDPR */}
      {tab === 2 && (
        <Stack spacing={3} sx={{ maxWidth: 680 }}>
          <Alert severity="info" icon={<PrivacyTipIcon />}>
            HealthSync is configured to process personal data in accordance with UK GDPR and the Data Protection Act 2018.
          </Alert>

          {[
            { icon: <LockIcon />,         title: 'Data Processing Agreement',     desc: 'Signed 14 Jan 2024 · Expires 14 Jan 2027', action: 'Download PDF' },
            { icon: <PrivacyTipIcon />,   title: 'Privacy Policy Version',        desc: 'v3.2 · Last updated 1 Mar 2026',            action: 'Update' },
            { icon: <ScheduleIcon />,     title: 'Right to Erasure (GDPR Art.17)',desc: 'Manual review required within 30 days',    action: 'View Requests' },
            { icon: <AccessTimeIcon />,   title: 'Data Breach Response Plan',     desc: 'Last tested: Oct 2025 · Notification: 72h', action: 'View Plan' },
          ].map(({ icon, title, desc, action }) => (
            <Card key={title} sx={{ border: '1px solid #D0E8EA' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: '#006D77' }}>{icon}</Box>
                    <Box>
                      <Typography fontWeight={700}>{title}</Typography>
                      <Typography variant="body2" color="text.secondary">{desc}</Typography>
                    </Box>
                  </Stack>
                  <Button variant="outlined" size="small">{action}</Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Cancellation Rules */}
      {tab === 3 && (
        <Box>
          {ruleSuccess && <Alert severity="success" sx={{ mb: 2 }}>{ruleSuccess}</Alert>}
          {ruleError   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setRuleError(null)}>{ruleError}</Alert>}

          <Box mb={2}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetRuleForm(); setShowRuleForm(p => !p); }}>Add Cancellation Rule</Button>
          </Box>

          {showRuleForm && (
            <Card sx={{ mb: 3, p: 2 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>{editRule ? 'Edit Rule' : 'New Cancellation Rule'}</Typography>
              <Box component="form" onSubmit={handleRuleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><TextField fullWidth required size="small" label="Rule Name" value={ruleForm.name} onChange={e => setRF('name', e.target.value)} /></Grid>
                  <Grid item xs={6} sm={3}><TextField fullWidth required size="small" type="number" label="Hours Before" value={ruleForm.hours_before} onChange={e => setRF('hours_before', e.target.value)} /></Grid>
                  <Grid item xs={6} sm={3}><TextField fullWidth required size="small" type="number" label="Priority" value={ruleForm.priority} onChange={e => setRF('priority', e.target.value)} /></Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small"><InputLabel>Fee Type</InputLabel>
                      <Select label="Fee Type" value={ruleForm.fee_type} onChange={e => setRF('fee_type', e.target.value)}>
                        <MenuItem value="percentage">Percentage (%)</MenuItem>
                        <MenuItem value="fixed">Fixed Amount (₹)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={4}><TextField fullWidth required size="small" type="number" label={ruleForm.fee_type === 'percentage' ? 'Fee (%)' : 'Fee (₹)'} value={ruleForm.fee_amount} onChange={e => setRF('fee_amount', e.target.value)} /></Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small"><InputLabel>Clinic (leave blank = global)</InputLabel>
                      <Select label="Clinic (leave blank = global)" value={ruleForm.clinic_id} onChange={e => setRF('clinic_id', e.target.value)}>
                        <MenuItem value="">Global (all clinics)</MenuItem>
                        {clinics.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}><TextField fullWidth size="small" label="Description" multiline rows={2} value={ruleForm.description} onChange={e => setRF('description', e.target.value)} /></Grid>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={1}>
                      <Button type="submit" variant="contained" disabled={submitting}>{editRule ? 'Update' : 'Create'}</Button>
                      <Button variant="outlined" onClick={resetRuleForm}>Cancel</Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          )}

          <Stack spacing={2}>
            {[...rules].sort((a, b) => a.priority - b.priority).map(rule => (
              <Card key={rule.id}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                        <Typography fontWeight={700}>{rule.name}</Typography>
                        <Chip label={`Priority ${rule.priority}`} size="small" />
                        <Chip label={rule.is_active ? 'Active' : 'Inactive'} size="small" color={rule.is_active ? 'success' : 'default'} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Cancel within {rule.hours_before}h → {rule.fee_type === 'percentage' ? `${rule.fee_amount}%` : `₹${rule.fee_amount}`} fee · {rule.clinic?.name || 'All clinics'}
                      </Typography>
                      {rule.description && <Typography variant="caption" color="text.secondary">{rule.description}</Typography>}
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditRule(rule); setRuleForm({ name: rule.name, description: rule.description || '', hours_before: rule.hours_before, fee_type: rule.fee_type, fee_amount: rule.fee_amount, clinic_id: rule.clinic_id || '', priority: rule.priority, is_active: rule.is_active }); setShowRuleForm(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { setDeletingId(rule.id); setConfirmOpen(true); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {rules.length === 0 && <Card><CardContent sx={{ textAlign: 'center', py: 4 }}><Typography color="text.secondary">No cancellation rules yet. Add one above.</Typography></CardContent></Card>}
          </Stack>

          <ConfirmDialog isOpen={confirmOpen} title="Delete Rule" message="Delete this cancellation rule?" onConfirm={confirmDeleteRule} onCancel={() => { setConfirmOpen(false); setDeletingId(null); }} />
        </Box>
      )}
    </Box>
  );
}
