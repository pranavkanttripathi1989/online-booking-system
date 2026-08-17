import { Provider } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

// Single-process in-memory PubSub — correct for this deployment's single
// backend container today. Swapping to a Redis-backed PubSub (RedisModule
// already provisions a client for this) is a one-line change to the
// `useValue` below if the backend is ever scaled to multiple instances;
// not built now since there is only one instance to fan events out to.
export const PUB_SUB = 'PUB_SUB';

export const PubSubProvider: Provider = {
  provide: PUB_SUB,
  useValue: new PubSub(),
};
