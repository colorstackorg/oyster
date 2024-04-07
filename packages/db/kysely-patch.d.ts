// This file is needed in order to fix a Typescript error when implementing
// a dynamic selection of columns ("This is likely not portable. A type
// annotation is necessary."). Though it's likely something that Typescript
// needs to fix, it can be fixed by exporting the necessary dynamic types from
// the "kysely" package. Since Kysely doesn't export them by default, we need to
// manually export them in this declaration file.

import type {} from '../../node_modules/kysely/dist/esm/dynamic/dynamic-reference-builder';
import type {} from '../../node_modules/kysely/dist/esm/util/type-utils';

declare module 'kysely' {
  export * from '../../node_modules/kysely/dist/esm/dynamic/dynamic-reference-builder';
  export * from '../../node_modules/kysely/dist/esm/util/type-utils';
}
