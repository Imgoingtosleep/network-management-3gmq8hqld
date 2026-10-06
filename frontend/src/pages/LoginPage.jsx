import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    const result = await login(username.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      const user = result.user;
      const from = location.state?.from?.pathname;

      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (user.role === 'nds' || (user.allowedTeams?.length === 1 && user.allowedTeams[0] === 'nds')) {
        navigate('/nds', { replace: true });
      } else if (user.role === 'cds' || (user.allowedTeams?.length === 1 && user.allowedTeams[0] === 'cds')) {
        navigate('/cds', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } else {
      setErrorMessage(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

        </form>
      </div>
    </div>
  );
}
