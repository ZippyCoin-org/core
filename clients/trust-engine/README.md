# ZippyCoin Trust Engine API

Backend service for ZippyCoin trust score calculations and wallet operations.

## Quick Start

```bash
# Install dependencies
yarn install

# Development
yarn dev

# Production build
yarn build
yarn start
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/trust/:address` - Get trust score for address
- `GET /api/price` - Get current ZPC price
- `POST /api/transactions` - Submit transaction
- `GET /api/wallet/:address/balance` - Get wallet balance
- `GET /api/wallet/:address/transactions` - Get transaction history

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production) 