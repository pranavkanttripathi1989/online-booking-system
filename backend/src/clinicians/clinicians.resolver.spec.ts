import { Test, TestingModule } from '@nestjs/testing';
import { CliniciansResolver } from './clinicians.resolver';
import { CliniciansService } from './clinicians.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// BUG028 — email()/phone() are the only real logic on this resolver
// (every other handler is a pure delegation to CliniciansService); this
// spec covers exactly that gating, not a full re-test of the service
// itself.
describe('CliniciansResolver — email/phone field-level gating (BUG028)', () => {
  let resolver: CliniciansResolver;

  const clinicianRow = { id: 'clin-1', email: 'sarah@medibook.dev', phone: '9876543210' };
  const managerUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const clinicianUser: JwtPayload = { sub: 'u2', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: 'clin-2' } as JwtPayload;
  const patientUser: JwtPayload = { sub: 'u3', roles: ['patient'], client_org_id: 'org-a', patient_id: 'pat-1', clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CliniciansResolver, { provide: CliniciansService, useValue: {} }],
    }).compile();
    resolver = module.get(CliniciansResolver);
  });

  it('returns the real email for a manager caller', () => {
    expect(resolver.email(clinicianRow, managerUser)).toBe('sarah@medibook.dev');
  });

  it('returns the real phone for a clinician caller', () => {
    expect(resolver.phone(clinicianRow, clinicianUser)).toBe('9876543210');
  });

  it('withholds email from a patient caller', () => {
    expect(resolver.email(clinicianRow, patientUser)).toBeNull();
  });

  it('withholds phone from a patient caller', () => {
    expect(resolver.phone(clinicianRow, patientUser)).toBeNull();
  });

  it('returns null rather than undefined when the underlying row has no email set', () => {
    expect(resolver.email({ id: 'clin-2' }, managerUser)).toBeNull();
  });
});
