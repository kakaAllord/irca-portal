/**
 * The registration form's own rules: the questions, their three languages,
 * the branching, the validation, the dial codes and the insights drawn from
 * the answers.
 *
 * Three repositories keep a copy, because three things need the same rules:
 * the form the visitor fills in, the backend that stores the answers, and the
 * Membership portal that reads them. A change here is made in all three
 * (src/shared/README.md).
 */
export * from './flow';
export * from './validate';
export * from './dialCodes';
export * from './insights';
export * from './types';
