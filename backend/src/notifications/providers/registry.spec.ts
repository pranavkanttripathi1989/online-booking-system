const snsSendMock = jest.fn();
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({ send: snsSendMock })),
  PublishCommand: jest.fn().mockImplementation((input) => input),
}));

import { getProvider, listProviders } from './registry';
import { validateCredentials } from './provider.interface';
import { msg91Provider } from './msg91.provider';
import { gupshupProvider } from './gupshup.provider';
import { twilioProvider } from './twilio.provider';
import { awsSnsProvider } from './aws-sns.provider';

const originalFetch = global.fetch;

describe('provider registry', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('lists all 4 registered providers, each declaring the sms channel', () => {
    const providers = listProviders();
    expect(providers.map((p) => p.id).sort()).toEqual(['aws_sns', 'gupshup', 'msg91', 'twilio']);
    expect(providers.every((p) => p.channel === 'sms')).toBe(true);
  });

  it('getProvider resolves a known id and returns undefined for an unknown one', () => {
    expect(getProvider('msg91')).toBe(msg91Provider);
    expect(getProvider('nonexistent_vendor')).toBeUndefined();
  });

  describe('validateCredentials', () => {
    it('flags a missing required field by its human label', () => {
      const error = validateCredentials(msg91Provider, { authkey: 'k' }); // sender_id missing
      expect(error).toContain('Sender ID');
      expect(error).toContain('MSG91');
    });

    it('passes when every required field is present (optional fields may be omitted)', () => {
      expect(validateCredentials(msg91Provider, { authkey: 'k', sender_id: 'MEDIBK' })).toBeNull();
    });

    it('validates each provider\'s own declared required fields', () => {
      expect(validateCredentials(gupshupProvider, { user_id: 'u', password: 'p' })).toContain('Sender ID');
      expect(validateCredentials(gupshupProvider, { user_id: 'u', password: 'p', sender_id: 's' })).toBeNull();

      expect(validateCredentials(twilioProvider, { account_sid: 'a' })).toContain('Auth Token');
      expect(
        validateCredentials(twilioProvider, { account_sid: 'a', auth_token: 't', from_number: '+1' }),
      ).toBeNull();

      expect(validateCredentials(awsSnsProvider, { access_key_id: 'a' })).toContain('Secret Access Key');
      expect(
        validateCredentials(awsSnsProvider, { access_key_id: 'a', secret_access_key: 's', region: 'ap-south-1' }),
      ).toBeNull();
    });
  });

  describe('send() — every provider catches its own errors rather than throwing', () => {
    it('msg91 reports a non-ok HTTP response as a failed (not thrown) send', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: () => Promise.resolve('bad authkey') });
      const result = await msg91Provider.send({ authkey: 'x', sender_id: 'MEDIBK' }, '+919810000000', 'hi');
      expect(result.sent).toBe(false);
      expect(result.error).toContain('401');
    });

    it('msg91 reports success on an ok response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      const result = await msg91Provider.send({ authkey: 'x', sender_id: 'MEDIBK' }, '+919810000000', 'hi');
      expect(result.sent).toBe(true);
    });

    it('gupshup treats a non-success response body as a failed send, not just a non-ok status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: { status: 'error', details: 'invalid mask' } }),
      });
      const result = await gupshupProvider.send({ user_id: 'u', password: 'p', sender_id: 's' }, '+919810000000', 'hi');
      expect(result.sent).toBe(false);
      expect(result.error).toBe('invalid mask');
    });

    it('twilio never throws when the underlying request rejects (e.g. network failure)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await twilioProvider.send(
        { account_sid: 'AC1', auth_token: 'tok', from_number: '+1' },
        '+919810000000',
        'hi',
      );
      expect(result.sent).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
    });

    it('aws_sns reports success when the SDK publish resolves', async () => {
      snsSendMock.mockResolvedValue({ MessageId: 'msg-1' });
      const result = await awsSnsProvider.send(
        { access_key_id: 'k', secret_access_key: 's', region: 'ap-south-1' },
        '+919810000000',
        'hi',
      );
      expect(result.sent).toBe(true);
    });

    it('aws_sns never throws when the SDK client rejects (e.g. bad credentials)', async () => {
      snsSendMock.mockRejectedValue(new Error('The security token included in the request is invalid'));
      const result = await awsSnsProvider.send(
        { access_key_id: 'bad', secret_access_key: 'bad', region: 'ap-south-1' },
        '+919810000000',
        'hi',
      );
      expect(result.sent).toBe(false);
      expect(result.error).toBe('The security token included in the request is invalid');
    });
  });
});
