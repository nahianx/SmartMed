# SmartMed Documentation

Welcome to the SmartMed healthcare management system documentation.

## 📚 Documentation Structure

### 🏥 Core Features
- **[Profile Management](./profile-management/)** - Comprehensive user profile management system
  - [Feature Overview](./profile-management/README.md) - Complete feature documentation
  - [Migration Guide](./profile-management/migration-guide.md) - Developer setup and usage guide

### 🔧 API Documentation
- **[Backend Setup](./api/backend-setup.md)** - Server configuration and API testing guide

### 🧪 Testing Resources
- **[Postman Collections](../postman/)** - API testing collections
  - [Profile Management API](../postman/profile-management-api.postman_collection.json) - Complete API test suite

## 🚀 Quick Start

1. **Profile Management Feature**
   - Read the [Profile Management Overview](./profile-management/README.md)
   - Follow the [Migration Guide](./profile-management/migration-guide.md) for setup
   - Test APIs using the [Backend Setup Guide](./api/backend-setup.md)

2. **API Testing**
   - Import the [Postman Collection](../postman/profile-management-api.postman_collection.json)
   - Configure environment variables as described in [Backend Setup](./api/backend-setup.md)
   - Test all 21 Profile Management endpoints

## 📁 Project Structure

```
SmartMed/
├── docs/                           # 📚 All documentation
│   ├── README.md                   # This file
│   ├── profile-management/         # Profile feature docs
│   │   ├── README.md              # Feature overview
│   │   └── migration-guide.md     # Developer guide
│   └── api/                       # API documentation
│       └── backend-setup.md       # Server setup guide
├── postman/                       # 🧪 API testing collections
│   └── profile-management-api.postman_collection.json
├── apps/                          # 🏗️ Applications
│   ├── web/                       # Next.js frontend
│   └── api/                       # Express.js backend
├── packages/                      # 📦 Shared packages
│   ├── ui/                        # UI components
│   ├── types/                     # TypeScript types
│   ├── database/                  # Prisma database
│   └── config/                    # Configuration
└── ...
```

## 🔍 Feature Status

| Feature | Status | Documentation | Tests |
|---------|--------|---------------|-------|
| Profile Management | ✅ Complete | [View](./profile-management/README.md) | ✅ Comprehensive |
| Authentication | ✅ Complete | [API Guide](./api/backend-setup.md) | ✅ Ready |
| Doctor Features | ✅ Complete | [Profile Docs](./profile-management/README.md) | ✅ Ready |
| Patient Features | ✅ Complete | [Profile Docs](./profile-management/README.md) | ✅ Ready |

## 🛠️ Development

- **Tech Stack**: Next.js 14, TypeScript, PostgreSQL, Prisma, React Query, Zustand
- **API**: Express.js with comprehensive REST endpoints
- **Testing**: Jest, React Testing Library, Postman collections
- **Documentation**: Markdown with comprehensive guides

## 📝 Contributing

1. Read the relevant documentation in `docs/`
2. Follow setup instructions in migration guides
3. Use Postman collections for API testing
4. Maintain documentation for new features

---

*Last updated: November 20, 2024*