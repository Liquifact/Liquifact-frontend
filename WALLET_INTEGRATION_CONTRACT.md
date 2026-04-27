# Wallet Integration Contract

## Overview
This document outlines the contract for implementing actual Stellar wallet integration in the Liquifact frontend. The current UI implementation uses mock data and states for development and testing.

## Current Implementation Status
- ✅ UI state machine with 6 connection states
- ✅ Accessibility features (ARIA labels, screen reader support)
- ✅ Responsive design
- ✅ Helper text and error messaging
- ✅ Visual status indicators
- ❌ Actual wallet connection logic (mocked)

## Wallet States
```javascript
const WALLET_STATES = {
  DISCONNECTED: 'disconnected',    // Initial state, wallet not connected
  CONNECTING: 'connecting',        // Connection in progress
  CONNECTED: 'connected',          // Successfully connected
  ERROR: 'error',                  // Connection failed
  WRONG_NETWORK: 'wrong_network',  // Connected to wrong network
  NO_WALLET: 'no_wallet'           // No wallet detected
};
```

## Required Implementation

### 1. Wallet Detection
- Check for installed Stellar wallets (Freighter, Albedo, etc.)
- Update `NO_WALLET` state based on detection

### 2. Connection Logic
Replace the mock `connectWallet()` function with actual wallet integration:

```javascript
const connectWallet = async () => {
  // TODO: Implement actual wallet connection
  // 1. Detect available wallets
  // 2. Request connection
  // 3. Get account info
  // 4. Verify network (public vs testnet)
  // 5. Handle errors appropriately
};
```

### 3. Wallet Data Structure
Expected wallet data shape:
```javascript
const walletData = {
  address: 'G...',           // Stellar public key
  network: 'public',         // 'public' or 'testnet'
  balance: '1,234.56 XLM',   // Formatted balance string
  walletType: 'freighter'    // Wallet provider name
};
```

### 4. Network Verification
- Check if connected wallet is on correct network (public mainnet)
- Update `WRONG_NETWORK` state if on testnet
- Provide network switching guidance

### 5. Error Handling
- Handle wallet rejection (user cancels)
- Handle network errors
- Handle insufficient permissions
- Update `ERROR` state with appropriate messages

## Supported Wallets
Target wallets for integration:
1. **Freighter** (primary)
2. **Albedo** (secondary)
3. **Rabet** (tertiary)

## Integration Points

### Component Interface
The `WalletStatus` component exposes:
- `walletState` - Current connection state
- `walletData` - Connected wallet information
- `connectWallet()` - Initiate connection
- `disconnectWallet()` - Terminate connection

### Global State Management
Consider implementing global state (Context/Zustand) for:
- Wallet connection status across app
- Transaction signing
- Network operations

## Security Considerations
- Validate Stellar addresses
- Verify network before transactions
- Secure storage of connection state
- Handle wallet disconnection gracefully

## Testing Requirements
- Test all wallet states
- Test connection flow end-to-end
- Test error scenarios
- Test network switching
- Test multiple wallet types

## Dependencies
Add required wallet SDKs:
```bash
npm install @stellar/freighter-api
# Other wallet SDKs as needed
```

## Next Steps
1. Install wallet SDKs
2. Implement actual connection logic
3. Add transaction signing capabilities
4. Test with real wallets
5. Update documentation with real wallet flows
