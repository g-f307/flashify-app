'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiClient, User, LoginRequest, RegisterRequest } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = user !== null

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      // TODO: Verify token with backend
      // For now, we'll just assume token is valid
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (data: LoginRequest) => {
    try {
      const tokenResponse = await apiClient.login(data)
      // TODO: Fetch user data after login
      // For now, we'll create a mock user object
      const mockUser: User = {
        id: 1,
        username: data.username,
        email: data.username.includes('@') ? data.username : '',
        is_active: true
      }
      setUser(mockUser)
    } catch (error) {
      throw error
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      const user = await apiClient.register(data)
      // Auto-login after registration
      await login({ username: data.username, password: data.password })
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    apiClient.logout()
    setUser(null)
  }

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}