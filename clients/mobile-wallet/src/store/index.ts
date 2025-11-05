import { configureStore, createSlice, PayloadAction, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WalletState {
  balance: string;
  trustScore: number;
  transactions: any[];
  currentAccount?: { name: string; address: string };
}

const initialState: WalletState = {
  balance: '0',
  trustScore: 0,
  transactions: [],
  currentAccount: { name: 'Account 1', address: 'zpc1placeholder' },
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    updateBalance(state, action: PayloadAction<string>) {
      state.balance = action.payload;
    },
    updateTrustScore(state, action: PayloadAction<number>) {
      state.trustScore = action.payload;
    },
    updateTransactions(state, action: PayloadAction<any[]>) {
      state.transactions = action.payload;
    },
  },
});

export const { updateBalance, updateTrustScore, updateTransactions } = walletSlice.actions;

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['wallet'],
};

const rootReducer = combineReducers({
  wallet: walletSlice.reducer,
});

const store = configureStore({
  reducer: persistReducer(persistConfig, rootReducer) as any,
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

const persistor = persistStore(store as any);

export { store, persistor };
export type RootState = ReturnType<typeof store.getState>; 