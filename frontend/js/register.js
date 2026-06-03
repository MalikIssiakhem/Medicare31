let current = 1;

function getEmail() {
  return document.getElementById('email').value.trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function goTo(step) {
  if (step > current && !validate(current)) return;

  if (step === 4) fillSummary();

  for (let i = 1; i <= 4; i++) {
    const s = document.getElementById('s' + i);
    s.classList.remove('active', 'done');

    if (i < step) s.classList.add('done');
    if (i === step) s.classList.add('active');
  }

  document.querySelectorAll('.step-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  document.getElementById('panel' + step).classList.add('active');

  current = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validate(step) {
  let ok = true;

  function check(id, errId, condition) {
    const el = document.getElementById(id);
    const err = document.getElementById(errId);

    if (!el || !err) return;

    if (!condition(el.value)) {
      el.classList.add('error');
      err.classList.add('show');
      ok = false;
    } else {
      el.classList.remove('error');
      el.classList.add('valid');
      err.classList.remove('show');
    }
  }

  if (step === 1) {
    check('nom', 'err-nom', value => value.trim().length > 0);
    check('prenom', 'err-prenom', value => value.trim().length > 0);
    check('ddn', 'err-ddn', value => value.length > 0);
    check('sexe', 'err-sexe', value => value !== '');
    check('email', 'err-email', value => isValidEmail(value.trim().toLowerCase()));
  }

  if (step === 2) {
    check('tel', 'err-tel', value => value.replace(/\s/g, '').length >= 10);
    check('adresse', 'err-adresse', value => value.trim().length > 0);
    check('cp', 'err-cp', value => /^\d{5}$/.test(value));
    check('ville', 'err-ville', value => value.trim().length > 0);
  }

  if (step === 3) {
    const pwd = document.getElementById('pwd');
    const pwd2 = document.getElementById('pwd2');
    const cgu = document.getElementById('cgu');
    const hds = document.getElementById('hds');

    if (pwd.value.length < 8) {
      pwd.classList.add('error');
      document.getElementById('err-pwd').classList.add('show');
      ok = false;
    } else {
      pwd.classList.remove('error');
      pwd.classList.add('valid');
      document.getElementById('err-pwd').classList.remove('show');
    }

    if (pwd.value !== pwd2.value || pwd2.value.length === 0) {
      pwd2.classList.add('error');
      document.getElementById('err-pwd2').classList.add('show');
      ok = false;
    } else {
      pwd2.classList.remove('error');
      pwd2.classList.add('valid');
      document.getElementById('err-pwd2').classList.remove('show');
    }

    if (!cgu.checked) {
      document.getElementById('err-cgu').classList.add('show');
      ok = false;
    } else {
      document.getElementById('err-cgu').classList.remove('show');
    }

    if (!hds.checked) {
      document.getElementById('err-hds').classList.add('show');
      ok = false;
    } else {
      document.getElementById('err-hds').classList.remove('show');
    }
  }

  return ok;
}

function fillSummary() {
  const civ = document.querySelector('input[name="civilite"]:checked');
  const ddn = document.getElementById('ddn').value;
  const adresse = [
    document.getElementById('adresse').value,
    document.getElementById('cp').value,
    document.getElementById('ville').value
  ].filter(Boolean).join(', ');

  document.getElementById('sum-civ').textContent = civ ? civ.value : '—';
  document.getElementById('sum-nom').textContent = document.getElementById('nom').value || '—';
  document.getElementById('sum-prenom').textContent = document.getElementById('prenom').value || '—';
  document.getElementById('sum-email').textContent = document.getElementById('email').value || '—';
  document.getElementById('sum-tel').textContent = document.getElementById('tel').value || '—';
  document.getElementById('sum-adresse').textContent = adresse || '—';

  if (ddn) {
    const date = new Date(ddn);
    document.getElementById('sum-ddn').textContent = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } else {
    document.getElementById('sum-ddn').textContent = '—';
  }
}

async function submitForm() {
  if (!validate(3)) {
    goTo(3);
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const email = getEmail();
  const password = document.getElementById('pwd').value;
  const nom = document.getElementById('nom').value.trim();
  const prenom = document.getElementById('prenom').value.trim();

  if (!isValidEmail(email)) {
    alert('Veuillez saisir une adresse e-mail valide.');
    goTo(1);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Création en cours...';

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password,
        nom: nom,
        prenom: prenom,
        role: 'patient'
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(data.detail || 'Erreur pendant la création du compte.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Créer mon compte';
      return;
    }

    document.querySelectorAll('.step-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    document.getElementById('stepper').style.display = 'none';
    document.getElementById('successEmail').textContent = email;
    document.getElementById('successView').classList.add('show');

  } catch (error) {
    console.error(error);
    alert('Erreur serveur. Vérifiez que le backend est lancé.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Créer mon compte';
  }
}

function checkStrength(value) {
  let score = 0;

  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  const colors = ['#f04438', '#f79009', '#e8a838', '#12b76a'];
  const labels = ['Très faible', 'Faible', 'Moyen', 'Fort'];
  const bars = ['sb1', 'sb2', 'sb3', 'sb4'];

  bars.forEach((id, index) => {
    const bar = document.getElementById(id);
    if (!bar) return;
    bar.style.background = index < score ? colors[score - 1] : 'var(--border)';
  });

  const label = document.getElementById('strengthLabel');
  if (!label) return;

  label.textContent = value.length ? labels[score - 1] || 'Très faible' : 'Entrez un mot de passe';
  label.style.color = value.length ? colors[score - 1] : 'var(--text-light)';
}

function toggleEye(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  const isHidden = input.type === 'password';

  input.type = isHidden ? 'text' : 'password';

  icon.innerHTML = isHidden
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
       <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
       <circle cx="12" cy="12" r="3"/>`;
}

document.addEventListener('DOMContentLoaded', function () {
  const numSecuInput = document.getElementById('numsecu');

  if (numSecuInput) {
    numSecuInput.addEventListener('input', function () {
      let value = this.value.replace(/\D/g, '').substring(0, 15);
      this.value = value.replace(
        /(\d{1})(\d{2})(\d{2})(\d{2})(\d{3})(\d{3})(\d{2})?/,
        function (_, a, b, c, d, e, f, g) {
          return [a, b, c, d, e, f, g].filter(Boolean).join(' ');
        }
      );
    });
  }

  ['tel', 'tel2'].forEach(function (id) {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('input', function () {
      let value = this.value.replace(/\D/g, '').substring(0, 10);
      this.value = value.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    });
  });
});