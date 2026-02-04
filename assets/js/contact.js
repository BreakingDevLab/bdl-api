document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Sending…';

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim()
    };

    if (!payload.name || !payload.email || !payload.message) {
      status.textContent = 'Please fill in all fields.';
      return;
    }

    try {
      const res = await fetch('https://bdl2025.onrender.com/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        status.textContent = err.message || 'Server error. Try again later.';
        return;
      }

      status.textContent = 'Message sent. Thank you.';
      form.reset();
    } catch (err) {
      console.error(err);
      status.textContent = 'Network error. Please try again.';
    }
  });
});
