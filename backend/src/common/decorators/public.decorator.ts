import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a resolver as not requiring authentication, for use once GqlAuthGuard
// is registered globally (see app.module.ts) — login/register/refresh/OTP/
// forgot-password are the only resolvers that should ever carry this.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
