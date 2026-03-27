document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorDiv = document.getElementById('error');
      errorDiv.textContent = '';
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          window.location.href = '/game';
        } else {
          errorDiv.textContent = data.error || 'Login failed';
        }
      } catch (err) {
        errorDiv.textContent = 'Network error. Please try again.';
      }
    });
  }
  
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorDiv = document.getElementById('error');
      errorDiv.textContent = '';
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        const response = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          window.location.href = '/game';
        } else {
          errorDiv.textContent = data.error || 'Signup failed';
        }
      } catch (err) {
        errorDiv.textContent = 'Network error. Please try again.';
      }
    });
  }
});
