import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { NotificationProvider } from './provider.interface';

// AWS SNS requires SigV4 request signing -- using the official SDK rather
// than hand-rolling that, unlike the other providers' plain fetch() calls.
// Same honest caveat as msg91.provider.ts -- no real credentials to test
// delivery against yet.
export const awsSnsProvider: NotificationProvider = {
  id: 'aws_sns',
  label: 'AWS SNS',
  channel: 'sms',
  fields: [
    { key: 'access_key_id', label: 'Access Key ID', type: 'text', required: true },
    { key: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true },
    { key: 'region', label: 'Region', type: 'text', required: true },
  ],
  async send(credentials, to, message) {
    try {
      const client = new SNSClient({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.access_key_id,
          secretAccessKey: credentials.secret_access_key,
        },
      });
      await client.send(new PublishCommand({ PhoneNumber: to, Message: message }));
      return { sent: true };
    } catch (e: any) {
      return { sent: false, error: e.message ?? 'AWS SNS request failed' };
    }
  },
};
