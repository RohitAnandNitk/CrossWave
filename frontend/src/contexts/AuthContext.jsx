import react, {createContext, useContext, useEffect, useState} from "react";
import {authAPI} from "../api/api.js";


const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const {data} = await authAPI.getCurrentUser();
      setUser(data);
    }catch (e) {
      console.error('Auth check failed:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Only check auth status for protected routes
    const publicPaths = [ '/login', '/register'];
    if (!publicPaths.includes(location.pathname)) {
      checkAuthStatus();
    } else {
      // For public routes, just set loading to false
      setLoading(false);
    }
  }, [location.pathname])

  const login = async(email, password) => {
    try{
      const {data} = await authAPI.login(email, password);
      setUser(data.user);
      setLoading(false);
      return data.user
    }catch (e) {
      console.error('Login failed:', e);
      throw e;
    }
  }

  const logout = async () => {
    try{
      await authAPI.logout();
      setUser(null);
    }catch (e) {
      console.error('Some error occurred:', e);
      throw e;
    }
  }

  const register = async(userData) => {
    try{
      const { data } = await authAPI.register(userData);
      setUser(data.user);
      return data.user;
    }catch (e) {
      console.error('Registration failed:', e);
      throw e;
    }

  }

  const value = {
    user,
    login,
    logout,
    register,
  }

  return (
     <AuthContext.Provider value={value}>
       {!loading && children}
     </AuthContext.Provider>
  )
}