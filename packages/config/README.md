# @smartmed/config

Shared configuration for SmartMed applications.

## Usage

Import configuration in your application:

```typescript
import config from '@smartmed/config'

// Access API configuration
const apiUrl = config.api.url

// Check feature flags
if (config.features.enableVideoCall) {
  // Video call feature enabled
}
```

## Configuration Options

### API

- `url` - API endpoint URL
- `timeout` - Request timeout in milliseconds

### App

- `name` - Application name
- `version` - Application version
- `description` - Application description

### Features

- `enableAppointments` - Enable appointment system
- `enablePrescriptions` - Enable prescription system
- `enableNotifications` - Enable notification system
- `enableVideoCall` - Enable video call feature

### Pagination

- `defaultPageSize` - Default page size for listings
- `maxPageSize` - Maximum allowed page size

## Environment Variables

Configuration reads from environment variables:

- `API_URL` - Override API URL

## Tests

Run Jest tests for this package:

```bash
npm run test
# or from the monorepo root
npm run test --workspace @smartmed/config
```
