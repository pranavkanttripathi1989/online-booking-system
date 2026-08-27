import { Reflector } from '@nestjs/core';
import { TelemedicineResolver } from './telemedicine.resolver';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

// P1-16 — the metadata/guard wiring is asserted directly; the real
// self/org-scoping it delegates to is exercised in
// telemedicine.service.spec.ts and encounters.service.spec.ts.
describe('TelemedicineResolver — role gating', () => {
  const reflector = new Reflector();

  it('joinTelemedicineSession is reachable by both the patient and the clinician on the call, plus staff', () => {
    const roles = reflector.get(ROLES_KEY, TelemedicineResolver.prototype.joinTelemedicineSession);
    expect(roles).toContain('patient');
    expect(roles).toContain('clinician');
  });

  it('consentToTelemedicineRecording is clinician-only — recording consent is not the patient\'s decision to grant here', () => {
    const roles = reflector.get(ROLES_KEY, TelemedicineResolver.prototype.consentToTelemedicineRecording);
    expect(roles).toEqual(['clinician']);
  });
});
