import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice';

const store = configureStore({
    reducer: {
        auth: authSlice,
        // You can add a postSlice here later as an assignment
    }
});

export default store;