import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../utils/api'
import './Login.css'

const Login = () => {
    const navigate = useNavigate()
    const { login } = useAuthStore()

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rememberMe: false
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    // Demo users for hosted/offline mode (no backend required)
    const DEMO_USERS = [
        { id: 1, username: 'admin', role: 'Admin', full_name: 'Admin User', password: 'Admin@123' },
        { id: 2, username: 'john_doe', role: 'Sales Manager', full_name: 'John Doe', password: 'Manager@123' },
        { id: 3, username: 'admin', role: 'Admin', full_name: 'Admin User', password: 'admin123' },
        { id: 4, username: 'manager', role: 'Sales Manager', full_name: 'Sales Manager', password: 'manager123' },
        { id: 5, username: 'akki', role: 'Sales Manager', full_name: 'Akki Bansode', password: 'akki123' },
    ]


    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Try demo login first (works offline / without backend)
        const demoUser = Object.values(DEMO_USERS).find(
            u => u.username === formData.username && u.password === formData.password
        )
        if (demoUser) {
            const { password, ...userData } = demoUser
            login(userData, 'demo-token-' + userData.username)
            setLoading(false)
            if (userData.role === 'Admin') navigate('/admin')
            else navigate('/manager')
            return
        }

        try {
            const response = await api.post('/api/auth/login', {
                username: formData.username,
                password: formData.password
            })

            const { success, user_id, username, role, full_name, token } = response.data

            if (success) {
                login({ id: user_id, username, role, full_name }, token)
                if (role === 'Admin') navigate('/admin')
                else navigate('/manager')
            } else {
                setError('Invalid username or password')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Invalid username or password. Try demo credentials below.')
        } finally {
            setLoading(false)
        }
    }


    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card card">
                    <div className="login-header">
                        <h1>Sales Manager CRM</h1>
                        <p>Sign in to your account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                autoFocus
                                placeholder="Enter your username"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Enter your password"
                            />
                        </div>

                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                />
                                <span>Remember me for 30 days</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary login-btn"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>Need help? Contact your administrator</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
