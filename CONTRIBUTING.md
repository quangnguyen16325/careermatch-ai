# Contributing

## Workflow

1. Update your local `develop` branch.
2. Create a focused branch named `feat/<ticket>-description`, `fix/<ticket>-description`, or `docs/<ticket>-description`.
3. Keep commits small and use Conventional Commits, for example `feat(api): add job approval endpoint`.
4. Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before opening a pull request.
5. Request at least one review. Do not merge when CI is failing.

## Pull request checklist

- The change maps to an agreed MVP requirement.
- Authorization, validation, and error handling are implemented.
- Personal data and CV access are protected.
- Tests cover the main path and relevant failure paths.
- API or setup documentation is updated.
- AI output is structured, explainable, and advisory only.

## Status transitions

Application status changes must follow the domain flow and create status history plus a notification event where applicable. Avoid directly updating status from controllers.
