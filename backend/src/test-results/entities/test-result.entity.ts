import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('TestResultValue')
export class TestResultValueType {
  @Field() name: string;
  @Field() value: string;
  @Field() ref: string;
  @Field() flag: string;
}

// Registered 'TestResult' — new domain, no pre-existing contract to match
// (frontend/src/pages/test-results/index.jsx was 100% mock before this
// increment). Field names chosen to match that page's MOCK_RESULTS shape
// exactly, so the frontend rewrite is a drop-in swap, not a redesign.
@ObjectType('TestResult')
export class TestResultType {
  @Field(() => ID) id: string;
  @Field() patient: string; // patient_name, exposed under the frontend's existing field name
  // context/open-questions.md #20 -- the column already existed (F-08/
  // BUG027), just was never exposed to GraphQL. Nullable: free-text/
  // walk-in results predate real patient linkage.
  @Field(() => ID, { nullable: true }) patient_id?: string;
  @Field() test: string; // test_name
  @Field() ordered_by: string; // ordered_by_name
  @Field() date_ordered: string;
  @Field({ nullable: true }) date_completed?: string;
  @Field() status: string;
  @Field() type: string; // test_type
  // TC-PAT-API-010: withheld (empty array) until status === 'completed' —
  // enforced in the service, not just this field being nullable.
  @Field(() => [TestResultValueType]) values: TestResultValueType[];
}

// REQ133 (F-14 residue) — findAll() previously returned a plain, unbounded
// array (no `take` at all beyond the global 200-row clampTakeMiddleware
// safety net). Migrated to this codebase's own established {data,
// paginatorInfo} convention (AppointmentPaginatedType et al.) rather than
// inventing a shared generic type, matching every other paginated domain's
// own dedicated per-domain type.
@ObjectType('TestResultPaginatorInfo')
export class TestResultPaginatorInfoType {
  @Field(() => Int) count: number;
  @Field(() => Int) currentPage: number;
  @Field(() => Int) firstItem: number;
  @Field() hasMorePages: boolean;
  @Field(() => Int) lastItem: number;
  @Field(() => Int) lastPage: number;
  @Field(() => Int) perPage: number;
  @Field(() => Int) total: number;
}

@ObjectType('TestResultPaginated')
export class TestResultPaginatedType {
  @Field(() => [TestResultType]) data: TestResultType[];
  @Field(() => TestResultPaginatorInfoType) paginatorInfo: TestResultPaginatorInfoType;
}
