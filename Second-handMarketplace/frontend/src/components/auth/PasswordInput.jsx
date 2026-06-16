import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

function PasswordInput({
  id,
  name,
  autoComplete,
  value,
  onChange,
  placeholder,
  hasError = false,
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`password-input ${hasError ? 'input-error' : ''}`}>
      <input
        id={id}
        name={name}
        type={isVisible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <button
        type="button"
        aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        onClick={() => setIsVisible((value) => !value)}
      >
        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default PasswordInput;
