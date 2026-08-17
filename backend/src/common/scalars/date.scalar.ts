import { Scalar, CustomScalar } from '@nestjs/graphql';
import { GraphQLError, Kind, ValueNode } from 'graphql';

// A never-otherwise-used marker class, purely as the @Scalar() type-reference
// token below — deliberately NOT the global `Date` class. Binding this scalar
// to `() => Date` the first time round hijacked every other field in the
// whole schema that uses the plain TS `Date` type (every created_at/
// updated_at/start_datetime/... across all 20+ modules), since NestJS
// resolves an implicit (no explicit `type:`) Date-typed field by matching
// the reflected class against whatever a @Scalar() is registered against —
// broke serialization for every timestamp field app-wide. Only
// `availableSlots`'s `date` argument explicitly references this marker
// (`@Args('date', { type: () => DateOnlyMarker })`), so nothing else is affected.
export class DateOnlyMarker {}

// Registers a GraphQL scalar literally named 'Date' — NestJS only
// auto-registers 'DateTime' for TS `Date`-typed fields, but
// frontend/src/graphql/queries.js's AVAILABLE_SLOTS_QUERY declares
// `$date: Date!` verbatim (a date-only YYYY-MM-DD value, no time-of-day).
// Without this, the query fails GraphQL validation before the resolver ever
// runs ("Unknown type \"Date\"."), confirmed live via the real booking
// wizard, not just curl (context/frontend-integration-audit.md follow-up —
// curl testing of availableSlots used inline literals, never exercised the
// $date: Date! typed-variable shape the frontend actually sends).
// Kept as a plain YYYY-MM-DD string end to end (matches AvailabilityService.
// availableSlots(clinicianId, date: string, ...)) rather than parsing to a
// JS Date, since nothing downstream needs Date semantics for this argument.
@Scalar('Date', () => DateOnlyMarker)
export class DateScalar implements CustomScalar<string, string> {
  description = 'Date-only scalar (YYYY-MM-DD), distinct from the DateTime scalar used elsewhere';

  parseValue(value: unknown): string {
    return this.validate(value);
  }

  serialize(value: unknown): string {
    return this.validate(value);
  }

  parseLiteral(ast: ValueNode): string {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError('Date must be a string in YYYY-MM-DD format');
    }
    return this.validate(ast.value);
  }

  private validate(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new GraphQLError('Date must be a string in YYYY-MM-DD format');
    }
    return value;
  }
}
