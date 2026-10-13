"use client";

import { useDispatch, useSelector } from "react-redux";
import { setCredentials, logout as logoutAction, fetchCurrentUser } from "./slices/authSlice";

export const useAppDispatch = () => useDispatch();
export const useAppSelector = (selector) => useSelector(selector);

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, loading, isAuthenticated, error } = useSelector((state) => state.auth);

  const login = (token, user) => {
    dispatch(setCredentials({ token, user }));
  };

  const logout = () => {
    dispatch(logoutAction());
  };

  const refreshUser = () => {
    return dispatch(fetchCurrentUser());
  };

  return {
    user,
    token,
    loading,
    isAuthenticated,
    error,
    login,
    logout,
    refreshUser,
  };
};
