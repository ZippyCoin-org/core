export type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: { onWalletCreated: () => void } | undefined;
  ImportWallet: { onWalletCreated: () => void } | undefined;
  Unlock: { onUnlock: () => void } | undefined;
  Main: undefined;
  TransactionHistory: undefined;
  Settings: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Send: undefined;
  Receive: undefined;
  Trust: undefined;
  DeFi: undefined;
}; 