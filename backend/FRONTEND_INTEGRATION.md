# 🎨 Integración con Frontend - Firebase

Guía completa para integrar el backend de autenticación con Firebase en tu aplicación frontend.

## 📦 Instalación en el Frontend

```bash
npm install firebase
```

## 🔧 Configuración de Firebase

### 1. Crear archivo de configuración

```javascript
// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Authentication
export const auth = getAuth(app);
```

## 📝 Ejemplos de Uso

### Registro de Usuario

```javascript
// src/services/authService.js
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

export const registerUser = async (email, password, nombre, rol) => {
  try {
    // 1. Crear usuario en Firebase (solo para autenticación)
    // El backend creará el usuario completo
    
    // 2. Llamar al backend para registro completo
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        nombre,
        rol
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    console.log('Usuario registrado:', data);
    return data;
  } catch (error) {
    console.error('Error en registro:', error);
    throw error;
  }
};
```

### Login

```javascript
// src/services/authService.js
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

export const loginUser = async (email, password) => {
  try {
    // 1. Login con Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // 2. Obtener el ID Token
    const idToken = await userCredential.user.getIdToken();

    // 3. Enviar token al backend para establecer sesión
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Importante para cookies
      body: JSON.stringify({ idToken })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    console.log('Login exitoso:', data);
    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};
```

### Logout

```javascript
// src/services/authService.js
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

export const logoutUser = async () => {
  try {
    // 1. Logout del backend (limpiar cookie)
    await fetch('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    // 2. Logout de Firebase
    await signOut(auth);

    console.log('Logout exitoso');
  } catch (error) {
    console.error('Error en logout:', error);
    throw error;
  }
};
```

### Obtener Perfil

```javascript
// src/services/userService.js
import { auth } from '../config/firebase';

export const getUserProfile = async () => {
  try {
    // Obtener token actualizado
    const idToken = await auth.currentUser.getIdToken();

    const response = await fetch('http://localhost:3000/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    throw error;
  }
};
```

### Acceder a Rutas Protegidas

```javascript
// src/services/api.js
import { auth } from '../config/firebase';

// Helper para hacer peticiones autenticadas
export const authenticatedFetch = async (url, options = {}) => {
  try {
    // Verificar que haya un usuario autenticado
    if (!auth.currentUser) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener token actualizado
    const idToken = await auth.currentUser.getIdToken();

    // Agregar token al header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${idToken}`
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Para cookies
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Error en petición:', error);
    throw error;
  }
};

// Ejemplo de uso: Obtener dashboard
export const getDashboard = async () => {
  return authenticatedFetch('http://localhost:3000/api/employee/dashboard');
};

// Ejemplo de uso: Obtener usuarios (admin)
export const getAllUsers = async () => {
  return authenticatedFetch('http://localhost:3000/api/admin/users');
};

// Ejemplo de uso: Eliminar usuario (admin)
export const deleteUser = async (userId) => {
  return authenticatedFetch(`http://localhost:3000/api/admin/users/${userId}`, {
    method: 'DELETE'
  });
};

// Ejemplo de uso: Actualizar rol (admin)
export const updateUserRole = async (userId, rol) => {
  return authenticatedFetch(`http://localhost:3000/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rol })
  });
};
```

## ⚛️ Ejemplo con React

### Context de Autenticación

```javascript
// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { loginUser, logoutUser, registerUser } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar cambios en el estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Obtener datos adicionales del backend
        try {
          const idToken = await user.getIdToken();
          const response = await fetch('http://localhost:3000/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUserData(data.user);
          }
        } catch (error) {
          console.error('Error al obtener datos del usuario:', error);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (email, password, nombre, rol) => {
    return await registerUser(email, password, nombre, rol);
  };

  const login = async (email, password) => {
    const result = await loginUser(email, password);
    setUserData(result.user);
    return result;
  };

  const logout = async () => {
    await logoutUser();
    setUserData(null);
  };

  const value = {
    currentUser,
    userData,
    loading,
    register,
    login,
    logout,
    isAdmin: userData?.rol === 'administrador',
    isEmployee: userData?.rol === 'empleado' || userData?.rol === 'administrador'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
```

### Componente de Login

```javascript
// src/components/Login.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Iniciar Sesión</h2>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
};

export default Login;
```

### Componente de Registro

```javascript
// src/components/Register.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    rol: 'empleado'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(
        formData.email,
        formData.password,
        formData.nombre,
        formData.rol
      );
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h2>Registro</h2>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="nombre"
          placeholder="Nombre completo"
          value={formData.nombre}
          onChange={handleChange}
          required
        />
        
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        
        <input
          type="password"
          name="password"
          placeholder="Contraseña (mín. 6 caracteres)"
          value={formData.password}
          onChange={handleChange}
          required
        />
        
        <select
          name="rol"
          value={formData.rol}
          onChange={handleChange}
          required
        >
          <option value="empleado">Empleado</option>
          <option value="administrador">Administrador</option>
        </select>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrar'}
        </button>
      </form>
    </div>
  );
};

export default Register;
```

### Componente de Dashboard

```javascript
// src/components/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../services/api';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { userData } = useAuth();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await getDashboard();
        setDashboardData(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      <div className="user-info">
        <p>Bienvenido, {userData?.nombre}</p>
        <p>Rol: {userData?.rol}</p>
      </div>
      
      {dashboardData && (
        <div className="stats">
          <div className="stat-card">
            <h3>Total Usuarios</h3>
            <p>{dashboardData.totalUsers}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
```

### Rutas Protegidas

```javascript
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && userData?.rol !== 'administrador') {
    return <Navigate to="/dashboard" />;
  }

  return children;
};
```

### Configuración de Rutas

```javascript
// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

## 🔄 Actualizar Token Automáticamente

```javascript
// src/utils/tokenRefresh.js
import { auth } from '../config/firebase';

export const getValidToken = async () => {
  if (!auth.currentUser) {
    throw new Error('Usuario no autenticado');
  }

  // Firebase automáticamente refresca el token si es necesario
  // El parámetro true fuerza un refresh
  return await auth.currentUser.getIdToken(true);
};
```

## 📱 Ejemplo con React Native

```javascript
// Instalar
npm install firebase @react-native-firebase/app @react-native-firebase/auth

// Configuración similar pero usando módulos de React Native
import auth from '@react-native-firebase/auth';

// Login
const loginUser = async (email, password) => {
  const userCredential = await auth().signInWithEmailAndPassword(email, password);
  const idToken = await userCredential.user.getIdToken();
  
  // Resto del código igual...
};
```

## ⚡ Tips y Mejores Prácticas

1. **Siempre obtén un token fresco**: `user.getIdToken(true)`
2. **Maneja la expiración**: Los tokens expiran cada hora
3. **Usa interceptores**: Para agregar tokens automáticamente
4. **Cachea datos del usuario**: Evita peticiones innecesarias
5. **Maneja errores de red**: Implementa reintentos
6. **Logout en múltiples tabs**: Usa localStorage o eventos

## 🔒 Seguridad en el Frontend

```javascript
// ❌ NUNCA hagas esto
localStorage.setItem('password', password);
localStorage.setItem('idToken', idToken);

// ✅ Deja que Firebase maneje la sesión
// El token se guarda de forma segura automáticamente

// ✅ Las cookies se manejan con httpOnly en el backend
// No intentes acceder a ellas desde JavaScript
```

## 📚 Recursos

- [Firebase Auth Docs](https://firebase.google.com/docs/auth/web/start)
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks)
- [Firebase UI](https://firebase.google.com/docs/auth/web/firebaseui)

