import { ObjectType, Field, ID } from '@nestjs/graphql';

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
