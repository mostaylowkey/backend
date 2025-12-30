# Changelog
All notable changes to this server will be documented here.

## [V0.2.0] - 2025-12-29

### Changed
- Hardened server startup flow to ensure dependencies (MongoDB, critical init) are ready before accepting traffic.
- Standardized environment configuration for predictable boot behavior across environments.
- Replaced ad-hoc CORS logic with environment-driven allowlists for production and safer defaults for development.
- Introduced request-level tracing with unique request IDs and structured logging.
- Centralized error handling with consistent client responses and improved server-side diagnostics.
- Improved server resilience with safe crash handling and process restart compatibility.
- Added baseline HTTP hardening and proxy awareness for production deployments.
- Improved Stripe webhook handling safety while preserving raw body validation.
- Added graceful shutdown handling for clean deploys and restarts.
- Inventory sync is disabled by default and will only be enabled intentionally for controlled runs.
- Reconfigured backend to function as an Ecommerce store rather than a marketplace.

### Added
- `/health` and `/ready` endpoints for service and dependency status checks.

### Fixed
- Server starting before database availability.
- Difficult-to-trace request and error logs.
- Risky CORS behavior and mixed environment handling.


## [V0.1.0] - 2025-11-26
### Added
- Initial API release
- User authentication
****
