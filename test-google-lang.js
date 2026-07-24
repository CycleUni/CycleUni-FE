const googleBtn = document.getElementById('google-btn');
googleBtn.innerHTML = '';
google.accounts.id.renderButton(googleBtn, { theme: 'outline', size: 'large', width: '100%', locale: 'en' });
