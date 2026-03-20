# Changelog
All notable changes to this server will be documented here.

## [V0.3.1] - 2026-03-20

### Fixed
- Product images not displaying: changed inventory schema from a single `image` string to an `images` array to match Stripe's product data structure.
- Inconsistent API response shape between `GET /products` (list) and `GET /products/:productId` (detail): both endpoints now return the same normalized fields (`id`, `name`, `description`, `images`, `price`, `currency`).
- `GET /products` now returns `id` (Stripe product ID) instead of exposing internal MongoDB `_id` and `stripeId` fields, aligning with the frontend's expected contract.

## [V0.3.0] - 2026-01-05

### Changed
- Refactored product architecture to make Stripe the authoritative source of product details and pricing.
- Enforced inventory-based product approval before exposing Stripe products to the frontend.
- Standardized frontend–backend contract to use Stripe product IDs (`prod_*`) exclusively.
- Improved checkout flow to ensure same-tab redirects and consistent success/cancel behavior.
- Enhanced Stripe Checkout session creation with product metadata for clearer dashboard visibility.
- Standardized frontend API base resolution for local development and production environments.
- Separated shop listing and product detail styling into page-specific CSS for improved UX and maintainability.

### Added
- Authoritative product detail endpoint (`GET /products/:productId`) backed by Stripe and inventory validation.
- Inventory approval gate to prevent unauthorized or inactive Stripe products from being sold.
- Product metadata (Stripe product ID and name) attached to checkout sessions.
- Dedicated `success.html` and `cancel.html` flows aligned with Stripe-hosted checkout behavior.
- Page-specific CSS files for shop listing and product detail views.

### Fixed
- Stripe dashboard showing price-only entries without associated product context.
- Frontend checkout opening unintended blank tabs.
- Mismatch between frontend product identifiers and backend validation logic.
- Product detail page failures caused by incorrect ID usage.
- Confusion between hosted and embedded Stripe checkout behavior.

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
