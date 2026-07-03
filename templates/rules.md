# Project Rules & Conventions

> Read by the AI before drafting any spec (schema, contract, tasks, testcases)
> through `forge`. Rules here **override** forge's built-in defaults. Fill every
> `[TODO]`, delete sections that don't apply, and keep entries factual and
> enforceable — the AI follows this literally.

## Tech stack

- Language / runtime: [TODO]
- Framework: [TODO]
- Database / ORM: [TODO]
- Other key libraries: [TODO]

## Naming conventions

- Folders & files: [TODO — e.g. kebab-case]
- Classes / types: [TODO — e.g. PascalCase]
- Variables & functions: [TODO — e.g. camelCase]
- Database columns: [TODO — e.g. snake_case]
- API endpoints / paths: [TODO — e.g. kebab-case, `/v1/...`]
- Forbidden: [TODO — e.g. no underscores in file/folder names]

## Project & module structure

[TODO — describe the folder layout a new feature/module must follow, e.g.
`dto/`, `entities/`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`,
`*.module.ts`. The AI should scaffold new work to match this.]

## API design

- Versioning: [TODO — e.g. URI versioning `/v1/`, `/v2/`]
- Auth: [TODO — e.g. global guard, how to opt an endpoint out]
- Response envelope: [TODO — paste the exact success shape the API returns]
- Error shape & status: [TODO — how errors are formatted and what HTTP status is used]
- Pagination: [TODO — shape of paginated responses]

## Data & schema

- Audit/base fields every entity carries: [TODO — e.g. created_by, created_date, ...]
- Multi-tenancy / scoping: [TODO — or "n/a"]
- Type conventions: [TODO]

## Validation

[TODO — e.g. all inputs validated with a schema/validator; every field documented with an example]

## Security

[TODO — e.g. secrets from env only; encryption standard; required headers; rate limiting]

## Testing

- Framework: [TODO]
- Coverage threshold: [TODO — e.g. 80% branches/functions/lines/statements, build fails below]
- Test file convention: [TODO — e.g. `*.spec.ts` beside the file under test]
- Minimum per unit: [TODO — e.g. 1 success case + 1 error case]

## Documentation

[TODO — e.g. OpenAPI/Swagger required; every endpoint and DTO documented with examples]

## Tooling

- Lint: [TODO]
- Format: [TODO]
- Pre-commit checks: [TODO]

## Out of bounds

[TODO — anything the AI must never do in this codebase]
